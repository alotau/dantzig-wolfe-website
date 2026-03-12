/**
 * solver-messages.test.ts — Unit tests for WorkerClient message construction.
 *
 * Tests cover: SOLVE message shape, UUID requestId generation, CANCEL echoes
 * requestId, and INIT_ERROR propagation.
 *
 * The Worker global is mocked with vi.fn() so no real worker is spawned.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WorkerClient, type SolverResult } from '@/lib/solver/worker-client.js'
import type { ParsedProblemInstance } from '@/lib/solver/problem-schema.js'

// ---------------------------------------------------------------------------
// Mock Worker
// ---------------------------------------------------------------------------

/** Captured messages sent by WorkerClient.worker.postMessage() */
let capturedMessages: Array<Record<string, unknown>> = []

/** Manual event listener registry on the mock worker */
let workerMessageListeners: Array<(e: MessageEvent) => void> = []
let workerErrorListeners: Array<(e: ErrorEvent) => void> = []

class MockWorker {
  postMessage(msg: unknown) {
    capturedMessages.push(msg as Record<string, unknown>)
  }
  addEventListener(type: string, listener: (...args: unknown[]) => void) {
    if (type === 'message') workerMessageListeners.push(listener as (e: MessageEvent) => void)
    if (type === 'error') workerErrorListeners.push(listener as (e: ErrorEvent) => void)
  }
  removeEventListener() {}
  terminate() {}
}

/** Helper: dispatch a synthetic message from the worker to the client */
function dispatchWorkerMessage(data: unknown) {
  const event = { data } as MessageEvent
  workerMessageListeners.forEach((l) => l(event))
}

// Replace the global Worker with our mock
vi.stubGlobal('Worker', MockWorker)

// ---------------------------------------------------------------------------
// Minimal valid ProblemInstance fixture
// ---------------------------------------------------------------------------

