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
      | Field                                                 |
      | Restricted master problem value                       |
      | Dual variables at that iteration                      |
      | Sub-problem index that generated the entering column  |
      | Reduced cost of the entering column                   |

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
