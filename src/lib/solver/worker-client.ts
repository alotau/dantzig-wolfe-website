/**
 * worker-client.ts — Main-thread client for the Pyodide solver Web Worker.
 *
 * Manages the worker lifecycle, request/response mapping, and exposes a clean
 * async API to Svelte components.
 *
 * Message protocol: specs/002-initial-feature-files/contracts/solver-worker-contract.md
 */

import type { ParsedProblemInstance, ConstraintSense } from './problem-schema.js'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SolverIteration {
  iterationNumber: number
  masterObjectiveValue: number
  dualVariables: number[]
  enteringSubproblemIndex: number
  enteringColumnReducedCost: number
  subproblemObjectiveValues: number[]
}

export type SolverStatus = 'optimal' | 'infeasible' | 'unbounded' | 'cancelled' | 'error'

export interface InfeasibilityDiagnostic {
  blocks: Array<{
    index: number
    label: string
    boundViolations: string[]
  }>
  coupling: Array<{
    index: number
    label: string
    sense: ConstraintSense
    rhs: number
    violated: boolean
    minAchievable?: number
    maxAchievable?: number
  }>
}

export interface SolverResult {
  status: SolverStatus
  objectiveValue?: number
  primalSolution?: { variableValues: number[][]; couplingSlacks: number[] }
  dualSolution?: { couplingDuals: number[]; subproblemDuals: number[][] }
  iterations: SolverIteration[]
  solveTimeMs: number
  errorMessage?: string
  unboundedSubproblemIndex?: number
  infeasibilityDiagnostic?: InfeasibilityDiagnostic
}

// Internal worker message shapes
interface ReadyMessage {
  type: 'READY'
  pyodideVersion: string
  solverPackageVersion: string
}
interface InitErrorMessage {
  type: 'INIT_ERROR'
  error: string
}
interface IterationMessage {
  type: 'ITERATION'
  requestId: string
  payload: SolverIteration
}
interface ResultMessage {
  type: 'RESULT'
  requestId: string
  payload: SolverResult
}
type WorkerOutboundMessage = ReadyMessage | InitErrorMessage | IterationMessage | ResultMessage

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const READY_TIMEOUT_MS = 30_000

// ---------------------------------------------------------------------------
// WorkerClient
// ---------------------------------------------------------------------------

export class WorkerClient {
  private worker: Worker | null = null
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null
  private readyReject: ((err: Error) => void) | null = null
  private readyTimeoutId: ReturnType<typeof setTimeout> | null = null

  /** Pending solve request — requestId → { resolve, reject, onIteration } */
  private pendingSolve: {
    requestId: string
    resolve: (result: SolverResult) => void
    reject: (err: Error) => void
    onIteration: ((iter: SolverIteration) => void) | undefined
  } | null = null

  // Public fields for consumers to read after READY
  pyodideVersion = ''
  solverPackageVersion = ''

  // ---------------------------------------------------------------------------
  // init()
  // ---------------------------------------------------------------------------

  /**
   * Creates the worker and sends INIT.  Resolves when READY is received.
   * Rejects with an error message if INIT_ERROR arrives or the 30s timeout
   * expires.  Safe to call multiple times — returns the same Promise.
   */
  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise

    // Check WebAssembly support in the main thread before creating the worker.
    // Workers have their own global, so page-level stubs (e.g., in tests) won't
    // reach the worker — this check ensures graceful error handling.
    if (typeof WebAssembly === 'undefined') {
      this.readyPromise = Promise.reject(
        new Error(
          'WebAssembly is not supported in this browser. ' +
            'The interactive solver requires a modern browser with WebAssembly support.',
        ),
      )
      return this.readyPromise
    }

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.readyResolve = resolve
      this.readyReject = reject
    })

    // Create module worker — Vite resolves import.meta.url at build time
    this.worker = new Worker(new URL('../../workers/solver.worker.ts', import.meta.url), {
      type: 'module',
    })

    this.worker.addEventListener('message', this.handleMessage.bind(this))
    this.worker.addEventListener('error', (e) => {
      const msg = e.message ?? 'Unknown worker error'
      this.readyReject?.(new Error(msg))
    })

    // 30-second timeout for READY
    this.readyTimeoutId = setTimeout(() => {
      this.readyReject?.(
        new Error('Solver timed out waiting for Pyodide to initialise (30s exceeded).'),
      )
    }, READY_TIMEOUT_MS)

    // Send INIT
    this.worker.postMessage({ type: 'INIT' })

    return this.readyPromise
  }

  // ---------------------------------------------------------------------------
  // solve()
  // ---------------------------------------------------------------------------

  /**
   * Sends a SOLVE request with a fresh UUID requestId.
   * Streams iterations via onIteration callback (optional).
   * Resolves with SolverResult when RESULT is received.
   */
  async solve(
    problem: ParsedProblemInstance,
    onIteration?: (iter: SolverIteration) => void,
  ): Promise<SolverResult> {
    if (!this.worker) {
      throw new Error('WorkerClient not initialised. Call init() first.')
    }

    const requestId = crypto.randomUUID()

    const resultPromise = new Promise<SolverResult>((resolve, reject) => {
      this.pendingSolve = { requestId, resolve, reject, onIteration }
    })

    this.worker.postMessage({
      type: 'SOLVE',
      requestId,
      // Use a plain JSON round-trip to strip any Svelte reactive proxies before
      // postMessage's structured-clone step (proxies cause DataCloneError).
      payload: JSON.parse(JSON.stringify(problem)) as ParsedProblemInstance,
    })
    return resultPromise
  }

  // ---------------------------------------------------------------------------
  // cancel()
  // ---------------------------------------------------------------------------

  /** Cancels the currently active solve (if any). */
  cancel(): void {
    if (!this.worker || !this.pendingSolve) return
    this.worker.postMessage({ type: 'CANCEL', requestId: this.pendingSolve.requestId })
  }

  // ---------------------------------------------------------------------------
  // dispose()
  // ---------------------------------------------------------------------------

  /** Terminates the worker.  The client cannot be reused after this. */
  dispose(): void {
    if (this.readyTimeoutId !== null) {
      clearTimeout(this.readyTimeoutId)
      this.readyTimeoutId = null
    }
    this.worker?.terminate()
    this.worker = null
    this.readyPromise = null
  }

  // ---------------------------------------------------------------------------
  // Private message handler
  // ---------------------------------------------------------------------------

  private handleMessage(e: MessageEvent<WorkerOutboundMessage>): void {
    const msg = e.data
    switch (msg.type) {
      case 'READY':
        if (this.readyTimeoutId !== null) {
          clearTimeout(this.readyTimeoutId)
          this.readyTimeoutId = null
        }
        this.pyodideVersion = msg.pyodideVersion
        this.solverPackageVersion = msg.solverPackageVersion
        this.readyResolve?.()
        break

      case 'INIT_ERROR':
        if (this.readyTimeoutId !== null) {
          clearTimeout(this.readyTimeoutId)
          this.readyTimeoutId = null
        }
        this.readyReject?.(new Error(msg.error))
        break

      case 'ITERATION':
        if (this.pendingSolve?.requestId === msg.requestId) {
          this.pendingSolve.onIteration?.(msg.payload)
        }
        break

      case 'RESULT':
        if (this.pendingSolve?.requestId === msg.requestId) {
          const { resolve } = this.pendingSolve
          this.pendingSolve = null
          resolve(msg.payload)
        }
        break
    }
  }
}