const VALID_PROBLEM: ParsedProblemInstance = {
  objectiveDirection: 'min',
  coupling: {
    A: [[1, 1]],
    b: [2],
    senses: ['leq'],
  },
  subproblems: [
    {
      index: 1,
      A: [[1]],
      b: [1],
      constraintSenses: ['leq'],
      c: [1],
      bounds: [{ lower: 0, upper: null }],
    },
    {
      index: 2,
      A: [[1]],
      b: [1],
      constraintSenses: ['leq'],
      c: [1],
      bounds: [{ lower: 0, upper: null }],
    },
  ],
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WorkerClient — message construction', () => {
  let client: WorkerClient

  beforeEach(() => {
    capturedMessages = []
    workerMessageListeners = []
    workerErrorListeners = []
    client = new WorkerClient()
  })

  afterEach(() => {
    client.dispose()
  })

  // -------------------------------------------------------------------------
  // INIT message
  // -------------------------------------------------------------------------

  it('sends an INIT message when init() is called', async () => {
    // Start init — do not await (worker never sends READY in mock)
    client.init()
    const initMsg = capturedMessages.find((m) => m.type === 'INIT')
    expect(initMsg).toBeDefined()
    expect(initMsg).toEqual({ type: 'INIT' })
  })

  it('returns the same promise on repeated init() calls', () => {
    const p1 = client.init()
    const p2 = client.init()
    expect(p1).toBe(p2)
  })

  // -------------------------------------------------------------------------
  // READY / INIT_ERROR handling
  // -------------------------------------------------------------------------

  it('resolves init() when READY is received', async () => {
    const initPromise = client.init()
    dispatchWorkerMessage({
      type: 'READY',
      pyodideVersion: '0.29.3',
      solverPackageVersion: '0.1.0',
    })
    await expect(initPromise).resolves.toBeUndefined()
    expect(client.pyodideVersion).toBe('0.29.3')
    expect(client.solverPackageVersion).toBe('0.1.0')
  })

  it('rejects init() when INIT_ERROR is received', async () => {
    const initPromise = client.init()
    dispatchWorkerMessage({ type: 'INIT_ERROR', error: 'WebAssembly not supported' })
    await expect(initPromise).rejects.toThrow('WebAssembly not supported')
  })

  // -------------------------------------------------------------------------
  // SOLVE message
  // -------------------------------------------------------------------------

  it('sends a SOLVE message with UUID requestId and correct payload', async () => {
    // Initialise first
    const initPromise = client.init()
    dispatchWorkerMessage({ type: 'READY', pyodideVersion: '0.29.3', solverPackageVersion: '1.0' })
    await initPromise

    // Start solve (don't await — worker never resolves in mock)
    client.solve(VALID_PROBLEM)

    const solveMsg = capturedMessages.find((m) => m.type === 'SOLVE')
    expect(solveMsg).toBeDefined()
    expect(solveMsg!.type).toBe('SOLVE')

    // requestId must be a v4 UUID
    const requestId = solveMsg!.requestId as string
    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )

    // Payload is the problem instance
    expect(solveMsg!.payload).toEqual(VALID_PROBLEM)
  })

  it('generates a unique requestId for each solve call', async () => {
    const initPromise = client.init()
    dispatchWorkerMessage({ type: 'READY', pyodideVersion: '0.29.3', solverPackageVersion: '1.0' })
    await initPromise

    // First solve
    client.solve(VALID_PROBLEM)
    const msg1 = capturedMessages.find((m) => m.type === 'SOLVE')!
    const id1 = msg1.requestId as string

    // Simulate RESULT so we can start a second solve
    dispatchWorkerMessage({
      type: 'RESULT',
      requestId: id1,
      payload: { status: 'optimal', iterations: [], solveTimeMs: 1 } satisfies SolverResult,
    })

    capturedMessages = []
    client.solve(VALID_PROBLEM)
    const msg2 = capturedMessages.find((m) => m.type === 'SOLVE')!
    const id2 = msg2.requestId as string

    expect(id1).not.toBe(id2)
  })

  // -------------------------------------------------------------------------
  // CANCEL message
  // -------------------------------------------------------------------------

  it('sends a CANCEL message that echoes the active requestId', async () => {
    const initPromise = client.init()
    dispatchWorkerMessage({ type: 'READY', pyodideVersion: '0.29.3', solverPackageVersion: '1.0' })
    await initPromise

    client.solve(VALID_PROBLEM)
    const solveMsg = capturedMessages.find((m) => m.type === 'SOLVE')!
    const requestId = solveMsg.requestId as string

    // Cancel the active solve
    client.cancel()

    const cancelMsg = capturedMessages.find((m) => m.type === 'CANCEL')
    expect(cancelMsg).toBeDefined()
    expect(cancelMsg!.type).toBe('CANCEL')
    expect(cancelMsg!.requestId).toBe(requestId)
  })

  it('does nothing on cancel() when no solve is active', async () => {
    const initPromise = client.init()
    dispatchWorkerMessage({ type: 'READY', pyodideVersion: '0.29.3', solverPackageVersion: '1.0' })
    await initPromise

    // No solve started
    client.cancel()
    const cancelMsg = capturedMessages.find((m) => m.type === 'CANCEL')
    expect(cancelMsg).toBeUndefined()
  })

  // -------------------------------------------------------------------------
  // ITERATION streaming
  // -------------------------------------------------------------------------

  it('forwards ITERATION messages to the onIteration callback', async () => {
    const initPromise = client.init()
    dispatchWorkerMessage({ type: 'READY', pyodideVersion: '0.29.3', solverPackageVersion: '1.0' })
    await initPromise

    const iterations: unknown[] = []
    client.solve(VALID_PROBLEM, (iter) => iterations.push(iter))

    const solveMsg = capturedMessages.find((m) => m.type === 'SOLVE')!
    const requestId = solveMsg.requestId as string

    const iterPayload = {
      iterationNumber: 1,
      masterObjectiveValue: 5.0,
      dualVariables: [1.0],
      enteringSubproblemIndex: 0,
      enteringColumnReducedCost: -0.5,
      subproblemObjectiveValues: [4.5],
    }
    dispatchWorkerMessage({ type: 'ITERATION', requestId, payload: iterPayload })

    expect(iterations).toHaveLength(1)
    expect(iterations[0]).toEqual(iterPayload)
  })

  // -------------------------------------------------------------------------
  // RESULT resolution
  // -------------------------------------------------------------------------

  it('resolves solve() with SolverResult when RESULT is received', async () => {
    const initPromise = client.init()
    dispatchWorkerMessage({ type: 'READY', pyodideVersion: '0.29.3', solverPackageVersion: '1.0' })
    await initPromise

    const solvePromise = client.solve(VALID_PROBLEM)
    const solveMsg = capturedMessages.find((m) => m.type === 'SOLVE')!
    const requestId = solveMsg.requestId as string

    const resultPayload: SolverResult = {
      status: 'optimal',
      objectiveValue: 2.0,
      iterations: [],
      solveTimeMs: 42,
    }
    dispatchWorkerMessage({ type: 'RESULT', requestId, payload: resultPayload })

    await expect(solvePromise).resolves.toEqual(resultPayload)
  })

  it('ignores RESULT messages for a different requestId', async () => {
    const initPromise = client.init()
    dispatchWorkerMessage({ type: 'READY', pyodideVersion: '0.29.3', solverPackageVersion: '1.0' })
    await initPromise

    let resolved = false
    const solvePromise = client.solve(VALID_PROBLEM).then((r) => {
      resolved = true
      return r
    })

    // Send RESULT with wrong requestId — should be ignored
    dispatchWorkerMessage({
      type: 'RESULT',
      requestId: 'wrong-id',
      payload: { status: 'optimal', iterations: [], solveTimeMs: 0 } satisfies SolverResult,
    })

    // Give microtasks a chance to run
    await Promise.resolve()
    expect(resolved).toBe(false)

    // Now send correct RESULT
    const solveMsg = capturedMessages.find((m) => m.type === 'SOLVE')!
    dispatchWorkerMessage({
      type: 'RESULT',
      requestId: solveMsg.requestId,
      payload: { status: 'optimal', iterations: [], solveTimeMs: 1 } satisfies SolverResult,
    })
    await expect(solvePromise).resolves.toBeDefined()
  })
})
