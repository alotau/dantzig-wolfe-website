# Tasks: Dantzig-Wolfe Decomposition Website

**Branch**: `002-initial-feature-files` | **Date**: 2026-03-07  
**Input**: `specs/002-initial-feature-files/` plan.md, research.md, data-model.md, contracts/, and `features/` Gherkin files  
**Stack**: Astro 5.x · Svelte 5.x · Tailwind CSS 4.x · Pyodide 0.29.3 · KaTeX · Chart.js · Vitest 3.x · Cucumber.js 11.x · Playwright 1.50.x · Vercel

## Format: `- [ ] [ID] [P?] [Story?] Description with file path`

- **[P]**: Parallelisable — touches distinct files, no incomplete dependency
- **[Story]**: User story label (US1–US7); omitted in Setup, Foundation, and Polish phases

---

## User Story Map

| Label | Feature File(s) | Priority | Summary |
|-------|----------------|----------|---------|
| US1 | `site-navigation.feature` | P1 | Site navigation + Glossary panel |
| US2 | `history.feature` | P2 | Algorithm History static page |
| US3 | `technical-lesson.feature` | P2 | Technical Lesson with KaTeX |
| US4 | `literature-examples.feature` | P3 | Worked examples index + detail |
| US5 | `interactive-solver.feature` (Feature 1) | P1 | Solver: Problem Input |
| US6 | `interactive-solver.feature` (Feature 2) + `solver-engine.feature` | P1 | Solver: Engine + Running |
| US7 | `interactive-solver.feature` (Feature 3) | P2 | Solver: Solution Visualisation |

---

## Phase 1: Setup

**Purpose**: Scaffold the Astro project with all tooling configured and CI wired up.

- [X] T001 Initialise Astro 5.x project: create package.json with all runtime deps (astro, @astrojs/svelte, @astrojs/mdx, @astrojs/vercel, tailwindcss, @tailwindcss/vite, svelte, katex, remark-math, rehype-katex, chart.js, pako, zod) and dev deps (typescript, vitest, @vitest/ui, jsdom, @playwright/test, @cucumber/cucumber, @cucumber/html-formatter, eslint, prettier, eslint-plugin-svelte); create astro.config.mjs wiring all integrations and the Vercel static adapter
- [X] T002 [P] Configure strict TypeScript in tsconfig.json (strict: true, moduleResolution: bundler, target: ES2022, paths alias `@/*` → `src/*`)
- [X] T003 [P] Configure ESLint and Prettier: create eslint.config.js (TypeScript + Svelte rules) and .prettierrc (single quotes, no semi, 2-space indent, Svelte plugin)
- [X] T004 [P] Configure Vitest 3.x in vitest.config.ts (jsdom environment, include `tests/unit/**/*.test.ts`, coverage via v8)
- [X] T005 Configure Cucumber.js 11.x in cucumber.js at repo root: `features/**/*.feature` glob, step definitions at `tests/acceptance/step-definitions/**/*.ts`, support at `tests/acceptance/support/*.ts`, format html:reports/cucumber-report.html
- [X] T006 Create GitHub Actions CI workflow in .github/workflows/ci.yml with 4 sequential gates: (1) `npm audit --audit-level=moderate`, (2) `eslint . && prettier --check .`, (3) `vitest run`, (4) `astro build && npx wait-on http://localhost:4321 & astro preview --port 4321 & cucumber-js`; trigger on push and pull_request to main. **Also** create `playwright.config.ts` at repo root with a `webServer` entry pointing to `astro preview --port 4321` and `url: 'http://localhost:4321'` so Playwright manages the preview server automatically during local and CI runs — this ensures the built site is served before any Cucumber/Playwright acceptance test executes
- [X] T007 Initialise public/pyodide-lock.json as a pinned lockfile stub: record Pyodide 0.29.3 CDN indexURL (`https://cdn.jsdelivr.net/pyodide/v0.29.3/full/`) and the dantzig-wolfe-python wheel URL from `https://github.com/alotau/dantzig-wolfe-python` releases (pin to latest tagged release wheel)

**Checkpoint**: `npm run dev` starts the dev server; `npm run lint` and `npm test` pass on an empty project; CI workflow file is valid YAML.

