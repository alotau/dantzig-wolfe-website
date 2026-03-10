Feature: Solver Engine — Correctness
  As a user of the interactive solver
  I need the solver to produce mathematically correct results
  So that I can trust the solutions and learn from them

  Background:
    Given the Pyodide runtime has been loaded successfully
    And the dantzig-wolfe-python solver package is available

  Scenario Outline: Known optimal value is reproduced for standard benchmark instances
    Given I load the "<example>" pre-built problem
    When I run the solver
    Then the reported optimal objective value equals <expected_value> within a tolerance of 1e-6

    Examples:
      | example                         | expected_value |
      | Cutting Stock (2-width)         | 3.0            |
      | Two-block LP (Textbook ex. 1)   | 12.0           |
      | Three-block LP (Textbook ex. 2) | 24.5           |

  Scenario: Infeasible problem is correctly identified
    Given I enter a problem whose feasible region is empty
    When I run the solver
    Then the solver reports "Infeasible"
    And it does not report a finite objective value

  Scenario: Unbounded problem is correctly identified
    Given I enter a problem with an unbounded feasible region and unbounded objective
    When I run the solver
    Then the solver reports "Unbounded"
    And it identifies the sub-problem that produced the unbounded ray

  Scenario: Optimal duals satisfy complementary slackness
    Given the solver has produced an optimal solution
    Then for every coupling constraint the product of the dual value and the constraint slack is zero within tolerance 1e-6
    And for every sub-problem variable the product of the reduced cost and the variable value is zero within tolerance 1e-6

  Scenario: Solver handles a single sub-problem block correctly
    Given I enter a decomposed LP with exactly one sub-problem block
    When I run the solver
    Then the solver produces a solution equivalent to solving the original LP directly
    And the objective value matches the expected result within tolerance 1e-6

  Scenario: Solver handles many sub-problem blocks without error
    Given I enter a decomposed LP with ten or more sub-problem blocks each with distinct structure
    When I run the solver
    Then the solver terminates without error
    And the reported optimal value satisfies all coupling constraints within tolerance 1e-6
