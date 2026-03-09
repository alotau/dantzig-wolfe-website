Feature: Solver Engine — Pyodide Initialisation
  As the website
  I need to load the Python solver via Pyodide in the browser
  So that all computation runs client-side without contacting a server

  Scenario: Pyodide loads successfully on a modern browser
    Given the user's browser supports WebAssembly
    When the Interactive Solver page is opened
    Then the Pyodide runtime loads completely in the browser
    And the dantzig-wolfe-python package is installed into the Pyodide environment
    And no solver-related HTTP requests are made to any compute server

  Scenario: Pyodide runtime is cached after first load
    Given the user has previously loaded the Interactive Solver in the same browser
    When the Interactive Solver page is opened again
    Then the Pyodide runtime loads from the browser cache
    And the time to solver-ready is measurably shorter than on the first load

  Scenario: Graceful error when WebAssembly is not supported
    Given the user's browser does not support WebAssembly
    When the Interactive Solver page is opened
    Then I see a clear message explaining that the solver requires a WebAssembly-capable browser
    And a list of compatible browsers is shown
    And no JavaScript errors are thrown to the console


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
      | example                        | expected_value |
      | Cutting Stock (2-width)        | 3.0            |
      | Two-block LP (Textbook ex. 1)  | 12.0           |
      | Three-block LP (Textbook ex. 2)| 24.5           |

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


Feature: Solver Engine — Security
  As the website operator
  I need to ensure that user-provided problem data cannot cause harmful behaviour
  So that the solver remains safe to operate as a publicly accessible tool

  Scenario: Oversized input is rejected before solver execution
    Given a user submits a problem with more than 500 variables or more than 200 constraints in any single block
    Then the input is rejected with a clear message before the solver starts
    And no Pyodide computation is initiated

  Scenario: Non-finite values in input are rejected
    Given a user enters NaN or Infinity in any matrix or vector cell
    Then the cell is marked invalid
    And the solver does not start while non-finite values are present

  Scenario: Solver execution is isolated to the browser context
    When the solver runs
    Then it does not make any outbound network requests to external services
    And it does not read from or write to browser storage outside of its designated solver-state key
    And it does not access the DOM outside of the designated solver output container