---

## Phase 2: Foundation

**Purpose**: Core shared infrastructure that every user story depends on. **No US work can begin until this phase is complete.**

- [X] T008 Create base Astro layout in src/components/layout/BaseLayout.astro: HTML5 shell, `<meta charset>` / viewport / OG tags, import src/styles/global.css, `<slot name="head">` for page-specific meta, NavBar island slot, `<main>` slot, Footer slot; accept `title` and `description` props
- [X] T009 [P] Create shared content helper components in src/components/content/: MathBlock.astro (KaTeX display math wrapper, `{@html}` render of `katex.renderToString(formula, {displayMode:true})`), InlineMath.astro (inline KaTeX wrapper), Callout.astro (info/warning/definition variant with colour-coded border using design tokens), Citation.astro (author + title + year + optional DOI link), TermLink.astro (inline glossary trigger that fires a custom `open-glossary` event with `term` detail)
- [X] T010 [P] Create Footer component in src/components/layout/Footer.astro: site name, licence note, GitHub repo link, Glossary link (triggers GlossaryPanel via `open-glossary` event), responsive layout using Tailwind
- [X] T011 Create Astro content collection schemas in src/content/config.ts: define four collections — `history` (title, date, order, description), `lessons` (title, section, order, prerequisites), `examples` (title, problemClass enum, source, doi, slug), `glossary` (term, shortDef, relatedTerms array); export `CollectionEntry` helper types
- [X] T012 Create Cucumber.js Playwright test infrastructure: tests/acceptance/support/world.ts (CustomWorld class extending World, holds `browser: Browser` and `page: Page`; `baseURL` from env or `http://localhost:4321`) and tests/acceptance/support/hooks.ts (`BeforeAll` launches Chromium; `Before` opens fresh page; `After` captures screenshot on failure and closes page; `AfterAll` closes browser)

**Checkpoint**: `astro build` succeeds on a site with only a bare index.astro; Cucumber world compiles; content schemas are valid.

---

## Phase 3: US1 — Site Navigation + Glossary (P1) 🎯 MVP start

**Goal**: A working site skeleton — every page reachable, glossary accessible from anywhere, home page introducing the site.

**Independent Test**: Open the site; NavBar links navigate to all 5 sections; Glossary panel opens/closes from any page showing ≥10 terms; clicking a TermLink opens the panel at the correct term; keyboard-only navigation reaches all links.

- [X] T013 [US1] Implement NavBar.astro in src/components/layout/NavBar.astro: horizontal nav with links to Home, History, Lesson, Examples, Solver; active link highlighted via `Astro.url.pathname` comparison; Glossary button triggering `open-glossary` custom event; responsive collapse to hamburger on narrow viewports (Tailwind); skip-to-main landmark link for accessibility
- [X] T014 [US1] Implement GlossaryPanel.svelte in src/components/layout/GlossaryPanel.svelte: Svelte 5 `$state` island; listens for `open-glossary` window event; renders as a right-hand slide-in panel with focus-trap (trap focus on open, restore on close); alphabetical term list from `src/content/glossary/` (fetched via Astro glob and passed as prop); live-filter `<input>` (debounced); definition view when term is selected (plain language + optional KaTeX notation + related term links); close button + Escape key dismiss; `aria-dialog` role
- [X] T015 [P] [US1] Create home page at src/pages/index.astro using BaseLayout: site tagline, one-paragraph description of DW Decomposition, four CTA cards (History / Lesson / Examples / Solver) with icon and teaser text; fully readable without JS
- [X] T016 [P] [US1] Author glossary MDX entries in src/content/glossary/ — one .mdx file per term for all key DW terms: block-angular LP, coupling constraints, master problem, pricing sub-problem, column generation, reduced cost, convexity constraint, dual variables, extreme point, restricted master problem, Dantzig-Wolfe Decomposition (≥10 entries); each entry includes plain-language definition and optional KaTeX notation
- [X] T017 [US1] **⚡ RED-FIRST — commit before T013/T014/T015** Write failing Cucumber step definitions for site-navigation.feature and glossary Feature scenarios in tests/acceptance/step-definitions/navigation.steps.ts (steps for: navigating to each section, NavBar present on every page, Glossary opening from nav/footer, TermLink triggering Glossary, keyboard navigation, mobile viewport); confirm all steps fail in CI before opening implementation tasks

