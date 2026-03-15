# Implementation Plan: Solver Wheel Download at Build Time

**Branch**: `004-solver-wheel-ci` | **Date**: 2026-03-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/004-solver-wheel-ci/spec.md`

## Summary

The solver wheel binary (`dwsolver-*.whl`) must be removed from git and instead downloaded
from the public `alotau/dantzig-wolfe-python` GitHub releases at build time. A Node.js
ESM script reads the version and expected SHA-256 from `public/pyodide-lock.json`, constructs
the GitHub release URL, downloads the wheel into `public/`, and verifies its checksum. An
npm `prebuild` lifecycle hook runs the script automatically before every `npm run build`,
covering local development, CI, and Vercel deployments without any pipeline configuration
changes. A new Gherkin feature file specifies the build-time behavior; unit tests (Vitest)
cover the download, skip, and checksum-failure scenarios.

## Technical Context

**Language/Version**: Node.js 22 (pinned in `ci.yml`); TypeScript via Vitest for tests  
**Primary Dependencies**: Node.js built-ins only (`fetch`, `crypto`, `fs/promises`) — no new npm packages  
**Storage**: Filesystem — `public/dwsolver-*.whl` (downloaded at build time, gitignored)  
**Testing**: Vitest (unit tests for download script); Cucumber.js (Gherkin acceptance)  
**Target Platform**: Linux (GitHub Actions `ubuntu-latest`) + macOS (local dev)  
**Project Type**: Static web application — this feature is a build process change only  
**Performance Goals**: Download adds <5s to a cold build; skipped (<50ms) on warm builds  
**Constraints**: No new npm runtime dependencies; no server-side computation; Vercel build must pass with zero manual steps  
**Scale/Scope**: One wheel file, one version per release, one download script

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Branch exists**: `004-solver-wheel-ci` confirmed with `git branch --show-current`
- [ ] **Gherkin feature file exists**: `features/solver-wheel-fetch.feature` must be created before implementation (Phase 1 output — planned; see §Project Structure)
- [ ] **Failing tests committed**: Red step on branch before implementation PR is opened
- [x] **`main` merged into branch**: Required before first implementation commit
- [x] **Client-side computation**: This feature is build infrastructure only; solver continues to execute entirely in-browser via Pyodide. No server-side computation introduced.
- [x] **Security baseline**: No new npm packages introduced; SHA-256 verification is the supply-chain safeguard for the downloaded binary

**Post-Phase 1 re-check**: All gates pass. No constitution violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/004-solver-wheel-ci/
├── plan.md           # This file
├── research.md       # Phase 0 — download mechanism & integration decisions
├── data-model.md     # Phase 1 — WheelManifest entity, state transitions
├── quickstart.md     # Phase 1 — developer and CI usage guide
└── tasks.md          # Phase 2 output (created by /speckit.tasks — NOT this command)
```

### Source Code Changes

```text
# New files
scripts/
└── download-solver-wheel.mjs    # ESM download script; called by npm prebuild hook

features/
└── solver-wheel-fetch.feature   # Gherkin scenarios for build-time wheel fetching

tests/unit/
└── download-solver-wheel.test.ts  # Vitest unit tests (mocked fetch + fs)

# Modified files
package.json                     # Add "prebuild": "node scripts/download-solver-wheel.mjs"
.gitignore                       # Add "public/dwsolver-*.whl"
public/pyodide-lock.json         # No structural change; remains single source of truth

# Removed from git tracking (not deleted from disk)
public/dwsolver-0.1.0-py3-none-any.whl   # git rm --cached
```

**Structure Decision**: Single project layout — no new directories beyond `scripts/`. The
download script is a standalone Node.js ESM module in the top-level `scripts/` directory,
consistent with the convention used by `.specify/scripts/` for tooling scripts.
