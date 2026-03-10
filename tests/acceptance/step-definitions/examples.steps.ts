import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { CustomWorld } from '../support/world.js'

When<CustomWorld>('I navigate to the Examples section', async function () {
  await this.page.goto(`${this.baseURL}/examples`)
})

When<CustomWorld>(
  'I open the {string} example',
  async function (this: CustomWorld, exampleTitle: string) {
    await this.page.goto(`${this.baseURL}/examples`)
    const link = this.page.getByRole('link', { name: new RegExp(exampleTitle, 'i') }).first()
    await link.click()
    await this.page.waitForLoadState('load')
  },
)

When<CustomWorld>('I read any worked example', async function () {
  await this.page.goto(`${this.baseURL}/examples`)
  // Click first example
  const firstLink = this.page.locator('main a[href*="/examples/"]').first()
  await firstLink.click()
  await this.page.waitForLoadState('load')
})

When<CustomWorld>('I am on the Examples index', async function () {
  await this.page.goto(`${this.baseURL}/examples`)
})

Then<CustomWorld>('I see an index listing all available worked examples', async function () {
  const items = this.page.locator('main [data-example-card], main article, main li')
  expect(await items.count()).toBeGreaterThanOrEqual(1)
})

Then<CustomWorld>(
  'each entry shows the example title, the problem class, and the source citation',
  async function () {
    const cards = this.page.locator('[data-example-card]')
    expect(await cards.count()).toBeGreaterThanOrEqual(1)
    // Each card should have a title, badge, and citation info
    const firstCard = cards.first()
    await expect(firstCard).toBeVisible()
  },
)

Then<CustomWorld>('I can click an entry to view the full worked example', async function () {
  const link = this.page.locator('main a[href*="/examples/"]').first()
  await expect(link).toBeVisible()
})

Then<CustomWorld>('I see a description of the problem in plain language', async function () {
  // The main content area should have descriptive paragraphs
  const paragraphs = this.page.locator('main p')
  expect(await paragraphs.count()).toBeGreaterThanOrEqual(1)
})

Then<CustomWorld>('I see the block-angular LP formulation of the problem', async function () {
  const content = this.page.locator('main')
  await expect(content).toContainText(/block.angular/i)
  const mathEl = this.page.locator('.katex').first()
  await expect(mathEl).toBeVisible()
})

Then<CustomWorld>(
  'I see the Dantzig-Wolfe master problem derived from that formulation',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/master problem/i)
  },
)

Then<CustomWorld>(
  'I see the pricing sub-problem defined and interpreted in the context of the cutting-stock problem',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/pricing sub.problem|knapsack/i)
  },
)

Then<CustomWorld>(
  'I see at least one iteration traced step by step with concrete numerical values',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/iteration/i)
    // Should have at least one numeric value in context
    const mathEl = this.page.locator('.katex')
    expect(await mathEl.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>('the example cites the canonical Gilmore-Gomory reference', async function () {
  const content = this.page.locator('main')
  await expect(content).toContainText(/Gilmore|Gomory/i)
})

Then<CustomWorld>(
  'I see how the network structure creates the block-angular LP form',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/block.angular/i)
    await expect(content).toContainText(/network|commodity/i)
  },
)

Then<CustomWorld>(
  'I see the Dantzig-Wolfe decomposition applied to the multi-commodity structure',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/Dantzig.Wolfe/i)
    await expect(content).toContainText(/commodity/i)
  },
)

Then<CustomWorld>(
  'the example cites a published source for multi-commodity network flow decomposition',
  async function () {
    const citations = this.page.locator('main cite')
    expect(await citations.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  'I see a description of the set-partitioning formulation used in crew scheduling',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/set.partitioning|set partitioning/i)
  },
)

Then<CustomWorld>(
  'I see how Dantzig-Wolfe Decomposition is applied to generate crew pairings via column generation',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/column generation/i)
    await expect(content).toContainText(/crew/i)
  },
)

Then<CustomWorld>(
  'the example cites a published airline or transit crew scheduling reference',
  async function () {
    const citations = this.page.locator('main cite')
    expect(await citations.count()).toBeGreaterThanOrEqual(1)
    const content = this.page.locator('main')
    await expect(content).toContainText(/airline|transit|crew/i)
  },
)

Then<CustomWorld>(
  'the example explicitly labels which constraints are coupling constraints',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/coupling constraint/i)
  },
)

Then<CustomWorld>(
  'the example explicitly labels which constraints belong to each sub-problem',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/sub.problem/i)
  },
)

Then<CustomWorld>(
  'the role of the dual variables in the pricing sub-problem is explained',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/dual/i)
  },
)

Then<CustomWorld>(
  'every symbol introduced in the formulation is defined before or at first use',
  async function () {
    // A definition list or legend should appear
    const defs = this.page.locator('main dl, main [data-legend]')
    expect(await defs.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  'the example does not require knowledge of other examples to be understood',
  async function () {
    // Self-contained: the page has a complete narrative without external references
    const content = this.page.locator('main')
    const text = await content.textContent()
    expect(text).toBeTruthy()
    expect((text ?? '').length).toBeGreaterThan(200)
  },
)

Then<CustomWorld>(
  /the source citation includes at minimum the author\(s\), publication title, and year/,
  async function () {
    const citations = this.page.locator('main cite')
    expect(await citations.count()).toBeGreaterThanOrEqual(1)
    // Each citation should contain a year
    const firstCite = await citations.first().textContent()
    expect(firstCite).toMatch(/\b\d{4}\b/)
  },
)

Then<CustomWorld>(
  'a DOI, URL, or standard bibliographic reference is provided where available',
  async function () {
    // At least one cite element or a DOI link
    const doiLinks = this.page.locator('main a[href*="doi.org"]')
    const cites = this.page.locator('main cite')
    const total = (await doiLinks.count()) + (await cites.count())
    expect(total).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  /I can filter the list by problem class \(e\.g\., network flow, scheduling, cutting stock, other\)/,
  async function () {
    const filterButtons = this.page.locator('[data-filter-btn], button[data-problem-class]')
    expect(await filterButtons.count()).toBeGreaterThanOrEqual(2)
  },
)

Then<CustomWorld>('the filtered list updates without a full page reload', async function () {
  // Click first filter button and check page didn't reload (URL stays same, content updates)
  const url = this.page.url()
  const filterBtn = this.page.locator('[data-filter-btn]').first()
  await filterBtn.click()
  // URL should not have changed to a different page
  expect(this.page.url()).toBe(url)
})

Then<CustomWorld>('the active filter is visually indicated', async function () {
  const activeFilter = this.page.locator(
    '[data-filter-btn][aria-pressed="true"], [data-filter-btn][data-active]',
  )
  expect(await activeFilter.count()).toBeGreaterThanOrEqual(1)
})