**Checkpoint**: All site-navigation.feature and glossary Feature scenarios pass or are pending with correct step skeletons.

---

## Phase 4: US2 — Algorithm History (P2)

**Goal**: A fully readable, cited history page covering the origins and context of DW Decomposition.

**Independent Test**: Navigate to `/history`; page shows ≥5 chronological sections with citations visible; every citation has an identifiable source; all technical term links open the Glossary panel; page is readable with JS disabled.

- [X] T018 [US2] Create history page at src/pages/history.astro using BaseLayout: queries `history` content collection ordered by `order` field; renders each MDX article using Astro's `<Content />` with Citation and TermLink components available in scope; page title "History of Dantzig-Wolfe Decomposition"
- [X] T019 [P] [US2] Author history MDX articles in src/content/history/: 01-origins.mdx (Dantzig & Wolfe 1960, Operations Research citation, motivation from large-scale LP intractability), 02-simplex-relationship.mdx (block-angular structure, exploitation of LP form), 03-industrial-applications.mdx (≥1 domain: transportation / energy / production planning with citation), 04-column-generation.mdx (pricing sub-problems as origin of modern column generation), 05-citations.mdx (full bibliography); all factual claims cited with author/title/year
- [X] T020 [US2] **⚡ RED-FIRST — commit before T018/T019** Write failing Cucumber step definitions for history.feature scenarios in tests/acceptance/step-definitions/history.steps.ts; confirm all steps fail in CI before opening implementation tasks
- [X] T021 [P] [US2] Write Vitest unit test for Citation.astro rendering in tests/unit/components/citation.test.ts (validates DOI link href, author display format)

**Checkpoint**: All history.feature scenarios pass or are pending; `/history` renders correctly with all MDX content.

---

## Phase 5: US3 — Technical Lesson (P2)

**Goal**: A structured, self-contained lesson with KaTeX math, a navigable TOC, and session-persistent position.

**Independent Test**: Navigate to `/lesson`; page shows prerequisites summary + ≥6 numbered sections; KaTeX renders all formulas; TOC anchor links jump to sections; refreshing the page restores scroll position; all terms link to Glossary.

- [X] T022 [US3] Create lesson page at src/pages/lesson/index.astro: queries `lessons` collection ordered by `section` + `order`; renders table-of-contents nav with anchor links; renders each MDX section; uses BaseLayout; page title "Dantzig-Wolfe Decomposition: A Technical Lesson"; configures `remark-math` + `rehype-katex` MDX plugins in astro.config.mjs
- [X] T023 [P] [US3] Author lesson MDX articles in src/content/lessons/: 01-prerequisites.mdx, 02-problem-structure.mdx (block-angular LP formula with full symbol legend), 03-master-problem.mdx (derivation; extreme points/rays; convexity constraints), 04-sub-problems.mdx (pricing sub-problems; bounded/unbounded cases), 05-column-generation.mdx (step-by-step one full iteration; optimality condition), 06-convergence.mdx (termination criterion; degeneracy; tailing-off; stabilisation strategies); all terms linked via TermLink, all formulas via MathBlock
- [X] T024 [P] [US3] Implement session-position persistence: add a small `<script>` in lesson/index.astro that saves `window.scrollY` to `sessionStorage` key `lesson-scroll` on `beforeunload` and restores it on `DOMContentLoaded`
- [X] T025 [US3] **⚡ RED-FIRST — commit before T022/T023/T024** Write failing Cucumber step definitions for technical-lesson.feature scenarios in tests/acceptance/step-definitions/lesson.steps.ts; confirm all steps fail in CI before opening implementation tasks
- [X] T026 [P] [US3] Verify KaTeX CSS is included globally: import `katex/dist/katex.min.css` in src/styles/global.css; confirm math renders correctly in Vitest snapshot of MathBlock.astro output in tests/unit/components/math-block.test.ts

