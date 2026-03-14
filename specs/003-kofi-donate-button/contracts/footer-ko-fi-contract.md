# Contract: Footer Ko-fi Button

**Feature**: `003-kofi-donate-button`  
**Scope**: The rendered HTML element in `Footer.astro` that implements the Ko-fi donation link

---

## Element Contract

The Ko-fi button element MUST be rendered as an `<a>` tag in the footer with the following required attributes:

| Attribute | Required Value | Rationale |
|-----------|---------------|-----------|
| `href` | `https://ko-fi.com/P5P51TYCQS` | Links to the correct campaign (FR-002) |
| `target` | `_blank` | Opens in a new tab; preserves the current page session (FR-002) |
| `rel` | `noopener noreferrer` | OWASP tabnapping mitigation (FR-003) |
| `data-kofi-button` | _(present, any value)_ | Playwright test selector anchor (R-003) |
| `aria-label` | `"Buy Me a Coffee at ko-fi.com"` | Accessible name when image fails to load |

The `<img>` inside the anchor MUST have:

| Attribute | Required Value |
|-----------|---------------|
| `src` | `https://storage.ko-fi.com/cdn/kofi5.png?v=6` |
| `alt` | `"Buy Me a Coffee at ko-fi.com"` |
| `height` | `36` |
| `style` | `border:0px;height:36px;` |

---

## Gherkin Acceptance Scenarios Contract

The file `features/kofi-donate-button.feature` MUST cover:

1. **Presence on all pages** — the button is visible at `[data-kofi-button]` on routes `/`, `/solver`, `/history`, `/about`, `/examples`, `/lesson`.
2. **Correct link target** — the anchor's `href` equals `https://ko-fi.com/P5P51TYCQS`.
3. **Opens in new tab** — the anchor has `target="_blank"`.
4. **Security attribute** — the anchor has `rel` containing `noopener`.

---

## Out of Scope

- Click-through tracking / analytics
- Conditional display (e.g., only after a session threshold)
- Localisation of button text
- Any server-side calls to Ko-fi API
