/**
 * solver.worker.ts — Pyodide Web Worker for the Dantzig-Wolfe solver.
 *
 * Message protocol is defined in specs/002-initial-feature-files/contracts/solver-worker-contract.md
 *
 * INIT  → load Pyodide + dantzig-wolfe-python, post READY
 * SOLVE → convert ProblemInstance to Python, run solver, stream ITERATION, post RESULT
 * CANCEL → set cancellation flag (checked after each iteration)
 */

// ---------------------------------------------------------------------------
// Types (mirror contracts/solver-worker-contract.md)
// ---------------------------------------------------------------------------

interface InitMessage {
  type: 'INIT'
}
interface SolveMessage {
  type: 'SOLVE'
  requestId: string
  payload: Record<string, unknown>
}
interface CancelMessage {
  type: 'CANCEL'
  requestId: string
}
type WorkerInboundMessage = InitMessage | SolveMessage | CancelMessage

interface SolverIteration {
  iterationNumber: number
  masterObjectiveValue: number
  dualVariables: number[]
  enteringSubproblemIndex: number
  enteringColumnReducedCost: number
  subproblemObjectiveValues: number[]
}

interface SolverResult {
  status: 'optimal' | 'infeasible' | 'unbounded' | 'cancelled' | 'error'
  objectiveValue?: number
  primalSolution?: { variableValues: number[][]; couplingSlacks: number[] }
  dualSolution?: { couplingDuals: number[]; subproblemDuals: number[][] }
  iterations: SolverIteration[]
  solveTimeMs: number
  errorMessage?: string
  unboundedSubproblemIndex?: number
}

// ---------------------------------------------------------------------------
// Constants — loaded from /pyodide-lock.json at startup
// ---------------------------------------------------------------------------

const DEFAULT_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/'
const DEFAULT_DW_WHEEL_URL =
  'https://github.com/alotau/dantzig-wolfe-python/releases/download/v0.1.0/dantzig_wolfe_python-0.1.0-py3-none-any.whl'

// ---------------------------------------------------------------------------
// Worker state
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null
let pyodideReady = false
let cancelRequested = false
let currentRequestId: string | null = null

// ---------------------------------------------------------------------------
// Load pyodide-lock config
// ---------------------------------------------------------------------------

async function loadLockConfig(): Promise<{ indexURL: string; dwWheelUrl: string }> {
  try {
    const resp = await fetch('/pyodide-lock.json')
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const lock = await resp.json()
    return {
      indexURL: lock?.pyodide?.indexURL ?? DEFAULT_INDEX_URL,
      dwWheelUrl: lock?.packages?.['dantzig-wolfe-python']?.url ?? DEFAULT_DW_WHEEL_URL,
    }
  } catch {
    return { indexURL: DEFAULT_INDEX_URL, dwWheelUrl: DEFAULT_DW_WHEEL_URL }
  }
}

// ---------------------------------------------------------------------------
// INIT handler
// ---------------------------------------------------------------------------

