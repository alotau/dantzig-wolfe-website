# Feature Specification: Ko-fi Donation Button

**Feature Branch**: `003-kofi-donate-button`  
**Created**: 2026-03-13  
**Status**: Draft  
**Input**: User description: "Add a Ko-fi donation button to each page to allow folks to donate to me for providing the page if it was useful for them."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor makes an optional donation (Priority: P1)

A visitor has found the interactive solver or educational content useful and wants to show appreciation by making a small donation. They click the Ko-fi button visible on the page, are taken to the site owner's Ko-fi page in a new tab, and can choose to donate or leave without any further interaction with the main site.

**Why this priority**: This is the entire purpose of the feature. Every other story is secondary to the button being present and functional.

**Independent Test**: Can be fully tested by loading any page and verifying a visible Ko-fi button exists that links to the correct Ko-fi URL in a new tab.

**Acceptance Scenarios**:

1. **Given** a visitor is on any page of the site, **When** they view the page, **Then** they see a Ko-fi donation button.
2. **Given** a visitor sees the Ko-fi button, **When** they click it, **Then** they are taken to `https://ko-fi.com/P5P51TYCQS` in a new browser tab.
3. **Given** a visitor clicks the Ko-fi button, **Then** the current page remains open and unchanged.

---

### User Story 2 - Button does not distract from primary content (Priority: P2)

A student using the solver or reading an educational article is not interrupted or distracted by the donation prompt. The button is present but unobtrusive, positioned so it does not obscure any interactive elements.

**Why this priority**: The educational mission of the site is paramount. A donation button that degrades the learning experience would be counterproductive.

**Independent Test**: Can be verified by checking that all existing page content and interactive elements (solver, navigation, glossary panel) remain fully accessible with the button present.

**Acceptance Scenarios**:

1. **Given** the Ko-fi button is present on the solver page, **When** a user interacts with the solver controls, **Then** the button does not obstruct any input fields or buttons.
2. **Given** the Ko-fi button is present on any page, **When** the page is viewed on a mobile-width screen, **Then** the button is visible but does not cause horizontal scrolling or overlap other content.

---

### Edge Cases

- What happens if the Ko-fi CDN image is unavailable? The link should still be functional even if the image fails to load (the `alt` text provides fallback).
- The button must open in a new tab (`target="_blank"`) to avoid navigating the user away from the site mid-session (especially important on the solver page where state would be lost).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Ko-fi donation button MUST appear on every page of the site (home, solver, history, about, examples, lessons, glossary).
- **FR-002**: The button MUST link to `https://ko-fi.com/P5P51TYCQS` and MUST open in a new tab so the current page is not navigated away from.
- **FR-003**: The button link MUST include `rel="noopener noreferrer"` when opening in a new tab, to prevent the opened page from accessing the originating window.
- **FR-004**: The button MUST display the official Ko-fi badge image with appropriate alt text ("Buy Me a Coffee at ko-fi.com") so the purpose is clear to all users including those using assistive technology.
- **FR-005**: The button MUST be positioned consistently across all pages — in the site footer so it is always accessible without interfering with primary page content.
- **FR-006**: The button image MUST be served from the Ko-fi CDN (`https://storage.ko-fi.com/cdn/kofi5.png?v=6`) as provided by Ko-fi.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The Ko-fi button is visible on every page of the site — verifiable by loading each route and confirming the button is present.
- **SC-002**: Clicking the button opens `https://ko-fi.com/P5P51TYCQS` in a new tab on every page — verifiable by automated acceptance test.
- **SC-003**: No existing page functionality is broken or obscured by the addition of the button — verifiable by the existing acceptance test suite passing without regression.
- **SC-004**: The button renders correctly at all common viewport widths (320px–1440px) without causing layout overflow.

## Assumptions

- The Ko-fi button is placed in the existing `Footer.astro` component, which is already rendered on every page via `BaseLayout.astro`. This requires no per-page changes.
- The Ko-fi CDN URL and campaign ID (`P5P51TYCQS`) are stable and provided by the site owner — no server-side integration or API key is required.
- The button height is fixed at 36px as specified in the Ko-fi-provided HTML snippet, which is appropriate for footer placement.
