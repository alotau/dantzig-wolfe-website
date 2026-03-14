import { Then, When } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { CustomWorld } from '../support/world.js'

const ALL_ROUTES = ['/', '/solver', '/history', '/about', '/examples', '/lesson']

// ---------------------------------------------------------------------------
// Every-page presence check
// ---------------------------------------------------------------------------

Then<CustomWorld>('I see a Ko-fi donation button on every page of the site', async function () {
  for (const route of ALL_ROUTES) {
    await this.page.goto(`${this.baseURL}${route}`)
    await expect(
      this.page.locator('[data-kofi-button]'),
      `Expected Ko-fi button on route ${route}`,
    ).toBeVisible()
  }
})

// ---------------------------------------------------------------------------
// Single-page attribute checks
// ---------------------------------------------------------------------------

When<CustomWorld>('I visit the home page', async function () {
  await this.page.goto(this.baseURL)
})

Then<CustomWorld>('the Ko-fi button href is {string}', async function (expectedHref: string) {
  const btn = this.page.locator('[data-kofi-button]')
  await expect(btn).toBeVisible()
  await expect(btn).toHaveAttribute('href', expectedHref)
})

Then<CustomWorld>('the Ko-fi button has target {string}', async function (expectedTarget: string) {
  const btn = this.page.locator('[data-kofi-button]')
  await expect(btn).toBeVisible()
  await expect(btn).toHaveAttribute('target', expectedTarget)
})

Then<CustomWorld>('the Ko-fi button rel contains {string}', async function (expectedRel: string) {
  const btn = this.page.locator('[data-kofi-button]')
  await expect(btn).toBeVisible()
  const rel = await btn.getAttribute('rel')
  expect(rel, `Expected rel to contain "${expectedRel}" but got "${rel}"`).toContain(expectedRel)
})