**Checkpoint**: All technical-lesson.feature scenarios pass or are pending; KaTeX formulas render in the built site; TOC anchors work.

---

## Phase 6: US4 — Literature Examples (P3)

**Goal**: An examples index with client-side filtering, and detail pages for three canonical worked examples.

**Independent Test**: Navigate to `/examples`; index lists ≥3 examples; filter by problem class updates list without page reload; active filter is visually indicated; each example detail shows plain-language description, formulation, DW master problem, pricing sub-problem, ≥1 numerical iteration trace, and citation.

- [ ] T027 [US4] Create examples index page at src/pages/examples/index.astro: queries `examples` collection; passes entries as props to ExampleFilter Svelte island; static fallback renders full list when JS is off; page title "Worked Examples"
- [ ] T028 [P] [US4] Implement ExampleCard.astro in src/components/examples/ExampleCard.astro: displays title, problem class badge, one-line description, source citation, and link to detail page; uses design tokens for badge colours per problem class
- [ ] T029 [P] [US4] Implement ExampleFilter.svelte in src/components/examples/ExampleFilter.svelte: Svelte 5 `$state` island; receives all example entries as prop; renders filter buttons (network flow / scheduling / cutting stock / other); `$derived` filtered list; updates DOM without reload; active filter highlighted; renders ExampleCard for each visible entry
- [ ] T030 [P] [US4] Create examples detail page at src/pages/examples/[slug].astro: Astro dynamic route driven by `examples` content collection; renders MDX via `<Content />`; all mathematical notation via MathBlock/InlineMath; citations via Citation component
- [ ] T031 [P] [US4] Author worked example MDX files in src/content/examples/: cutting-stock.mdx (Gilmore–Gomory reference, block-angular form, DW master, pricing sub-problem = knapsack, ≥1 numerical iteration), multi-commodity-flow.mdx (network structure → block-angular, DW decomposition applied to commodities, published source), crew-scheduling.mdx (set-partitioning formulation, column generation for crew pairings, airline/transit reference); each explicitly labels coupling constraints and sub-problem constraints
- [ ] T032 [US4] **⚡ RED-FIRST — commit before T027–T031** Write failing Cucumber step definitions for literature-examples.feature scenarios in tests/acceptance/step-definitions/examples.steps.ts; confirm all steps fail in CI before opening implementation tasks

**Checkpoint**: All literature-examples.feature scenarios pass or are pending; filter island works with JS; all 3 example detail pages build without errors.

---

## Phase 7: US5 — Interactive Solver: Problem Input (P1)

**Goal**: A fully usable problem-input workspace where users can enter, validate, load examples, and clear a decomposed LP.

**Independent Test**: Navigate to `/solver`; blank workspace shown; enter coupling constraints + ≥2 sub-problem blocks; dimension mismatch triggers clear error; loading a pre-built example populates all fields; Clear resets after confirmation; non-numeric input is flagged inline; no network requests to any compute server during input.

