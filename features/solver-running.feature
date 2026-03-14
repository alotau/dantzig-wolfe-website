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
    And the infeasibility diagnostic details the violated coupling constraints

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
