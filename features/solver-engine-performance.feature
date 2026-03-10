Feature: Solver Engine — Performance
  As a user of the interactive solver
  I need the solver to run within a reasonable time in the browser
  So that the interactive learning experience is not disrupted by long waits

  Scenario: Small problem solves quickly
    Given a decomposed LP with at most 5 sub-problem blocks and at most 10 variables per block
    When I run the solver
    Then the solver produces a result within 5 seconds of the Pyodide environment being ready

  Scenario: Progress is reported during a longer solve
    Given a decomposed LP that requires more than 10 iterations
    When I run the solver
    Then the iteration log updates at least once every 2 seconds throughout the solve
    And the browser UI remains interactive while solving

  Scenario: Solver does not block the browser's main thread
    Given I am running the solver on a problem that takes more than 3 seconds
    When the solver is running
    Then I can still scroll the page and interact with non-solver UI elements
    And the browser does not display an "unresponsive script" warning
