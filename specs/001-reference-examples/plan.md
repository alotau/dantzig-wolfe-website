# Implementation Plan: Reference LP Examples in Solver

**Branch**: `001-reference-examples` | **Date**: 2026-03-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-reference-examples/spec.md`

## Summary

Add five canonical Dantzig-Wolfe reference problems (Trick, Lasdon, Mitchell, Bertsimas, Dantzig) to the solver page's example dropdown. All five JSON problem files and the dropdown wiring already exist. The remaining work is entirely in the BDD test layer: updating a step-definition name map, adding a missing Dantzig correctness scenario, and adding acceptance scenarios for source-attribution display.

## Technical Context

**Language/Version**: TypeScript 5 (Astro + Svelte 5); Node 20  
**Primary Dependencies**: Playwright (acceptance tests), Cucumber.js 11 (BDD runner), Vitest 3 (unit tests)  
**Storage**: Static JSON files in `public/examples/` — no database  
**Testing**: Vitest (unit), Cucumber.js + Playwright (acceptance)  
**Target Platform**: Browser (client-side Pyodide/WASM); Vercel static hosting  
**Project Type**: Static web application  
**Performance Goals**: Selecting and loading a reference example ≤ time of existing examples (SC-003)  
**Constraints**: Client-side only (Principle II); all new tests must be red before implementation (Principle III)  
**Scale/Scope**: 5 new dropdown entries; 8 total after feature

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Gherkin `.feature` files exist and are accepted | ✅ PASS | `interactive-solver.feature` (dropdown availability scenario), `solver-engine-correctness.feature` (correctness outline) |
| Dedicated branch `001-reference-examples` exists | ✅ PASS | Branch confirmed |
| Failing tests committed before implementation | ⚠️ REQUIRED | Step definitions must be written (red) before nameMap update (green) |
| `main` merged into working branch | ⚠️ REQUIRED | Merge before first commit per Principle IV |
| Client-side computation strategy confirmed | ✅ PASS | JSON files served as static assets; no server computation added |
| Security scan baseline | ✅ PASS | No new npm dependencies introduced |

**Violations requiring justification**: None.

**Post-design re-check**: After Phase 1, confirm the attribution display approach (using `metadata.description` as the `data-example-description` text) matches what the acceptance scenario verifies.

## Project Structure

### Documentation (this feature)

```text
specs/001-reference-examples/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── example-json-schema.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
features/
├── interactive-solver.feature     # Dropdown availability scenarios (exists, no changes)
└── solver-engine-correctness.feature  # Correctness outline — ADD Dantzig row

tests/acceptance/step-definitions/
├── solver-input.steps.ts          # 'I open the examples dropdown' + 'I see {string} as an available option' (already implemented)
└── solver-engine.steps.ts         # 'I load the {string} pre-built problem' — ADD 4 nameMap entries

public/examples/
├── trick-2block.json              # Already exists ✅
├── lasdon-2block.json             # Already exists ✅
├── mitchell-1block.json           # Already exists ✅
├── bertsimas-1block.json          # Already exists ✅
└── dantzig-3block.json            # Already exists ✅

src/components/solver/
└── SolverWorkspace.svelte         # EXAMPLES array already has all 5 entries ✅
```

**Structure Decision**: Single project (Astro monorepo). The feature touches only the test layer; all static assets and UI wiring are already in place.

## Complexity Tracking

*No constitution violations.*