async function handleInit(): Promise<void> {
  try {
    // WebAssembly is required for Pyodide
    if (typeof WebAssembly === 'undefined') {
      self.postMessage({
        type: 'INIT_ERROR',
        error:
          'WebAssembly is not supported in this browser. ' +
          'The interactive solver requires a modern browser with WebAssembly support.',
      })
      return
    }

    const { indexURL, dwWheelUrl } = await loadLockConfig()

    // Load Pyodide from CDN (module worker — use dynamic import)
    // @vite-ignore
    const pyodideModule = await import(/* @vite-ignore */ `${indexURL}pyodide.mjs`)
    pyodide = await pyodideModule.loadPyodide({ indexURL })

    // Install micropip (bundled with Pyodide)
    await pyodide.loadPackage('micropip')

    // Install dantzig-wolfe-python wheel
    await pyodide.runPythonAsync(`
import micropip
await micropip.install("${dwWheelUrl}")
    `)

    // Read version string
    let solverVersion = 'unknown'
    try {
      solverVersion = String(
        await pyodide.runPythonAsync(`import dantzig_wolfe; dantzig_wolfe.__version__`),
      )
    } catch {
      // Package installed but no __version__ — acceptable
    }

    pyodideReady = true
    self.postMessage({
      type: 'READY',
      pyodideVersion: String(pyodide.version ?? pyodide.version),
      solverPackageVersion: solverVersion,
    })
  } catch (err) {
    self.postMessage({
      type: 'INIT_ERROR',
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

// ---------------------------------------------------------------------------
// SOLVE handler
// ---------------------------------------------------------------------------

async function handleSolve(requestId: string, problem: Record<string, unknown>): Promise<void> {
  cancelRequested = false
  currentRequestId = requestId
  const iterations: SolverIteration[] = []
  const startTime = performance.now()

  // Register iteration callback — Python calls this after each DW iteration.
  // The callback returns 'cancel' when cancellation is requested; the Python
  // solver checks this return value and stops with status='cancelled'.
  pyodide.globals.set('iterationCallback', (jsonStr: string): string | null => {
    try {
      const iteration = JSON.parse(jsonStr) as SolverIteration
      iterations.push(iteration)
      self.postMessage({ type: 'ITERATION', requestId, payload: iteration })
    } catch {
      // Malformed iteration data — continue solving
    }
    return cancelRequested ? 'cancel' : null
  })

  // Pass the problem as a JSON string (avoids Pyodide proxy complexity)
  pyodide.globals.set('problemJson', JSON.stringify(problem))

  try {
    const resultJson = String(
      await pyodide.runPythonAsync(`
import json, dantzig_wolfe
from js import iterationCallback

problem = json.loads(problemJson)
result = dantzig_wolfe.solve(
    problem,
    iteration_callback=lambda data: iterationCallback(json.dumps(data))
)
json.dumps(result)
      `),
    )

    const raw = JSON.parse(resultJson) as Record<string, unknown>
    const solveTimeMs = performance.now() - startTime

    const result: SolverResult = {
      status: (raw.status as SolverResult['status']) ?? 'error',
      iterations,
      solveTimeMs,
    }

    if (cancelRequested) result.status = 'cancelled'

    if (raw.objectiveValue !== undefined && raw.objectiveValue !== null) {
      result.objectiveValue = Number(raw.objectiveValue)
    }
    if (raw.primalSolution != null) {
      const ps = raw.primalSolution as { variableValues: number[][]; couplingSlacks: number[] }
      result.primalSolution = {
        variableValues: ps.variableValues,
        couplingSlacks: ps.couplingSlacks,
      }
    }
    if (raw.dualSolution != null) {
      const ds = raw.dualSolution as { couplingDuals: number[]; subproblemDuals: number[][] }
      result.dualSolution = {
        couplingDuals: ds.couplingDuals,
        subproblemDuals: ds.subproblemDuals,
      }
    }
    if (raw.errorMessage != null) result.errorMessage = String(raw.errorMessage)
    if (raw.unboundedSubproblemIndex != null) {
      result.unboundedSubproblemIndex = Number(raw.unboundedSubproblemIndex)
    }

    self.postMessage({ type: 'RESULT', requestId, payload: result })
  } catch (err) {
    const solveTimeMs = performance.now() - startTime
    self.postMessage({
      type: 'RESULT',
      requestId,
      payload: {
        status: cancelRequested ? 'cancelled' : 'error',
        iterations,
        solveTimeMs,
        errorMessage: err instanceof Error ? err.message : String(err),
      } satisfies SolverResult,
    })
  } finally {
    currentRequestId = null
    cancelRequested = false
    pyodide.globals.delete('iterationCallback')
    pyodide.globals.delete('problemJson')
  }
}

// ---------------------------------------------------------------------------
// Message dispatch
// ---------------------------------------------------------------------------

self.addEventListener('message', async (e: MessageEvent<WorkerInboundMessage>) => {
  const msg = e.data
  switch (msg.type) {
    case 'INIT':
      await handleInit()
      break

    case 'SOLVE':
      if (!pyodideReady) {
        self.postMessage({
          type: 'RESULT',
          requestId: msg.requestId,
          payload: {
            status: 'error',
            iterations: [],
            solveTimeMs: 0,
            errorMessage: 'Pyodide is not initialised. Wait for the solver to become ready.',
          } satisfies SolverResult,
        })
        return
      }
      await handleSolve(msg.requestId, msg.payload)
      break

    case 'CANCEL':
      if (currentRequestId === msg.requestId) {
        cancelRequested = true
      }
      break
  }
})
