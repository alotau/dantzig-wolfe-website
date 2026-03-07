# Implementation Plan: Dantzig-Wolfe Decomposition Website

**Branch**: `002-initial-feature-files` | **Date**: 2026-03-07 | **Spec**: [features/](../../features/)  
**Input**: Six Gherkin feature files in `/features/` (authoritative spec per Principle I)

## Summary

Build a static, client-side educational website that teaches Dantzig-Wolfe Decomposition
through a history section, a structured technical lesson, worked examples from literature,
and an interactive solver. The solver runs the `dantzig-wolfe-python` package entirely in
the user's browser via Pyodide (Python on WebAssembly in a Web Worker). No server-side
computation. The site uses Astro (island architecture) with Svelte interactive islands,
Tailwind CSS, and KaTeX for mathematical notation.

## Technical Context

**Language/Version**: TypeScript 5.x (site); Python 3.12 (via Pyodide 0.29.x in-browser)  
**Primary Dependencies**: Astro 5.x, Svelte 5.x, Tailwind CSS 4.x, Pyodide 0.29.x, KaTeX, Chart.js, Cucumber.js, Playwright  
**Storage**: None (server-side); browser `sessionStorage` for solver state; URL query params for problem sharing  
**Testing**: Vitest (unit), Cucumber.js + Playwright (BDD acceptance)  
**Target Platform**: Modern browsers (WebAssembly support required for solver); static content degrades gracefully without JS  
**Project Type**: Static web application (Astro SSG) + client-side WASM runtime  
**Performance Goals**: Solver worker ready ≤5s (cached Pyodide), static pages ≤1s LCP, iteration log updates ≤2s during solve  
**Constraints**: Zero server-side computation; offline-capable static content; WCAG 2.1 AA accessibility; mobile-responsive  
**Scale/Scope**: ~6 pages, ~30 components, 6 feature files, ~50 Gherkin scenarios

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Principle I — Specification-First**: Six Gherkin `.feature` files exist in `/features/` covering all site areas. ✅
- [x] **Principle II — Client-Side Computation**: Pyodide Web Worker architecture confirmed; solver runs entirely in browser; no compute server. ✅
- [x] **Principle III — Test-First via BDD**: Cucumber.js + Playwright selected; failing step definitions must be committed before implementation PRs. ✅
- [x] **Principle IV — Branch-Protection**: Work is on `002-initial-feature-files`; `main` is up to date. ✅
- [x] **Principle V — Security & Quality Gates**: GitHub Actions pipeline will run npm audit → ESLint → Vitest → Cucumber+Playwright in sequence. ✅
- [x] **Principle VI — Pedagogical Clarity**: Content MDX files subject to domain-review gate; KaTeX for all math notation. ✅

**Pyodide bundle strategy** (gate from constitution v1.1.0): Pyodide loaded from jsDelivr CDN in a dedicated Web Worker; `dantzig-wolfe-python` installed via `micropip` from a pinned GitHub release wheel URL; lockfile (`pyodide-lock.json` extension) committed to repo for reproducibility. See `research.md` §2.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this feature. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```text
src/
├── pages/
│   ├── index.astro              # Home page
│   ├── history.astro            # Algorithm history
│   ├── lesson/
│   │   └── index.astro          # Technical lesson (single-page, section anchors)
│   ├── examples/
│   │   ├── index.astro          # Examples index with filter
│   │   └── [slug].astro         # Individual example detail page
│   ├── solver.astro             # Interactive solver page
│   └── glossary.astro           # Glossary page
├── components/
│   ├── layout/
│   │   ├── NavBar.astro
│   │   ├── Footer.astro
│   │   └── GlossaryPanel.svelte  # Accessible slide-in panel (island)
│   ├── solver/
│   │   ├── SolverWorkspace.svelte   # Root solver island
│   │   ├── ProblemInput.svelte      # Coupling constraints + sub-problem inputs
│   │   ├── SubProblemBlock.svelte   # Single sub-problem block editor
│   │   ├── SolverControls.svelte    # Solve / Cancel / Clear / Export / Share
│   │   ├── IterationLog.svelte      # Live scrolling log
│   │   ├── SolutionPanel.svelte     # Final result display
│   │   └── ConvergenceChart.svelte  # Chart.js chart island
│   ├── content/
│   │   ├── MathBlock.astro          # KaTeX display math wrapper
│   │   ├── InlineMath.astro         # KaTeX inline math wrapper
│   │   ├── Citation.astro           # Formatted literature citation
│   │   ├── Callout.astro            # Info / warning / definition callout box
│   │   └── TermLink.astro           # Inline glossary link
│   └── examples/
│       ├── ExampleCard.astro        # Summary card for examples index
│       └── ExampleFilter.svelte     # Client-side filter island
├── content/                         # Astro content collections
│   ├── config.ts                    # Content collection schemas
│   ├── history/
│   │   └── *.mdx                    # History section MDX articles
│   ├── lessons/
│   │   └── *.mdx                    # Lesson section MDX articles
│   ├── examples/
│   │   └── *.mdx                    # Worked example MDX files
│   └── glossary/
│       └── *.mdx                    # Glossary entry MDX files
├── workers/
│   └── solver.worker.ts             # Pyodide Web Worker (loads solver package)
├── lib/
│   ├── solver/
│   │   ├── worker-client.ts         # Typed wrapper: postMessage ↔ Promise
│   │   └── problem-schema.ts        # Zod schemas for ProblemInstance validation
│   ├── math/
│   │   └── matrix-utils.ts          # Dimension validation, matrix helpers
│   └── sharing/
│       └── url-codec.ts             # Encode/decode problem to/from URL params
└── styles/
    └── global.css                   # Tailwind base + CSS custom properties

tests/
├── unit/                            # Vitest
│   ├── lib/
│   │   ├── problem-schema.test.ts
│   │   ├── matrix-utils.test.ts
│   │   └── url-codec.test.ts
│   └── workers/
│       └── solver-messages.test.ts
└── acceptance/                      # Cucumber.js + Playwright
    ├── step-definitions/
    │   ├── navigation.steps.ts
    │   ├── solver-input.steps.ts
    │   ├── solver-run.steps.ts
    │   ├── solver-output.steps.ts
    │   ├── lesson.steps.ts
    │   ├── examples.steps.ts
    │   ├── history.steps.ts
    │   └── glossary.steps.ts
    └── support/
        ├── world.ts                 # Cucumber World with Playwright browser
        └── hooks.ts                 # Before/After hooks: launch/close browser

features/                            # Gherkin feature files (authoritative spec)
├── history.feature
├── technical-lesson.feature
├── literature-examples.feature
├── interactive-solver.feature
├── solver-engine.feature
└── site-navigation.feature

public/
└── pyodide-lock.json                # Pinned Pyodide + dantzig-wolfe-python lockfile
```

**Structure Decision**: Single static web application (Astro SSG). No backend. All source under `src/`. Tests under `tests/`. Feature files under `features/` (already established). The Pyodide Web Worker (`src/workers/solver.worker.ts`) runs off the main thread; Svelte islands handle reactive UI. Content is authored in MDX under `src/content/` using Astro content collections.

## Complexity Tracking

> No Constitution Check violations. All principles satisfied without exception.
