// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type Result<T, E = string> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E }

export function ok<T>(value: T): Result<T> {
  return { ok: true, value }
}

export function err<T = never>(error: string): Result<T> {
  return { ok: false, error }
}

// ---------------------------------------------------------------------------
// Matrix helpers
// ---------------------------------------------------------------------------

/** Returns an error if `matrix` is not rectangular (all rows same length). */
export function validateRectangular(matrix: number[][]): Result<void> {
  if (matrix.length === 0) return ok(undefined)
  const cols = matrix[0].length
  for (let i = 1; i < matrix.length; i++) {
    if (matrix[i].length !== cols) {
      return err(
        `Row ${i} has ${matrix[i].length} column(s) but expected ${cols} (matching row 0)`,
      )
    }
  }
  return ok(undefined)
}

/** Returns the total number of variables (columns) across all sub-problem blocks. */
export function totalColumns(subproblems: { c: number[] }[]): number {
  return subproblems.reduce((sum, sp) => sum + sp.c.length, 0)
}

/**
 * Validates that the coupling matrix column count matches the total number
 * of variables across all sub-problem blocks.
 */
export function validateCouplingDimensions(
  coupling: { A: number[][] },
  subproblems: { c: number[] }[],
): Result<void> {
  if (coupling.A.length === 0) return ok(undefined)
  const couplingCols = coupling.A[0].length
  const total = totalColumns(subproblems)
  if (couplingCols !== total) {
    return err(
      `Coupling matrix has ${couplingCols} column(s) but sub-problems have ` +
        `${total} variable(s) in total — they must match`,
    )
  }
  return ok(undefined)
}

/** Creates a zero-filled matrix of the given dimensions. */
export function createEmptyMatrix(rows: number, cols: number): number[][] {
  return Array.from({ length: rows }, () => Array<number>(cols).fill(0))
}
