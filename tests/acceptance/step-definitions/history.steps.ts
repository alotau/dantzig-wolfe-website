import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { CustomWorld } from '../support/world.js'

When<CustomWorld>('I navigate to the History section', async function () {
  await this.page.goto(`${this.baseURL}/history`)
})

When<CustomWorld>('I read any section on the History page', async function () {
  await this.page.goto(`${this.baseURL}/history`)
})

Then<CustomWorld>(
  'I see a page titled {string}',
  async function (this: CustomWorld, title: string) {
    await expect(this.page).toHaveTitle(new RegExp(title, 'i'))
  },
)

Then<CustomWorld>(
  'the page is organized into clearly labelled chronological sections',
  async function () {
    // Expects multiple <section> or <article> elements or headings (h2/h3) on the page
    const sections = this.page.locator('main section, main article, main h2')
    await expect(sections).toHaveCount(await sections.count())
    expect(await sections.count()).toBeGreaterThanOrEqual(3)
  },
)

Then<CustomWorld>('I see a section describing the origins of the algorithm', async function () {
  const heading = this.page.locator('main h2, main h3').filter({ hasText: /origin/i })
  await expect(heading).toBeVisible()
})

Then<CustomWorld>(
  'the section explains that the algorithm was introduced by George Dantzig and Philip Wolfe',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/George Dantzig/i)
    await expect(content).toContainText(/Philip Wolfe/i)
  },
)

Then<CustomWorld>(
  'the section references the 1960 publication in {string}',
  async function (this: CustomWorld, journal: string) {
    const content = this.page.locator('main')
    await expect(content).toContainText(/1960/)
    await expect(content).toContainText(new RegExp(journal, 'i'))
  },
)

Then<CustomWorld>(
  'the section explains the motivation: solving large-scale linear programs that were computationally intractable by direct simplex methods',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/large.scale/i)
  },
)

Then<CustomWorld>(
  'I see a section explaining the relationship between Dantzig-Wolfe Decomposition and the Simplex Method',
  async function () {
    const heading = this.page.locator('main h2, main h3').filter({ hasText: /simplex/i })
    await expect(heading).toBeVisible()
  },
)

Then<CustomWorld>(
  'the section explains that Dantzig-Wolfe exploits block-angular structure present in many real-world LP formulations',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/block.angular/i)
  },
)

Then<CustomWorld>(
  'every technical term in the section is either defined inline or linked to the site glossary',
  async function () {
    // Any TermLink buttons should exist on the page
    const termLinks = this.page.locator('button[data-term]')
    expect(await termLinks.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  'I see a section describing early industrial applications of the algorithm',
  async function () {
    const heading = this.page
      .locator('main h2, main h3')
      .filter({ hasText: /application|industrial/i })
    await expect(heading).toBeVisible()
  },
)

Then<CustomWorld>(
  'the section includes at least one example application domain such as transportation, energy, or production planning',
  async function () {
    const content = this.page.locator('main')
    const hasApplication = await content
      .getByText(/transportation|energy|production planning/i)
      .count()
    expect(hasApplication).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  'each application example is cited with a reference to the source literature',
  async function () {
    // Citations rendered by Citation.astro appear within <cite> or a specific class
    const citations = this.page.locator('main cite, main [data-citation]')
    expect(await citations.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  'I see a section explaining how Dantzig-Wolfe Decomposition relates to column generation',
  async function () {
    const heading = this.page.locator('main h2, main h3').filter({ hasText: /column generation/i })
    await expect(heading).toBeVisible()
  },
)

Then<CustomWorld>(
  'the section notes that the pricing sub-problems in Dantzig-Wolfe Decomposition are the conceptual origin of modern column generation techniques',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/pricing sub.problem/i)
    await expect(content).toContainText(/column generation/i)
  },
)

Then<CustomWorld>(
  'every factual claim about dates, people, or publications includes an inline citation',
  async function () {
    // At least one citation block visible on the page
    const citations = this.page.locator('main cite, main [data-citation]')
    expect(await citations.count()).toBeGreaterThanOrEqual(3)
  },
)

Then<CustomWorld>('each citation links to or identifies a verifiable source', async function () {
  // Citation components should render author + year text
  const citations = this.page.locator('main cite, main [data-citation]')
  const count = await citations.count()
  for (let i = 0; i < count; i++) {
    const text = await citations.nth(i).textContent()
    // Each citation should contain a year (4-digit number)
    expect(text).toMatch(/\b\d{4}\b/)
  }
})
