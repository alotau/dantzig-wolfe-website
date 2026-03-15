# Research: Solver Wheel Download at Build Time

**Branch**: `004-solver-wheel-ci` | **Date**: 2026-03-15  
**Status**: Complete — all NEEDS CLARIFICATION items resolved

---

## §1 — Download Mechanism

**Decision**: Native Node.js `fetch` + `crypto` + `fs/promises` in a plain ESM script
(`scripts/download-solver-wheel.mjs`) — no new dependencies.

**Rationale**: Node.js 22 (the version pinned in `ci.yml`) ships `fetch`, `crypto.subtle`,
and `fs/promises` as globals/built-ins. A Node.js script is:
- Cross-platform (macOS + Linux CI) without relying on `curl`/`wget` availability.
- Consistent with the project's existing TypeScript/Node.js toolchain.
- Executable as `node scripts/download-solver-wheel.mjs` without compilation or extra
  runtime dependencies.

**Alternatives considered**:
- `curl`+`sha256sum` shell script: Simpler at first glance, but macOS uses `shasum -a 256`
  while Linux uses `sha256sum`; handling the difference adds fragility.
- `wget`: Not installed by default on macOS.
- An npm package (`got`, `node-fetch`): Unnecessary — `fetch` is native since Node 18.

---

## §2 — Integration Point (Build Hook)

**Decision**: npm `prebuild` lifecycle hook.

**Rationale**: npm automatically runs a `prebuild` script before any `build` invocation.
This means:
- `npm run build` (local, CI, Vercel) automatically triggers the download without
  any additional configuration.
- The Vercel build pipeline uses `npm run build` as its build command; no Vercel-specific
  config changes are required.
- CI (`ci.yml`) already runs `npm run build`; no changes to the workflow file are needed
  for the download to trigger.

No explicit `prebuild` step in `ci.yml` is needed.

**Alternatives considered**:
- A separate CI step (`Download wheel`) before the build step: Requires editing `ci.yml`
  and any Vercel config; the two places can drift out of sync.
- An Astro `vite` plugin hook: Possible, but hooks Vite's lifecycle rather than npm's —
  it would not run for `npm run dev` unless deliberately added, leading to confusion.

---

## §3 — Configuration Source

**Decision**: Read `VERSION` and `SHA256` from the existing `public/pyodide-lock.json`.

**Rationale**: `pyodide-lock.json` already carries `version` and `sha256` for the
`dantzig-wolfe-python` package. Reading from this file keeps a single source of truth.
When upgrading the solver, the developer only edits `pyodide-lock.json` (updating `version`,
`fileName`, `sha256`, and `url`) and everything else — the download script, the worker
fallback, and the browser runtime — derives from that file automatically.

**URL pattern**:
```
https://github.com/alotau/dantzig-wolfe-python/releases/download/v{VERSION}/{FILENAME}
```
For the current wheel: `https://github.com/alotau/dantzig-wolfe-python/releases/download/v0.1.0/dwsolver-0.1.0-py3-none-any.whl`

The `url` field already recorded in `pyodide-lock.json` is a root-relative local path
(`/dwsolver-0.1.0-py3-none-any.whl`) used at runtime. The download script derives the
remote GitHub release URL from the `version` and `fileName` fields, rather than depending
on the `url` field. This keeps the runtime URL (local CDN path) and the build-time download
URL (GitHub release) separate concerns.

**Alternatives considered**:
- A dedicated `wheel.config.json`: Duplicates data already in `pyodide-lock.json`.
- Reading a `SOLVER_WHEEL_VERSION` env var: Less discoverable; forces every developer and
  CI configuration to declare the env var explicitly.

---

## §4 — Skip-If-Present Logic

**Decision**: Skip the download (and checksum verification) if the file already exists.

**Rationale**: In local development, once the wheel has been downloaded it does not change
between `npm run build` invocations. Re-downloading on every build adds seconds of latency.
The skip logic trusts the previously downloaded file because it was verified on the way in.

A developer who wants to force a re-download (e.g., after updating the version in
`pyodide-lock.json`) simply deletes the file or runs the script directly.

**Alternatives considered**:
- Always verify checksum even when file exists: Safer against accidental corruption but
  adds a disk read + hash computation on every build.
- Always re-download: Simplest logic but unnecessary network traffic and latency.

---

## §5 — `.gitignore` Entry

**Decision**: Add `public/dwsolver-*.whl` to `.gitignore`.

**Rationale**: The glob pattern `public/dwsolver-*.whl` excludes all patch/minor versions
of the wheel without requiring updates to `.gitignore` when the version changes. The existing
`public/dwsolver-0.1.0-py3-none-any.whl` must also be removed from git tracking with
`git rm --cached`.

---

## §6 — Gherkin Feature File

**Decision**: A new `features/solver-wheel-fetch.feature` file is required per Constitution
Principle I.

**Rationale**: The constitution mandates Gherkin feature files for all features. While
the end-user behaviour (solver works in browser) is already covered by existing feature
files, the *build-time* behaviour of the download script is new and testable at the Node.js
unit level (see §7).

**Scenarios to specify**:
1. Fresh build: wheel absent → downloaded and verified → build proceeds
2. Subsequent build: wheel present → skipped
3. Corrupted / checksum mismatch → build exits non-zero
4. Network failure / 404 → build exits non-zero

**Note**: These scenarios are validated by unit tests of the download script, NOT by
Playwright-level browser acceptance tests. The Cucumber step definitions call the
Node.js script directly in a temp directory.

---

## §7 — Testing Strategy

**Decision**: Unit-test the download script with Vitest using filesystem and network mocking.

**Rationale**: The download script has three independently testable units:
- URL construction from `pyodide-lock.json` values
- Checksum verification of an existing file
- Download + verify pipeline

Vitest's `vi.spyOn` / `vi.mock` allows mocking `fetch` and `fs` without real network calls.
The happy path (a real download against GitHub) optionally runs in CI as an integration test
tagged `@slow`.

**Alternatives considered**:
- Only testing end-to-end (Playwright + Gherkin): Would require a real network call and a
  full build in every test run; too slow for a unit gate.
- No tests at all: Unacceptable per Principle III.
