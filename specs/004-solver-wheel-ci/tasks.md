# Tasks: Solver Wheel Download at Build Time

**Input**: Design documents from `/specs/004-solver-wheel-ci/`
**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ quickstart.md ✅

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Exact file paths included in all descriptions

---

## Phase 1: Setup (Remove Binary From Git)

**Purpose**: Clean the repository before any new code is written. These are pure configuration/git operations.

- [X] T001 Remove `public/dwsolver-0.1.0-py3-none-any.whl` from git tracking by running `git rm --cached public/dwsolver-0.1.0-py3-none-any.whl` (file stays on disk)
- [X] T002 [P] Add `public/dwsolver-*.whl` glob pattern to `.gitignore` (after the existing `tmp/` entry)

**Checkpoint**: `git status` shows `.gitignore` modified and `public/dwsolver-0.1.0-py3-none-any.whl` deleted (staged); wheel file still present on disk untracked

---

## Phase 2: Foundational (Red Tests — MUST FAIL Before Implementation)

**Purpose**: Establish all behavioural and unit specifications in failing state before any implementation begins. Per Constitution Principle III, failing tests MUST be committed on the feature branch before Phase 3 begins.

**⚠️ CRITICAL**: No user story work can begin until all tests in this phase are confirmed to fail (RED).

- [X] T003 Create `features/solver-wheel-fetch.feature` with Gherkin scenarios covering: (1) absent wheel → downloaded and verified → exit 0, (2) present wheel → skipped → exit 0, (3) checksum mismatch → exit 1 with expected/actual hashes in stderr, (4) network/404 failure → exit 1 with error detail in stderr
- [X] T004 [P] Create failing Cucumber step definitions stub in `tests/acceptance/step-definitions/solver-wheel-fetch.steps.ts` — import `@cucumber/cucumber`; define all steps from `solver-wheel-fetch.feature` as `pending()` so the dry-run reports 0 undefined steps and all scenarios are pending
- [X] T005 [P] Create failing Vitest unit test file `tests/unit/download-solver-wheel.test.ts` — write `describe` blocks and `it` cases for: `readWheelManifest()` (returns version/fileName/sha256 from pyodide-lock.json), `constructDownloadUrl()` (returns correct GitHub URL pattern for v0.1.0 and for a hypothetical v0.2.0), skip-if-present guard (exits 0 without fetching when file exists), download success (fetch called once, file written), checksum mismatch (process exits 1 with expected/actual in output), fetch failure (process exits 1 with error detail); all cases fail with "function not found" or similar since script is not yet implemented
- [X] T006 Verify RED state: run `npx vitest run tests/unit/download-solver-wheel.test.ts` (expect failures) and `npm run test:acceptance:dry-run` (expect 0 undefined steps, all scenarios pending); commit results on branch

**Checkpoint**: All unit tests fail; Cucumber dry-run reports 0 undefined steps with all solver-wheel-fetch scenarios pending; committed to `004-solver-wheel-ci`

---

## Phase 3: User Story 1 — Build Fetches Wheel Automatically (Priority: P1) 🎯 MVP

**Goal**: Running `npm run build` on a machine without the wheel fetches it automatically from the public GitHub release and the Astro build completes successfully.

**Independent Test**: Delete wheel (`rm public/dwsolver-*.whl`), run `npm run build`, confirm wheel appears in `public/` and site build succeeds.

- [ ] T007 [US1] Create `scripts/download-solver-wheel.mjs` and implement `readWheelManifest()` — reads `public/pyodide-lock.json`, extracts `packages['dantzig-wolfe-python']` entry, returns `{ version, fileName, sha256 }`, throws with clear message if file unreadable or entry missing
- [ ] T008 [US1] Implement `constructDownloadUrl(version, fileName)` in `scripts/download-solver-wheel.mjs` — returns `https://github.com/alotau/dantzig-wolfe-python/releases/download/v${version}/${fileName}`
- [ ] T009 [US1] Implement skip-if-present guard in `scripts/download-solver-wheel.mjs` — check if `public/${fileName}` exists using `fs.access()`; if present, print `[solver-wheel] Found ${fileName} — skipping download.` to stdout and `process.exit(0)`
- [ ] T010 [US1] Implement `downloadWheel(url, destPath)` in `scripts/download-solver-wheel.mjs` — `fetch(url)`, assert `response.ok` (throw with URL + status if not), stream `response.body` to `destPath` using `pipeline()` from `node:stream/promises`
- [ ] T011 [US1] Implement `main()` entry point in `scripts/download-solver-wheel.mjs` — calls `readWheelManifest()`, `constructDownloadUrl()`, skip-if-present guard, `downloadWheel()`, prints `[solver-wheel] Downloaded ${fileName}.` on success, catches and re-throws errors with `[solver-wheel]` prefix to stderr then `process.exit(1)`
- [ ] T012 [US1] Add `"prebuild": "node scripts/download-solver-wheel.mjs"` to the `scripts` object in `package.json` (after the `"build"` entry)

