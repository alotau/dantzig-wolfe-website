# Research: Ko-fi Donation Button

**Feature**: `003-kofi-donate-button`  
**Phase**: 0 — Pre-implementation research  
**Date**: 2026-03-13

---

## R-001: Footer Component — Where to Place the Button

**Question**: Which component renders the footer on every page, and where exactly should the Ko-fi button be inserted?

**Finding**: `src/components/layout/Footer.astro` is the sole footer component. It is included in `BaseLayout.astro` via a `<slot name="footer" />` which every page fills (or defaults to). The footer has two columns: a left block (site name + MIT licence) and a right `<nav>` (About, GitHub, Glossary). The Ko-fi button should sit between these two as a centred third element, or more simply appended inside the right nav block — keeping it visually separated and unobtrusive.

**Decision**: Place the Ko-fi button as a standalone element inside the existing `flex` row, alongside the nav, so it naturally sits in the footer's right-hand cluster on desktop and wraps gracefully on mobile.

**Rationale**: Inserting into the single footer component satisfies FR-001 (every page) with a one-file change and zero per-page work.

**Alternatives considered**: Per-page insertion via a Svelte store or Astro prop — rejected as unnecessary complexity for a static element that belongs in shared layout.

---

## R-002: Security — `target="_blank"` Link Hardening

**Question**: What is the required security attribute when using `target="_blank"`, and is there a pattern already used in the codebase?

**Finding**: `Footer.astro` already uses `rel="noopener noreferrer"` on the GitHub link (`target="_blank"`). The same pattern is used in `NavBar.astro` and other components. This is also what the Ko-fi-provided HTML snippet omits — the snippet only has `target='_blank'` without `rel`.

**Decision**: Add `rel="noopener noreferrer"` to the Ko-fi anchor, overriding the bare Ko-fi snippet. This prevents the Ko-fi page from accessing `window.opener` (tabnapping OWASP risk) and is required by FR-003.

**Rationale**: Consistent with existing codebase pattern; closes known OWASP tabnapping vulnerability.

**Alternatives considered**: Omitting it to match the raw Ko-fi snippet exactly — rejected; security requirement takes precedence.

---

## R-003: Feature File and Step Definition Pattern

**Question**: How are acceptance tests structured for site-wide UI elements (things visible on every page)?

**Finding**: `features/site-navigation.feature` uses a `Scenario: Primary navigation is visible on every page` with a `When I visit each page of the site` step, backed by a step definition in `navigation.steps.ts` that iterates over known routes (`/`, `/solver`, `/history`, `/about`, `/examples`, `/lesson`). The pattern uses `data-*` attributes on elements for reliable Playwright selectors.

**Decision**: Follow the same pattern for the Ko-fi button:
- Add `data-kofi-button` attribute to the `<a>` in `Footer.astro`.
- Write `features/kofi-donate-button.feature` with a scenario structure that checks each main route.
- Write `tests/acceptance/step-definitions/kofi-donate-button.steps.ts` using the same `for...of` route loop.

**Rationale**: Consistent with established codebase patterns; `data-*` selectors decouple tests from styling.

**Alternatives considered**: Single-page test (just the home page) — rejected; FR-001 specifies every page and the route loop is already an established pattern.

---

## R-004: Ko-fi Image — External CDN vs Local Copy

**Question**: Should the Ko-fi badge image be fetched from the Ko-fi CDN or copied to `public/`?

**Finding**: The Ko-fi-provided snippet references `https://storage.ko-fi.com/cdn/kofi5.png?v=6`. The site's existing external resources (Pyodide, MathJax CDN fallbacks) all use CDN URLs directly. Ko-fi explicitly requires use of their CDN image to ensure campaigns work correctly.

**Decision**: Use the Ko-fi CDN URL directly as provided. Do not copy the image locally.

**Rationale**: Ko-fi's terms require their hosted image; avoids stale/incorrect image if Ko-fi updates the badge; consistent with how other third-party assets are used on the site.

**Alternatives considered**: Download and serve from `public/` — rejected; Ko-fi terms and maintenance burden.

---

## Summary of Changes Required

| Area | File | Change |
|------|------|--------|
| Layout component | `src/components/layout/Footer.astro` | Add Ko-fi `<a>` with `data-kofi-button`, `rel="noopener noreferrer"`, `target="_blank"` |
| Acceptance feature | `features/kofi-donate-button.feature` | New file — presence and link scenarios |
| Acceptance step defs | `tests/acceptance/step-definitions/kofi-donate-button.steps.ts` | New file — Playwright steps iterating all routes |

No new npm packages. No schema changes. No route changes.
