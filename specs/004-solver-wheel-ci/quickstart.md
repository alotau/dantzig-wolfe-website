# Quickstart: Solver Wheel Download at Build Time

**Branch**: `004-solver-wheel-ci` | **Date**: 2026-03-15

---

## For Developers

### First-time setup (fresh clone)

```bash
npm install
npm run build     # prebuild hook downloads wheel automatically
```

The first `npm run build` (or any command that invokes the `build` npm script) will
download `dwsolver-{version}-py3-none-any.whl` into `public/` before Astro build runs.
Subsequent builds skip the download if the file is already present.

### Force re-download

```bash
rm public/dwsolver-*.whl
npm run build
```

Or run the script directly without triggering a full build:

```bash
node scripts/download-solver-wheel.mjs
```

### Upgrading the solver version

1. Open `public/pyodide-lock.json`.
2. Update the `dantzig-wolfe-python` entry: change `version`, `fileName`, `url`, and `sha256`.
3. Delete the old wheel: `rm public/dwsolver-*.whl`.
4. Run `npm run build` (or `node scripts/download-solver-wheel.mjs`) — the new wheel is
   downloaded and verified against the new SHA-256.

The SHA-256 for a new release can be obtained from the GitHub release asset or computed
locally after manual download:
```bash
shasum -a 256 dwsolver-{version}-py3-none-any.whl   # macOS
sha256sum dwsolver-{version}-py3-none-any.whl        # Linux
```

---

## For CI

No changes to `.github/workflows/ci.yml` are required. The `Build site` step runs
`npm run build`, which automatically triggers the `prebuild` hook (wheel download + verify).

If the download fails (network error, 404, checksum mismatch), the prebuild script exits
with a non-zero status, which causes the CI build step to fail immediately.

---

## For Vercel Deployments

Vercel uses `npm run build` as its build command by default. The `prebuild` hook executes
automatically in the Vercel build environment, which has outbound internet access to GitHub.
No Vercel environment variable or configuration change is required.

---

## File Layout After This Feature

```
public/
├── dwsolver-0.1.0-py3-none-any.whl    ← downloaded at build time; NOT in git
├── pyodide-lock.json                  ← single source of truth for wheel metadata
└── ...

scripts/
└── download-solver-wheel.mjs          ← new; called by prebuild hook

features/
└── solver-wheel-fetch.feature         ← new; Gherkin scenarios for this feature

tests/unit/
└── download-solver-wheel.test.ts      ← new; Vitest unit tests for the script
```

---

## Error Messages

| Failure mode | Exit code | Stderr message example |
|-------------|-----------|------------------------|
| Download fetch error | 1 | `[solver-wheel] Download failed: 404 Not Found — https://github.com/...` |
| Checksum mismatch | 1 | `[solver-wheel] Checksum mismatch! expected: e6ad87... actual: 3fa2c1...` |
| Cannot parse pyodide-lock.json | 1 | `[solver-wheel] Failed to read public/pyodide-lock.json: ...` |
| Wheel already present | 0 | `[solver-wheel] Found dwsolver-0.1.0-py3-none-any.whl — skipping download.` (stdout) |
| Download + verify success | 0 | `[solver-wheel] Downloaded and verified dwsolver-0.1.0-py3-none-any.whl.` (stdout) |
