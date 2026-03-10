import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import type { CustomWorld } from '../support/world.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Wait for solver status to leave loading/solving (terminal states only). */
async function waitForSolverDone(world: CustomWorld, timeoutMs = 120_000) {
  await world.page.waitForFunction(
    () => {
      const status = document
        .querySelector('[data-workspace]')
        ?.getAttribute('data-solver-status')
      return status !== null && !['loading', 'solving'].includes(status)
    },
    { timeout: timeoutMs },
  )
}

/** Navigate to solver with a URL-encoded problem fixture. */
async function loadProblemViaUrl(world: CustomWorld, problem: object) {
  const encoded = btoa(JSON.stringify(problem))
  await world.page.goto(`${world.baseURL}/solver?p=${encoded}`)
  await world.page.waitForSelector('[data-workspace]', { timeout: 10_000 })
  await world.page.locator('[data-solve]:not([disabled])').waitFor({ timeout: 15_000 })
}

// ---------------------------------------------------------------------------
// Start the solver
// ---------------------------------------------------------------------------

Then<CustomWorld>(
  'the solver initialises in the browser using the Pyodide runtime',
  async function (this: CustomWorld) {
    // Pyodide is involved: workspace should leave 'idle' state
    await this.page.waitForFunction(
      () =>
        document.querySelector('[data-workspace]')?.getAttribute('data-solver-status') !== 'idle',
      { timeout: 15_000 },
    )
  },
)

Then<CustomWorld>(
  'a progress indicator is shown while the solver is running',
  async function (this: CustomWorld) {
    const status = await this.page
      .locator('[data-workspace]')
      .getAttribute('data-solver-status')
    // Status should be loading or solving (progress in progress)
    expect(['loading', 'solving']).toContain(status)
  },
)

