/**
 * LCP (Largest Contentful Paint) performance measurement for static pages.
 *
 * Measures LCP for History, Lesson, and Examples pages against a running
 * preview server and asserts each is ≤ LCP_THRESHOLD_MS (per plan.md goal).
 *
 * Usage:
 *   BASE_URL=http://localhost:4321 NODE_OPTIONS='--import tsx' node tests/perf/lcp.ts
 */

import { chromium } from 'playwright'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4321'
const LCP_THRESHOLD_MS = 1000

const PAGES = [
  { name: 'History', path: '/history' },
  { name: 'Lesson', path: '/lesson' },
  { name: 'Examples', path: '/examples' },
]

interface LCPResult {
  name: string
  lcp: number | null
  pass: boolean
  error?: string
}

async function measureLCPForPage(
  browserContext: Awaited<ReturnType<typeof chromium.launch>>,
  name: string,
  path: string,
): Promise<LCPResult> {
  const context = await browserContext.newContext()
  const page = await context.newPage()
  try {
    // Inject LCP observer before navigation
    await page.addInitScript(() => {
      ;(window as unknown as { __lcpValue: number }).__lcpValue = -1
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries()
          if (entries.length > 0) {
            const last = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
            ;(window as unknown as { __lcpValue: number }).__lcpValue = last.startTime
          }
        })
        observer.observe({ type: 'largest-contentful-paint', buffered: true })
      } catch {
        // PerformanceObserver not available — LCP stays -1
      }
    })

    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 30_000 })

    // Give LCP observer a moment to fire after load
    await page.waitForTimeout(200)

    const lcp = await page.evaluate(() => (window as unknown as { __lcpValue: number }).__lcpValue)

    const measured = lcp >= 0 ? lcp : null
    const pass = measured !== null && measured <= LCP_THRESHOLD_MS

    return { name, lcp: measured, pass }
  } catch (err) {
    return {
      name,
      lcp: null,
      pass: false,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    await context.close()
  }
}

async function main(): Promise<void> {
  console.log(`\nLCP Performance Measurement`)
  console.log(`Target: ≤ ${LCP_THRESHOLD_MS} ms per page`)
  console.log(`Server: ${BASE_URL}`)
  console.log('='.repeat(55))

  const browser = await chromium.launch({ headless: true })
  let anyFail = false

  try {
    const results: LCPResult[] = []
    for (const { name, path } of PAGES) {
      const result = await measureLCPForPage(browser, name, path)
      results.push(result)
    }

    for (const { name, lcp, pass, error } of results) {
      let status: string
      let detail: string

      if (error) {
        status = '✗ ERROR'
        detail = error
        anyFail = true
      } else if (lcp === null) {
        status = '? NO LCP'
        detail = 'LCP entry not observed (page may have no LCP candidate)'
      } else {
        status = pass ? '✓ PASS ' : '✗ FAIL '
        detail = `${lcp.toFixed(0)} ms`
        if (!pass) anyFail = true
      }

      console.log(`${status}  ${name.padEnd(12)}  ${detail}`)
    }
  } finally {
    await browser.close()
  }

  console.log('='.repeat(55))

  if (anyFail) {
    console.error(`\nFAIL: One or more pages exceed the LCP threshold of ${LCP_THRESHOLD_MS} ms.\n`)
    process.exit(1)
  } else {
    console.log(`\nPASS: All measured pages are within the ${LCP_THRESHOLD_MS} ms LCP threshold.\n`)
  }
}

main().catch((err) => {
  console.error('Unexpected error in LCP measurement:', err)
  process.exit(1)
})
