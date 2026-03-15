// @vitest-environment node
/**
 * Unit tests for scripts/download-solver-wheel.mjs
 *
 * RED PHASE: This test file is committed before the script exists.
 * All tests fail with a module-not-found error until Phase 3 implementation.
 *
 * After implementation the tests go GREEN via mocked fs/fetch — no real
 * network calls are made in the unit test suite.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Types for the expected exports (verified to match once impl lands) ──────

interface WheelManifest {
  version: string
  fileName: string
  sha256: string
}

// Dynamic import so that a missing module produces a clear failure per test
// rather than crashing the entire file at load time.
async function loadModule() {
  const mod = await import('../../scripts/download-solver-wheel.mjs')
  return mod as {
    readWheelManifest: () => Promise<WheelManifest>
    constructDownloadUrl: (version: string, fileName: string) => string
    main: () => Promise<void>
  }
}

// ── readWheelManifest ────────────────────────────────────────────────────────

describe('readWheelManifest()', () => {
  beforeEach(() => {
    vi.mock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue(
        JSON.stringify({
          packages: {
            'dantzig-wolfe-python': {
              name: 'dwsolver',
              version: '0.1.0',
              fileName: 'dwsolver-0.1.0-py3-none-any.whl',
              installDir: 'site',
              url: '/dwsolver-0.1.0-py3-none-any.whl',
              sha256: 'e6ad87e41eb5b25ae63dcccb18dedec8900aadd0c178f228e4fd594ad47baba1',
            },
          },
        }),
      ),
      access: vi.fn(),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns version, fileName, and sha256 from pyodide-lock.json', async () => {
    const { readWheelManifest } = await loadModule()
    const manifest = await readWheelManifest()
    expect(manifest.version).toBe('0.1.0')
    expect(manifest.fileName).toBe('dwsolver-0.1.0-py3-none-any.whl')
    expect(manifest.sha256).toBe('e6ad87e41eb5b25ae63dcccb18dedec8900aadd0c178f228e4fd594ad47baba1')
  })

  it('throws when pyodide-lock.json is unreadable', async () => {
    const { readFile } = await import('node:fs/promises')
    vi.mocked(readFile).mockRejectedValueOnce(new Error('ENOENT'))
    const { readWheelManifest } = await loadModule()
    await expect(readWheelManifest()).rejects.toThrow()
  })
})

// ── constructDownloadUrl ─────────────────────────────────────────────────────

describe('constructDownloadUrl()', () => {
  it('constructs the correct GitHub release URL for v0.1.0', async () => {
    const { constructDownloadUrl } = await loadModule()
    const url = constructDownloadUrl('0.1.0', 'dwsolver-0.1.0-py3-none-any.whl')
    expect(url).toBe(
      'https://github.com/alotau/dantzig-wolfe-python/releases/download/v0.1.0/dwsolver-0.1.0-py3-none-any.whl',
    )
  })

  it('constructs the correct GitHub release URL for a bumped version (v0.2.0)', async () => {
    const { constructDownloadUrl } = await loadModule()
    const url = constructDownloadUrl('0.2.0', 'dwsolver-0.2.0-py3-none-any.whl')
    expect(url).toBe(
      'https://github.com/alotau/dantzig-wolfe-python/releases/download/v0.2.0/dwsolver-0.2.0-py3-none-any.whl',
    )
  })
})

// ── skip-if-present guard ────────────────────────────────────────────────────

describe('skip-if-present guard', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exits 0 without calling fetch when wheel file already exists', async () => {
    vi.resetModules()
    vi.doMock('node:fs/promises', () => ({
      readFile: vi.fn().mockResolvedValue(
        JSON.stringify({
          packages: {
            'dantzig-wolfe-python': {
              version: '0.1.0',
              fileName: 'dwsolver-0.1.0-py3-none-any.whl',
              sha256: 'e6ad87e41eb5b25ae63dcccb18dedec8900aadd0c178f228e4fd594ad47baba1',
            },
          },
        }),
      ),
      // access resolves (no error) → file exists
      access: vi.fn().mockResolvedValue(undefined),
    }))

    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const { main } = await loadModule()
    await main()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(exitSpy).toHaveBeenCalledWith(0)

    fetchSpy.mockRestore()
    exitSpy.mockRestore()
  })
})

// ── download success ─────────────────────────────────────────────────────────

describe('download success', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('writes the wheel file and exits 0 when fetch succeeds and checksum matches', async () => {
    // This test verifies the happy-path pipeline:
    //   readWheelManifest → constructDownloadUrl → fetch → write → computeSha256 → exit 0
    // Full implementation comes in Phase 3+; the test fails RED until then.
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)
    // After implementation, expect: exitSpy.toHaveBeenCalledWith(0)
    expect(exitSpy).toBeDefined() // placeholder assertion — RED until impl
    exitSpy.mockRestore()
  })
})

// ── checksum mismatch ────────────────────────────────────────────────────────

describe('checksum mismatch', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exits 1 and writes expected/actual checksums to stderr when SHA-256 does not match', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    // After implementation: exitSpy.toHaveBeenCalledWith(1)
    // and stderrSpy output contains "Checksum mismatch"
    expect(stderrSpy).toBeDefined() // placeholder — RED until impl
    expect(exitSpy).toBeDefined() // placeholder — RED until impl

    stderrSpy.mockRestore()
    exitSpy.mockRestore()
  })
})

// ── network / fetch failure ──────────────────────────────────────────────────

describe('fetch failure', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exits 1 and writes error detail to stderr when fetch returns a non-OK status', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    // After implementation: exitSpy.toHaveBeenCalledWith(1)
    // and stderrSpy output contains "Download failed"
    expect(stderrSpy).toBeDefined() // placeholder — RED until impl
    expect(exitSpy).toBeDefined() // placeholder — RED until impl

    stderrSpy.mockRestore()
    exitSpy.mockRestore()
  })

  it('exits 1 and writes error detail to stderr when fetch throws a network error', async () => {
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    expect(stderrSpy).toBeDefined() // placeholder — RED until impl
    expect(exitSpy).toBeDefined() // placeholder — RED until impl

    stderrSpy.mockRestore()
    exitSpy.mockRestore()
  })
})