**Checkpoint**: Delete wheel, run `npm run build` — wheel downloads, Astro build completes, site serves solver page; US1 unit tests in T005 for happy-path cases now pass (GREEN)

---

## Phase 4: User Story 2 — Tampered or Corrupted Download Is Rejected (Priority: P2)

**Goal**: Any mismatch between the downloaded wheel's SHA-256 and the expected value in `pyodide-lock.json` causes an immediate non-zero exit with a clear error. Network and HTTP errors also produce an informative failure.

**Independent Test**: Set expected SHA-256 to a wrong value in test, run download script, confirm exit code 1 and stderr contains expected/actual hashes.

- [ ] T013 [US2] Implement `computeSha256(filePath)` in `scripts/download-solver-wheel.mjs` — uses `node:crypto` `createHash('sha256')` with `createReadStream(filePath)` via `pipeline()`; returns hex digest string
- [ ] T014 [US2] Integrate checksum verification into `main()` in `scripts/download-solver-wheel.mjs` — after `downloadWheel()` completes, call `computeSha256(destPath)` and compare to `manifest.sha256`; if mismatch: delete downloaded file, print `[solver-wheel] Checksum mismatch! expected: ${manifest.sha256} actual: ${actual}` to stderr, `process.exit(1)`; print `[solver-wheel] Downloaded and verified ${fileName}.` on success
- [ ] T015 [US2] Add HTTP and network error handling in `downloadWheel()` in `scripts/download-solver-wheel.mjs` — check `!response.ok` before streaming and throw `Download failed: ${response.status} ${response.statusText} — ${url}`; catch `fetch` rejections (DNS/network) and rethrow with `Network error downloading ${url}: ${err.message}`

**Checkpoint**: US2 unit tests from T005 now pass (GREEN): checksum mismatch → exit 1 with correct message, fetch failure → exit 1 with correct message; US1 tests remain green

---

## Phase 5: User Story 3 — Upgrading Is a Config Change (Priority: P3)

**Goal**: Confirm that the URL derived by the download script is fully dynamic from `pyodide-lock.json` values, and that the solver worker's fallback constant is kept aligned for future version bumps.

**Independent Test**: US3 unit test in T005 for `constructDownloadUrl()` with version `0.2.0` passes automatically once T008 is done correctly (validates dynamic derivation without extra implementation).

- [ ] T016 [P] [US3] Update `DEFAULT_DW_WHEEL_URL` fallback constant in `src/workers/solver.worker.ts` — change hardcoded value `/dwsolver-0.1.0-py3-none-any.whl` to a comment-annotated constant noting it mirrors the `url` field in `public/pyodide-lock.json` and must be kept in sync when the version is updated there

**Checkpoint**: All US3 unit tests (URL construction with bumped version) pass; worker fallback constant updated and consistent with pyodide-lock.json

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Full verification sweep, lint confirmation, and end-to-end smoke test.

