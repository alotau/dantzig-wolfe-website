<!--
## Sync Impact Report

**Version change**: 1.2.2 → 1.2.3

### Amended Principles
- None.

### Amended Sections
- Technology Stack: added production URL `https://dantzigwolfe.com` to the Hosting entry.

### Templates Reviewed
- `.specify/templates/tasks-template.md` ✅ compatible
- `.specify/templates/plan-template.md` ✅ compatible
- `.specify/templates/spec-template.md` ✅ no changes required
- `.specify/templates/constitution-template.md` ✅ no changes required

### Deferred TODOs
- None.

---

## Previous Report (v1.2.2 — 2026-03-11)

**Version change**: 1.2.1 → 1.2.2

### Amended Principles
- None.

### Amended Sections
- Development Workflow: added new "Temporary files" rule requiring all scratch/diagnostic
  output to be written to the project-local `tmp/` directory rather than the system `/tmp`
  directory.

### Templates Reviewed
- `.specify/templates/tasks-template.md` ✅ compatible
- `.specify/templates/plan-template.md` ✅ compatible
- `.specify/templates/spec-template.md` ✅ no changes required
- `.specify/templates/constitution-template.md` ✅ no changes required

### Deferred TODOs
- None.

---

## Previous Report (v1.2.1 — 2026-03-09)

**Version change**: 1.2.0 → 1.2.1

### Amended Principles
- IV. Branch-Protection & Pull-Request Workflow: added explicit rule requiring the agent/developer
  to return to `main` immediately after a branch is pushed, and to create or switch to a
  new appropriately named branch before beginning any subsequent work.

### Amended Sections
- Development Workflow step 8: added mandatory `git checkout main` after merge/push.
- Development Workflow: added new step 9 for "start next task" to make the return-to-main
  checkpoint explicit in the linear workflow.

### Templates Reviewed
- `.specify/templates/tasks-template.md` ✅ compatible
- `.specify/templates/plan-template.md` ✅ compatible
- `.specify/templates/spec-template.md` ✅ no changes required
- `.specify/templates/constitution-template.md` ✅ no changes required

### Deferred TODOs
- None.

---

## Previous Report (v1.2.0 — 2026-03-08)

### Amended Principles
- IV. Branch-Protection & Pull-Request Workflow: expanded with explicit branch-per-task
  naming convention; specifies that each distinct feature, phase, or independent task MUST
  land on its own branch and MUST NOT accumulate unrelated work.

### Amended Sections
- Development Workflow step 4: expanded with concrete branch-naming examples and the
  requirement to create a new branch before starting any new task.
- Constitution Check Gates: added gate confirming the working branch name matches the
  task being implemented.

### Templates Reviewed
- `.specify/templates/tasks-template.md` ✅ compatible
- `.specify/templates/plan-template.md` ✅ compatible
- `.specify/templates/spec-template.md` ✅ no changes required
- `.specify/templates/constitution-template.md` ✅ no changes required

### Deferred TODOs
- None.

---

## Previous Report (v1.1.0 — 2026-03-07)

**Version change**: 1.0.0 → 1.1.0

### Amended Principles
- II. Client-Side Computation: expanded to explicitly designate Pyodide as the Python solver
  integration mechanism; external solver repository referenced.

### Amended Sections
- Technology Stack: added Pyodide and external Python solver dependency entries.

### Templates Reviewed
- `.specify/templates/plan-template.md` ✅ compatible (Constitution Check gate updated to
  require Pyodide bundle strategy to be documented for solver-related features)
- `.specify/templates/spec-template.md` ✅ no changes required
- `.specify/templates/tasks-template.md` ✅ no changes required
- `.specify/templates/constitution-template.md` ✅ no changes required

### Deferred TODOs
- None. All placeholders resolved.

---

## Previous Report (v1.0.0 — 2026-03-07)

**Version change**: N/A → 1.0.0 (initial ratification)

### Principles Established
- I. Specification-First (new)
- II. Client-Side Computation (new)
- III. Test-First via BDD (new)
- IV. Branch-Protection & Pull-Request Workflow (new)
- V. Security & Quality Gates (new)
- VI. Pedagogical Clarity (new)
-->

# Dantzig-Wolfe Decomposition Website Constitution

## Core Principles

### I. Specification-First

All features MUST be defined as Gherkin `.feature` files before any implementation work begins.
Gherkin scenarios are the authoritative source of truth for system behavior. No implementation
task is valid without a corresponding, accepted Gherkin specification.