- [ ] T033 [US5] Implement Zod validation schemas in src/lib/solver/problem-schema.ts: `VariableBoundsSchema`, `ConstraintSenseSchema`, `SubProblemBlockSchema` (all validation rules from data-model.md **plus security limits from solver-engine.feature Security scenario**: `.max(200)` on `A` rows i.e. constraints-per-block, `.max(500)` on `c`/`bounds`/`variableLabels` length i.e. variables-per-block), `CouplingConstraintsSchema`, `ProblemInstanceSchema`; export `ParsedProblemInstance` inferred type; update T035 to assert that a block with 201 constraints or 501 variables is rejected by the schema with a clear error message
- [ ] T033a [US5] Create `src/pages/solver.astro` using BaseLayout: set page `<title>` to "Interactive Solver — Dantzig-Wolfe"; pass `pyodide-lock.json` CDN base URL as a `data-pyodide-base` attribute on the `<main>` element; mount `<SolverWorkspace client:load />` island; add `<noscript>` block explaining JS is required with a list of supported browsers (Chrome, Firefox, Safari, Edge); **this task must complete before T038 so the island has a host page**
- [ ] T034 [P] [US5] Implement matrix utilities in src/lib/math/matrix-utils.ts: `validateRectangular(matrix)`, `totalColumns(subproblems)`, `validateCouplingDimensions(coupling, subproblems)`, `createEmptyMatrix(rows, cols)` — all pure functions returning `Result<T, string>`
- [ ] T035 [P] [US5] Write Vitest unit tests for problem-schema.ts and matrix-utils.ts in tests/unit/lib/problem-schema.test.ts and tests/unit/lib/matrix-utils.test.ts (valid edge cases: 1 sub-problem, 10 sub-problems; invalid: dimension mismatch, NaN values, mismatched senses array length)
- [ ] T036 [US5] Implement SubProblemBlock.svelte component in src/components/solver/SubProblemBlock.svelte: Svelte 5 `$state`; numeric grid input for A, b, c matrices with inline validation; variable bounds row (lower/upper with default 0/∞ indicator); optional label field; collapsible via `<details>`; block index shown in heading; emits `change` event with updated `SubProblemBlock`
- [ ] T037 [US5] Implement ProblemInput.svelte in src/components/solver/ProblemInput.svelte: coupling constraint section (A0 matrix, b0 vector, sense selectors); dynamic list of SubProblemBlock components; "Add Sub-problem" button; runs `validateCouplingDimensions` on every change and surfaces dimension errors; emits validated `ProblemInstance` or null when invalid
- [ ] T038 [US5] Implement SolverWorkspace.svelte in src/components/solver/SolverWorkspace.svelte: root Svelte 5 `$state` island; holds `ProblemInstance | null`, solver status (`idle | loading | solving | complete | error`); renders ProblemInput + SolverControls (stub); wires "Load Example" dropdown to fetch `public/examples/*.json` and call `ProblemInstanceSchema.parse()`; wires "Clear" to confirm-then-reset; persists problem input to `sessionStorage` key `dw-problem` on every valid change; handles `INIT_ERROR` from solver worker by rendering a browser-compatibility message in place of the workspace (**depends on T033a** — solver.astro host page must exist)
- [ ] T039 [P] [US5] Create pre-built example JSON files in public/examples/: cutting-stock.json, two-block-lp.json, three-block-lp.json — each a serialised `ProblemInstance` matching the schema; values align with solver-engine.feature Scenario Outline expected_values (cutting-stock optimal = 3.0, two-block = 12.0, three-block = 24.5); include `metadata.description` field
- [ ] T040 [US5] **⚡ RED-FIRST — commit before T033a/T036/T037/T038** Write failing Cucumber step definitions for interactive-solver.feature (Problem Input feature scenarios) in tests/acceptance/step-definitions/solver-input.steps.ts (steps for: blank workspace, coupling constraint input, add sub-problem block, multiple blocks expand/collapse, variable bounds, load example, clear with confirmation, dimension mismatch error, non-numeric value rejection); confirm all steps fail in CI before opening implementation tasks

**Checkpoint**: All interactive-solver.feature (Feature 1: Problem Input) scenarios pass or are pending; dimension validation prevents premature solve attempts.

---

## Phase 8: US6 — Solver Engine + Running Solver (P1)

**Goal**: A fully functional in-browser solver using Pyodide + dantzig-wolfe-python, with live iteration log, status messages, and cancel support.

**Independent Test**: Click "Solve" with the three-block LP example; loading message appears; Pyodide initialises without errors; iteration log updates in real time; "Solved — Optimal" status shown with objective value matching expected_value within 1e-6; "Cancel" halts after current iteration; UI remains responsive throughout; no server requests made.

