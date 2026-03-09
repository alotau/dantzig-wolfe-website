import { z } from 'zod'

// ---------------------------------------------------------------------------
// Primitive schemas
// ---------------------------------------------------------------------------

export const ConstraintSenseSchema = z.enum(['leq', 'geq', 'eq'])

export const VariableBoundsSchema = z
  .object({
    lower: z.number().finite('Bound must be a finite number'),
    // null encodes +Infinity (cannot serialise Infinity in JSON)
    upper: z.number().finite('Bound must be a finite number').nullable(),
  })
  .refine(
    (data) => {
      const upper = data.upper ?? Infinity
      return data.lower <= upper
    },
    { message: 'lower bound must be ≤ upper bound' },
  )

// ---------------------------------------------------------------------------
// Matrix / vector helpers
// ---------------------------------------------------------------------------

const FiniteNumberSchema = z.number().finite('All matrix and vector entries must be finite numbers')

const VectorSchema = z.array(FiniteNumberSchema)

const MatrixRowSchema = z.array(FiniteNumberSchema)

const MatrixSchema = z.array(MatrixRowSchema)

// ---------------------------------------------------------------------------
// Sub-problem block
// ---------------------------------------------------------------------------

export const SubProblemBlockSchema = z
  .object({
    index: z.number().int().positive('Block index must be a positive integer'),
    label: z.string().optional(),
    /** Constraint matrix for this block: m_k × n_k */
    A: MatrixSchema.max(200, 'Maximum 200 constraints per sub-problem block'),
    /** RHS vector: length m_k */
    b: VectorSchema,
    /** One sense per constraint row */
    constraintSenses: z.array(ConstraintSenseSchema),
    /** Objective cost vector: length n_k */
    c: VectorSchema.max(500, 'Maximum 500 variables per sub-problem block'),
    /** Variable bounds: one per variable */
    bounds: z.array(VariableBoundsSchema).max(500, 'Maximum 500 variables per sub-problem block'),
    /** Optional display names for variables */
    variableLabels: z.array(z.string()).max(500).optional(),
  })
  .refine(
    (data) =>
      data.A.length === 0 ||
      (data.b.length === data.A.length && data.constraintSenses.length === data.A.length),
    {
      message: 'A, b, and constraintSenses must all have the same number of rows',
    },
  )
  .refine(
    (data) => {
      if (data.A.length === 0) return true
      const cols = data.A[0].length
      return (
        data.A.every((row) => row.length === cols) &&
        data.c.length === cols &&
        data.bounds.length === cols &&
        (data.variableLabels === undefined || data.variableLabels.length === cols)
      )
    },
    {
      message: 'A column count, c length, bounds length, and variableLabels length must all match',
    },
  )

// ---------------------------------------------------------------------------
// Coupling constraints
// ---------------------------------------------------------------------------

export const CouplingConstraintsSchema = z
  .object({
    /** Coupling matrix A0: m0 × n_total */
    A: MatrixSchema,
    /** RHS vector: length m0 */
    b: VectorSchema,
    /** Sense for each coupling constraint */
    senses: z.array(ConstraintSenseSchema),
    /** Optional display names for coupling constraints */
    constraintLabels: z.array(z.string()).optional(),
  })
  .refine(
    (data) =>
      data.A.length === 0 ||
      (data.b.length === data.A.length && data.senses.length === data.A.length),
    {
      message: 'Coupling A, b, and senses must all have the same number of rows',
    },
  )

// ---------------------------------------------------------------------------
// Top-level problem instance
// ---------------------------------------------------------------------------

export const ProblemInstanceSchema = z
  .object({
    objectiveDirection: z.enum(['min', 'max']),
    coupling: CouplingConstraintsSchema,
    subproblems: z
      .array(SubProblemBlockSchema)
      .min(1, 'At least one sub-problem block is required')
      .max(50, 'Maximum 50 sub-problem blocks'),
    metadata: z
      .object({
        name: z.string().optional(),
        description: z.string().optional(),
        sourceExample: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      const totalVars = data.subproblems.reduce((sum, sp) => sum + sp.c.length, 0)
      return totalVars <= 500
    },
    { message: 'Total variables across all sub-problem blocks must not exceed 500' },
  )
  .refine(
    (data) => {
      if (data.coupling.A.length === 0 || data.subproblems.length === 0) return true
      const couplingCols = data.coupling.A[0].length
      const totalVars = data.subproblems.reduce((sum, sp) => sum + sp.c.length, 0)
      return couplingCols === totalVars
    },
    {
      message:
        'Coupling matrix column count must equal total variable count across all sub-problem blocks',
    },
  )

export type ParsedProblemInstance = z.infer<typeof ProblemInstanceSchema>
export type ParsedSubProblemBlock = z.infer<typeof SubProblemBlockSchema>
export type ParsedCouplingConstraints = z.infer<typeof CouplingConstraintsSchema>
export type ParsedVariableBounds = z.infer<typeof VariableBoundsSchema>
export type ConstraintSense = z.infer<typeof ConstraintSenseSchema>
