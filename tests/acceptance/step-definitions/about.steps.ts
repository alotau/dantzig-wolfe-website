import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { CustomWorld } from '../support/world.js'

// ---------------------------------------------------------------------------
// Navigate to the About page
// ---------------------------------------------------------------------------

When<CustomWorld>(
  'I click the {string} link in the navigation bar or site footer',
  async function (label: string) {
    const trigger = this.page
      .locator('header, nav, footer')
      .getByRole('link', { name: label })
      .first()
    await trigger.click()
  },
)

Then<CustomWorld>('I am taken to the About page', async function () {
  await this.page.waitForURL(/\/about/)
  await expect(this.page.locator('main h1').first()).toContainText(/about/i)
})

Then<CustomWorld>('the page is titled {string}', async function (expectedTitle: string) {
  await expect(this.page).toHaveTitle(new RegExp(expectedTitle, 'i'))
})

// ---------------------------------------------------------------------------
// Visit the About page
// ---------------------------------------------------------------------------

When<CustomWorld>('I visit the About page', async function () {
  await this.page.goto(`${this.baseURL}/about`)
})

// ---------------------------------------------------------------------------
// Contact section
// ---------------------------------------------------------------------------

Then<CustomWorld>('I see a {string} section', async function (sectionTitle: string) {
  const heading = this.page.locator(`h2, h3, section[aria-label], div[data-section]`)
  const found = heading.filter({ hasText: new RegExp(sectionTitle, 'i') })
  await expect(found.first()).toBeVisible()
})

Then<CustomWorld>(
  'the section contains a working email address or contact form link',
  async function () {
    const contactLink = this.page.locator('a[href^="mailto:"], a[href*="contact"], a[href*="form"]')
    await expect(contactLink.first()).toBeVisible()
  },
)

Then<CustomWorld>('the section clearly labels how to get in touch', async function () {
  // The contact section should have visible text explaining how to reach the author
  const contactText = this.page
    .locator('section, div')
    .filter({ hasText: /contact|email|reach|get in touch/i })
  await expect(contactText.first()).toBeVisible()
})

// ---------------------------------------------------------------------------
// GitHub / Links section
// ---------------------------------------------------------------------------

Then<CustomWorld>(
  'I see a {string} or {string} section',
  async function (title1: string, title2: string) {
    const heading = this.page.locator('h2, h3')
    const found = heading.filter({
      hasText: new RegExp(`${title1}|${title2}`, 'i'),
    })
    await expect(found.first()).toBeVisible()
  },
)

Then<CustomWorld>("I see a link to the website's source repository on GitHub", async function () {
  const link = this.page.locator('a[href="https://github.com/alotau/dantzig-wolfe-website"]')
  await expect(link.first()).toBeVisible()
})

Then<CustomWorld>(
  'I see a link to the Dantzig-Wolfe Python solver repository on GitHub',
  async function () {
    const link = this.page.locator('a[href="https://github.com/alotau/dantzig-wolfe-python"]')
    await expect(link.first()).toBeVisible()
  },
)

Then<CustomWorld>('each link opens in a new tab and is labelled descriptively', async function () {
  const repoLinks = this.page.locator('a[href*="github.com/alotau"]')
  const count = await repoLinks.count()
  expect(count).toBeGreaterThanOrEqual(2)
  for (let i = 0; i < count; i++) {
    const link = repoLinks.nth(i)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noopener/)
    // Each link should have non-trivial text (not just the URL)
    const text = await link.textContent()
    expect(text?.trim().length).toBeGreaterThan(3)
  }
})

// ---------------------------------------------------------------------------
// Motivation section
// ---------------------------------------------------------------------------

Then<CustomWorld>('I see a section explaining why the site was built', async function () {
  const motivationSection = this.page.locator('section, div, article').filter({
    hasText: /motivation|why|built|purpose|reason/i,
  })
  await expect(motivationSection.first()).toBeVisible()
})

Then<CustomWorld>("the section is written in the author's own words", async function () {
  // Verify the motivation section has prose content (not just a heading)
  const motivationSection = this.page.locator('section, div').filter({
    hasText: /motivation|why|built|purpose/i,
  })
  const text = await motivationSection.first().textContent()
  // Should have enough text for at least a short paragraph (>50 chars)
  expect((text ?? '').trim().length).toBeGreaterThan(50)
})

Then<CustomWorld>('the section is at least one paragraph long', async function () {
  const paragraph = this.page.locator(
    'section p, article p, div[data-section="motivation"] p, .motivation p',
  )
  await expect(paragraph.first()).toBeVisible()
  const text = await paragraph.first().textContent()
  expect((text ?? '').trim().length).toBeGreaterThan(20)
})

// ---------------------------------------------------------------------------
// About in nav bar and footer
// ---------------------------------------------------------------------------

Then<CustomWorld>('the navigation bar contains a link to the About page', async function () {
  const nav = this.page.locator('header nav, nav[aria-label="Primary navigation"]')
  const aboutLink = nav.getByRole('link', { name: /^about$/i })
  await expect(aboutLink).toBeVisible()
})

Then<CustomWorld>('the site footer contains a link to the About page', async function () {
  const footer = this.page.locator('footer')
  const aboutLink = footer.getByRole('link', { name: /^about$/i })
  await expect(aboutLink).toBeVisible()
})