- [ ] T041 [US6] Implement src/workers/solver.worker.ts: handle `INIT` message (load Pyodide 0.29.3 from `pyodide-lock.json` CDN URL, install micropip, install dantzig-wolfe-python wheel from pinned URL, post `READY`); handle `SOLVE` message (convert `ProblemInstance` to Python dict, register iteration callback via `pyodide.globals.set('iterationCallback', fn)` that posts `ITERATION` message, call `dantzig_wolfe.solve()`, post `RESULT` or `ERROR`); handle `CANCEL` message (set cancellation flag checked in iteration callback); post `INIT_ERROR` with message if WebAssembly unsupported or package install fails
- [ ] T042 [P] [US6] Implement src/lib/solver/worker-client.ts: `WorkerClient` class; creates `Worker` lazily on first `init()` call; maps `requestId` UUIDs to pending Promises; exposes `init(): Promise<void>`, `solve(problem, onIteration): Promise<SolverResult>`, `cancel(): void`; full TypeScript types for all message shapes from contracts/solver-worker-contract.md
- [ ] T043 [P] [US6] Write Vitest unit tests for worker-client message construction in tests/unit/workers/solver-messages.test.ts: verify `SOLVE` message shape, requestId generation, `CANCEL` echoes requestId; mock `Worker` with `vi.fn()`
- [ ] T044 [US6] Implement SolverControls.svelte in src/components/solver/SolverControls.svelte: "Solve" button (disabled when `ProblemInstance` is null or solver is running); "Cancel" button (visible only when solving); status badge (`idle` / `Loading solver…` with spinner / `Solving…` / `Solved — Optimal` / `Solved — Infeasible` / `Solved — Unbounded` / `Error`); wire to WorkerClient via SolverWorkspace props; `data-solver-status` attribute for Playwright wait
- [ ] T045 [US6] Implement IterationLog.svelte in src/components/solver/IterationLog.svelte: Svelte 5 `$state` list of `SolverIteration` entries; auto-scrolls to bottom on new entry; each row shows iteration number, master objective, best reduced cost; clicking a row expands detail (RMP value, duals, sub-problem index, entering column reduced cost); WebAssembly-unavailable state shows browser-compatibility message
- [ ] T046 [P] [US6] Update public/pyodide-lock.json with real metadata: fetch actual Pyodide 0.29.3 package list from `https://cdn.jsdelivr.net/pyodide/v0.29.3/full/pyodide-lock.json`; extract and store `numpy`, `scipy`, `micropip` entries; add `dantzig-wolfe-python` entry with pinned GitHub release wheel URL and SHA-256 hash
- [ ] T047 [US6] **⚡ RED-FIRST — commit before T041/T044/T045** Write failing Cucumber step definitions for solver-engine.feature (all 4 Features: Pyodide init, correctness, performance, security) and interactive-solver.feature (Feature 2: Running scenarios) in tests/acceptance/step-definitions/solver-run.steps.ts (steps include: waiting for `[data-solver-status="ready"]`, loading pre-built example, running solver, asserting optimal value within tolerance, asserting infeasible/unbounded messages, asserting iteration log updates, asserting cancel, asserting no compute server requests via Playwright `route` interception, asserting domain-size rejection); confirm all steps fail in CI before opening implementation tasks

**Checkpoint**: All solver-engine.feature and interactive-solver.feature (Feature 2) scenarios pass or are pending; known benchmark values reproduced within tolerance.

---

## Phase 9: US7 — Interactive Solver: Solution Visualisation (P2)

**Goal**: A rich output experience — solution summary panel, convergence chart, JSON export, and URL sharing.

**Independent Test**: After solving the two-block LP example: solution panel shows objective value + variable values grouped by block + coupling duals; convergence chart renders with monotone-improving line; clicking a chart point shows iteration detail; "Export Solution" downloads valid JSON matching contracts/export-contract.md schema; "Share" updates the URL and opening that URL in a new session restores the same problem.

