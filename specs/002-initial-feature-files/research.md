# Research: Dantzig-Wolfe Decomposition Website

**Branch**: `002-initial-feature-files` | **Date**: 2026-03-07  
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## §1 — Static Site Framework

**Decision**: Astro 5.x (island architecture, static site generation)

**Rationale**: The site has a mix of static content pages (History, Lesson, Examples) and
one highly interactive page (Solver). Astro's island architecture is the ideal fit: content
pages are zero-JS static HTML, and the solver is a single reactive Svelte island loaded only
on the Solver page. This directly satisfies the `site-navigation.feature` scenario "Site
works without JavaScript for static content" with no special effort.

**Alternatives considered**:
- Next.js: Heavier, SSR-oriented, the server-rendering model conflicts with the spirit of
  client-side-only computation and adds unnecessary complexity for a static site.
- SvelteKit: Excellent, but Astro's content collections and MDX pipe are more mature for
  multi-section educational content with math notation.
- Vite + vanilla TS: No SSG opinion; would require building routing and content management
  from scratch.

**Key Astro features used**:
- Content Collections (`src/content/`) with typed schemas for history, lessons, examples, glossary.
- MDX support via `@astrojs/mdx` for rich content authoring with embedded components.
- Static adapter (`@astrojs/vercel`) for Vercel deployment as pure HTML+JS (static output mode).
- `@astrojs/svelte` integration for Svelte 5 islands.

---

## §2 — Pyodide + Web Worker Architecture

**Decision**: Pyodide 0.29.x loaded in a dedicated Web Worker; `dantzig-wolfe-python`
installed via `micropip` from a pinned GitHub release wheel URL.

**Rationale**: Running Pyodide on the main thread would block UI rendering during the
multi-second load and during solver iterations. A Web Worker isolates WASM execution to a
background thread, satisfying `solver-engine.feature` scenario "Solver does not block the
browser's main thread."

**Architecture** (see `contracts/solver-worker-contract.md` for message schema):

```
Main thread (Svelte island)
  │
  │ postMessage({ type: 'INIT' })
  ▼
solver.worker.ts
  ├─ loadPyodide({ indexURL: CDN })   ← first call only, ~3s uncached
  ├─ micropip.install(DW_WHEEL_URL)   ← from pinned GitHub release
  ├─ postMessage({ type: 'READY' })
  │
  │ postMessage({ type: 'SOLVE', payload: ProblemInstance })
  │
  ├─ Python: dantzig_wolfe.solve(problem)
  ├─ postMessage({ type: 'ITERATION', payload: SolverIteration }) × N
  └─ postMessage({ type: 'RESULT', payload: SolverResult })
```

