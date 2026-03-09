import { describe, it, expect } from 'vitest'
import {
  ProblemInstanceSchema,
  SubProblemBlockSchema,
  CouplingConstraintsSchema,
  VariableBoundsSchema,
} from '../../../src/lib/solver/problem-schema.js'

// ---------------------------------------------------------------------------
// VariableBoundsSchema
// ---------------------------------------------------------------------------
describe('VariableBoundsSchema', () => {
  it('accepts valid finite bounds', () => {
    const result = VariableBoundsSchema.safeParse({ lower: 0, upper: 10 })
    expect(result.success).toBe(true)
  })

  it('accepts null upper bound (represents +Infinity)', () => {
    const result = VariableBoundsSchema.safeParse({ lower: 0, upper: null })
    expect(result.success).toBe(true)
  })

  it('rejects lower > upper', () => {
    const result = VariableBoundsSchema.safeParse({ lower: 5, upper: 2 })
    expect(result.success).toBe(false)
  })

  it('rejects Infinity as lower', () => {
    const result = VariableBoundsSchema.safeParse({ lower: Infinity, upper: null })
    expect(result.success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// SubProblemBlockSchema
// ---------------------------------------------------------------------------
describe('SubProblemBlockSchema', () => {
  const minimal: unknown = {
    index: 1,
    A: [[1, 0], [0, 1]],
    b: [4, 4],
    constraintSenses: ['leq', 'leq'],
    c: [1, 1],
    bounds: [{ lower: 0, upper: null }, { lower: 0, upper: null }],
  }

  it('accepts a valid 2×2 block', () => {
    expect(SubProblemBlockSchema.safeParse(minimal).success).toBe(true)
  })

  it('rejects when A rows ≠ b length', () => {
    const bad = { ...(minimal as Record<string, unknown>), b: [4] }
    expect(SubProblemBlockSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects when A columns ≠ c length', () => {
    const bad = { ...(minimal as Record<string, unknown>), c: [1, 1, 1] }
    expect(SubProblemBlockSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects a block with 201 constraints (security limit)', () => {
    const bigA = Array.from({ length: 201 }, () => [1])
    const big = {
      index: 1,
      A: bigA,
      b: Array(201).fill(1),
      constraintSenses: Array(201).fill('leq'),
      c: [1],
      bounds: [{ lower: 0, upper: null }],
    }
    const result = SubProblemBlockSchema.safeParse(big)
    expect(result.success).toBe(false)
  })

  it('rejects a block with 501 variables (security limit)', () => {
    const bigRow = Array(501).fill(1)
    const big = {
      index: 1,
      A: [bigRow],
      b: [1],
      constraintSenses: ['leq'],
      c: Array(501).fill(1),
      bounds: Array(501).fill({ lower: 0, upper: null }),
    }
    const result = SubProblemBlockSchema.safeParse(big)
    expect(result.success).toBe(false)
  })

  it('accepts NaN detection: rejects NaN in A', () => {
    const bad = { ...(minimal as Record<string, unknown>), A: [[NaN, 0], [0, 1]] }
    expect(SubProblemBlockSchema.safeParse(bad).success).toBe(false)
  })

  it('rejects when constraintSenses length ≠ A rows', () => {
    const bad = {
      ...(minimal as Record<string, unknown>),
      constraintSenses: ['leq'],
    }
    expect(SubProblemBlockSchema.safeParse(bad).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// CouplingConstraintsSchema
// ---------------------------------------------------------------------------
describe('CouplingConstraintsSchema', () => {
  it('accepts valid coupling with 2 rows and 4 columns', () => {
    const coupling = {
      A: [[1, 0, 1, 0], [0, 1, 0, 1]],
      b: [6, 6],
      senses: ['leq', 'leq'],
    }
    expect(CouplingConstraintsSchema.safeParse(coupling).success).toBe(true)
  })

  it('rejects when b length ≠ A rows', () => {
    const bad = {
      A: [[1, 0]],
      b: [1, 2],
      senses: ['leq'],
    }
    expect(CouplingConstraintsSchema.safeParse(bad).success).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// ProblemInstanceSchema — integration
// ---------------------------------------------------------------------------
describe('ProblemInstanceSchema', () => {
  const twoBlockLP = {
    objectiveDirection: 'max',
    coupling: {
      A: [[1, 0, 1, 0], [0, 1, 0, 1]],
      b: [6, 6],
      senses: ['leq', 'leq'],
    },
    subproblems: [
      {
        index: 1,
        A: [[1, 0], [0, 1]],
        b: [5, 5],
        constraintSenses: ['leq', 'leq'],
        c: [1, 1],
        bounds: [{ lower: 0, upper: null }, { lower: 0, upper: null }],
      },
      {
        index: 2,
        A: [[1, 0], [0, 1]],
        b: [5, 5],
        constraintSenses: ['leq', 'leq'],
        c: [1, 1],
        bounds: [{ lower: 0, upper: null }, { lower: 0, upper: null }],
      },
    ],
  }

  it('accepts the two-block LP example', () => {
    expect(ProblemInstanceSchema.safeParse(twoBlockLP).success).toBe(true)
  })

  it('rejects a coupling column mismatch (4 columns vs 2 variables)', () => {
    const bad = {
      ...twoBlockLP,
      subproblems: [twoBlockLP.subproblems[0]], // Only 2 variables but coupling has 4 cols
    }
    expect(ProblemInstanceSchema.safeParse(bad).success).toBe(false)
  })

  it('accepts a single sub-problem block (edge case)', () => {
    const single = {
      objectiveDirection: 'min',
      coupling: {
        A: [[1, 1]],
        b: [5],
        senses: ['leq'],
      },
      subproblems: [
        {
          index: 1,
          A: [[1, 0], [0, 1]],
          b: [3, 3],
          constraintSenses: ['leq', 'leq'],
          c: [2, 3],
          bounds: [{ lower: 0, upper: null }, { lower: 0, upper: null }],
        },
      ],
    }
    expect(ProblemInstanceSchema.safeParse(single).success).toBe(true)
  })

  it('rejects more than 50 sub-problems', () => {
    const block = twoBlockLP.subproblems[0]
    const tooMany = {
      objectiveDirection: 'max',
      coupling: {
        A: [Array(51).fill(1)],
        b: [1],
        senses: ['leq'],
      },
      subproblems: Array.from({ length: 51 }, (_, i) => ({ ...block, index: i + 1 })),
    }
    expect(ProblemInstanceSchema.safeParse(tooMany).success).toBe(false)
  })

  it('rejects total variables > 500', () => {
    // 5 blocks of 101 variables each = 505 total
    const bigBlock = {
      index: 1,
      A: [Array(101).fill(1)],
      b: [1],
      constraintSenses: ['leq'],
      c: Array(101).fill(1),
      bounds: Array(101).fill({ lower: 0, upper: null }),
    }
    const problem = {
      objectiveDirection: 'min' as const,
      coupling: {
        A: [Array(505).fill(1)],
        b: [1],
        senses: ['leq'],
      },
      subproblems: Array.from({ length: 5 }, (_, i) => ({ ...bigBlock, index: i + 1 })),
    }
    expect(ProblemInstanceSchema.safeParse(problem).success).toBe(false)
  })
})
