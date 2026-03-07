Feature: Site Navigation
  As a visitor to the Dantzig-Wolfe Decomposition website
  I want clear and consistent navigation between all site sections
  So that I can move freely between history, lessons, examples, and the solver

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website

  Scenario: Home page introduces the site
    When I land on the home page
    Then I see a brief description of what Dantzig-Wolfe Decomposition is
    And I see clear signposts to the four main sections: History, Lesson, Examples, and Solver
    And the page is readable without any prior knowledge of the algorithm

  Scenario: Primary navigation is visible on every page
    When I am on any page of the site
    Then I see a navigation bar containing links to: Home, History, Lesson, Examples, and Solver
    And the link for the current section is visually highlighted

  Scenario: Navigate between sections
    When I click the "History" link in the navigation bar
    Then I am taken to the History page
    When I click the "Lesson" link
    Then I am taken to the Lesson page
    When I click the "Examples" link
    Then I am taken to the Examples index
    When I click the "Solver" link
    Then I am taken to the Interactive Solver

  Scenario: Glossary is accessible from any page
    When I am on any page of the site
    Then I can access the Glossary via a link in the navigation bar or site footer
    And the Glossary opens without leaving the current page (e.g., as a panel or modal)

  Scenario: Site works without JavaScript for static content
    Given JavaScript is disabled in the browser
    When I visit the History, Lesson, or Examples pages
    Then the text content of those pages is fully readable
    And navigation between those pages works via standard HTML links
    And a notice is shown explaining that the Interactive Solver requires JavaScript

  Scenario: Site is accessible via keyboard navigation
    When I navigate the site using only a keyboard
    Then I can reach every link and interactive element via Tab key
    And the currently focused element is visually indicated at all times
    And the Interactive Solver can be fully operated by keyboard

  Scenario: Site renders correctly on mobile viewports
    Given my viewport width is 375 pixels or less
    When I visit any page of the site
    Then all text content is readable without horizontal scrolling
    And the navigation is usable (e.g., collapsed into a menu)
    And the Interactive Solver input is usable on a touch screen


Feature: Glossary
  As a student encountering unfamiliar terminology
  I want access to definitions of all technical terms used on the site
  So that I can understand each concept without leaving the page I am reading

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website

  Scenario: Open the glossary
    When I open the Glossary
    Then I see a list of terms in alphabetical order
    And I can search or filter the list by typing part of a term name

  Scenario: View a glossary definition
    When I click on a term in the Glossary
    Then I see a definition in plain language
    And if applicable, the definition includes the formal mathematical notation for the term
    And related terms are listed with links to their own definitions

  Scenario: Jump to glossary from an inline term link
    Given I am reading any page that contains an inline glossary link
    When I click the inline glossary link for a term
    Then the Glossary opens with that term's definition already displayed
    And I can close the Glossary and return to my position on the original page

  Scenario: All terms used on the site are present in the glossary
    When I visit any page of the site
    Then every term that carries an inline glossary link resolves to a defined entry in the Glossary
    And no glossary link points to a missing or empty entry
