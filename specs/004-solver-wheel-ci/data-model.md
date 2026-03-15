# Data Model: Solver Wheel Download at Build Time

**Branch**: `004-solver-wheel-ci` | **Date**: 2026-03-15

---

## Entities

### WheelManifest

Extracted at build time from `public/pyodide-lock.json`. Read-only; not written by the
download script.

| Field | Source path in pyodide-lock.json | Type | Example |
|-------|----------------------------------|------|---------|
| `name` | `packages.dantzig-wolfe-python.name` | string | `"dwsolver"` |
| `version` | `packages.dantzig-wolfe-python.version` | string | `"0.1.0"` |
| `fileName` | `packages.dantzig-wolfe-python.fileName` | string | `"dwsolver-0.1.0-py3-none-any.whl"` |
| `sha256` | `packages.dantzig-wolfe-python.sha256` | string (hex, 64 chars) | `"e6ad87e4..."` |

The download script constructs the remote URL as:
```
https://github.com/alotau/dantzig-wolfe-python/releases/download/v{version}/{fileName}
```

### DownloadResult

In-memory value returned by the download function.

| Field | Type | Purpose |
|-------|------|---------|
| `skipped` | boolean | `true` if wheel already existed on disk |
| `path` | string | Absolute path to the wheel file on disk |
| `verified` | boolean | `true` if SHA-256 matched expected value |

---

## State Transitions

```
[Start]
   │
   ├─ wheel file exists? → YES → [Skipped] → exits 0
   │
   └─ NO
        │
        ├─ download OK? → NO → [DownloadError] → exits 1 (stderr: reason)
        │
        └─ YES
             │
             ├─ sha256 matches? → NO → [ChecksumError] → exits 1 (stderr: expected/actual)
             │
             └─ YES → [Downloaded+Verified] → exits 0
```

---

## Configuration Ownership

`public/pyodide-lock.json` is the **single source of truth** for wheel metadata. When
upgrading the solver, these four fields must be updated together in that file:

- `version`
- `fileName`
- `url` (runtime CDN path — stays local-relative: `/dwsolver-{version}-py3-none-any.whl`)
- `sha256`

The download script and the worker fallback constant both derive from these values; no other
files need updating for a version bump.
