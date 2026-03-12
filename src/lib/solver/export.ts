/**
 * export.ts — Build the solution export payload and trigger a browser download.
 *
 * Contract: specs/002-initial-feature-files/contracts/export-contract.md
 */

import type { ParsedProblemInstance } from './problem-schema.js'
import type { SolverResult, SolverIteration } from './worker-client.js'

// ---------------------------------------------------------------------------
// Export schema types
// ---------------------------------------------------------------------------

/** The JSON payload written to the downloaded file. */
export interface ExportPayload {
  $schema: string
  schemaVersion: '1.0.0'
  exportedAt: string
  problem: ExportProblem
  result: ExportResult
  iterations: ExportIteration[]
}

interface ExportProblem {
  name?: string
  objectiveDirection: 'min' | 'max'
  couplingConstraints: {
    numConstraints: number
    numVariables: number
    A: number[][]
    b: number[]
    senses: string[]
  }
  subproblems: ExportSubproblem[]
}

interface ExportSubproblem {
  index: number
  label: string
  numVariables: number
  numConstraints: number
  A: number[][]
  b: number[]
  senses: string[]
  c: number[]
  bounds: Array<{ lower: number; upper: number | null }>
}

interface ExportResult {
  status: string
  objectiveValue?: number
  solveTimeMs: number
  primalSolution?: {
    variableValues: number[][]
    couplingSlacks: number[]
  }
  dualSolution?: {
    couplingDuals: number[]
    subproblemDuals: number[][]
  }
}

interface ExportIteration {
  iterationNumber: number
  masterObjectiveValue: number
  dualVariables: number[]
  enteringSubproblemIndex: number
  enteringColumnReducedCost: number
  subproblemObjectiveValues: number[]
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Builds the export payload from a solved problem + result.
 * Follows the v1.0.0 schema from export-contract.md.
 */
export function buildExportPayload(
  problem: ParsedProblemInstance,
  result: SolverResult,
  iterationHistory: SolverIteration[],
): ExportPayload {
  const coupling = problem.coupling

  const exportSubproblems: ExportSubproblem[] = problem.subproblems.map((sp, i) => ({
    index: i + 1,
    label: sp.label ?? `Block ${i + 1}`,
    numVariables: sp.c.length,
    numConstraints: sp.A.length,
    A: sp.A,
    b: sp.b,
    senses: sp.constraintSenses,
    c: sp.c,
    bounds: sp.bounds.map((bd) => ({
      lower: bd.lower,
      upper: bd.upper ?? null,
    })),
  }))

  const exportResult: ExportResult = {
    status: result.status,
    solveTimeMs: result.solveTimeMs,
    ...(result.objectiveValue !== undefined && { objectiveValue: result.objectiveValue }),
    ...(result.primalSolution && { primalSolution: result.primalSolution }),
    ...(result.dualSolution && { dualSolution: result.dualSolution }),
  }

  const exportIterations: ExportIteration[] = iterationHistory.map((it) => ({
    iterationNumber: it.iterationNumber,
    masterObjectiveValue: it.masterObjectiveValue,
    dualVariables: it.dualVariables,
    enteringSubproblemIndex: it.enteringSubproblemIndex,
    enteringColumnReducedCost: it.enteringColumnReducedCost,
    subproblemObjectiveValues: it.subproblemObjectiveValues,
  }))

  return {
    $schema: 'https://dantzig-wolfe.example/schemas/solution-export/v1',
    schemaVersion: '1.0.0',
    exportedAt: new Date().toISOString(),
    problem: {
      name: problem.metadata?.name,
      objectiveDirection: (problem.objectiveDirection ?? 'min') as 'min' | 'max',
      couplingConstraints: {
        numConstraints: coupling.A.length,
        numVariables: coupling.A[0]?.length ?? 0,
        A: coupling.A,
        b: coupling.b,
        senses: coupling.senses,
      },
      subproblems: exportSubproblems,
    },
    result: exportResult,
    iterations: exportIterations,
  }
}

/**
 * Triggers a browser download of `payload` as a JSON file.
 * File name: `dw-solution-<YYYY-MM-DD>-<name|"unnamed">.json`
 */
export function downloadJson(payload: ExportPayload): void {
  const date = new Date().toISOString().slice(0, 10)
  const name = (payload.problem.name ?? 'unnamed')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  const filename = `dw-solution-${date}-${name}.json`

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()

  // Clean up the object URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}
