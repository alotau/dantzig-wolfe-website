Feature: Literature Examples
  As a student or researcher studying optimization
  I want to see worked examples of Dantzig-Wolfe Decomposition drawn from published literature
  So that I can understand how the algorithm is applied to real problem classes

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website

  Scenario: Browse the examples index
    When I navigate to the Examples section
    Then I see an index listing all available worked examples
    And each entry shows the example title, the problem class, and the source citation
    And I can click an entry to view the full worked example

  Scenario: View the cutting-stock problem example
    When I open the "Cutting Stock Problem" example
    Then I see a description of the problem in plain language
    And I see the block-angular LP formulation of the problem
    And I see the Dantzig-Wolfe master problem derived from that formulation
    And I see the pricing sub-problem defined and interpreted in the context of the cutting-stock problem
    And I see at least one iteration traced step by step with concrete numerical values
    And the example cites the canonical Gilmore-Gomory reference

  Scenario: View the multi-commodity network flow example
    When I open the "Multi-Commodity Network Flow" example
    Then I see a description of the problem in plain language
    And I see how the network structure creates the block-angular LP form
    And I see the Dantzig-Wolfe decomposition applied to the multi-commodity structure
    And the example cites a published source for multi-commodity network flow decomposition

  Scenario: View the crew scheduling example
    When I open the "Crew Scheduling" example
    Then I see a description of the set-partitioning formulation used in crew scheduling
    And I see how Dantzig-Wolfe Decomposition is applied to generate crew pairings via column generation
    And the example cites a published airline or transit crew scheduling reference

  Scenario: Each example clearly identifies the decomposition structure
    When I read any worked example
    Then the example explicitly labels which constraints are coupling constraints
    And the example explicitly labels which constraints belong to each sub-problem
    And the role of the dual variables in the pricing sub-problem is explained

  Scenario: Examples are mathematically self-contained
    When I read any worked example
    Then every symbol introduced in the formulation is defined before or at first use
    And the example does not require knowledge of other examples to be understood

  Scenario: All examples cite verifiable sources
    When I read any worked example
    Then the source citation includes at minimum the author(s), publication title, and year
    And a DOI, URL, or standard bibliographic reference is provided where available

  Scenario: Filter examples by problem class
    When I am on the Examples index
    Then I can filter the list by problem class (e.g., network flow, scheduling, cutting stock, other)
    And the filtered list updates without a full page reload
    And the active filter is visually indicated
