Feature: About Page
  As a visitor to the Dantzig-Wolfe Decomposition website
  I want to learn about the person who built the site and how to get in touch
  So that I can understand the motivation behind the project and reach out if needed

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website

  Scenario: Navigate to the About page
    When I click the "About" link in the navigation bar or site footer
    Then I am taken to the About page
    And the page is titled "About"

  Scenario: View contact information
    When I visit the About page
    Then I see a "Contact" section
    And the section contains a working email address or contact form link
    And the section clearly labels how to get in touch

  Scenario: View links to GitHub
    When I visit the About page
    Then I see a "Links" or "GitHub" section
    And I see a link to the website's source repository on GitHub
    And I see a link to the Dantzig-Wolfe Python solver repository on GitHub
    And each link opens in a new tab and is labelled descriptively

  Scenario: Read the motivation section
    When I visit the About page
    Then I see a section explaining why the site was built
    And the section is written in the author's own words
    And the section is at least one paragraph long

  Scenario: About page is linked from the navigation bar
    When I am on any page of the site
    Then the navigation bar contains a link to the About page

  Scenario: About page is linked from the site footer
    When I am on any page of the site
    Then the site footer contains a link to the About page
