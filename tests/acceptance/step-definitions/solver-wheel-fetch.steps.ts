import { Given, When, Then, After } from '@cucumber/cucumber'
import { spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { createHash } from 'node:crypto'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { createServer } from 'node:http'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { expect } from '@playwright/test'
import type { CustomWorld } from '../support/world.js'

// ---------------------------------------------------------------------------
// Per-scenario state — stored on the World instance at runtime.
// ---------------------------------------------------------------------------

interface WheelResult {
  status: number | null
  stdout: Buffer
  stderr: Buffer
}

interface WheelWorld extends CustomWorld {
  wsTmpDir: string
  wsExtraEnv: Record<string, string>
  wsResult: WheelResult
  wsServer?: Server
}

// Clean up tmpDir and local HTTP server after each wheel scenario.
After(async function (this: CustomWorld) {
  const w = this as WheelWorld
  if (w.wsServer) {
    await new Promise<void>((resolve) => w.wsServer!.close(() => resolve()))
  }
  if (w.wsTmpDir) {
    rmSync(w.wsTmpDir, { recursive: true, force: true })
  }
})

// ---------------------------------------------------------------------------
// Background
// ---------------------------------------------------------------------------

Given('the wheel manifest is read from {string}', function (this: CustomWorld, _lockPath: string) {
  const w = this as WheelWorld
  w.wsTmpDir = mkdtempSync(join(tmpdir(), 'dw-acc-'))
  w.wsExtraEnv = {}
  mkdirSync(join(w.wsTmpDir, 'public'), { recursive: true })

  // Copy the committed lock file into the temp directory so the script has a
  // real manifest to read (version, fileName, sha256 all present).
  const realLock = readFileSync(resolve(process.cwd(), 'public', 'pyodide-lock.json'), 'utf8')
  writeFileSync(join(w.wsTmpDir, 'public', 'pyodide-lock.json'), realLock)
})

// ---------------------------------------------------------------------------
// Given steps
// ---------------------------------------------------------------------------

Given(
  'the solver wheel file is not present in {string}',
  function (this: CustomWorld, _dir: string) {
    // Default state — no wheel file in the tmpDir public/ folder.
  },
)

Given(
  'the solver wheel file is already present in {string}',
  function (this: CustomWorld, _dir: string) {
    const w = this as WheelWorld
    const lock = JSON.parse(readFileSync(join(w.wsTmpDir, 'public', 'pyodide-lock.json'), 'utf8'))
    const fileName: string = lock.packages['dantzig-wolfe-python'].fileName
    writeFileSync(join(w.wsTmpDir, 'public', fileName), 'placeholder')
  },
)

Given('the expected SHA-256 in the manifest is incorrect', function (this: CustomWorld) {
  const w = this as WheelWorld
  const lockPath = join(w.wsTmpDir, 'public', 'pyodide-lock.json')
  const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
  lock.packages['dantzig-wolfe-python'].sha256 = 'a'.repeat(64)
  writeFileSync(lockPath, JSON.stringify(lock))
})

Given('the GitHub release URL returns a 404 error', async function (this: CustomWorld) {
  const w = this as WheelWorld
  const srv = createServer(
    (_req: unknown, res: { writeHead(code: number, msg: string): void; end(): void }) => {
      res.writeHead(404, 'Not Found')
      res.end()
    },
  )
  await new Promise<void>((res) => srv.listen(0, '127.0.0.1', res))
  const port = (srv.address() as AddressInfo).port
  w.wsServer = srv
  w.wsExtraEnv = { ...w.wsExtraEnv, SOLVER_WHEEL_BASE_URL: `http://127.0.0.1:${port}` }
})

// ---------------------------------------------------------------------------
// When
// ---------------------------------------------------------------------------

When('the download script runs', async function (this: CustomWorld) {
  const w = this as WheelWorld
  w.wsResult = await new Promise<WheelResult>((resolvePromise, rejectPromise) => {
    const child = spawn(
      process.execPath,
      [resolve(process.cwd(), 'scripts', 'download-solver-wheel.mjs')],
      {
        env: { ...process.env, SOLVER_WHEEL_PROJECT_ROOT: w.wsTmpDir, ...w.wsExtraEnv },
        cwd: process.cwd(),
      },
    )
    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []
    child.stdout.on('data', (d: Buffer) => stdoutChunks.push(d))
    child.stderr.on('data', (d: Buffer) => stderrChunks.push(d))
    child.on('error', rejectPromise)
    child.on('close', (status) => {
      resolvePromise({
        status,
        stdout: Buffer.concat(stdoutChunks),
        stderr: Buffer.concat(stderrChunks),
      })
    })
  })
})

// ---------------------------------------------------------------------------
// Then
// ---------------------------------------------------------------------------

Then('the wheel is downloaded from the GitHub release URL', function (this: CustomWorld) {
  const w = this as WheelWorld
  const lock = JSON.parse(readFileSync(join(w.wsTmpDir, 'public', 'pyodide-lock.json'), 'utf8'))
  const fileName: string = lock.packages['dantzig-wolfe-python'].fileName
  expect(existsSync(join(w.wsTmpDir, 'public', fileName))).toBe(true)
})

Then(
  "the downloaded file's SHA-256 matches the expected checksum",
  async function (this: CustomWorld) {
    const w = this as WheelWorld
    const lock = JSON.parse(readFileSync(join(w.wsTmpDir, 'public', 'pyodide-lock.json'), 'utf8'))
    const { fileName, sha256: expectedSha256 } = lock.packages['dantzig-wolfe-python']
    const hash = createHash('sha256')
    await pipeline(createReadStream(join(w.wsTmpDir, 'public', fileName)), hash)
    expect(hash.digest('hex')).toBe(expectedSha256)
  },
)

Then('the script exits with code {int}', function (this: CustomWorld, code: number) {
  const w = this as WheelWorld
  expect(w.wsResult.status).toBe(code)
})

Then('no network request is made', function (this: CustomWorld) {
  const w = this as WheelWorld
  expect(w.wsResult.stdout.toString()).toContain('skipping')
})

Then('stdout contains {string}', function (this: CustomWorld, text: string) {
  const w = this as WheelWorld
  expect(w.wsResult.stdout.toString()).toContain(text)
})

Then('stderr contains {string}', function (this: CustomWorld, text: string) {
  const w = this as WheelWorld
  expect(w.wsResult.stderr.toString()).toContain(text)
})

Then('stderr contains the expected checksum', function (this: CustomWorld) {
  const w = this as WheelWorld
  const lock = JSON.parse(readFileSync(join(w.wsTmpDir, 'public', 'pyodide-lock.json'), 'utf8'))
  const expectedSha256: string = lock.packages['dantzig-wolfe-python'].sha256
  expect(w.wsResult.stderr.toString()).toContain(expectedSha256)
})

Then('stderr contains the actual checksum', function (this: CustomWorld) {
  const w = this as WheelWorld
  // The script logs "  actual:   <hex64>" — verify a 64-char hex string appears
  // in stderr after "actual:" as proof the real hash was reported.
  expect(w.wsResult.stderr.toString()).toMatch(/actual:\s+[0-9a-f]{64}/)
})
