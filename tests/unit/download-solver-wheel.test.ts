// @vitest-environment node
/**
 * Unit tests for scripts/download-solver-wheel.mjs
 *
 * readWheelManifest and constructDownloadUrl use mocked fs.
 * Integration-style tests (skip, download, checksum, fetch) use a real tmpDir
 * via SOLVER_WHEEL_PROJECT_ROOT and only mock globalThis.fetch / process.exit.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'

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
    vi.doUnmock('node:fs/promises')
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
  let tmpDir: string

  beforeEach(() => {
    vi.doUnmock('node:fs/promises')
    vi.resetModules()
    tmpDir = mkdtempSync(join(tmpdir(), 'dw-test-'))
    mkdirSync(join(tmpDir, 'public'), { recursive: true })
    process.env.SOLVER_WHEEL_PROJECT_ROOT = tmpDir
  })

  afterEach(() => {
    delete process.env.SOLVER_WHEEL_PROJECT_ROOT
    rmSync(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('writes the wheel file and exits 0 when fetch succeeds and checksum matches', async () => {
    const wheelBytes = Buffer.from('dummy wheel bytes')
    const sha256 = createHash('sha256').update(wheelBytes).digest('hex')

    writeFileSync(
      join(tmpDir, 'public', 'pyodide-lock.json'),
      JSON.stringify({
        packages: {
          'dantzig-wolfe-python': {
            version: '0.1.0',
            fileName: 'dwsolver-0.1.0-py3-none-any.whl',
            sha256,
          },
        },
      }),
    )

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(wheelBytes))
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const { main } = await loadModule()
    await main()

    const wheelPath = join(tmpDir, 'public', 'dwsolver-0.1.0-py3-none-any.whl')
    expect(existsSync(wheelPath)).toBe(true)
    expect(readFileSync(wheelPath)).toEqual(wheelBytes)
    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})

// ── checksum mismatch ────────────────────────────────────────────────────────

describe('checksum mismatch', () => {
  let tmpDir: string

  beforeEach(() => {
    vi.doUnmock('node:fs/promises')
    vi.resetModules()
    tmpDir = mkdtempSync(join(tmpdir(), 'dw-test-'))
    mkdirSync(join(tmpDir, 'public'), { recursive: true })
    process.env.SOLVER_WHEEL_PROJECT_ROOT = tmpDir
  })

  afterEach(() => {
    delete process.env.SOLVER_WHEEL_PROJECT_ROOT
    rmSync(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('exits 1 and writes expected/actual checksums to stderr when SHA-256 does not match', async () => {
    const wrongSha256 = 'a'.repeat(64)
    writeFileSync(
      join(tmpDir, 'public', 'pyodide-lock.json'),
      JSON.stringify({
        packages: {
          'dantzig-wolfe-python': {
            version: '0.1.0',
            fileName: 'dwsolver-0.1.0-py3-none-any.whl',
            sha256: wrongSha256,
          },
        },
      }),
    )

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(Buffer.from('dummy wheel bytes')),
    )
    const stderrOutput: string[] = []
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk))
      return true
    })
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const { main } = await loadModule()
    await main()

    expect(exitSpy).toHaveBeenCalledWith(1)
    const stderr = stderrOutput.join('')
    expect(stderr).toContain('Checksum mismatch')
    expect(stderr).toContain(wrongSha256)
    expect(existsSync(join(tmpDir, 'public', 'dwsolver-0.1.0-py3-none-any.whl'))).toBe(false)
  })
})

// ── network / fetch failure ──────────────────────────────────────────────────

describe('fetch failure', () => {
  let tmpDir: string

  beforeEach(() => {
    vi.doUnmock('node:fs/promises')
    vi.resetModules()
    tmpDir = mkdtempSync(join(tmpdir(), 'dw-test-'))
    mkdirSync(join(tmpDir, 'public'), { recursive: true })
    writeFileSync(
      join(tmpDir, 'public', 'pyodide-lock.json'),
      JSON.stringify({
        packages: {
          'dantzig-wolfe-python': {
            version: '0.1.0',
            fileName: 'dwsolver-0.1.0-py3-none-any.whl',
            sha256: 'e6ad87e41eb5b25ae63dcccb18dedec8900aadd0c178f228e4fd594ad47baba1',
          },
        },
      }),
    )
    process.env.SOLVER_WHEEL_PROJECT_ROOT = tmpDir
  })

  afterEach(() => {
    delete process.env.SOLVER_WHEEL_PROJECT_ROOT
    rmSync(tmpDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('exits 1 and writes error detail to stderr when fetch returns a non-OK status', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 500, statusText: 'Internal Server Error' }),
    )
    const stderrOutput: string[] = []
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk))
      return true
    })
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const { main } = await loadModule()
    await main()

    expect(exitSpy).toHaveBeenCalledWith(1)
    const stderr = stderrOutput.join('')
    expect(stderr).toContain('Download failed')
    expect(stderr).toContain('500')
  })

  it('exits 1 and writes error detail to stderr when fetch throws a network error', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Simulated network failure'))
    const stderrOutput: string[] = []
    vi.spyOn(process.stderr, 'write').mockImplementation((chunk: string | Uint8Array) => {
      stderrOutput.push(typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk))
      return true
    })
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as never)

    const { main } = await loadModule()
    await main()

    expect(exitSpy).toHaveBeenCalledWith(1)
    const stderr = stderrOutput.join('')
    expect(stderr).toContain('Simulated network failure')
  })
})