- [ ] T017 [P] Run `npx vitest run tests/unit/download-solver-wheel.test.ts` and confirm all tests pass GREEN; fix any remaining failures
- [ ] T018 [P] Run `npm run test:acceptance:dry-run` and confirm `solver-wheel-fetch.feature` has 0 undefined steps; implement any missing Cucumber step definitions in `tests/acceptance/step-definitions/solver-wheel-fetch.steps.ts`
- [ ] T019 Run `npm run lint` and fix any lint/formatting issues in `scripts/download-solver-wheel.mjs` and `tests/unit/download-solver-wheel.test.ts`
- [ ] T020 End-to-end smoke test: run `rm -f public/dwsolver-*.whl && npm run build` from a clean state; confirm wheel is downloaded, SHA-256 verified, and Astro build completes without errors
- [ ] T021 [P] Confirm `git ls-files public/dwsolver-*.whl` returns empty (binary no longer tracked) and `git status` shows clean after a full build

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational/Red)**: Can begin alongside Phase 1; T003→T004/T005→T006 within phase
- **Phase 3 (US1)**: Requires Phase 2 complete (T006 confirmed) — BLOCKED until RED state committed
- **Phase 4 (US2)**: Requires Phase 3 complete (T011 done) — extends the download pipeline
- **Phase 5 (US3)**: Can start anytime after T008 is done (T016 is in a different file)
- **Phase 6 (Polish)**: Requires all implementation phases complete

### User Story Dependencies

- **US1 (P1)**: Depends on Foundational only — no other story dependency
- **US2 (P2)**: Depends on US1 (T010/T011 must exist to extend); independently testable via unit tests
- **US3 (P3)**: Depends on US1 (T008 provides the `constructDownloadUrl()` being tested); T016 is independent of US1/US2 (different file)

### Within Each Phase

- Phase 2: T003 first → T004 + T005 in parallel → T006 confirms RED
- Phase 3: T007 → T008 → T009 → T010 → T011 → T012 (all sequential, single file except T012)
- Phase 4: T013 → T014 → T015 (sequential, single file)
- Phase 5: T016 parallel with Phase 4 (different file: `src/workers/solver.worker.ts`)

---

## Parallel Opportunities

### Phase 1 (T001 + T002)

```
T001 git rm --cached (modifies git index)
T002 edit .gitignore (different concern)
→ Start both simultaneously
```

### Phase 2 (T004 + T005 after T003)

```
T003 → features/solver-wheel-fetch.feature (must finish first)
       ├── T004 → tests/acceptance/step-definitions/solver-wheel-fetch.steps.ts
       └── T005 → tests/unit/download-solver-wheel.test.ts
→ T004 and T005 in parallel (different files)
→ T006 after both complete
```

### Phase 5 (T016) vs Phase 4

```
Phase 4 (T013 → T014 → T015) in scripts/download-solver-wheel.mjs
T016 in src/workers/solver.worker.ts
→ T016 can run in parallel with all of Phase 4
```

### Phase 6 (T017 + T018 + T019)

```
T017 vitest run (unit test runner)
T018 cucumber dry-run (acceptance runner)
T019 lint check
→ All three can run simultaneously; T020 waits for all three
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Remove binary from git
2. Complete Phase 2: Write all tests (RED committed)
3. Complete Phase 3: US1 — download script + prebuild hook
4. **STOP and VALIDATE**: delete wheel, run `npm run build`, confirm end-to-end; US1 unit tests green
5. Demo-ready: build pipeline works without committed binary

### Incremental Delivery

1. Phase 1 + Phase 2 → Clean repo, red tests committed
2. Phase 3 (US1) → Build auto-fetches wheel; deploy without binary in repo
3. Phase 4 (US2) → Supply-chain verification; safer deployments
4. Phase 5 (US3) → One-place version upgrades; maintainability confirmed
5. Phase 6 → Full clean sweep; all gates green

---

## Summary

| Phase | Tasks | Stories | Key Deliverable |
|-------|-------|---------|-----------------|
| 1 — Setup | T001–T002 | — | Binary removed from git tracking |
| 2 — Foundational | T003–T006 | — | Gherkin + unit tests in RED state |
| 3 — US1 | T007–T012 | US1 | `scripts/download-solver-wheel.mjs` + `prebuild` hook |
| 4 — US2 | T013–T015 | US2 | SHA-256 verification + error handling |
| 5 — US3 | T016 | US3 | Worker fallback constant aligned |
| 6 — Polish | T017–T021 | — | All gates green; clean end-to-end build |

**Total tasks**: 21  
**Parallel opportunities**: 4 identified (Phase 1, Phase 2, T016 vs Phase 4, Phase 6)  
**MVP scope**: Phases 1–3 (US1) — 12 tasks
