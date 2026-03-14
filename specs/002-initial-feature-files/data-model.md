# Data Model: Dantzig-Wolfe Decomposition Website

**Branch**: `002-initial-feature-files` | **Date**: 2026-03-07

All entities below are TypeScript types used in `src/lib/`. They are plain data objects
(no ORM, no database). Persistent state lives only in component memory and URL params.

---

## Solver Domain Entities

### `Matrix`

A 2D array of numbers representing a constraint or objective matrix.

```typescript
type Matrix = number[][];   // rows × cols; must be rectangular (validated)
type Vector = number[];     // 1D array (column vector or objective row)
```

---

### `VariableBounds`

Lower and upper bounds for a single decision variable. Default: `[0, Infinity]`.

```typescript
interface VariableBounds {
  lower: number;   // ≥ 0 by default; may be -Infinity for free variables
  upper: number;   // may be Infinity (unconstrained above)
}
```

---

### `SubProblemBlock`

One block in the block-angular LP structure. Corresponds to one sub-problem in the
Dantzig-Wolfe decomposition.

```typescript
interface SubProblemBlock {
  index: number;            // 1-based block index (k)
  label?: string;           // Optional display label (e.g. "Plant A")
  A: Matrix;                // Constraint matrix for this block (m_k × n_k)
  b: Vector;                // RHS vector (length m_k)
  constraintSenses: ConstraintSense[];  // One per row of A
  c: Vector;                // Objective cost vector (length n_k)
  bounds: VariableBounds[]; // One per variable (length n_k); default [0, ∞]
  variableLabels?: string[]; // Optional display names (length n_k)
}

type ConstraintSense = 'leq' | 'geq' | 'eq';  // ≤, ≥, =
```

**Validation rules**:
- `A.length === b.length === constraintSenses.length` (row dimension)
- `A[0].length === c.length === bounds.length` (column dimension)
- All values must be finite numbers (no NaN, no ±Infinity in matrix/vector entries)
- `bounds[i].lower <= bounds[i].upper` for all i

---

### `CouplingConstraints`

The linking constraints that connect the sub-problem blocks (the "A0 x = b0" part of the
block-angular LP).

```typescript
interface CouplingConstraints {
  A: Matrix;                        // Coupling matrix (m0 × n_total)
  b: Vector;                        // RHS vector (length m0)
  senses: ConstraintSense[];        // One per coupling constraint
  constraintLabels?: string[];      // Optional display names
}
```

**Validation rules**:
- `A.length === b.length === senses.length`
- `A[0].length === sum of n_k across all SubProblemBlocks`

---

### `ProblemInstance`

The complete decomposed LP as entered by the user. This is the top-level entity passed
to the solver worker and encoded into the shareable URL.

```typescript
interface ProblemInstance {
  objectiveDirection: 'min' | 'max';
  coupling: CouplingConstraints;
  subproblems: SubProblemBlock[];   // Ordered list; index matches SubProblemBlock.index
  metadata?: {
    name?: string;                  // Optional user-supplied name
    description?: string;           // Optional description
    sourceExample?: string;         // Slug of a pre-built example, if loaded from one
  };
}
```

**Invariants**:
- `subproblems.length >= 1`
- `subproblems.length <= 50` (UI limit; see solver-engine.feature security scenario)
- Total variables: `sum(n_k) <= 500` (per security scenario)
- `coupling.A[0].length === sum(s.c.length for s in subproblems)` (column alignment)

---

## Solver Execution Entities

### `SolverIteration`

One complete Dantzig-Wolfe column generation iteration.

```typescript
interface SolverIteration {
  iterationNumber: number;          // 1-based
  masterObjectiveValue: number;     // Current restricted master LP objective
  dualVariables: Vector;            // One dual per coupling constraint
  enteringSubproblemIndex: number;  // Which sub-problem generated the entering column
  enteringColumnReducedCost: number; // Reduced cost of the entering column (negative = improvement)
  subproblemObjectiveValues: number[]; // Pricing objective value for each sub-problem
}
```

---

### `SolverStatus`

```typescript
type SolverStatus = 'optimal' | 'infeasible' | 'unbounded' | 'cancelled' | 'error';
```