**Pyodide version**: `0.29.3` (current stable at plan date; NumPy 2.2.5 and SciPy 1.14.1
included — both are compiled to WASM in Pyodide's distribution).

**dantzig-wolfe-python wheel**: Must be distributed as a pure-Python wheel
(`*-py3-none-any.whl`) from a tagged GitHub release at
`https://github.com/alotau/dantzig-wolfe-python`. The wheel URL is pinned in
`public/pyodide-lock.json` and in `src/workers/solver.worker.ts`. CI runs `micropip.install`
against the same URL to verify the wheel is reachable.

**Caching strategy**: Pyodide and its packages are served from jsDelivr CDN. The browser
caches HTTP responses automatically. The worker issues `loadPyodide()` once per worker
lifetime; the Svelte island keeps a singleton worker reference for the session. This
satisfies `solver-engine.feature` scenario "Pyodide runtime is cached after first load."

**Input marshalling**: `ProblemInstance` is a plain JSON-serialisable object (see
data-model.md). It is passed directly via `postMessage()` using the structured clone
algorithm — no manual serialisation needed for plain objects/arrays.

**Streaming iterations**: The worker calls `self.postMessage({ type: 'ITERATION', ... })`
from inside the Python iteration callback (exposed to Pyodide via `pyodide.globals.set`).
This is the standard Pyodide interop pattern for Python→JS callbacks.

**Size concern**: Pyodide core WASM is ~4–6 MB (gzip ~1.2 MB). The `dantzig-wolfe-python`
wheel is expected to be small (<100 KB). Loading time ~3–5s on first visit, <500ms cached.
A "Loading solver environment…" progress message is shown on first load
(see `interactive-solver.feature` "Solver initialise Pyodide on first use").

**Alternatives considered**:
- Server-side solver: Violates Constitution Principle II. Rejected.
- Compiling solver to WASM directly (Emscripten): Requires maintaining a separate WASM build
  toolchain alongside the Python source. Pyodide amortises this cost across the Python ecosystem.
- WASM-compiled LP solver in JavaScript (e.g., glpk.js): Would require reimplementing the
  Dantzig-Wolfe algorithm in JS, discarding the existing Python package investment.

---

## §3 — Interactive UI Framework (Svelte 5)

**Decision**: Svelte 5 (runes-based reactivity) for all interactive islands.

**Rationale**: Svelte 5 compiles to minimal vanilla JS with no runtime overhead — ideal for
islands that must not balloon the page weight. Runes (`$state`, `$derived`, `$effect`) are
clean for managing solver state (problem input, iteration log, result). No virtual DOM.

**Interactive islands on the Solver page**:
- `SolverWorkspace.svelte` — root island containing all solver UI
- `ExampleFilter.svelte` — lightweight filter on the Examples index
- `GlossaryPanel.svelte` — slide-in overlay, accessible (focus-trap)

**Alternatives considered**:
- React: Heavier runtime; no benefit over Svelte for this use case.
- Alpine.js: Suitable for minor interactions but insufficient for the complex solver state
  (matrix inputs, live iteration log, Chart.js integration, Web Worker lifecycle).
- Vanilla TypeScript: Viable but more verbose for managing the matrix input grid
  and live-updating iteration log.

---

## §4 — Styling (Tailwind CSS 4 + Design Tokens)

**Decision**: Tailwind CSS 4.x with a custom colour scheme defined as CSS custom properties.

**Color scheme** (distinct, academic/mathematical character):

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary` | `#1E3A5F` | Navy — primary brand, headers, navlinks |
| `--color-accent` | `#0EA5E9` | Sky blue — interactive elements, links, buttons |
| `--color-optimal` | `#059669` | Emerald — optimal solutions, success states |
| `--color-constraint` | `#EA580C` | Orange — constraints, warnings, bounds |
| `--color-surface` | `#F8FAFC` | Slate-50 — page background |
| `--color-surface-dark` | `#0F172A` | Slate-950 — hero sections, footer |
| `--color-text` | `#0F172A` | Primary text on light |
| `--color-text-inverse` | `#F8FAFC` | Primary text on dark |
| `--color-math-bg` | `#F1F5F9` | Math block background (neutral) |

The navy/sky/emerald/orange palette gives a "precision instrument" feel appropriate for an
optimization algorithm site, while remaining accessible (all foreground/background pairs
meet WCAG 4.5:1 contrast ratio).

Typography: `Inter` (sans-serif, body/UI) + `STIX Two Math` or `Crimson Pro` (serif,
lesson headings) — gives academic gravitas without heavy custom font loading.

---

## §5 — Mathematical Notation (KaTeX)

**Decision**: KaTeX for all math rendering — `remark-math` + `rehype-katex` for MDX content;
direct `katex.renderToString()` in Svelte components where dynamic math is needed.

**Rationale**: KaTeX is ~10× faster than MathJax, renders server-side during Astro's SSG
build for static pages (zero client-side JS cost for math in History/Lesson/Examples),
and supports the LaTeX notation needed for LP formulations.

**MDX setup**: `remark-math` parses `$...$` / `$$...$$` in MDX; `rehype-katex` renders them
to HTML at build time. The KaTeX CSS stylesheet (`katex/dist/katex.min.css`) is included
in the global stylesheet.

**Dynamic math in Svelte**: Any dynamically generated LP formulation in the solver output
uses `katex.renderToString(latex, { displayMode: true })` and sets `innerHTML` via Svelte's
`{@html}`. Content is always internally generated (never from user input), so XSS risk is
absent.

---

## §6 — Charts (Chart.js)

**Decision**: Chart.js 4.x for the convergence chart in the solver output.

**Rationale**: Framework-agnostic, lightweight (~60 KB gzip), no React dependency, easy
Canvas-based rendering that works inside a Svelte island. The convergence chart is a simple
line chart (iteration number vs. master objective value) — exactly Chart.js's sweet spot.

**Alternatives considered**:
- D3.js: Powerful but excessive for a single line chart; large bundle.
- Recharts: React-only.
- Observable Plot: Interesting but unfamiliar dependency; Chart.js is more predictable here.

---

## §7 — BDD Testing (Cucumber.js + Playwright)

**Decision**: `@cucumber/cucumber` 11.x + `@playwright/test` 1.50.x for acceptance tests
wired to the Gherkin feature files in `/features/`.

**Rationale**: The constitution mandates Gherkin-first. Cucumber.js is the standard JS
Gherkin runner. Playwright provides cross-browser (Chromium, Firefox, WebKit) browser
automation, headless CI support, and reliable async handling.

**Setup**:
- `cucumber.js` config at root: `features/**/*.feature`, step definitions at
  `tests/acceptance/step-definitions/`, support at `tests/acceptance/support/`.
- Cucumber World (`world.ts`) holds a Playwright `Browser` instance; each scenario gets
  a fresh `Page`.
- `Before` hook: launch browser. `After` hook: close page, capture screenshot on failure.
- For solver scenarios that require Pyodide: Playwright waits for `[data-solver-status="ready"]`
  before proceeding (Pyodide load is the real async gate).

**Pyodide in CI**: Pyodide loads from CDN in acceptance tests. CI must have network access.
For deterministic CI, consider caching the Pyodide CDN responses with Playwright's
`route` API to serve from a local fixture directory — this avoids CI flakiness from CDN
availability.

---

## §8 — Unit Testing (Vitest)

**Decision**: Vitest 3.x.

**Rationale**: Native ESM, TypeScript-first, compatible with Astro/Svelte projects out of
the box. Fast (Vite-powered). `@vitest/ui` for local development visibility.

**Scope**: Input validation (`problem-schema.ts`), matrix utilities, URL codec, worker
message construction. Solver correctness is covered by the Python package's own test suite
(run in CI via standard pytest) and by Cucumber acceptance tests that run against the full
browser stack.

---

## §9 — CI Pipeline (GitHub Actions)

**Decision**: Single GitHub Actions workflow (`.github/workflows/ci.yml`) with 4 sequential
gates per Constitution Principle V.

```
Gate 1: npm audit --audit-level=moderate     (dependency vulnerability scan)
Gate 2: eslint . && prettier --check .       (style + lint)
Gate 3: vitest run                            (unit tests)
Gate 4: astro build && cucumber-js           (build, then BDD acceptance tests via Playwright)
```

Python-level tests for `dantzig-wolfe-python` are NOT run in this repo's CI — they live in
the solver repo's own pipeline. This CI validates the JS integration layer and the full
user-facing browser behaviour.

**Branch protection rule** on GitHub: require status checks (all 4 gates) to pass before
merge; require `main` to be up to date; require at least 1 reviewer approval.

---

## §10 — Hosting

**Decision**: Vercel (static output mode via `@astrojs/vercel` adapter).

**Rationale**: Vercel offers zero-config GitHub integration — pushing a branch automatically
triggers a build and produces a unique preview URL per PR, making it straightforward to
review deployed changes before merge. The global Edge Network provides fast TTFB worldwide.
The free Hobby tier is appropriate for an open-source educational project. Custom domains
are supported natively. No server-side functions are used; the site deploys as pure
static HTML+JS.

**Adapter**: `@astrojs/vercel` in static output mode. Add to `astro.config.mjs`:
```ts
import vercel from '@astrojs/vercel/static';
export default defineConfig({ output: 'static', adapter: vercel() });
```

**Deploy workflow** (automatic via Vercel GitHub App):
```
git push origin <branch>  →  Vercel builds preview  →  unique preview URL posted to PR
git merge main (PR merged)  →  Vercel builds production  →  https://<project>.vercel.app
```

**Alternatives considered**:
- GitHub Pages: Requires a separate `gh-pages` branch and a custom Actions job to upload
  the build artefact. No PR preview URLs. More manual setup.
- Netlify: Comparable feature set to Vercel; Vercel chosen for its tighter Astro integration
  (maintained by the same Astro core team) and cleaner dashboard UX.
