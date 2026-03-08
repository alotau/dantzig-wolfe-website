import { describe, it, expect } from 'vitest'
import katex from 'katex'

// MathBlock.astro uses katex.renderToString server-side.
// These tests verify the rendering logic matches expected patterns.

describe('MathBlock rendering (katex)', () => {
  it('renders a display-mode formula without throwing', () => {
    const formula = '\\sum_{i=1}^{K} c_i^T x_i'
    const html = katex.renderToString(formula, { displayMode: true, throwOnError: false })
    expect(html).toContain('katex-display')
    expect(html).toContain('katex')
  })

  it('renders inline math without display wrapper', () => {
    const formula = 'x_i \\geq 0'
    const html = katex.renderToString(formula, { displayMode: false, throwOnError: false })
    expect(html).not.toContain('katex-display')
    expect(html).toContain('katex')
  })

  it('does not throw on invalid LaTeX when throwOnError is false', () => {
    const invalid = '\\invalid{broken'
    expect(() =>
      katex.renderToString(invalid, { displayMode: true, throwOnError: false }),
    ).not.toThrow()
  })

  it('renders the coupling constraint formula', () => {
    const formula = '\\sum_{i=1}^{K} A_0^i x_i = b_0'
    const html = katex.renderToString(formula, { displayMode: true, throwOnError: false })
    expect(html).toBeTruthy()
    expect(html.length).toBeGreaterThan(50)
  })
})
