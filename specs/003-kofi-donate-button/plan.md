# Implementation Plan: Ko-fi Donation Button

**Branch**: `003-kofi-donate-button` | **Date**: 2026-03-13 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/003-kofi-donate-button/spec.md`

## Summary

Add a Ko-fi donation button to the site footer so it appears on every page. The button uses the owner-provided Ko-fi HTML snippet, opens in a new tab with `rel="noopener noreferrer"`, and is placed in the existing `Footer.astro` component — requiring a one-line HTML addition, a new Gherkin feature file, and corresponding step definitions.

## Technical Context

**Language/Version**: TypeScript 5 / Astro 5 / Svelte 5; Node 20  
**Primary Dependencies**: No new dependencies — static HTML only  
**Storage**: N/A  
**Testing**: Cucumber.js 11 + Playwright (acceptance); Vitest 3 (unit — no unit tests needed for static HTML)  
**Target Platform**: Browser; Vercel static hosting  
**Project Type**: Static web application  
**Performance Goals**: No measurable impact — one static image link  
**Constraints**: Client-side only (Principle II); `rel="noopener noreferrer"` required on all `target="_blank"` links (OWASP / FR-003)  
**Scale/Scope**: One-line change to `Footer.astro`; one new `.feature` file; one new step definitions file

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate | Status | Notes |
|------|--------|-------|
| Gherkin `.feature` file(s) exist and are accepted | ⚠️ REQUIRED | New `features/kofi-donate-button.feature` must be written before implementation |
| Dedicated branch `003-kofi-donate-button` created | ✅ PASS | Branch exists |
| Failing tests committed before implementation | ⚠️ REQUIRED | Gherkin step defs must be written and red before `Footer.astro` is changed |
| `main` merged into working branch | ⚠️ REQUIRED | Merge before first commit |
| Client-side computation strategy confirmed | ✅ PASS | Static HTML only; no computation |
| Security scan baseline | ✅ PASS | No new npm dependencies |

**Post-design re-check**: Confirm the `data-kofi-button` selector used in step definitions matches the attribute added to the `<a>` in `Footer.astro`.

## Project Structure

### Documentation (this feature)

```text
specs/003-kofi-donate-button/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── footer-ko-fi-contract.md
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
features/
└── kofi-donate-button.feature     # New — defines acceptance scenarios

tests/acceptance/step-definitions/
└── kofi-donate-button.steps.ts    # New — implements Gherkin steps

src/components/layout/
└── Footer.astro                   # Existing — add Ko-fi <a>/<img> markup
```

**Structure Decision**: Single project (Astro monorepo). No new routes, no new pages, no new packages — `Footer.astro` is the only source file that changes.

## Complexity Tracking

*No constitution violations.*
