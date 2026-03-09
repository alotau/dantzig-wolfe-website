Feature: Algorithm History
  As a student or practitioner of linear programming
  I want to learn the historical context of Dantzig-Wolfe Decomposition
  So that I can understand where the algorithm came from and why it matters

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website

  Scenario: View the history page
    When I navigate to the History section
    Then I see a page titled "History of Dantzig-Wolfe Decomposition"
    And the page is organized into clearly labelled chronological sections

  Scenario: Read about the origins of the algorithm
    When I navigate to the History section
    Then I see a section describing the origins of the algorithm
    And the section explains that the algorithm was introduced by George Dantzig and Philip Wolfe
    And the section references the 1960 publication in "Operations Research"
    And the section explains the motivation: solving large-scale linear programs that were computationally intractable by direct simplex methods

  Scenario: Read about the relationship to the simplex method
    When I navigate to the History section
    Then I see a section explaining the relationship between Dantzig-Wolfe Decomposition and the Simplex Method
    And the section explains that Dantzig-Wolfe exploits block-angular structure present in many real-world LP formulations
    And every technical term in the section is either defined inline or linked to the site glossary

  Scenario: Read about early industrial applications
    When I navigate to the History section
    Then I see a section describing early industrial applications of the algorithm
    And the section includes at least one example application domain such as transportation, energy, or production planning
    And each application example is cited with a reference to the source literature

  Scenario: Read about the development of column generation
    When I navigate to the History section
    Then I see a section explaining how Dantzig-Wolfe Decomposition relates to column generation
    And the section notes that the pricing sub-problems in Dantzig-Wolfe Decomposition are the conceptual origin of modern column generation techniques

  Scenario: All historical claims are cited
    When I read any section on the History page
    Then every factual claim about dates, people, or publications includes an inline citation
    And each citation links to or identifies a verifiable source
