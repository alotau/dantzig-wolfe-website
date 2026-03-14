# Implementation Plan: Initial Feature Files

**Branch**: `002-initial-feature-files` | **Date**: 2026-03-07 | **Spec**: [features/](../../features/)  
**Input**: Six Gherkin feature files in `/features/` (authoritative spec per Principle I)

## Summary

Establish a canonical per-feature specification scaffold under `specs/` and implement the
full initial set of website features described in the Gherkin specification files. The site
teaches and demonstrates Dantzig-Wolfe Decomposition through a history section, a structured
technical lesson, worked examples from literature, and an interactive solver. The solver runs
the `dantzig-wolfe-python` package entirely in the user's browser via Pyodide (Python on
WebAssembly in a Web Worker). No server-side computation. The site uses Astro (island
architecture) with Svelte interactive islands, Tailwind CSS, and KaTeX for mathematical
notation.

## Technical Context

**Language/Version**: TypeScript 5 / Node 20  
**Primary Dependencies**: Astro 5, Svelte 5, Tailwind CSS v4, Pyodide 0.29, KaTeX, Playwright, Cucumber.js 11, Vitest 3  
**Storage**: Static files (Astro SSG) + URL-encoded problem state for sharing; no server-side storage  
**Testing**: Cucumber.js + Playwright (acceptance), Vitest (unit)  
**Target Platform**: Browser (evergreen) + Vercel static hosting  
**Project Type**: Static educational web application  
**Performance Goals**: LCP < 2.5 s on fast 3G; solver initialises within 10 s on a modern laptop  
**Constraints**: All computation must run client-side (no server); shareable URLs must round-trip losslessly; WCAG 2.1 AA colour contrast  
**Scale/Scope**: Single-user interactive tool; no auth; no database

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- Purely additive front-end feature — no breaking changes to existing routes.
- Solver communication isolated behind a Web Worker; no server-side attack surface introduced.
- All user-supplied input validated with Zod before entering the solver.

Result: Approved.

## Project Structure

### Documentation (this feature)

```text
specs/
└── 002-initial-feature-files/
    ├── plan.md          # Implementation plan (this file)
    ├── research.md      # Phase 0: background research
    ├── data-model.md    # Phase 1: entities and relationships
    ├── quickstart.md    # Phase 1: onboarding guide
    ├── contracts/       # Phase 1: API/message-protocol contracts
    └── tasks.md         # Phase 2: implementation task list
```

### Source Code (implemented layout)

```text
src/
├── components/
│   ├── content/         # MDX prose components (Callout, Citation, MathBlock, TermLink)
│   ├── examples/        # Example card + filter
│   ├── layout/          # BaseLayout, NavBar, Footer, GlossaryPanel
│   └── solver/          # SolverPanel, SolutionPanel, IterationLog, ProblemEditor
├── content/             # Astro content collections
│   ├── examples/        # Worked-example MDX files
│   ├── glossary/        # Term definitions
│   ├── history/         # History section MDX
│   └── lessons/         # Technical lesson MDX
├── lib/
│   ├── math/            # Matrix utilities
│   ├── sharing/         # URL codec for problem sharing
│   └── solver/          # Worker client, problem schema (Zod), type exports
├── pages/               # Astro page routes (index, solver, history, examples, lesson)
├── styles/              # global.css (Tailwind v4 + brand tokens)
└── workers/
    └── solver.worker.ts # Pyodide Web Worker

tests/
├── acceptance/          # Cucumber + Playwright end-to-end tests
├── perf/                # LCP timing
└── unit/                # Vitest unit tests
```

**Structure Decision**: Island architecture — static shell rendered at build time; Svelte
islands (`client:only="svelte"`) for the interactive solver and glossary panel.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| None      | N/A        | Feature is purely additive.          |
