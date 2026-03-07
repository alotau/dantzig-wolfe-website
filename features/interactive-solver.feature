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

  Scenario: Clear the workspace
    When I click "Clear"
    Then all input fields are reset to empty
    And no sub-problem blocks remain
    And a confirmation is requested before clearing if any data has been entered

  Scenario: Input is validated before solving
    When I attempt to solve a problem with incompatible dimensions
      (e.g. the number of columns in A0 does not match the total variables across sub-problems)
    Then I see a clear error message identifying the dimension mismatch
    And the solver does not start until the error is resolved

  Scenario: Input rejects non-numeric values
    When I enter a non-numeric value in a matrix or vector cell
    Then the cell is highlighted as invalid
    And an inline message explains that a numeric value is required
    And the solver does not start while any cell is invalid


Feature: Interactive Solver — Running the Solver
  As a student or researcher
  I want to run the Dantzig-Wolfe solver on my input problem
  So that I can see the decomposition algorithm execute and produce a solution

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website
    And I have navigated to the Interactive Solver
    And I have entered a valid decomposed problem

  Scenario: Start the solver
    When I click "Solve"
    Then the solver initialises in the browser using the Pyodide runtime
    And a progress indicator is shown while the solver is running
    And the interface remains responsive during solving

  Scenario: See the solver initialise Pyodide on first use
    Given the Pyodide runtime has not yet been loaded in this session
    When I click "Solve" for the first time
    Then I see a loading message indicating the solver environment is being prepared
    And once Pyodide is ready the solver begins automatically without further input

  Scenario: View the iteration log as solving progresses
    When the solver is running
    Then I see a live iteration log that updates after each Dantzig-Wolfe iteration
    And each log entry shows the iteration number, the current master problem objective value, and the best reduced cost found across sub-problems

  Scenario: Solver reaches an optimal solution
    When the solver terminates with an optimal solution
    Then I see a "Solved — Optimal" status message
    And the final objective value is prominently displayed
    And the optimal primal solution values for all variables are shown

  Scenario: Solver detects an infeasible problem
    Given I have entered a problem that is infeasible
    When the solver terminates
    Then I see a "Solved — Infeasible" status message
    And a brief explanation of what infeasibility means in this context is shown

  Scenario: Solver detects an unbounded problem
    Given I have entered a problem that is unbounded
    When an unbounded sub-problem direction is found
    Then I see a "Solved — Unbounded" status message
    And the sub-problem that produced the unbounded ray is identified

  Scenario: Cancel a running solve
    When I click "Cancel" while the solver is running
    Then the solver stops after completing the current iteration
    And the iteration log up to that point remains visible
    And I can modify the problem and re-solve without reloading the page


Feature: Interactive Solver — Solution Visualisation
  As a student learning Dantzig-Wolfe Decomposition
  I want to explore and understand the solver output visually
  So that I can build intuition for how the algorithm progresses

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website
    And I have navigated to the Interactive Solver
    And the solver has produced a result

  Scenario: View the optimal solution summary
    When I look at the Solution panel
    Then I see the final objective value
    And I see the variable values grouped by sub-problem block
    And I see the values of the coupling constraint duals (shadow prices)

  Scenario: Browse iteration detail
    When I click on any row in the iteration log
    Then I see the full detail for that iteration including:
      | Field                           |
      | Restricted master problem value |
      | Dual variables at that iteration|
      | Sub-problem index that generated the entering column |
      | Reduced cost of the entering column |

  Scenario: View the convergence chart
    When I look at the Solution panel after solving
    Then I see a chart plotting the restricted master problem objective value against iteration number
    And the chart shows the monotone improvement towards the optimal value
    And hovering over a data point shows the iteration detail

  Scenario: Export the solution
    When I click "Export Solution"
    Then I can download the solution as a JSON file
    And the JSON file contains the objective value, variable values, dual variables, and the full iteration log

  Scenario: Share a problem instance via URL
    When I click "Share"
    Then the current problem input is encoded into the page URL
    And copying and opening that URL in a new browser session restores the same problem input
    And the URL does not contain any personally identifiable information
