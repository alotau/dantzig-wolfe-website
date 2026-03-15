Feature: Solver wheel fetched at build time
  The download script fetches the solver wheel from the public GitHub release
  and verifies its integrity before the Astro build begins.

  Background:
    Given the wheel manifest is read from "public/pyodide-lock.json"

  Scenario: Fresh build downloads and verifies the wheel
    Given the solver wheel file is not present in "public/"
    When the download script runs
    Then the wheel is downloaded from the GitHub release URL
    And the downloaded file's SHA-256 matches the expected checksum
    And the script exits with code 0

  Scenario: Subsequent build skips the download
    Given the solver wheel file is already present in "public/"
    When the download script runs
    Then no network request is made
    And the script exits with code 0
    And stdout contains "skipping download"

  Scenario: Checksum mismatch fails the build
    Given the solver wheel file is not present in "public/"
    And the expected SHA-256 in the manifest is incorrect
    When the download script runs
    Then the script exits with code 1
    And stderr contains "Checksum mismatch"
    And stderr contains the expected checksum
    And stderr contains the actual checksum

  Scenario: Network failure fails the build
    Given the solver wheel file is not present in "public/"
    And the GitHub release URL returns a 404 error
    When the download script runs
    Then the script exits with code 1
    And stderr contains "Download failed"
