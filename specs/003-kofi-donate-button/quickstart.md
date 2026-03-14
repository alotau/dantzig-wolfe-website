# Quickstart: Ko-fi Donation Button

**Feature**: `003-kofi-donate-button`  
**Branch**: `003-kofi-donate-button`

## What This Feature Does

Adds a Ko-fi donation button to the site footer that appears on every page, linking visitors to the site owner's Ko-fi page in a new tab.

## Files Changed

| File | Action |
|------|--------|
| `src/components/layout/Footer.astro` | Add Ko-fi anchor + image |
| `features/kofi-donate-button.feature` | New Gherkin acceptance scenarios |
| `tests/acceptance/step-definitions/kofi-donate-button.steps.ts` | New Playwright step implementations |

## Implementation Steps (Red → Green → Refactor)

### 1. Write the feature file (Red)

Create `features/kofi-donate-button.feature` with scenarios for button presence across all pages and correct link target. Run the test suite and confirm the new scenarios **fail** (no step definitions yet).

### 2. Write failing step definitions (Red)

Create `tests/acceptance/step-definitions/kofi-donate-button.steps.ts`. Implement the steps with `data-kofi-button` selectors. Run again — steps now execute but **fail** because `Footer.astro` has no button yet. Commit this red state to the feature branch.

### 3. Add the Ko-fi button to the footer (Green)

In `src/components/layout/Footer.astro`, insert inside the footer's flex row:

```html
<a
  href="https://ko-fi.com/P5P51TYCQS"
  target="_blank"
  rel="noopener noreferrer"
  data-kofi-button
  aria-label="Buy Me a Coffee at ko-fi.com"
>
  <img
    height="36"
    style="border:0px;height:36px;"
    src="https://storage.ko-fi.com/cdn/kofi5.png?v=6"
    alt="Buy Me a Coffee at ko-fi.com"
  />
</a>
```

### 4. Run the full acceptance suite (Green)

```bash
npm run build && npm run preview -- --port 4321 &
NODE_OPTIONS='--import tsx' npx cucumber-js --format json:tmp/kofi-results.json
```

All new scenarios should pass. All existing scenarios should still pass (regression check for SC-003).

### 5. Open a PR

```bash
git add features/kofi-donate-button.feature \
        tests/acceptance/step-definitions/kofi-donate-button.steps.ts \
        src/components/layout/Footer.astro
git commit -m "feat(003): add Ko-fi donation button to footer"
git push origin 003-kofi-donate-button
```