---

### `SolverResult`

The final output from the solver worker.

```typescript
interface SolverResult {
  status: SolverStatus;
  objectiveValue?: number;          // Present when status === 'optimal'
  primalSolution?: {
    variableValues: number[][];     // Indexed by [subproblemIndex][variableIndex]
    couplingSlacks: number[];       // Slack/surplus for each coupling constraint
  };
  dualSolution?: {
    couplingDuals: Vector;          // Shadow prices on coupling constraints
    subproblemDuals: number[][];    // Reduced costs per block at optimum
  };
  iterations: SolverIteration[];   // Full iteration history
  solveTimeMs: number;             // Wall-clock time (browser)
  errorMessage?: string;            // Present when status === 'error'
  unboundedSubproblemIndex?: number; // Present when status === 'unbounded'
  infeasibilityDiagnostic?: {      // Present when status === 'infeasible' (best-effort)
    blocks: Array<{
      index: number;               // Sub-problem index (1-based)
      label: string;               // Display label for the sub-problem
      boundViolations: string[];   // Variable names where lower > upper
    }>;
    coupling: Array<{
      index: number;               // Coupling constraint index (0-based)
      label: string;               // Display label for the constraint
      sense: ConstraintSense;      // 'leq' | 'geq' | 'eq'
      rhs: number;                 // Right-hand side value
      violated: boolean;           // True if constraint is provably infeasible at bounds
      minAchievable?: number;      // Smallest achievable LHS at variable bounds
      maxAchievable?: number;      // Largest achievable LHS at variable bounds
    }>;
  };
}
```

---

## Content Entities (Astro Content Collections)

These are the front-matter schemas for MDX content files, defined in `src/content/config.ts`
using Astro's `defineCollection` + Zod.

### `HistoryEntry`

```typescript
// src/content/history/*.mdx front matter
interface HistoryEntry {
  title: string;
  order: number;          // Section ordering
  summary: string;        // 1–2 sentence section summary (used in TOC)
}
```

### `LessonSection`

```typescript
// src/content/lessons/*.mdx front matter
interface LessonSection {
  title: string;
  order: number;
  prerequisites?: string[];   // List of glossary slugs required to understand this section
  summary: string;
}
```

### `WorkedExample`

```typescript
// src/content/examples/*.mdx front matter
interface WorkedExample {
  slug: string;             // URL slug (e.g. "cutting-stock")
  title: string;
  problemClass: ProblemClass;
  summary: string;          // 1–2 sentences for index card
  citation: Citation;
  prebuiltInstance?: string; // filename of JSON problem instance in public/examples/
}

type ProblemClass =
  | 'cutting-stock'
  | 'network-flow'
  | 'scheduling'
  | 'other';

interface Citation {
  authors: string[];        // e.g. ["Gilmore, P.C.", "Gomory, R.E."]
  title: string;
  journal?: string;
  year: number;
  doi?: string;
  url?: string;
}
```

### `GlossaryEntry`

```typescript
// src/content/glossary/*.mdx front matter
interface GlossaryEntry {
  slug: string;             // URL fragment and lookup key
  term: string;             // Display name (e.g. "Block-Angular Structure")
  shortDefinition: string;  // Plain-language definition (1 sentence, no LaTeX)
  relatedTerms?: string[];  // Slugs of related glossary entries
}
```

---

## State Entities (Client-Side Only)

These live in Svelte `$state` within the solver island. They are never persisted to a server.

### `SolverUIState`

```typescript
type SolverUIPhase =
  | 'idle'          // No problem entered yet
  | 'input'         // User is entering a problem
  | 'loading'       // Pyodide is initialising
  | 'solving'       // Solver running
  | 'done'          // Result available
  | 'error';        // Unrecoverable error

interface SolverUIState {
  phase: SolverUIPhase;
  problem: ProblemInstance | null;
  result: SolverResult | null;
  liveIterations: SolverIteration[];  // Accumulates during 'solving' phase
  validationErrors: ValidationError[];
  pyodideReady: boolean;
}

interface ValidationError {
  field: string;    // e.g. "subproblems[0].A" or "coupling.b"
  message: string;
}
```
