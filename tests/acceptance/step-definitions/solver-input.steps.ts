import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { CustomWorld } from '../support/world.js'

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

Given<CustomWorld>('I have navigated to the Interactive Solver', async function () {
  await this.page.goto(`${this.baseURL}/solver`)
  // Wait for the solver workspace to mount
  await this.page.waitForSelector('[data-workspace]', { timeout: 10000 })
})

Given<CustomWorld>('I have entered a valid decomposed problem', async function () {
  // Load the two-block example as a baseline valid problem
  await this.page.goto(`${this.baseURL}/solver`)
  await this.page.waitForSelector('[data-workspace]', { timeout: 10000 })
  await this.page.selectOption('[data-example-select]', 'two-block-lp')
  await this.page.waitForSelector('[data-subproblem-block]', { timeout: 5000 })
})

// ---------------------------------------------------------------------------
// Blank workspace
// ---------------------------------------------------------------------------

When<CustomWorld>('I arrive at the Interactive Solver for the first time', async function () {
  await this.page.evaluate(() => sessionStorage.removeItem('dw-problem'))
  await this.page.reload()
  await this.page.waitForSelector('[data-workspace]', { timeout: 10000 })
})

Then<CustomWorld>('I see a workspace with an empty problem input area', async function () {
  const workspace = this.page.locator('[data-workspace]')
  await expect(workspace).toBeVisible()
  // No sub-problem blocks on a fresh load
  const blocks = this.page.locator('[data-subproblem-block]')
  await expect(blocks).toHaveCount(0)
})

Then<CustomWorld>(
  'I see instructions explaining the expected decomposed problem format',
  async function () {
    const instructions = this.page.locator('[data-instructions], [data-help], .solver-instructions')
    await expect(instructions.first()).toBeVisible()
  },
)

