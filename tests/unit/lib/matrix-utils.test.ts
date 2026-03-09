import { describe, it, expect } from 'vitest'
import {
  validateRectangular,
  totalColumns,
  validateCouplingDimensions,
  createEmptyMatrix,
} from '../../../src/lib/math/matrix-utils.js'

// ---------------------------------------------------------------------------
// validateRectangular
// ---------------------------------------------------------------------------
describe('validateRectangular', () => {
  it('returns ok for an empty matrix', () => {
    const result = validateRectangular([])
    expect(result.ok).toBe(true)
  })

  it('returns ok for a 2×3 matrix', () => {
    const result = validateRectangular([[1, 2, 3], [4, 5, 6]])
    expect(result.ok).toBe(true)
  })

  it('returns ok for a 1×1 matrix', () => {
    const result = validateRectangular([[42]])
    expect(result.ok).toBe(true)
  })

  it('returns error when rows have different lengths', () => {
    const result = validateRectangular([[1, 2], [3]])
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/row 1/i)
    }
  })

  it('returns error for a jagged matrix at row 2', () => {
    const result = validateRectangular([[1, 2], [3, 4], [5]])
    expect(result.ok).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// totalColumns
// ---------------------------------------------------------------------------
describe('totalColumns', () => {
  it('returns 0 for no sub-problems', () => {
    expect(totalColumns([])).toBe(0)
  })

  it('returns column count for a single sub-problem', () => {
    expect(totalColumns([{ c: [1, 2, 3] }])).toBe(3)
  })

  it('returns summed columns across multiple sub-problems', () => {
    expect(totalColumns([{ c: [1, 2] }, { c: [1, 2, 3] }, { c: [1] }])).toBe(6)
  })
})

// ---------------------------------------------------------------------------
// validateCouplingDimensions
// ---------------------------------------------------------------------------
describe('validateCouplingDimensions', () => {
  it('returns ok when coupling columns match total sub-problem variables', () => {
    const coupling = { A: [[1, 0, 1, 0]] } // 4 columns
    const subproblems = [{ c: [1, 1] }, { c: [1, 1] }] // 4 total
    expect(validateCouplingDimensions(coupling, subproblems).ok).toBe(true)
  })

  it('returns ok for empty coupling matrix', () => {
    const coupling = { A: [] }
    const subproblems = [{ c: [1, 2, 3] }]
    expect(validateCouplingDimensions(coupling, subproblems).ok).toBe(true)
  })

  it('returns error when coupling columns do not match total variables', () => {
    const coupling = { A: [[1, 0, 0]] } // 3 columns
    const subproblems = [{ c: [1, 1] }, { c: [1, 1] }] // 4 total
    const result = validateCouplingDimensions(coupling, subproblems)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toMatch(/3/)
      expect(result.error).toMatch(/4/)
    }
  })
})

// ---------------------------------------------------------------------------
// createEmptyMatrix
// ---------------------------------------------------------------------------
describe('createEmptyMatrix', () => {
  it('creates a 2×3 zero matrix', () => {
    const m = createEmptyMatrix(2, 3)
    expect(m).toHaveLength(2)
    expect(m[0]).toEqual([0, 0, 0])
    expect(m[1]).toEqual([0, 0, 0])
  })

  it('each row is an independent array (no shared references)', () => {
    const m = createEmptyMatrix(2, 2)
    m[0][0] = 99
    expect(m[1][0]).toBe(0)
  })

  it('creates an empty matrix with 0 rows', () => {
    expect(createEmptyMatrix(0, 3)).toHaveLength(0)
  })
})
