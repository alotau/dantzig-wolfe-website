import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { buildExportPayload, downloadJson } from '../../../src/lib/solver/export.js'
import type { ParsedProblemInstance } from '../../../src/lib/solver/problem-schema.js'
import type { SolverResult, SolverIteration } from '../../../src/lib/solver/worker-client.js'

// jsdom does not implement URL.createObjectURL / revokeObjectURL — stub them
const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
const mockRevokeObjectURL = vi.fn()

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    writable: true,
    value: mockCreateObjectURL,
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    writable: true,
    value: mockRevokeObjectURL,
  })
})

afterAll(() => {
  vi.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const PROBLEM: ParsedProblemInstance = {
  objectiveDirection: 'min',
  coupling: {
    // 2 columns = 1 var per subproblem × 2 subproblems
    A: [[1, 1]],
    b: [4],
    senses: ['leq'],
    constraintLabels: ['Shared limit'],
  },
  subproblems: [
    {
      index: 1,
      label: 'Block 1',
      A: [[1]],
      b: [3],
      constraintSenses: ['leq'],
      c: [1],
      bounds: [{ lower: 0, upper: null }],
      variableLabels: ['x1'],
    },
    {
      index: 2,
      label: 'Block 2',
      A: [[1]],
      b: [3],
      constraintSenses: ['leq'],
      c: [2],
      bounds: [{ lower: 0, upper: null }],
    },
  ],
  metadata: { name: 'Test Problem' },
}

const OPTIMAL_RESULT: SolverResult = {
  status: 'optimal',
  objectiveValue: 12.5,
  primalSolution: {
    variableValues: [[2.5], [1.0]],
    couplingSlacks: [0.0],
  },
  dualSolution: {
    couplingDuals: [1.5],
    subproblemDuals: [[-0.0], [-0.0]],
  },
  iterations: [],
  solveTimeMs: 847,
}

const ITERATIONS: SolverIteration[] = [
  {
    iterationNumber: 1,
    masterObjectiveValue: 18.0,
    dualVariables: [1.0],
    enteringSubproblemIndex: 0,
    enteringColumnReducedCost: -2.5,
    subproblemObjectiveValues: [-2.5, -0.8],
  },
  {
    iterationNumber: 2,
    masterObjectiveValue: 12.5,
    dualVariables: [1.5],
    enteringSubproblemIndex: 1,
    enteringColumnReducedCost: -0.01,
    subproblemObjectiveValues: [-0.01, -0.0],
  },
]

// ---------------------------------------------------------------------------
// buildExportPayload
// ---------------------------------------------------------------------------

describe('buildExportPayload', () => {
  it('contains all required top-level fields', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    expect(payload.$schema).toBe('https://dantzig-wolfe.example/schemas/solution-export/v1')
    expect(payload.schemaVersion).toBe('1.0.0')
    expect(typeof payload.exportedAt).toBe('string')
    expect(payload.problem).toBeDefined()
    expect(payload.result).toBeDefined()
    expect(Array.isArray(payload.iterations)).toBe(true)
  })

  it('exportedAt is a valid ISO 8601 timestamp', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    const date = new Date(payload.exportedAt)
    expect(isNaN(date.getTime())).toBe(false)
  })

  it('problem.name matches metadata.name', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    expect(payload.problem.name).toBe('Test Problem')
  })

  it('problem.objectiveDirection is preserved', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    expect(payload.problem.objectiveDirection).toBe('min')
  })

  it('coupling constraints are serialised correctly', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    const cc = payload.problem.couplingConstraints
    expect(cc.numConstraints).toBe(1)
    expect(cc.A).toEqual([[1, 1]])
    expect(cc.b).toEqual([4])
    expect(cc.senses).toEqual(['leq'])
  })

  it('subproblems are serialised with correct shape', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    expect(payload.problem.subproblems.length).toBe(2)
    const sp = payload.problem.subproblems[0]!
    expect(sp.index).toBe(1)
    expect(sp.label).toBe('Block 1')
    expect(sp.numVariables).toBe(1)
    expect(sp.numConstraints).toBe(1)
    expect(sp.c).toEqual([1])
    expect(sp.bounds[0]).toEqual({ lower: 0, upper: null })
  })

  it('result contains objectiveValue when optimal', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    expect(payload.result.status).toBe('optimal')
    expect(payload.result.objectiveValue).toBe(12.5)
    expect(payload.result.solveTimeMs).toBe(847)
  })

  it('result includes primal and dual solutions', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    expect(payload.result.primalSolution?.variableValues).toEqual([[2.5], [1.0]])
    expect(payload.result.dualSolution?.couplingDuals).toEqual([1.5])
  })

  it('iterations array is serialised correctly', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, ITERATIONS)
    expect(payload.iterations.length).toBe(2)
    expect(payload.iterations[0]!.iterationNumber).toBe(1)
    expect(payload.iterations[0]!.masterObjectiveValue).toBe(18.0)
    expect(payload.iterations[1]!.enteringColumnReducedCost).toBe(-0.01)
  })

  it('iterations is an empty array when no iterations given', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, [])
    expect(payload.iterations).toEqual([])
  })

  it('handles infeasible result without objectiveValue', () => {
    const infeasibleResult: SolverResult = {
      status: 'infeasible',
      iterations: [],
      solveTimeMs: 120,
    }
    const payload = buildExportPayload(PROBLEM, infeasibleResult, [])
    expect(payload.result.status).toBe('infeasible')
    expect(payload.result.objectiveValue).toBeUndefined()
    expect(payload.result.primalSolution).toBeUndefined()
  })

  it('subproblem upper null bound is preserved as null', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, [])
    const bound = payload.problem.subproblems[0]!.bounds[0]!
    expect(bound.upper).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// downloadJson — tests that the download mechanism calls the DOM correctly
// ---------------------------------------------------------------------------

describe('downloadJson', () => {
  it('triggers a DOM anchor click with a blob URL', () => {
    const payload = buildExportPayload(PROBLEM, OPTIMAL_RESULT, [])

    // Track anchor interactions
    const clicks: HTMLAnchorElement[] = []
    const originalCreateElement = document.createElement.bind(document)
    document.createElement = (tag: string) => {
      const el = originalCreateElement(tag)
      if (tag === 'a') {
        const orig = el.click.bind(el)
        ;(el as HTMLAnchorElement).click = () => {
          clicks.push(el as HTMLAnchorElement)
          orig()
        }
      }
      return el
    }

    downloadJson(payload)

    expect(clicks.length).toBe(1)
    const anchor = clicks[0]!
    expect(anchor.download).toMatch(/^dw-solution-\d{4}-\d{2}-\d{2}-test-problem\.json$/)
    expect(anchor.href).toMatch(/^blob:/)

    // Restore
    document.createElement = originalCreateElement
  })
})
