# Feature Specification: Solver Wheel Download at Build Time

**Feature Branch**: `004-solver-wheel-ci`  
**Created**: 2026-03-15  
**Status**: Draft  
**Input**: User description: "Download solver wheel from public GitHub releases at build time instead of committing the binary to git"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Build Fetches Wheel Automatically (Priority: P1)

A developer or CI pipeline triggers a build. They do not need to manually place the solver wheel file anywhere; the build process fetches it from the public GitHub releases page automatically and the site compiles successfully.

**Why this priority**: This is the core behaviour change — removing the binary from the repository while keeping the build working. Everything else depends on this working first.

**Independent Test**: Can be fully tested by deleting the local wheel file, running the build command, and confirming the site builds successfully and serves the solver page.

**Acceptance Scenarios**:

1. **Given** the solver wheel file is not present locally, **When** the build runs, **Then** the wheel is downloaded from the public release URL and placed where the build expects it
2. **Given** the build has just downloaded the wheel, **When** the site build completes, **Then** the site correctly serves the solver and the wheel is accessible to end users
3. **Given** the CI pipeline runs on a clean checkout with no cached files, **When** the build step executes, **Then** the wheel is downloaded and the build passes without manual intervention

---

### User Story 2 - Tampered or Corrupted Download Is Rejected (Priority: P2)

When the build downloads the solver wheel, it verifies the file's integrity before using it. If the downloaded file does not match the expected checksum, the build fails immediately with a clear error — it does not silently ship a bad binary.

**Why this priority**: The solver runs user-provided linear programs in the browser. Shipping an unverified binary is a supply-chain security risk. Integrity verification is the primary safeguard.

**Independent Test**: Can be tested by running the download step with an intentionally wrong expected checksum and confirming the build exits with a non-zero status and an informative error message.

**Acceptance Scenarios**:

1. **Given** the expected checksum is recorded in configuration, **When** the downloaded wheel's checksum matches, **Then** the build continues normally
2. **Given** the expected checksum is recorded in configuration, **When** the downloaded wheel's checksum does not match, **Then** the build fails immediately with an error identifying the mismatch
3. **Given** the download itself fails (network error, 404), **When** the build step runs, **Then** the build fails immediately with a clear error message

---

### User Story 3 - Upgrading the Solver Version Is a Config Change (Priority: P3)

When a new version of the solver is released on GitHub, a developer can update the project to use it by changing the version identifier and expected checksum in a single configuration location — not by manually downloading a binary and committing it.

**Why this priority**: This improves the maintainability of the update workflow but is not required for the initial build change to work.

**Independent Test**: Can be tested by bumping the version to a hypothetical new release, confirming the build downloads the new wheel from the expected URL, and verifying the old binary is not present anywhere in the repository.

**Acceptance Scenarios**:

1. **Given** a new solver release exists on GitHub, **When** a developer updates the version and checksum in the single configuration location, **Then** the next build fetches the new wheel without any other changes required
2. **Given** the version is updated, **When** the build runs, **Then** the URL constructed for the download reflects the new version number

---

### Edge Cases

- What happens when the GitHub releases endpoint is temporarily unavailable during a build?
- How does the build behave when run in a network-restricted environment (air-gapped CI)?
- What happens if a developer runs the build locally for the first time without internet access?
- What if the wheel file was previously committed and is still present in git history after being removed from the working tree?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The solver wheel binary file MUST NOT be committed to the repository
- **FR-002**: The solver wheel binary MUST be listed in `.gitignore` so it cannot be accidentally re-committed
- **FR-003**: The build process MUST automatically download the solver wheel from the public GitHub releases URL before site compilation begins
- **FR-004**: The build process MUST verify the SHA-256 checksum of the downloaded wheel against an expected value before using it
- **FR-005**: If the download fails for any reason, the build MUST exit with a non-zero status and a human-readable error message describing the failure
- **FR-006**: If the checksum verification fails, the build MUST exit with a non-zero status and a message indicating the expected and actual checksums
- **FR-007**: The solver version to download and its expected checksum MUST be defined in a single location that is easy to update
- **FR-008**: The CI pipeline MUST invoke the download step before the site compilation step
- **FR-009**: A developer setup script or documented command MUST exist so that local development environments can obtain the wheel without running the full build

### Assumptions

- The `alotau/dantzig-wolfe-python` GitHub repository uses standard GitHub release assets with a stable, predictable URL pattern based on version number
- The existing SHA-256 checksum already recorded in `pyodide-lock.json` is correct for the current wheel and will be updated whenever the version changes
- Local development environments have outbound internet access in the normal case
- The site's runtime behaviour is unchanged — the wheel is still served as a static asset from the same path; only how it arrives on disk changes

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The solver wheel binary is absent from the git repository and its history is clean, reducing repository clone size
- **SC-002**: A clean CI run on a fresh checkout downloads the wheel, verifies its integrity, and produces a passing build with no manual steps
- **SC-003**: A build that receives a corrupted or mismatched wheel exits with a non-zero status 100% of the time before any deployment artifact is produced
- **SC-004**: Updating the solver to a new version requires changes to at most two values (version number and checksum) in one file, with no binary files touched
