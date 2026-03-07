# Contract: Solution Export JSON Schema

**Date**: 2026-03-07

Defines the structure of the `.json` file produced when the user clicks "Export Solution"
in the Interactive Solver, as specified in `interactive-solver.feature`.

---

## File Naming

```
dw-solution-<YYYY-MM-DD>-<problemName|"unnamed">.json
```

Example: `dw-solution-2026-03-07-cutting-stock.json`

---

## JSON Schema

```json
{
  "$schema": "https://dantzig-wolfe.example/schemas/solution-export/v1",
  "schemaVersion": "1.0.0",
  "exportedAt": "2026-03-07T14:32:00.000Z",

  "problem": {
    "name": "Cutting Stock (2-width)",
    "objectiveDirection": "min",
    "couplingConstraints": {
      "numConstraints": 2,
      "numVariables": 4,
      "A": [[1, 0, 1, 0], [0, 1, 0, 1]],
      "b": [10, 8],
      "senses": ["leq", "leq"]
    },
    "subproblems": [
      {
        "index": 1,
        "label": "Block 1",
        "numVariables": 2,
        "numConstraints": 1,
        "A": [[2, 1]],
        "b": [4],
        "senses": ["leq"],
        "c": [3, 2],
        "bounds": [{"lower": 0, "upper": null}, {"lower": 0, "upper": null}]
      }
    ]
  },

  "result": {
    "status": "optimal",
    "objectiveValue": 12.5,
    "solveTimeMs": 847,
    "primalSolution": {
      "variableValues": [[2.5, 1.0], [0.0, 3.0]],
      "couplingSlacks": [0.0, 1.5]
    },
    "dualSolution": {
      "couplingDuals": [1.5, 0.75],
      "subproblemDuals": [[-0.0, -0.0], [-0.0, -0.0]]
    }
  },

  "iterations": [
    {
      "iterationNumber": 1,
      "masterObjectiveValue": 18.0,
      "dualVariables": [1.0, 0.5],
      "enteringSubproblemIndex": 1,
      "enteringColumnReducedCost": -2.5,
      "subproblemObjectiveValues": [-2.5, -0.8]
    }
  ]
}
```

---

## Field Reference

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `$schema` | string | yes | Fixed URI (for tooling, not fetched) |
| `schemaVersion` | string | yes | SemVer; bump MAJOR on breaking changes |
| `exportedAt` | string | yes | ISO 8601 UTC timestamp |
| `problem` | object | yes | Full problem input, reconstructible |
| `problem.name` | string | no | From `metadata.name`, may be absent |
| `problem.objectiveDirection` | `"min"\|"max"` | yes | |
| `problem.couplingConstraints` | object | yes | Includes `A`, `b`, `senses` |
| `problem.subproblems` | array | yes | One entry per block |
| `result.status` | string | yes | One of the `SolverStatus` values |
| `result.objectiveValue` | number | when optimal | |
| `result.primalSolution` | object | when optimal | `variableValues` indexed `[block][var]` |
| `result.dualSolution` | object | when optimal | |
| `iterations` | array | yes | May be empty if cancelled before iteration 1 |
| `bounds[].upper` | number\|null | yes | `null` encodes `+Infinity` |

---

## Versioning

- `schemaVersion` follows SemVer.
- **MINOR** bump: new optional fields added.
- **MAJOR** bump: existing fields renamed, removed, or type-changed.
- The website MUST be able to re-import its own exports for at least one MAJOR version back
  (i.e., a v2 export can be read by v1 reader, or the UI shows a clear version-mismatch
  message). *(Future requirement; not in scope for initial implementation.)*