- [ ] T048 [US7] Implement SolutionPanel.svelte in src/components/solver/SolutionPanel.svelte: Svelte 5 `$derived` from `SolverResult`; displays final objective value (prominent); variable values table grouped by sub-problem block (block label + variable labels from ProblemInstance); coupling constraint dual values table; infeasible/unbounded messages with plain-language explanation
- [ ] T049 [P] [US7] Implement ConvergenceChart.svelte in src/components/solver/ConvergenceChart.svelte: Chart.js 4.x line chart in a `<canvas>`; x-axis = iteration number, y-axis = restricted master objective value; data fed from `SolverIteration[]` via Svelte 5 `$effect`; tooltip shows full iteration detail on hover; destroy/recreate chart on new solve via `$effect` cleanup
- [ ] T050 [P] [US7] Implement URL codec in src/lib/sharing/url-codec.ts: `encodeProblm(problem: ProblemInstance): string` (JSON stringify → pako deflate → URL-safe Base64 → `?p=<encoded>`); `decodeProblem(encoded: string): ProblemInstance` (reverse; validates with `ProblemInstanceSchema.parse()`; throws `DecodingError` on invalid/oversized input ≥64 KB uncompressed); wire "Share" button in SolverControls.svelte to call `encodeProblm` and `history.replaceState`; on page load in SolverWorkspace.svelte check for `?p=` param and call `decodeProblem` to pre-populate workspace
- [ ] T051 [P] [US7] Implement JSON export in src/lib/solver/export.ts: `buildExportPayload(problem, result): ExportPayload` matching contracts/export-contract.md v1.0.0 schema (objectiveValue, variables, duals, iterationLog, metadata.exportedAt, metadata.solverVersion); `downloadJson(payload): void` (creates Blob, triggers `<a download>` click); wire to "Export Solution" button in SolverControls.svelte
- [ ] T052 [P] [US7] Write Vitest unit tests for url-codec.ts in tests/unit/lib/url-codec.test.ts: round-trip encode→decode for each pre-built example; oversized input throws `DecodingError`; malformed base64 throws; URL-safe characters only in output; and for export.ts in tests/unit/lib/export.test.ts: payload matches schema; all required fields present
- [ ] T053 [US7] **⚡ RED-FIRST — commit before T048/T049/T050/T051** Write failing Cucumber step definitions for interactive-solver.feature (Feature 3: Solution Visualisation scenarios) in tests/acceptance/step-definitions/solver-output.steps.ts (steps: solution panel shows objective + grouped variables + duals; convergence chart canvas present; chart tooltip shows detail; Export downloads JSON file; Share updates URL; opening shared URL restores problem); confirm all steps fail in CI before opening implementation tasks

**Checkpoint**: All interactive-solver.feature (Feature 3) scenarios pass or are pending; round-trip URL sharing works end-to-end.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Accessibility hardening, mobile UX, solver security, and final CI validation across all features.

- [ ] T054 Audit and fix WCAG 2.1 AA accessibility across all pages: verify all images have `alt` text; all form inputs have `<label>`; focus ring visible on all interactive elements (`outline` not suppressed); colour contrast ≥4.5:1 for all text/background pairs using design tokens; `aria-live="polite"` on IterationLog for screen reader announcements; `role="status"` on solver status badge in SolverControls.svelte
- [ ] T055 Implement mobile-responsive layout: add hamburger menu toggle to NavBar.astro (hidden on md+, visible on sm; `<details>/<summary>` or Svelte island); verify Interactive Solver input grid is scrollable horizontally on 375 px viewport (overflow-x auto wrapper in ProblemInput.svelte); verify all Tailwind breakpoints via Playwright viewport resize in tests/acceptance/step-definitions/navigation.steps.ts
- [ ] T056 Implement no-JS and WebAssembly-unsupported fallbacks: add `<noscript>` notice in src/pages/solver.astro explaining JS is required with list of compatible browsers; handle `INIT_ERROR` from solver.worker.ts (sent when `typeof WebAssembly === 'undefined'`) in SolverWorkspace.svelte by rendering the browser-compatibility message in place of the workspace
- [ ] T057 [P] Run full Cucumber acceptance suite against `astro build` output and fix any remaining failing step definitions; fix any Playwright timing issues (use `waitForSelector('[data-solver-status="ready"]')` for all solver scenarios; add `waitForURL` for navigation steps)
- [ ] T058 [P] Verify CI pipeline end-to-end: confirm all 4 GitHub Actions gates pass on a dry-run push to the branch; confirm `npm audit` has 0 moderate+ vulnerabilities; confirm `astro build` produces a `dist/` directory with all expected routes; confirm Vercel preview deployment builds cleanly via `vercel build --prod`
- [ ] T059 [P] Measure static page LCP performance: run `npx lighthouse` (or Playwright `page.evaluate(() => performance.getEntriesByType('navigation'))` + PerformanceObserver for LCP) against the `astro preview` build output for the History, Lesson, and Examples pages; assert LCP ≤ 1000 ms per plan.md performance goal; fail CI (or flag as a warning) if any static page exceeds the threshold
- [ ] T060 Domain-knowledge review gate (Principle VI): before this PR is merged, at least one contributor with LP/optimization background MUST review and approve all educational MDX content in src/content/history/, src/content/lessons/, and src/content/examples/ for mathematical accuracy and citation completeness; record approval as a PR comment or review approval; this task is NEVER marked done by the implementor — it requires an external approver