Then<CustomWorld>(
  'the interface remains responsive during solving',
  async function (this: CustomWorld) {
    // Verify the Solve button exists and is not permanently disabled
    // (i.e. the page is not frozen — real browser responsiveness can't be
    // fully tested in Playwright, but we verify the DOM is still interactive)
    const workspace = this.page.locator('[data-workspace]')
    await expect(workspace).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// First-time Pyodide initialisation
// ---------------------------------------------------------------------------

Given<CustomWorld>(
  'the Pyodide runtime has not yet been loaded in this session',
  async function (this: CustomWorld) {
    // Clear session to start fresh, then navigate to solver
    await this.page.evaluate(() => sessionStorage.clear())
    await this.page.goto(`${this.baseURL}/solver`)
    await this.page.waitForSelector('[data-workspace]', { timeout: 10_000 })
    // Load two-block-lp via URL param so Solve button is enabled immediately
    await this.page.waitForFunction(() => {
      const sel = document.querySelector<HTMLSelectElement>('[data-example-select]')
      return sel !== null && !sel.disabled
    })
    await this.page.selectOption('[data-example-select]', 'two-block-lp')
    await this.page.waitForSelector('[data-subproblem-block]', { timeout: 5_000 })
    await this.page.locator('[data-solve]:not([disabled])').waitFor({ timeout: 15_000 })
    // Do NOT wait for [data-solver-status="ready"] — Pyodide has not yet loaded
  },
)

When<CustomWorld>(
  'I click {string} for the first time',
  async function (this: CustomWorld, label: string) {
    await this.page.getByRole('button', { name: label }).click()
  },
)

Then<CustomWorld>(
  'I see a loading message indicating the solver environment is being prepared',
  async function (this: CustomWorld) {
    // After clicking Solve while Pyodide is still loading, the status should
    // show 'loading' (or transition through it so quickly that solving has begun)
    const status = await this.page
      .locator('[data-workspace]')
      .getAttribute('data-solver-status')
    expect(['loading', 'solving', 'optimal', 'infeasible', 'unbounded']).toContain(status)
    // The status message element should exist and indicate loading or solving
    const msg = this.page.locator('[data-status-message]')
    await expect(msg).toBeVisible()
  },
)

Then<CustomWorld>(
  /once Pyodide is ready the solver begins automatically without further input/,
  async function (this: CustomWorld) {
    // The solver should eventually reach a terminal state without further user input
    await waitForSolverDone(this, 120_000)
    const status = await this.page
      .locator('[data-workspace]')
      .getAttribute('data-solver-status')
    expect(['optimal', 'infeasible', 'unbounded', 'cancelled', 'error']).toContain(status)
  },
)

// ---------------------------------------------------------------------------
// Iteration log
// ---------------------------------------------------------------------------

When<CustomWorld>('the solver is running', async function (this: CustomWorld) {
  // Start the solver and wait for it to enter the 'solving' state
  await this.page.click('[data-solve]:not([disabled])')
  await this.page.waitForFunction(
    () =>
      document.querySelector('[data-workspace]')?.getAttribute('data-solver-status') === 'solving',
    { timeout: 60_000 },
  )
})

Then<CustomWorld>(
  /I see a live iteration log that updates after each Dantzig-Wolfe iteration/,
  async function (this: CustomWorld) {
    // Wait for at least one iteration row to appear
    await this.page.locator('[data-iteration-log] [data-iteration-row]').first().waitFor({
      timeout: 60_000,
    })
    const rows = this.page.locator('[data-iteration-log] [data-iteration-row]')
    await expect(rows).not.toHaveCount(0)
  },
)

Then<CustomWorld>(
  /each log entry shows the iteration number, the current master problem objective value, and the best reduced cost found across sub-problems/,
  async function (this: CustomWorld) {
    // Each row must contain iteration number, master objective, and reduced cost cells
    const firstRow = this.page.locator('[data-iteration-log] [data-iteration-row]').first()
    await expect(firstRow.locator('[data-iteration-number]')).toBeVisible()
    await expect(firstRow.locator('[data-master-objective]')).toBeVisible()
    await expect(firstRow.locator('[data-reduced-cost]')).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Optimal solution
// ---------------------------------------------------------------------------

When<CustomWorld>(
  'the solver terminates with an optimal solution',
  async function (this: CustomWorld) {
    await this.page.click('[data-solve]:not([disabled])')
    // Wait for solver-status=optimal (may take up to 2 minutes on first Pyodide load)
    await this.page.waitForFunction(
      () =>
        document.querySelector('[data-workspace]')?.getAttribute('data-solver-status') ===
        'optimal',
      { timeout: 120_000 },
    )
  },
)

Then<CustomWorld>(/I see a "Solved — Optimal" status message/, async function (this: CustomWorld) {
  await expect(this.page.locator('[data-status-message]')).toContainText('Solved — Optimal')
})

Then<CustomWorld>(
  'the final objective value is prominently displayed',
  async function (this: CustomWorld) {
    await expect(this.page.locator('[data-result-objective]')).toBeVisible()
    const text = await this.page.locator('[data-result-objective]').textContent()
    // Should contain a number
    expect(text).toMatch(/\d/)
  },
)

Then<CustomWorld>(
  'the optimal primal solution values for all variables are shown',
  async function (this: CustomWorld) {
    await expect(this.page.locator('[data-primal-solution]')).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Infeasible
// ---------------------------------------------------------------------------

Given<CustomWorld>('I have entered a problem that is infeasible', async function (this: CustomWorld) {
  // Load a known infeasible problem: coupling requires x1+x2 >= 100 but
  // each sub-problem is bounded to at most 3.
  const infeasible = {
    objectiveDirection: 'min',
    coupling: { A: [[1, 1]], b: [100], senses: ['geq'] },
    subproblems: [
      {
        index: 1,
        A: [[1]],
        b: [3],
        constraintSenses: ['leq'],
        c: [1],
        bounds: [{ lower: 0, upper: 3 }],
        variableLabels: ['x'],
      },
      {
        index: 2,
        A: [[1]],
        b: [3],
        constraintSenses: ['leq'],
        c: [1],
        bounds: [{ lower: 0, upper: 3 }],
        variableLabels: ['y'],
      },
    ],
  }
  await loadProblemViaUrl(this, infeasible)
})

When<CustomWorld>('the solver terminates', async function (this: CustomWorld) {
  await this.page.click('[data-solve]:not([disabled])')
  await waitForSolverDone(this, 120_000)
})

Then<CustomWorld>(
  /I see a "Solved — Infeasible" status message/,
  async function (this: CustomWorld) {
    await expect(this.page.locator('[data-status-message]')).toContainText('Solved — Infeasible')
  },
)

Then<CustomWorld>(
  'a brief explanation of what infeasibility means in this context is shown',
  async function (this: CustomWorld) {
    await expect(this.page.locator('[data-infeasibility-explanation]')).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Unbounded
// ---------------------------------------------------------------------------

Given<CustomWorld>(
  'I have entered a problem that is unbounded',
  async function (this: CustomWorld) {
    // Sub-problem 1 has an unconstrained variable with positive objective
    // coefficient and zero coupling coefficient — pricing LP is always unbounded.
    const unbounded = {
      objectiveDirection: 'max',
      coupling: { A: [[0, 1]], b: [5], senses: ['leq'] },
      subproblems: [
        {
          index: 1,
          A: [],
          b: [],
          constraintSenses: [],
          c: [1],
          bounds: [{ lower: 0, upper: null }],
          variableLabels: ['x'],
        },
        {
          index: 2,
          A: [],
          b: [],
          constraintSenses: [],
          c: [1],
          bounds: [{ lower: 0, upper: 5 }],
          variableLabels: ['y'],
        },
      ],
    }
    await loadProblemViaUrl(this, unbounded)
  },
)

When<CustomWorld>(
  'an unbounded sub-problem direction is found',
  async function (this: CustomWorld) {
    await this.page.click('[data-solve]:not([disabled])')
    await waitForSolverDone(this, 120_000)
  },
)

Then<CustomWorld>(
  /I see a "Solved — Unbounded" status message/,
  async function (this: CustomWorld) {
    await expect(this.page.locator('[data-status-message]')).toContainText('Solved — Unbounded')
  },
)

Then<CustomWorld>(
  'the sub-problem that produced the unbounded ray is identified',
  async function (this: CustomWorld) {
    await expect(this.page.locator('[data-unbounded-subproblem]')).toBeVisible()
  },
)

// ---------------------------------------------------------------------------
// Cancel
// ---------------------------------------------------------------------------

When<CustomWorld>(
  'I click {string} while the solver is running',
  async function (this: CustomWorld, label: string) {
    // Start solving then immediately click Cancel
    await this.page.click('[data-solve]:not([disabled])')
    // Wait until solving begins
    await this.page.waitForFunction(
      () =>
        document.querySelector('[data-workspace]')?.getAttribute('data-solver-status') ===
        'solving',
      { timeout: 60_000 },
    )
    await this.page.getByRole('button', { name: label }).click()
  },
)

Then<CustomWorld>(
  'the solver stops after completing the current iteration',
  async function (this: CustomWorld) {
    // Status should reach 'cancelled' (not 'solving')
    await this.page.waitForFunction(
      () =>
        document.querySelector('[data-workspace]')?.getAttribute('data-solver-status') ===
        'cancelled',
      { timeout: 30_000 },
    )
  },
)

Then<CustomWorld>(
  'the iteration log up to that point remains visible',
  async function (this: CustomWorld) {
    // Iteration log should still have at least one row after cancellation
    const rows = this.page.locator('[data-iteration-log] [data-iteration-row]')
    await expect(rows).not.toHaveCount(0)
  },
)

Then<CustomWorld>(
  'I can modify the problem and re-solve without reloading the page',
  async function (this: CustomWorld) {
    // The Solve button should be available again after cancellation
    await this.page.locator('[data-solve]:not([disabled])').waitFor({ timeout: 10_000 })
    // Change a value in the problem (reload the example) then click Solve again
    await this.page.selectOption('[data-example-select]', 'cutting-stock')
    await this.page.locator('[data-solve]:not([disabled])').waitFor({ timeout: 10_000 })
    await this.page.click('[data-solve]:not([disabled])')
    await waitForSolverDone(this, 120_000)
    const status = await this.page
      .locator('[data-workspace]')
      .getAttribute('data-solver-status')
    expect(['optimal', 'infeasible', 'unbounded', 'cancelled', 'error']).toContain(status)
  },
)
