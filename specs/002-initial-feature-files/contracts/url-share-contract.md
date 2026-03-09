# Contract: URL Problem Sharing Schema

**File**: `src/lib/sharing/url-codec.ts`  
**Date**: 2026-03-07

Defines how a `ProblemInstance` is encoded into and decoded from a URL query parameter,
enabling the "Share" feature described in `interactive-solver.feature`.

---

## URL Format

```
https://<host>/solver?p=<encoded>
```

A single query parameter `p` contains the entire serialised problem. No other
problem-related state is encoded in the URL.

---

## Encoding Algorithm

1. Serialise the `ProblemInstance` to JSON (standard `JSON.stringify`).
2. Compress with `pako.deflate` (zlib deflate, level 6) → `Uint8Array`.
3. Encode the compressed bytes to URL-safe Base64 (`btoa` variant using `-_` instead of
   `+/`, no padding `=`).
4. Set `window.history.replaceState` with `?p=<encoded>` — no full page reload.

**Encoding**: `ProblemInstance` → JSON string → zlib deflate → URL-safe Base64

---

## Decoding Algorithm

1. Read `p` from `URLSearchParams`.
2. Decode URL-safe Base64 → `Uint8Array`.
3. Decompress with `pako.inflate` → UTF-8 string.
4. Parse JSON → plain object.
5. Validate against the `ProblemInstance` Zod schema (`src/lib/solver/problem-schema.ts`).
   If validation fails, silently discard the URL parameter and show an empty workspace.

---

## Size Constraints

- Maximum uncompressed JSON size: **64 KB**. Problems exceeding this limit MUST NOT be
  shared via URL (the Share button is disabled and a message is shown).
- The `metadata.description` field is stripped before encoding to save space.

---

## Security Constraints

- The decoded object MUST pass full Zod schema validation before use. No trusted data
  is taken from the URL directly.
- `metadata.name` is limited to 100 characters after decode; longer values are truncated.
- No PII is encoded. The URL encodes only the mathematical problem structure.

---

## Codec Interface

```typescript
// src/lib/sharing/url-codec.ts

export function encodeProblem(instance: ProblemInstance): string | null;
// Returns the URL-safe encoded string, or null if the problem exceeds the size limit.

export function decodeProblem(encoded: string): ProblemInstance | null;
// Returns the decoded and validated ProblemInstance, or null if decoding/validation fails.

export function buildShareURL(instance: ProblemInstance): URL | null;
// Convenience: builds the full share URL using window.location as base.
```

---

## Dependency

- `pako` (npm) for zlib compression. Version pinned in `package.json`.
  Pako is a pure-JavaScript zlib port — no native extension, safe in browser and CI.
