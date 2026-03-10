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
    And the solver does not start while any cell is invalid