**Rationale**: Specification-first discipline ensures shared understanding before code is written,
reduces rework, and provides a living contract for CI-level acceptance testing.

### II. Client-Side Computation

The Dantzig-Wolfe solver, sub-problem solvers, and all mathematical utilities MUST run
on the client (browser). Server infrastructure MUST NOT perform optimization computations.
The server role is strictly limited to static asset delivery and, if unavoidable, lightweight
coordination services with no algorithmic logic.

The canonical solver implementation is the Python package maintained at
`https://github.com/alotau/dantzig-wolfe-python`. This package MUST be integrated into the
browser via **Pyodide** (Python running on WebAssembly in the browser). It MUST NOT be
executed on a server. The Pyodide environment and solver package MUST be loaded, initialized,
and invoked entirely within the user's browser session.

Any future computation that cannot run through Pyodide client-side MUST be justified and
ratified as a constitution amendment before implementation.

**Rationale**: Client-side computation scales without server cost, enables offline use, and
decouples the interactive solver from backend availability. Pyodide provides a standards-
compliant WASM runtime for Python, preserving the investment in the existing Python solver
while honoring the no-server-computation constraint.

### III. Test-First via BDD (NON-NEGOTIABLE)

Tests MUST be written and verified to fail (red) before implementation begins at all levels:

- Gherkin acceptance tests derived from `.feature` files drive feature development.
- Unit tests cover all solver logic, mathematical utilities, and UI components.
- Coding style checks are enforced before any code is considered reviewable.

The Red → Green → Refactor cycle is strictly enforced. No implementation PR is accepted
without a prior failing-test record committed on the feature branch.

### IV. Branch-Protection & Pull-Request Workflow

Direct pushes to `main` are NEVER permitted — including documentation, configuration, and
dependency updates. All changes MUST:

1. Be made on a **dedicated branch scoped to that specific work item**. One branch per
   feature, phase, or independent task. Unrelated work MUST NOT accumulate on a single
   long-lived branch.
2. Follow the branch naming convention: `###-short-kebab-description`, where `###` is the
   relevant task ID or feature number and the description summarises the work.
   Examples:
   - `033-solver-input-page` (a single phase or feature)
   - `040-solver-engine-pyodide` (a discrete implementation unit)
   - `fix-katex-ssr-crash` (a bug fix with no task number)
3. Merge the current `main` into the working branch before pushing.
4. Pass all CI gates (see Principle V) before merge approval.

**Branch lifecycle rule**: A branch MUST be created (or switched to) before the first commit
of its associated work. Retroactively moving commits from an incorrect branch via rebase or
cherry-pick is permitted only if `main` has not yet been compromised. The agent or developer
MUST verify the active branch before making any commit.

**Return-to-main rule**: After a branch has been pushed to the remote (or merged into `main`),
the agent or developer MUST immediately run `git checkout main && git pull` to return to an
up-to-date `main`. All subsequent work MUST start from `main` on a new, appropriately named
branch. Continuing to commit new, unrelated work on a branch that has already been pushed or
merged is NEVER permitted.

**Rationale**: Keeps `main` in a perpetually deployable state, produces a clean and
reviewable commit history aligned to discrete work items, and prevents unreviewed changes
or merge conflicts from reaching production.

### V. Security & Quality Gates

Every CI pipeline run MUST execute all of the following gates, in order:

1. Dependency vulnerability scan (OWASP / supply-chain checks).
2. Coding style and linting checks (zero tolerance for new violations).
3. Unit test suite (100% pass required).
4. Gherkin acceptance test suite (100% pass required).

No PR may be merged if any gate fails. Security vulnerabilities block merge with the same
severity as test failures. New dependencies MUST pass the vulnerability scan before introduction.

### VI. Pedagogical Clarity

All educational content — algorithm history, technical lessons, worked examples, and literature
references — MUST be:

- Mathematically accurate and cited where appropriate.
- Accessible to the target audience: students and practitioners of linear programming and
  combinatorial optimization.
- Free of unexplained jargon: every technical term MUST include an inline definition or a
  link to the site glossary.
- Approved by at least one contributor with domain knowledge before merge.

**Rationale**: The site's primary purpose is teaching. Correctness and clarity are
non-negotiable and take precedence over brevity or stylistic preference.

## Technology Stack