**Checkpoint**: All 6 feature files have ≥1 passing Cucumber scenario; `astro build` clean; CI green; LCP ≤ 1 s on all static pages; educational content domain-approved; no console errors in production build.

---

## Dependency Graph

```
Phase 1 (Setup)
    └─► Phase 2 (Foundation)
            ├─► Phase 3 (US1 Navigation) ──► Phase 4 (US2 History)
            │                            ──► Phase 5 (US3 Lesson)
            │                            ──► Phase 6 (US4 Examples)
            ├─► Phase 7 (US5 Solver Input)
            │       └─► Phase 8 (US6 Solver Engine)
            │               └─► Phase 9 (US7 Visualisation)
            └─► Phase 10 (Polish) ← depends on all phases complete
```

US2, US3, US4 are independent after Foundation; US5 → US6 → US7 are sequential (solver output depends on solver running, which depends on input).

---

## Parallel Execution Examples

**Within Phase 7 (Solver Input)** — after T033 is done:
- T034, T035, T039 can run in parallel (matrix-utils, unit tests, example JSON — all distinct files)
- T036 can start independently (SubProblemBlock.svelte touches no other in-progress file)
- T037 depends on T036 (ProblemInput uses SubProblemBlock)
- T038 depends on T033 and T034 (SolverWorkspace uses WorkerClient and schemas)

**Within Phase 8 (Solver Engine)** — after T041 (worker) is done:
- T042 and T043 can run in parallel (worker-client + its unit tests)
- T044 (SolverControls) and T045 (IterationLog) can run in parallel
- T046 (pyodide-lock update) can run at any point in Phase 8

**Static content phases (4, 5, 6)** can run fully in parallel with each other after Phase 3 is complete.

---

## Implementation Strategy

**Suggested MVP** (phases 1 + 2 + 3 + 7 + 8): gives a working site with navigation and a functional solver — the core value proposition. All other phases add educational depth.

**Increment 1** — MVP: `npm run dev` shows a navigable shell + glossary + interactive solver that accepts input, solves, and shows the iteration log with a final result.  
**Increment 2** — Educational content: History + Lesson + Examples pages authored in MDX.  
**Increment 3** — Rich output: Convergence chart, export, URL sharing.  
**Increment 4** — Polish: Accessibility audit, mobile hardening, CI green.

---

## Task Count

| Phase | Story | Tasks | Notes |
|-------|-------|-------|-------|
| Phase 1 — Setup | — | 7 (T001–T007) | |
| Phase 2 — Foundation | — | 5 (T008–T012) | |
| Phase 3 — Navigation + Glossary | US1 | 5 (T013–T017) | P1 |
| Phase 4 — Algorithm History | US2 | 4 (T018–T021) | P2 |
| Phase 5 — Technical Lesson | US3 | 5 (T022–T026) | P2 |
| Phase 6 — Literature Examples | US4 | 6 (T027–T032) | P3 |
| Phase 7 — Solver Input | US5 | 9 (T033–T033a, T034–T040) | P1 |
| Phase 8 — Solver Engine + Running | US6 | 7 (T041–T047) | P1 |
| Phase 9 — Solution Visualisation | US7 | 6 (T048–T053) | P2 |
| Phase 10 — Polish | — | 7 (T054–T060) | |
| **Total** | | **61** | |

Parallel opportunities identified across all phases. Step-definition tasks (T017, T020, T025, T032, T040, T047, T053) carry an explicit RED-FIRST ordering constraint and must be committed before their sibling implementation tasks within the same phase (per Constitution Principle III). Tasks added during analysis remediation: T033a (C2), T059 (E1 — LCP measurement), T060 (D2 — domain review gate).
