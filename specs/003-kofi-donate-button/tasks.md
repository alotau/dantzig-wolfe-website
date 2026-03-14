# Tasks: Ko-fi Donation Button

**Input**: Design documents from `/specs/003-kofi-donate-button/`  
**References**: [spec.md](spec.md) · [plan.md](plan.md) · [contracts/footer-ko-fi-contract.md](contracts/footer-ko-fi-contract.md) · [research.md](research.md) · [quickstart.md](quickstart.md)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g., [US1], [US2])
- Exact file paths are included in task descriptions

---

## Phase 1: Setup

**Purpose**: Ensure branch is up to date before any commits (Constitution Principle IV)

- [X] T001 Merge `main` into `003-kofi-donate-button` branch: `git fetch origin && git merge origin/main`

---

## Phase 2: Foundational — Red Tests (Blocking Prerequisite)

**Purpose**: Gherkin feature file and step definitions MUST exist and FAIL before any source code is changed. This is a non-negotiable Constitution gate.

**⚠️ CRITICAL**: No changes to `Footer.astro` until both T002 and T003 are committed and the new tests are confirmed RED.

- [X] T002 [P] Create `features/kofi-donate-button.feature` with 4 scenarios: button present on every route, correct `href`, `target="_blank"`, `rel` containing `noopener` — per Gherkin scenarios contract in `contracts/footer-ko-fi-contract.md`
- [X] T003 [P] Create `tests/acceptance/step-definitions/kofi-donate-button.steps.ts` using `[data-kofi-button]` selector and the route-loop pattern from `tests/acceptance/step-definitions/navigation.steps.ts`
- [X] T004 Run `NODE_OPTIONS='--import tsx' npx cucumber-js` and confirm new steps FAIL — commit the failing tests

**Checkpoint**: New tests exist and are RED — safe to begin implementation

---

## Phase 3: User Story 1 — Visitor Makes an Optional Donation (Priority: P1) 🎯 MVP

**Goal**: A Ko-fi button appears on every page, links to the correct campaign URL, and opens in a new tab with the required security attributes.

**Independent Test**: Load any page and confirm `[data-kofi-button]` is present with `href="https://ko-fi.com/P5P51TYCQS"`, `target="_blank"`, and `rel` containing `noopener`.

- [X] T005 [US1] Add Ko-fi anchor element to `src/components/layout/Footer.astro` with all required attributes: `href="https://ko-fi.com/P5P51TYCQS"`, `target="_blank"`, `rel="noopener noreferrer"`, `data-kofi-button`, `aria-label="Buy Me a Coffee at ko-fi.com"`, and a child `<img>` with `src="https://storage.ko-fi.com/cdn/kofi5.png?v=6"`, `alt="Buy Me a Coffee at ko-fi.com"`, `height="36"`, `style="border:0px;height:36px;"` — per element contract in `contracts/footer-ko-fi-contract.md`
- [X] T006 [US1] Re-run `NODE_OPTIONS='--import tsx' npx cucumber-js` and confirm all US1 scenarios are GREEN; commit

**Checkpoint**: User Story 1 fully functional — button present, correct URL, new tab, secure `rel`

---

## Phase 4: User Story 2 — Button Does Not Distract From Primary Content (Priority: P2)

**Goal**: The Ko-fi button in the footer is unobtrusive and does not cause layout issues at any viewport width, including mobile (320px–1440px).

**Independent Test**: Full acceptance suite passes without regression (SC-003) and footer layout is valid at 320px viewport width (SC-004).

- [X] T007 [P] [US2] Run full Cucumber suite and confirm all pre-existing scenarios pass without regression (SC-003) — `NODE_OPTIONS='--import tsx' npx cucumber-js`
- [X] T008 [P] [US2] Inspect footer rendering at 320px viewport in browser dev tools — if the footer flex row overflows horizontally, add `flex-wrap: wrap` to the footer container in `src/components/layout/Footer.astro`

**Checkpoint**: All user stories complete — button present, non-distracting, no regressions

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Final build validation and PR

- [X] T009 Run `npm run build` and confirm it completes without errors
- [X] T010 [P] Run full acceptance suite against the production build and confirm all scenarios pass
- [X] T011 [P] Run `npm audit --audit-level=moderate` and confirm no new vulnerabilities introduced
- [ ] T012 Open PR from `003-kofi-donate-button` into `main` referencing `specs/003-kofi-donate-button/spec.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — **BLOCKS all implementation**
- **User Story 1 (Phase 3)**: Depends on Phase 2 (red tests committed before touching `Footer.astro`)
- **User Story 2 (Phase 4)**: Depends on Phase 3 (button must be in DOM for regression check)
- **Polish (Phase 5)**: Depends on Phase 4

### User Story Dependencies

| Story | Depends On | Blocked By |
|-------|-----------|------------|
| US1: Donation flow | Phase 2 red tests committed | T002, T003, T004 |
| US2: Non-distraction | US1 button in DOM | T005, T006 |

### Within Each Phase

- **Phase 2**: T002 and T003 are independent files — write in parallel; T004 requires both
- **Phase 3**: T005 before T006 (implement before verify)
- **Phase 4**: T007 and T008 are independent — run in parallel
- **Phase 5**: T009 first; T010 and T011 in parallel; T012 last

### Parallel Opportunities

- **T002 + T003**: Feature file and step definitions are entirely independent — write simultaneously
- **T007 + T008**: Full suite run and viewport check are independent — execute simultaneously
- **T010 + T011**: Build acceptance check and `npm audit` are independent — run simultaneously

---

## Parallel Example: Phase 2

```bash
# Terminal 1 — Write feature file
$EDITOR features/kofi-donate-button.feature

# Terminal 2 — Write step definitions
$EDITOR tests/acceptance/step-definitions/kofi-donate-button.steps.ts

# Then confirm RED and commit:
NODE_OPTIONS='--import tsx' npx cucumber-js
git add features/kofi-donate-button.feature tests/acceptance/step-definitions/kofi-donate-button.steps.ts
git commit -m "test: add failing Ko-fi acceptance scenarios [red]"
```

---

## Implementation Strategy

**MVP Scope**: Phase 3 alone (T005–T006) delivers the complete feature value — US2 is a quality gate, not a new capability.

**Suggested delivery order**:
1. Phase 1 + Phase 2 — merge main, write red tests, commit
2. Phase 3 — add button to footer, confirm green, commit
3. Phase 4 + Phase 5 — regression check, polish, open PR

**Total tasks**: 12  
- Phase 1 (Setup): 1  
- Phase 2 (Foundational): 3  
- Phase 3 (US1 — MVP): 2  
- Phase 4 (US2): 2  
- Phase 5 (Polish): 4  
