# Feature Specification: Reference LP Examples in Solver

**Feature Branch**: `001-reference-examples`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "Add the examples that already live in our dantzig-wolfe-python repository to the solver page's example dropdown"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explore a textbook reference problem (Priority: P1)

A student or researcher visiting the solver page wants to quickly load one of the well-known LP examples from the Dantzig-Wolfe literature (Trick, Lasdon, Mitchell, Bertsimas, or Dantzig) so they can see the decomposition applied to a recognised problem without entering data manually.

**Why this priority**: The core value of the solver page is interactive demonstration. Canonical textbook examples that load instantly are the single most important improvement to that demonstration. Every other story depends on these examples being present.

**Independent Test**: Can be fully tested by selecting any of the 5 new examples from the dropdown and verifying the solver produces the expected optimal value.

**Acceptance Scenarios**:

1. **Given** the user is on the solver page, **When** they open the example dropdown, **Then** they see all 5 new reference examples listed alongside the existing ones (Cutting Stock, Two-block LP, Three-block LP).
2. **Given** the user selects "Trick - 2-block LP" from the dropdown, **When** the problem loads and they run the solver, **Then** the optimal objective value displayed is -40.
3. **Given** the user selects "Lasdon - 2-block LP" from the dropdown, **When** the problem loads and they run the solver, **Then** the optimal objective value displayed is approximately -36.67.
4. **Given** the user selects "Mitchell - 1-block LP" from the dropdown, **When** the problem loads and they run the solver, **Then** the optimal objective value displayed is -5.
5. **Given** the user selects "Bertsimas - 1-block LP" from the dropdown, **When** the problem loads and they run the solver, **Then** the optimal objective value displayed is -21.5.
6. **Given** the user selects "Dantzig - 3-block LP" from the dropdown, **When** the problem loads and they run the solver, **Then** the solver completes without error and returns an optimal result.

---

### User Story 2 - Understand the source of an example (Priority: P2)

A user who loads a reference example can see which textbook or web resource the example originates from, so they can follow up with the original source material.

**Why this priority**: Credibility and educational value - users need to trust that these are genuine reference problems. However, the solver works without this metadata, making it secondary to P1.

**Independent Test**: Can be tested by loading any reference example and checking that the problem panel displays a source attribution.

**Acceptance Scenarios**:

1. **Given** the user has loaded any of the 5 reference examples, **When** they view the problem description area, **Then** a source attribution is shown (author, title, or URL).
2. **Given** the user loads the Trick example, **Then** the attribution references the Trick web resource.
3. **Given** the user loads the Bertsimas example, **Then** the attribution references Bertsimas & Tsitsiklis "Introduction to Linear Optimization".

---

### Edge Cases

- What happens when a reference example JSON file is missing or malformed? The solver page must display a user-readable error rather than silently failing or crashing.
- What if a reference example's problem is infeasible or unbounded? The solver must report that status clearly rather than timing out.
- Examples with a single subproblem block (Mitchell, Bertsimas) must behave correctly - the coupling constraints must still be evaluated under decomposition.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The example dropdown on the solver page MUST include all 5 reference examples: Trick (2-block), Lasdon (2-block), Mitchell (1-block), Bertsimas (1-block), and Dantzig (3-block).
- **FR-002**: Each reference example MUST load into the solver by selecting it from the dropdown with no further manual data entry required.
- **FR-003**: Each reference example MUST conform to the existing problem schema used by the current examples so no solver code changes are required.
- **FR-004**: Each reference example MUST specify an objective direction (minimise or maximise).
- **FR-005**: Each reference example MUST include a human-readable name and a brief description identifying its origin.
- **FR-006**: The coupling constraint matrix in each example MUST be complete and correct - no missing rows or columns.
- **FR-007**: Variable and constraint labels MUST be present in each example to support display in the solution visualisation panel.
- **FR-008**: Loading a reference example MUST clear any previously loaded solution, consistent with the behaviour of existing examples.

### Key Entities

- **Problem Instance**: A fully specified LP decomposition problem - objective direction, coupling matrix, subproblem blocks, variable labels, constraint labels, and source metadata. Each reference example is one Problem Instance.
- **Example Entry**: A dropdown item mapping a human-readable label to a Problem Instance identifier. Each new reference example requires one Example Entry in the solver UI.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: All 5 reference examples appear in the solver dropdown when the page loads - verifiable by counting dropdown items (8 total after this feature).
- **SC-002**: Each of the 5 examples produces the correct known optimal value when solved: Trick -40, Lasdon -36.67, Mitchell -5, Bertsimas -21.5, Dantzig produces a bounded optimal.
- **SC-003**: Selecting a reference example and running the solver takes no longer than the equivalent action with the existing built-in examples.
- **SC-004**: Each example displays a source attribution, enabling a user to locate the original problem in under 1 minute.
- **SC-005**: No existing examples (Cutting Stock, Two-block LP, Three-block LP) are broken or altered by the addition of the reference examples.

## Assumptions

- All 5 reference examples are minimisation problems. No maximisation examples are included in this feature scope.
- The "ref_four_sea" fixture from the dantzig-wolfe-python test suite is explicitly excluded because its size (4 blocks x ~440 variables, 818 local constraints each) is unsuitable for in-browser demonstration.
- Conversion from the Python fixture format (sparse COO coupling matrix) to the website JSON schema (dense coupling matrix) is a one-time offline operation, not a runtime concern.
- The optimal value for the Dantzig 3-block example is accepted as correct from the solver output, subject to the pending T060 domain review.
