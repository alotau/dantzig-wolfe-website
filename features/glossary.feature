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
