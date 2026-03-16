Feature: Interactive Solver — Problem Input
  As a student or researcher
  I want to specify a properly decomposed LP problem in the interactive solver
  So that I can observe Dantzig-Wolfe Decomposition applied to my own problem instance

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website
    And I have navigated to the Interactive Solver

  Scenario: See a blank solver workspace on first visit
    When I arrive at the Interactive Solver for the first time
    Then I see a workspace with an empty problem input area
    And I see instructions explaining the expected decomposed problem format
    And I see a link to the glossary for any terms used in the instructions

  Scenario: Input coupling constraints
    When I enter the coupling constraint matrix A0, right-hand-side vector b0, and sense for each constraint
    Then the input is accepted and displayed in a structured table
    And the number of coupling constraints is shown

  Scenario: Input a sub-problem block
    When I add a sub-problem block with constraint matrix A_k, right-hand-side vector b_k, and objective cost vector c_k
    Then the sub-problem is added to the workspace
    And it is labelled with its block index k
    And the number of variables and constraints in the sub-problem is shown

  Scenario: Add multiple sub-problem blocks
    When I add two or more sub-problem blocks
    Then each block appears as a distinct section in the workspace
    And I can expand or collapse individual blocks

  Scenario: Specify variable bounds
    When I specify lower and upper bounds for variables in any sub-problem block
    Then the bounds are stored with the corresponding variable
    And variables with default bounds (0, unbounded) are indicated as such without requiring explicit entry

  Scenario: Load a pre-built example problem
    When I select a pre-built example from the examples dropdown
    Then the workspace is populated with the corresponding coupling constraints and sub-problem blocks
    And a description of the example is displayed alongside the input
    And I can modify the loaded data before solving

  Scenario: Reference examples from published literature are available in the dropdown
    When I open the examples dropdown
    Then I see "Trick – 2-block LP" as an available option
    And I see "Lasdon – 2-block LP" as an available option
    And I see "Mitchell – 1-block LP" as an available option
    And I see "Bertsimas – 1-block LP" as an available option
    And I see "Bertsimas – 2-block LP" as an available option
    And I see "Bertsimas – 3-block LP" as an available option
    And I see "Dantzig – 3-block LP" as an available option

  Scenario: Loading a new example clears any previous solution
    Given the solver has produced a result for the current problem
    When I select a different pre-built example from the examples dropdown
    Then the previous solution and iteration log are no longer visible
    And the status badge is reset

  Scenario: Clear the workspace
    When I click "Clear"
    Then all input fields are reset to empty
    And no sub-problem blocks remain
    And a confirmation is requested before clearing if any data has been entered

  Scenario: Input is validated before solving
    When I attempt to solve a problem with incompatible dimensions
    Then I see a clear error message identifying the dimension mismatch
    And the solver does not start until the error is resolved

  Scenario: Input rejects non-numeric values
    When I enter a non-numeric value in a matrix or vector cell
    Then the cell is highlighted as invalid
    And an inline message explains that a numeric value is required
    And the solver does not start while any cell is invalid

