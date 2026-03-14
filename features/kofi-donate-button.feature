Feature: Ko-fi Donation Button
  As a visitor who found the site useful
  I want to see a donation button on every page
  So that I can optionally support the site owner

  Background:
    Given I am on the Dantzig-Wolfe Decomposition website

  Scenario: Ko-fi button is present on every page
    Then I see a Ko-fi donation button on every page of the site

  Scenario: Ko-fi button links to the correct campaign
    When I visit the home page
    Then the Ko-fi button href is "https://ko-fi.com/P5P51TYCQS"

  Scenario: Ko-fi button opens in a new tab
    When I visit the home page
    Then the Ko-fi button has target "_blank"

  Scenario: Ko-fi button has the required security attribute
    When I visit the home page
    Then the Ko-fi button rel contains "noopener"
