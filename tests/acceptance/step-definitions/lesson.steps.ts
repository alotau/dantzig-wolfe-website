import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { CustomWorld } from '../support/world.js'

When<CustomWorld>('I navigate to the Lesson section', async function () {
  await this.page.goto(`${this.baseURL}/lesson`)
})

When<CustomWorld>(
  'I read the {string} section of the lesson',
  async function (this: CustomWorld, sectionName: string) {
    await this.page.goto(`${this.baseURL}/lesson`)
    // Scroll to heading matching the section name
    const heading = this.page
      .locator('main h2, main h3')
      .filter({ hasText: new RegExp(sectionName, 'i') })
    await expect(heading.first()).toBeVisible()
  },
)

When<CustomWorld>('I read any section of the lesson', async function () {
  await this.page.goto(`${this.baseURL}/lesson`)
})

When<CustomWorld>('I am on the Lesson page', async function () {
  await this.page.goto(`${this.baseURL}/lesson`)
})

Then<CustomWorld>(
  'the lesson is divided into numbered sections I can navigate between',
  async function () {
    // Expects a TOC nav or multiple headings
    const headings = this.page.locator('main h2')
    expect(await headings.count()).toBeGreaterThanOrEqual(3)
  },
)

Then<CustomWorld>('I see a prerequisites summary at the top of the page', async function () {
  const prereq = this.page
    .locator('main')
    .getByText(/prerequisite/i)
    .first()
  await expect(prereq).toBeVisible()
})

Then<CustomWorld>(
  'the prerequisites list familiarity with linear programming and the Simplex Method',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/linear programming/i)
    await expect(content).toContainText(/simplex/i)
  },
)

Then<CustomWorld>(
  'each prerequisite term links to an external resource or the site glossary',
  async function () {
    // At least one link or TermLink button in the prerequisite section
    const termButtons = this.page.locator('main button[data-term]')
    const links = this.page.locator('main a[href]')
    const total = (await termButtons.count()) + (await links.count())
    expect(total).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>('I see an explanation of block-angular LP structure', async function () {
  const content = this.page.locator('main')
  await expect(content).toContainText(/block.angular/i)
})

Then<CustomWorld>(
  'the section shows a general block-angular LP formulation expressed as mathematical notation',
  async function () {
    // KaTeX renders math; check for .katex elements
    const mathEl = this.page.locator('.katex').first()
    await expect(mathEl).toBeVisible()
  },
)

Then<CustomWorld>(
  'the notation distinguishes the coupling constraints from the sub-problem constraints',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/coupling/i)
  },
)

Then<CustomWorld>(
  'every symbol in the formulation is defined in an accompanying legend',
  async function () {
    // A symbol legend or definition list should appear after the math block
    const legend = this.page.locator('main dl, main [data-legend], main .legend')
    expect(await legend.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  'I see a derivation of the Dantzig-Wolfe master problem from the original block-angular LP',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/master problem/i)
  },
)

Then<CustomWorld>(
  "the derivation explains how extreme points and extreme rays of each sub-problem's feasible region are used as columns",
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/extreme point/i)
  },
)

Then<CustomWorld>(
  'the section explains the role of the convexity constraints in the master problem',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/convexity constraint/i)
  },
)

Then<CustomWorld>(
  'every technical term is defined inline or linked to the glossary',
  async function () {
    const termLinks = this.page.locator('button[data-term]')
    expect(await termLinks.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>('I see an explanation of the pricing sub-problems', async function () {
  const content = this.page.locator('main')
  await expect(content).toContainText(/pricing sub.problem/i)
})

Then<CustomWorld>(
  'the section explains that each sub-problem finds a column with negative reduced cost to enter the master problem',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/reduced cost/i)
  },
)

Then<CustomWorld>(
  'the section distinguishes the bounded and unbounded cases for sub-problem solutions',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/unbounded/i)
  },
)

Then<CustomWorld>(
  'the section explains that an unbounded sub-problem indicates the original LP is unbounded',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/unbounded/i)
  },
)

Then<CustomWorld>(
  'I see a step-by-step description of one complete Dantzig-Wolfe iteration',
  async function () {
    // Ordered list or numbered steps
    const stepList = this.page.locator('main ol')
    expect(await stepList.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  'the steps are: solve the restricted master problem, obtain dual variables, solve each pricing sub-problem, check optimality',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/restricted master problem/i)
    await expect(content).toContainText(/dual variable/i)
    await expect(content).toContainText(/pricing sub.problem/i)
    await expect(content).toContainText(/optimality/i)
  },
)

Then<CustomWorld>(
  'the optimality condition — all reduced costs non-negative — is stated explicitly',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/non.negative|nonnegative/i)
  },
)

Then<CustomWorld>(
  'the section explains that the algorithm terminates in finite iterations under non-degeneracy',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/finite|terminat/i)
  },
)

Then<CustomWorld>('I see an explanation of the termination criterion', async function () {
  const content = this.page.locator('main')
  await expect(content).toContainText(/terminat|stopping criterion/i)
})

Then<CustomWorld>(
  'the section notes practical issues such as degeneracy and tailing-off behaviour',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/degeneracy|tailing.off/i)
  },
)

Then<CustomWorld>(
  'the section mentions stabilisation strategies such as restricted master heuristics or Kelley cuts at a high level',
  async function () {
    const content = this.page.locator('main')
    await expect(content).toContainText(/stabilisation|stabilization|Kelley/i)
  },
)

Then<CustomWorld>(
  'every mathematical term that is not universally standard notation is either defined inline or linked to the site glossary',
  async function () {
    const termLinks = this.page.locator('button[data-term]')
    expect(await termLinks.count()).toBeGreaterThanOrEqual(1)
  },
)

Then<CustomWorld>(
  'the glossary entry explains the term in plain language before introducing formal notation',
  async function () {
    // Open the glossary and check that a term has shortDef text
    const glossaryBtn = this.page.locator('nav button[aria-label*="lossary"]').first()
    await glossaryBtn.click()
    const panel = this.page.locator('[data-glossary-panel]')
    await expect(panel).toBeVisible()
  },
)

Then<CustomWorld>(
  'I can jump directly to any section using a table of contents',
  async function () {
    // A nav element with anchor links to sections
    const tocLinks = this.page.locator('nav a[href^="#"], [data-toc] a')
    expect(await tocLinks.count()).toBeGreaterThanOrEqual(3)
  },
)

Then<CustomWorld>(
  'my position in the lesson is preserved if I navigate away and return within the same session',
  async function () {
    // sessionStorage key 'lesson-scroll' should be set
    const scrollKey = await this.page.evaluate(() => sessionStorage.getItem('lesson-scroll'))
    // After visiting the lesson, the key should exist (even if 0)
    expect(scrollKey).not.toBeNull()
  },
)
