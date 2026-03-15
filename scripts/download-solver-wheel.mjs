/**
 * Download the dantzig-wolfe-python wheel from the public GitHub release.
 *
 * Usage: node scripts/download-solver-wheel.mjs
 *        (also wired as npm prebuild hook)
 *
 * Source of truth: public/pyodide-lock.json
 */

import { readFile, access, unlink, rename } from 'node:fs/promises'
import { createReadStream, createWriteStream } from 'node:fs'
import { pipeline } from 'node:stream/promises'
import { Readable } from 'node:stream'
import { createHash } from 'node:crypto'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
// SOLVER_WHEEL_PROJECT_ROOT can be set in tests to point to a temporary directory.
const PROJECT_ROOT = process.env.SOLVER_WHEEL_PROJECT_ROOT
  ? resolve(process.env.SOLVER_WHEEL_PROJECT_ROOT)
  : resolve(dirname(__filename), '..')
const LOCK_FILE = join(PROJECT_ROOT, 'public', 'pyodide-lock.json')
const PUBLIC_DIR = join(PROJECT_ROOT, 'public')

// SOLVER_WHEEL_BASE_URL can be overridden in tests to inject a failing URL.
const GITHUB_RELEASE_BASE =
  process.env.SOLVER_WHEEL_BASE_URL ??
  'https://github.com/alotau/dantzig-wolfe-python/releases/download'

// ── T007: readWheelManifest ──────────────────────────────────────────────────

/**
 * Read wheel metadata from public/pyodide-lock.json.
 * @returns {Promise<{version: string, fileName: string, sha256: string}>}
 */
export async function readWheelManifest() {
  let raw
  try {
    raw = await readFile(LOCK_FILE, 'utf8')
  } catch (err) {
    throw new Error(`[solver-wheel] Cannot read public/pyodide-lock.json: ${err.message}`)
  }
  const lock = JSON.parse(raw)
  const pkg = lock.packages?.['dantzig-wolfe-python']
  if (!pkg) {
    throw new Error("[solver-wheel] 'dantzig-wolfe-python' not found in public/pyodide-lock.json")
  }
  return { version: pkg.version, fileName: pkg.fileName, sha256: pkg.sha256 }
}

// ── T008: constructDownloadUrl ───────────────────────────────────────────────

/**
 * Construct the GitHub release download URL.
 * @param {string} version
 * @param {string} fileName
 * @returns {string}
 */
export function constructDownloadUrl(version, fileName) {
  return `${GITHUB_RELEASE_BASE}/v${version}/${fileName}`
}

// ── T010 + T015: downloadWheel ──────────────────────────────────────────────

/**
 * Download wheel from url to destPath using streaming.
 * Throws on HTTP or network errors.
 * @param {string} url
 * @param {string} destPath
 */
async function downloadWheel(url, destPath) {
  let response
  try {
    response = await fetch(url)
  } catch (err) {
    throw new Error(`[solver-wheel] Network error downloading ${url}: ${err.message}`)
  }
  if (!response.ok) {
    throw new Error(
      `[solver-wheel] Download failed: ${response.status} ${response.statusText} — ${url}`,
    )
  }
  if (!response.body) {
    throw new Error(`[solver-wheel] Empty response body while downloading ${url}`)
  }
  const dest = createWriteStream(destPath)
  try {
    await pipeline(Readable.fromWeb(response.body), dest)
  } catch (err) {
    dest.destroy()
    try {
      await unlink(destPath)
    } catch {
      // Ignore cleanup errors
    }
    throw err
  }
}

// ── T013: computeSha256 ──────────────────────────────────────────────────────────

/**
 * Compute SHA-256 hex digest of a file using streaming.
 * @param {string} filePath
 * @returns {Promise<string>} hex digest
 */
async function computeSha256(filePath) {
  const hash = createHash('sha256')
  await pipeline(createReadStream(filePath), hash)
  return hash.digest('hex')
}

// ── T011: main ───────────────────────────────────────────────────────────────

/**
 * Main entry point — orchestrates manifest read, skip-if-present check,
 * and wheel download.
 */
export async function main() {
  try {
    const { version, fileName, sha256 } = await readWheelManifest()
    const destPath = join(PUBLIC_DIR, fileName)
    const tempPath = `${destPath}.tmp`
    const url = constructDownloadUrl(version, fileName)

    // T009: skip if already present
    let alreadyPresent = false
    try {
      await access(destPath)
      alreadyPresent = true
    } catch {
      // File not present — proceed to download
    }
    if (alreadyPresent) {
      console.log(`[solver-wheel] Found ${fileName} — skipping download.`)
      process.exit(0)
      return
    }

    // Clean up any stale temp file from a previous failed run
    try {
      await unlink(tempPath)
    } catch {
      // Ignore — stale temp may not exist
    }

    console.log(`[solver-wheel] Downloading ${fileName} from ${url} …`)
    try {
      await downloadWheel(url, tempPath)
    } catch (downloadErr) {
      // Belt-and-suspenders: ensure temp file is removed
      try {
        await unlink(tempPath)
      } catch {
        // Ignore cleanup errors
      }
      throw downloadErr
    }

    // T014: verify SHA-256 checksum of the downloaded temp file
    const actualHash = await computeSha256(tempPath)
    if (actualHash !== sha256) {
      await unlink(tempPath)
      process.stderr.write(
        `[solver-wheel] Checksum mismatch!\n  expected: ${sha256}\n  actual:   ${actualHash}\n`,
      )
      process.exit(1)
      return
    }

    // Atomically move the verified wheel into place
    await rename(tempPath, destPath)
    console.log(`[solver-wheel] Downloaded and verified ${fileName}.`)
    process.exit(0)
  } catch (err) {
    process.stderr.write(`${err.message}\n`)
    process.exit(1)
  }
}

// Run main() only when executed directly (not when imported by tests)
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main()
}
