# Dantzig-Wolfe Decomposition — Educational Website

A static, open-source educational website explaining the **Dantzig-Wolfe Decomposition** algorithm through structured lessons, worked examples, and an interactive LP solver.

Built with [Astro 5](https://astro.build), [Svelte 5](https://svelte.dev), [Tailwind CSS 4](https://tailwindcss.com), and [KaTeX](https://katex.org).

---

## Features

- **History** — Origins of the algorithm, from the 1960 Dantzig-Wolfe paper to modern column generation.
- **Technical Lesson** — A self-contained walkthrough: problem structure → master problem → sub-problems → column generation → convergence. Full KaTeX notation throughout.
- **Worked Examples** — Three in-depth examples with verified citations:
  - Cutting Stock Problem (Gilmore-Gomory)
  - Multi-Commodity Network Flow (Ford-Fulkerson)
  - Crew Scheduling / Branch-and-Price (Barnhart et al.)
- **Glossary** — Slide-out panel with filterable definitions; term links throughout content.
- **Interactive Solver** _(in progress)_ — Enter a block-angular LP in the browser, run Dantzig-Wolfe Decomposition via [dantzig-wolfe-python](https://github.com/alotau/dantzig-wolfe-python) loaded through Pyodide (Python in WebAssembly), and visualise the solution.

---

## Tech Stack

| Layer          | Technology                                                                                                                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework      | [Astro 5](https://astro.build) — static output, content collections, MDX                                                                                                                                                                                                                  |
| UI components  | [Svelte 5](https://svelte.dev) — runes reactivity (`$state`, `$derived`)                                                                                                                                                                                                                  |
| Styling        | [Tailwind CSS 4](https://tailwindcss.com) — Vite plugin, `@theme` CSS vars                                                                                                                                                                                                                |
| Math rendering | [KaTeX](https://katex.org) — server-side in Astro, `remark-math` + `rehype-katex` in MDX                                                                                                                                                                                                  |
| Charts         | [Chart.js](https://www.chartjs.org) — convergence visualisation                                                                                                                                                                                                                           |
| Solver runtime | [dantzig-wolfe-python](https://github.com/alotau/dantzig-wolfe-python) — solver library, loaded via [Pyodide](https://pyodide.org) (Python/WASM in-browser) + [pako](https://github.com/nodeca/pako); based on the original [dwsolver](https://github.com/alotau/dwsolver) implementation |
| Deployment     | [Vercel](https://vercel.com) via `@astrojs/vercel`                                                                                                                                                                                                                                        |

---

## Getting Started

### Prerequisites

- Node.js ≥ 20
- npm ≥ 10

### Install

```sh
npm install
```

### Develop

```sh
npm run dev
```

Opens at `http://localhost:4321`.

### Build

```sh
npm run build
```

Static output is written to `dist/`. Vercel adapter writes to `.vercel/output/`.

### Preview

```sh
npm run preview
```

Serves the production build locally.

---

## Project Structure

```
.
├── features/                  # Gherkin acceptance scenarios
│   ├── site-navigation.feature
│   ├── history.feature
│   ├── technical-lesson.feature
│   ├── literature-examples.feature
│   ├── interactive-solver.feature
│   └── solver-engine.feature
├── specs/                     # SpecKit design artefacts (spec, plan, tasks)
├── src/
│   ├── components/
│   │   ├── layout/            # BaseLayout, NavBar, Footer, GlossaryPanel
│   │   ├── content/           # MathBlock, InlineMath, Callout, Citation, TermLink
│   │   └── examples/          # ExampleCard, ExampleFilter
│   ├── content/               # Astro content collections
│   │   ├── glossary/          # 11 glossary entries (MDX)
│   │   ├── history/           # 5 history articles (MDX)
│   │   ├── lessons/           # 6 lesson sections (MDX)
│   │   └── examples/          # 3 worked examples (MDX)
│   ├── pages/
│   │   ├── index.astro        # Home
│   │   ├── history.astro      # History timeline
│   │   ├── lesson/index.astro # Technical lesson with TOC
│   │   └── examples/          # Examples index + detail pages
│   └── styles/
│       └── global.css         # Tailwind + KaTeX imports, design tokens
└── tests/
    ├── acceptance/            # Cucumber + Playwright end-to-end tests
    └── unit/                  # Vitest unit tests
```

---

## Architecture

A full system diagram — covering SSG pages, Svelte island hydration boundaries, the Web Worker/Pyodide solver, the `postMessage` protocol, URL sharing, and deployment topology — is in [docs/architecture.md](docs/architecture.md).

---

## Testing

### Unit tests (Vitest)

```sh
npm test
```

Runs component unit tests in `tests/unit/`.

```sh
npm run test:watch   # watch mode
npm run test:ui      # Vitest browser UI
```

### Acceptance tests (Cucumber + Playwright)

```sh
npm run test:acceptance
```

Runs all Gherkin scenarios against a live dev server. Requires the dev server to be running (or configure `baseURL` in `playwright.config.ts`).

### Type checking

```sh
npm run check
```

Runs `astro check` + TypeScript.

### Lint

```sh
npm run lint       # ESLint + Prettier check
npm run lint:fix   # auto-fix
```

---

## Content Collections

All written content lives in `src/content/` as MDX files and is validated by Zod schemas defined in `src/content/config.ts`.

| Collection | Fields                                                    |
| ---------- | --------------------------------------------------------- |
| `glossary` | `term`, `shortDef`, `relatedTerms[]`                      |
| `history`  | `title`, `date`, `order`, `description`                   |
| `lessons`  | `title`, `section` (number), `order`, `prerequisites[]`   |
| `examples` | `title`, `problemClass`, `source`, `doi?`, `description?` |

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b my-feature`.
3. Run `npm run lint:fix && npm test` before committing.
4. Open a pull request against `main`.

Please keep all mathematical content accurate and cite primary sources with DOI where available.

---

## Acknowledgements

The Python solver ([dantzig-wolfe-python](https://github.com/alotau/dantzig-wolfe-python)) is a rewrite of the original [dwsolver](https://github.com/alotau/dwsolver) by the same author, which served as the basis for the new implementation.

---

## License

[MIT](LICENSE)