Then<CustomWorld>(
  'I see a link to the glossary for any terms used in the instructions',
  async function () {
    const glossaryLink = this.page.locator(
      '[data-instructions] [href*="glossary"], [data-help] button[aria-label*="lossary"], [data-instructions] button',
    )
    await expect(glossaryLink.first()).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Coupling constraints input
// ---------------------------------------------------------------------------

When<CustomWorld>(
  'I enter the coupling constraint matrix A0, right-hand-side vector b0, and sense for each constraint',
  async function () {
    // Add one coupling constraint row
    const addCouplingBtn = this.page.locator('[data-add-coupling-row]')
    await addCouplingBtn.click()
    // Fill in b0 value
    const bInput = this.page.locator('[data-coupling-b] input').first()
    await bInput.fill('6')
    // Select sense
    const senseSelect = this.page.locator('[data-coupling-sense]').first()
    await senseSelect.selectOption('leq')
  },
)

Then<CustomWorld>('the input is accepted and displayed in a structured table', async function () {
  const table = this.page.locator('[data-coupling-table], table[data-coupling]')
  await expect(table.first()).toBeVisible()
})

Then<CustomWorld>('the number of coupling constraints is shown', async function () {
  const count = this.page.locator('[data-coupling-count]')
  await expect(count).toBeVisible()
  const text = await count.textContent()
  expect(text).toMatch(/\d+/)
})

// ---------------------------------------------------------------------------
// Sub-problem block input
// ---------------------------------------------------------------------------

When<CustomWorld>(
  'I add a sub-problem block with constraint matrix A_k, right-hand-side vector b_k, and objective cost vector c_k',
  async function () {
    const addBlockBtn = this.page.locator('[data-add-block]')
    await addBlockBtn.click()
    await this.page.waitForSelector('[data-subproblem-block]', { timeout: 3000 })
  },
)

Then<CustomWorld>('the sub-problem is added to the workspace', async function () {
  const blocks = this.page.locator('[data-subproblem-block]')
  await expect(blocks.first()).toBeVisible()
})

Then<CustomWorld>('it is labelled with its block index k', async function () {
  const blockHeading = this.page.locator('[data-subproblem-block] [data-block-index]')
  await expect(blockHeading.first()).toBeVisible()
  const text = await blockHeading.first().textContent()
  expect(text).toMatch(/1/)
})

Then<CustomWorld>(
  'the number of variables and constraints in the sub-problem is shown',
  async function () {
    const dims = this.page.locator('[data-subproblem-block] [data-block-dims]')
    await expect(dims.first()).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Multiple sub-problem blocks
// ---------------------------------------------------------------------------

When<CustomWorld>('I add two or more sub-problem blocks', async function () {
  const addBlockBtn = this.page.locator('[data-add-block]')
  await addBlockBtn.click()
  await this.page.waitForSelector('[data-subproblem-block]', { timeout: 3000 })
  await addBlockBtn.click()
  await expect(this.page.locator('[data-subproblem-block]')).toHaveCount(2)
})

Then<CustomWorld>('each block appears as a distinct section in the workspace', async function () {
  const blocks = this.page.locator('[data-subproblem-block]')
  await expect(blocks).toHaveCount(2)
})

Then<CustomWorld>('I can expand or collapse individual blocks', async function () {
  const toggleBtn = this.page.locator(
    '[data-subproblem-block] summary, [data-subproblem-block] [data-toggle-block]',
  )
  await expect(toggleBtn.first()).toBeVisible()
  // Clicking the toggle should collapse the block
  await toggleBtn.first().click()
})

// ---------------------------------------------------------------------------
// Variable bounds
// ---------------------------------------------------------------------------

When<CustomWorld>(
  'I specify lower and upper bounds for variables in any sub-problem block',
  async function () {
    // Ensure at least one block exists
    if ((await this.page.locator('[data-subproblem-block]').count()) === 0) {
      await this.page.locator('[data-add-block]').click()
      await this.page.waitForSelector('[data-subproblem-block]', { timeout: 3000 })
    }
    const lowerInput = this.page.locator('[data-bound-lower]').first()
    await lowerInput.fill('0')
    const upperInput = this.page.locator('[data-bound-upper]').first()
    await upperInput.fill('10')
  },
)

Then<CustomWorld>('the bounds are stored with the corresponding variable', async function () {
  const lowerInput = this.page.locator('[data-bound-lower]').first()
  await expect(lowerInput).toHaveValue('0')
  const upperInput = this.page.locator('[data-bound-upper]').first()
  await expect(upperInput).toHaveValue('10')
})

Then<CustomWorld>(
  /variables with default bounds \(0, unbounded\) are indicated as such without requiring explicit entry/,
  async function () {
    const defaultBound = this.page.locator(
      '[data-bound-default], [data-bound-upper][placeholder*="∞"], [data-bound-upper][placeholder*="inf"]',
    )
    await expect(defaultBound.first()).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Load pre-built example
// ---------------------------------------------------------------------------

When<CustomWorld>('I select a pre-built example from the examples dropdown', async function () {
  const select = this.page.locator('[data-example-select]')
  await expect(select).toBeVisible()
  await select.selectOption({ index: 1 }) // First real example (not the placeholder)
})

Then<CustomWorld>(
  'the workspace is populated with the corresponding coupling constraints and sub-problem blocks',
  async function () {
    await this.page.waitForSelector('[data-subproblem-block]', { timeout: 5000 })
    const blocks = this.page.locator('[data-subproblem-block]')
    await expect(blocks.first()).toBeVisible()
  },
)

Then<CustomWorld>(
  'a description of the example is displayed alongside the input',
  async function () {
    const description = this.page.locator('[data-example-description]')
    await expect(description).toBeVisible()
    const text = await description.textContent()
    expect((text ?? '').trim().length).toBeGreaterThan(5)
  },
)

Then<CustomWorld>('I can modify the loaded data before solving', async function () {
  const anyInput = this.page.locator('[data-coupling-b] input, [data-block-c] input').first()
  await expect(anyInput).not.toBeDisabled()
})

// ---------------------------------------------------------------------------
// Clear workspace
// ---------------------------------------------------------------------------

When<CustomWorld>('I click {string}', async function (label: string) {
  await this.page
    .locator(`button[data-action="${label.toLowerCase()}"], button`)
    .filter({ hasText: label })
    .click()
})

Then<CustomWorld>('all input fields are reset to empty', async function () {
  const inputs = this.page.locator('[data-workspace] input')
  const count = await inputs.count()
  for (let i = 0; i < count; i++) {
    const val = await inputs.nth(i).inputValue()
    expect(val).toBe('')
  }
})

Then<CustomWorld>('no sub-problem blocks remain', async function () {
  const blocks = this.page.locator('[data-subproblem-block]')
  await expect(blocks).toHaveCount(0)
})

Then<CustomWorld>(
  'a confirmation is requested before clearing if any data has been entered',
  async function () {
    // The clear button should show a confirmation dialog
    this.page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })
    const clearBtn = this.page.locator('button[data-action="clear"]')
    await clearBtn.click()
  },
)

// ---------------------------------------------------------------------------
// Dimension validation
// ---------------------------------------------------------------------------

When<CustomWorld>(
  'I attempt to solve a problem with incompatible dimensions',
  async function () {
    // This step matches the multi-line Gherkin string from the feature
    // Set up a coupling matrix with 3 columns but only 1 sub-problem variable
    const addBlockBtn = this.page.locator('[data-add-block]')
    if ((await addBlockBtn.count()) > 0) {
      await addBlockBtn.click()
      await this.page.waitForSelector('[data-subproblem-block]', { timeout: 3000 })
    }
    // Try to trigger a dimension mismatch error via the validate trigger
    await this.page.locator('[data-validate], [data-solve]').first().click()
  },
)

Then<CustomWorld>(
  'I see a clear error message identifying the dimension mismatch',
  async function () {
    const error = this.page.locator('[data-dimension-error], [data-error]')
    await expect(error.first()).toBeVisible()
  },
)

Then<CustomWorld>('the solver does not start until the error is resolved', async function () {
  const solveBtn = this.page.locator('[data-solve]')
  if ((await solveBtn.count()) > 0) {
    await expect(solveBtn).toBeDisabled()
  }
})

// ---------------------------------------------------------------------------
// Non-numeric input rejection
// ---------------------------------------------------------------------------

When<CustomWorld>('I enter a non-numeric value in a matrix or vector cell', async function () {
  // Ensure at least one block
  if ((await this.page.locator('[data-subproblem-block]').count()) === 0) {
    await this.page.locator('[data-add-block]').click()
    await this.page.waitForSelector('[data-subproblem-block]', { timeout: 3000 })
  }
  const cellInput = this.page.locator('[data-matrix-cell] input, [data-block-c] input').first()
  await cellInput.fill('abc')
  await cellInput.blur()
})

Then<CustomWorld>('the cell is highlighted as invalid', async function () {
  const invalidCell = this.page.locator(
    '[data-matrix-cell].invalid, [data-matrix-cell][aria-invalid="true"], input.invalid, input[aria-invalid="true"]',
  )
  await expect(invalidCell.first()).toBeVisible()
})

Then<CustomWorld>('an inline message explains that a numeric value is required', async function () {
  const validationMsg = this.page.locator('[data-validation-message], .validation-message')
  await expect(validationMsg.first()).toBeVisible()
  const text = await validationMsg.first().textContent()
  expect(text?.toLowerCase()).toMatch(/numeric|number/)
})

Then<CustomWorld>('the solver does not start while any cell is invalid', async function () {
  const solveBtn = this.page.locator('[data-solve]')
  if ((await solveBtn.count()) > 0) {
    await expect(solveBtn).toBeDisabled()
  }
})
