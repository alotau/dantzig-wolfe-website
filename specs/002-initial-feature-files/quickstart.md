# Quickstart: Dantzig-Wolfe Decomposition Website

**Date**: 2026-03-07

---

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Node.js | ≥ 22 LTS | https://nodejs.org or `nvm install --lts` |
| npm | ≥ 10 | Bundled with Node.js |
| Git | ≥ 2.40 | System package manager |

No server-side runtime is needed — this is a purely static site.

---

## 1. Clone and Install

```bash
git clone https://github.com/alotau/dantzig-wolfe-website.git
cd dantzig-wolfe-website
npm install
```

---

## 2. Run the Development Server

```bash
npm run dev
```

Opens at `http://localhost:4321` (Astro default). Hot module replacement is active for
Svelte components and Astro pages. MDX content changes reload the page automatically.

> **Note on the Interactive Solver during development**: The Pyodide Web Worker loads
> the `dantzig-wolfe-python` wheel from a GitHub release URL. On first load this takes
> 3–5 seconds (Pyodide + wheel download). Subsequent loads within the same browser
> session are near-instant (cached). An internet connection is required during development
> unless you configure a local wheel path in `src/workers/solver.worker.ts`.

---

## 3. Run Tests

### Unit tests (Vitest)

```bash
npm run test:unit
```

Runs all tests in `tests/unit/`. Fast, no browser required.

### Acceptance tests (Cucumber.js + Playwright)

```bash
# First time only: install Playwright browsers
npx playwright install --with-deps chromium

# Build the site and run acceptance tests
npm run test:acceptance
```

This builds the site to `dist/`, starts a local static server, and runs all Gherkin
scenarios from `features/` against Chromium. Requires an internet connection (Pyodide
CDN) unless the Playwright route cache fixture is in place.

### All tests (CI equivalent)

```bash
npm run test
```

Runs: `npm audit` → `eslint` → `prettier --check` → `test:unit` → `test:acceptance`

---

## 4. Build for Production

```bash
npm run build
```

Outputs static files to `dist/`. Preview locally:

```bash
npm run preview
```

---

## 4a. Deploy to Vercel

Deployment is automatic via the **Vercel GitHub App** — no manual steps required after
initial project setup:

1. Connect the repo to a Vercel project at <https://vercel.com/new> (one-time setup).
2. Every push to any branch triggers a **preview deployment** with a unique URL.
3. Every merge to `main` triggers a **production deployment**.

For local one-off deploys (optional):

```bash
npx vercel           # deploy preview
npx vercel --prod    # deploy to production
```

The `@astrojs/vercel` adapter (static output mode) is configured in `astro.config.mjs`.

Opens at `http://localhost:4321` serving the built static files.

---

## 5. Project Layout (key paths)

```
features/          Gherkin feature files (specifications — edit these first)
src/
  pages/           Astro pages (one file per route)
  components/      Astro + Svelte UI components
  content/         MDX educational content (history, lessons, examples, glossary)
  workers/         Pyodide Web Worker
  lib/             TypeScript utilities (solver client, validation, URL codec)
  styles/          Tailwind + CSS custom properties
tests/
  unit/            Vitest tests
  acceptance/      Cucumber.js step definitions + Playwright support
public/
  pyodide-lock.json  Pinned Pyodide dependency lockfile
  examples/          Pre-built problem instance JSON files
```

---

## 6. Authoring Educational Content

Content lives in `src/content/` as MDX files. Front-matter schemas are defined in
`src/content/config.ts`.

**Adding a new glossary term**:

```mdx
---
slug: "block-angular-structure"
term: "Block-Angular Structure"
shortDefinition: "An LP matrix form where the constraint matrix has independent diagonal blocks linked by a set of coupling constraints."
relatedTerms: ["coupling-constraints", "master-problem"]
---

A **block-angular LP** has the form [...]
```

**Using math notation in MDX** (rendered server-side by KaTeX):

```mdx
Inline: $c^T x$

Display:
$$
\min_{x} \; c^T x \quad \text{s.t.} \quad Ax = b, \; x \geq 0
$$
```

**Linking to a glossary term inline**:

```mdx
import TermLink from '@/components/content/TermLink.astro';

The <TermLink slug="master-problem">master problem</TermLink> [...]
```

---

## 7. Working on the Interactive Solver

The solver is a Svelte island (`src/components/solver/SolverWorkspace.svelte`).
The Pyodide Web Worker is at `src/workers/solver.worker.ts`.

To update the pinned `dantzig-wolfe-python` wheel version:

1. Find the new wheel URL from a GitHub release at
   `https://github.com/alotau/dantzig-wolfe-python/releases`.
2. Update `DW_WHEEL_URL` constant in `src/workers/solver.worker.ts`.
3. Update `public/pyodide-lock.json` (if used for version pinning).
4. Run `npm run test:acceptance` to verify the solver still works end to end.

---

## 8. Branch Workflow (per Constitution)

```bash
# Start a new feature
git checkout main && git pull origin main
git checkout -b <NNN>-short-description

# Before pushing, always merge main first
git fetch origin && git merge origin/main

# Push
git push -u origin <NNN>-short-description
# Then open a PR on GitHub — never push directly to main
```
