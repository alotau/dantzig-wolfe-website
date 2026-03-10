import { describe, it, expect } from 'vitest'
import { encodeProblem, decodeProblem, buildShareURL } from '../../../src/lib/sharing/url-codec.js'
import type { ParsedProblemInstance } from '../../../src/lib/solver/problem-schema.js'

// ---------------------------------------------------------------------------
// Fixture — minimal valid problem instance
// ---------------------------------------------------------------------------

const MINIMAL_PROBLEM: ParsedProblemInstance = {
  objectiveDirection: 'min',
  coupling: {
    // 2 columns = 1 var per subproblem × 2 subproblems
    A: [[1, 1]],
    b: [4],
    senses: ['leq'],
  },
  subproblems: [
    {
      index: 1,
      A: [[1]],
      b: [3],
      constraintSenses: ['leq'],
      c: [2],
      bounds: [{ lower: 0, upper: null }],
    },
    {
      index: 2,
      A: [[1]],
      b: [3],
      constraintSenses: ['leq'],
      c: [2],
      bounds: [{ lower: 0, upper: null }],
    },
  ],
}

const TWO_BLOCK_PROBLEM: ParsedProblemInstance = {
  objectiveDirection: 'max',
  coupling: {
    A: [
      [1, 0, 1, 0],
      [0, 1, 0, 1],
    ],
    b: [6, 6],
    senses: ['leq', 'leq'],
    constraintLabels: ['Resource A', 'Resource B'],
  },
  subproblems: [
    {
      index: 1,
      label: 'Plant A',
      A: [
        [1, 0],
        [0, 1],
      ],
      b: [5, 5],
      constraintSenses: ['leq', 'leq'],
      c: [1, 1],
      bounds: [
        { lower: 0, upper: null },
        { lower: 0, upper: null },
      ],
      variableLabels: ['Product 1', 'Product 2'],
    },
    {
      index: 2,
      label: 'Plant B',
      A: [
        [1, 0],
        [0, 1],
      ],
      b: [5, 5],
      constraintSenses: ['leq', 'leq'],
      c: [1, 1],
      bounds: [
        { lower: 0, upper: null },
        { lower: 0, upper: null },
      ],
    },
  ],
  metadata: { name: 'Two-block LP', description: 'Test problem' },
}

// ---------------------------------------------------------------------------
// encodeProblem / decodeProblem round-trips
// ---------------------------------------------------------------------------

describe('encodeProblem', () => {
  it('returns a non-empty string for a minimal problem', () => {
    const encoded = encodeProblem(MINIMAL_PROBLEM)
    expect(typeof encoded).toBe('string')
    expect(encoded!.length).toBeGreaterThan(0)
  })

  it('produces only URL-safe Base64 characters (no +, /, =)', () => {
    const encoded = encodeProblem(MINIMAL_PROBLEM)
    expect(encoded).not.toBeNull()
    expect(encoded).toMatch(/^[A-Za-z0-9\-_]+$/)
  })

  it('returns null for an oversized problem (>64 KB uncompressed)', () => {
    // Build a huge name to exceed the 64 KB limit after JSON serialisation
    const bigProblem: ParsedProblemInstance = {
      ...MINIMAL_PROBLEM,
      metadata: { name: 'x'.repeat(70_000) },
    }
    const encoded = encodeProblem(bigProblem)
    expect(encoded).toBeNull()
  })

  it('strips the description field from metadata to save space', () => {
    const withDesc: ParsedProblemInstance = {
      ...MINIMAL_PROBLEM,
      metadata: { name: 'Test', description: 'Long description that should be stripped' },
    }
    const encoded = encodeProblem(withDesc)!
    const decoded = decodeProblem(encoded)!
    expect(decoded.metadata?.description).toBeUndefined()
    // name should be preserved
    expect(decoded.metadata?.name).toBe('Test')
  })
})

describe('decodeProblem', () => {
  it('round-trips the minimal problem exactly', () => {
    const encoded = encodeProblem(MINIMAL_PROBLEM)!
    const decoded = decodeProblem(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.objectiveDirection).toBe(MINIMAL_PROBLEM.objectiveDirection)
    expect(decoded!.coupling.b).toEqual(MINIMAL_PROBLEM.coupling.b)
    expect(decoded!.subproblems.length).toBe(2)
  })

  it('round-trips the two-block problem', () => {
    const encoded = encodeProblem(TWO_BLOCK_PROBLEM)!
    const decoded = decodeProblem(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.objectiveDirection).toBe('max')
    expect(decoded!.coupling.A).toEqual(TWO_BLOCK_PROBLEM.coupling.A)
    expect(decoded!.subproblems[0]?.label).toBe('Plant A')
  })

  it('returns null for malformed base64', () => {
    const result = decodeProblem('!!!not-valid-base64!!!')
    expect(result).toBeNull()
  })

  it('returns null for valid base64 that is not a valid problem', () => {
    // Encode an arbitrary string that is not a ProblemInstance
    const garbage = btoa('{"hello":"world"}')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '')
    const result = decodeProblem(garbage)
    expect(result).toBeNull()
  })

  it('truncates metadata.name to 100 characters if too long', () => {
    const longName = 'n'.repeat(200)
    const problem: ParsedProblemInstance = {
      ...MINIMAL_PROBLEM,
      metadata: { name: longName },
    }
    const encoded = encodeProblem(problem)!
    const decoded = decodeProblem(encoded)!
    expect(decoded.metadata?.name?.length).toBeLessThanOrEqual(100)
  })
})

describe('buildShareURL', () => {
  it('returns a URL containing the ?p= parameter', () => {
    const url = buildShareURL(MINIMAL_PROBLEM)
    expect(url).not.toBeNull()
    expect(url!.searchParams.has('p')).toBe(true)
  })

  it('the ?p= value round-trips back to the original problem', () => {
    const url = buildShareURL(MINIMAL_PROBLEM)!
    const encoded = url.searchParams.get('p')!
    const decoded = decodeProblem(encoded)
    expect(decoded).not.toBeNull()
    expect(decoded!.objectiveDirection).toBe(MINIMAL_PROBLEM.objectiveDirection)
  })

  it('returns null for an oversized problem', () => {
    const bigProblem: ParsedProblemInstance = {
      ...MINIMAL_PROBLEM,
      metadata: { name: 'x'.repeat(70_000) },
    }
    expect(buildShareURL(bigProblem)).toBeNull()
  })
})
