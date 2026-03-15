import { Given, When, Then } from '@cucumber/cucumber'

// ---------------------------------------------------------------------------
// Solver wheel fetch — build-time script scenarios
// These step definitions invoke scripts/download-solver-wheel.mjs directly
// in a temporary directory to validate build-time behaviour.
// All steps are pending until the script is implemented (Phase 3+).
// ---------------------------------------------------------------------------

Given('the wheel manifest is read from {string}', function (_lockPath: string) {
  return 'pending'
})

Given('the solver wheel file is not present in {string}', function (_dir: string) {
  return 'pending'
})

Given('the solver wheel file is already present in {string}', function (_dir: string) {
  return 'pending'
})

Given('the expected SHA-256 in the manifest is incorrect', function () {
  return 'pending'
})

Given('the GitHub release URL returns a 404 error', function () {
  return 'pending'
})

When('the download script runs', function () {
  return 'pending'
})

Then('the wheel is downloaded from the GitHub release URL', function () {
  return 'pending'
})

Then("the downloaded file's SHA-256 matches the expected checksum", function () {
  return 'pending'
})

Then('the script exits with code {int}', function (_code: number) {
  return 'pending'
})

Then('no network request is made', function () {
  return 'pending'
})

Then('stdout contains {string}', function (_text: string) {
  return 'pending'
})

Then('stderr contains {string}', function (_text: string) {
  return 'pending'
})

Then('stderr contains the expected checksum', function () {
  return 'pending'
})

Then('stderr contains the actual checksum', function () {
  return 'pending'
})