- **Platform**: Static web application; client-side-first architecture.
- **Solver Implementation**: Python package at `https://github.com/alotau/dantzig-wolfe-python`.
- **Solver Runtime**: Pyodide (Python on WebAssembly in-browser) — no server-side computation.
- **Specification Format**: Gherkin (`.feature` files) for all behavioral specifications.
- **Testing**: BDD framework compatible with Gherkin (e.g., Cucumber.js or equivalent);
  unit test framework appropriate to the chosen stack (e.g., Jest, Vitest); Python-level
  solver unit tests run via Pyodide in-browser test harness or in CI via standard Python.
- **CI/CD**: Automated pipeline covering all gates defined in Principle V. The Python solver
  dependency MUST be pinned to an explicit version/commit to ensure reproducible builds.
- **Hosting**: Vercel (static output mode; `@astrojs/vercel` adapter); no compute backend
  required unless amended. Production site live at `https://dantzigwolfe.com`.
- **Versioning**: Semantic versioning (`MAJOR.MINOR.PATCH`) for all released artifacts.

Specific technology choices within these constraints are resolved at the plan stage per
feature. Any deviation from client-side-only computation MUST be documented, justified,
and ratified as a constitution amendment before implementation.

## Development Workflow

1. **Specify**: Author or update Gherkin `.feature` files defining the target behavior.
2. **Plan**: Create an implementation plan per `.specify/templates/plan-template.md`.
   The Constitution Check gate MUST pass before Phase 0 research begins.
3. **Test (Red)**: Write failing unit tests and Gherkin step definitions. Confirm all
   tests fail in CI before opening an implementation PR.
4. **Branch**: Before writing a single line of implementation, create (or switch to) a
   branch named `###-short-kebab-description` scoped to this specific task or phase.
   Check the active branch with `git branch --show-current` before the first commit.
   Merge current `main` into the branch before pushing.
5. **Implement**: Complete implementation targeting green tests. Follow Red → Green → Refactor.
6. **CI Gates**: All gates defined in Principle V MUST pass.
7. **PR & Review**: Open a pull request. At least one reviewer MUST approve. Educational
   content requires domain-knowledge review per Principle VI.
8. **Merge & Clean up**: Squash-merge to `main` after approval. Delete the feature branch.
   Immediately run `git checkout main && git pull` to return to an up-to-date `main`.
9. **Next task**: Before beginning any subsequent work, create or switch to a new branch
   named `###-short-kebab-description` scoped to that next task. Never reuse a pushed branch
   for unrelated work.
10. **Temporary files**: All scratch files, diagnostic scripts, and test-run output (e.g.
    JSON result dumps, analysis scripts, log files) MUST be written to the project-local
    `tmp/` directory (i.e. `<repo-root>/tmp/`). The system `/tmp` directory MUST NOT be
    used; doing so requires manual approval from the project owner and is inefficient.

**Constitution Check Gates** (referenced by `plan-template.md`):

- [ ] Gherkin `.feature` file(s) exist and are accepted for this feature.
- [ ] A dedicated branch named `###-short-kebab-description` has been created for this work
      item; active branch confirmed with `git branch --show-current` before first commit.
- [ ] Failing tests (unit + acceptance step definitions) are committed on the feature branch.
- [ ] `main` has been merged into the working branch.
- [ ] Client-side computation strategy is documented; Pyodide bundle/loading strategy confirmed
      for any solver-related feature; no server computation without amendment.
- [ ] Security scan baseline recorded for any new dependencies introduced.

## Governance

This constitution supersedes all other practices, guidelines, and conventions within this
project. In any conflict, the constitution takes precedence.

**Amendment Procedure**:

1. Open a PR modifying `.specify/memory/constitution.md`.
2. Increment `CONSTITUTION_VERSION` per the versioning policy below.
3. Prepend an updated Sync Impact Report HTML comment to the file.
4. Propagate changes to affected templates in the same PR.
5. Obtain at least one reviewer approval before merge.
6. Set `LAST_AMENDED_DATE` to the actual merge date.

**Versioning Policy**:

- **MAJOR**: Removal or incompatible redefinition of an existing principle.
- **MINOR**: New principle or section added; materially expanded guidance.
- **PATCH**: Clarifications, wording fixes, non-semantic refinements.

**Compliance Review**: Every PR description MUST include a "Constitution Check" section
confirming compliance with all applicable principles. The plan template enforces this gate
formally at the planning stage.

**Version**: 1.2.3 | **Ratified**: 2026-03-07 | **Last Amended**: 2026-03-12
