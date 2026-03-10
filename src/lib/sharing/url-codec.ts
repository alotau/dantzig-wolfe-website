/**
 * url-codec.ts — Encode/decode a ProblemInstance to/from a URL query parameter.
 *
 * Encoding: JSON → pako deflate (level 6) → URL-safe Base64 → `?p=<encoded>`
 * Contract: specs/002-initial-feature-files/contracts/url-share-contract.md
 */

import { deflate, inflate } from 'pako'
import { ProblemInstanceSchema, type ParsedProblemInstance } from '../solver/problem-schema.js'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum uncompressed JSON size (bytes). Problems larger than this cannot be shared. */
const MAX_UNCOMPRESSED_BYTES = 64 * 1024 // 64 KB

/** Maximum length of metadata.name after decode (characters). */
const MAX_NAME_LENGTH = 100

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Converts a Uint8Array to URL-safe Base64 (no padding `=`, `-` instead of `+`,
 * `_` instead of `/`).
 */
function uint8ToUrlBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Converts a URL-safe Base64 string back to a Uint8Array.
 * Adds back padding as needed.
 */
function urlBase64ToUint8(encoded: string): Uint8Array {
  // Restore standard base64
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Encodes a `ProblemInstance` to a URL-safe string.
 *
 * Returns `null` if the serialised problem exceeds the 64 KB limit (the Share
 * button should be disabled in that case).
 */
export function encodeProblem(instance: ParsedProblemInstance): string | null {
  // Strip description from metadata to save space (per contract)
  const slim: ParsedProblemInstance = {
    ...instance,
    metadata: instance.metadata
      ? { ...instance.metadata, description: undefined }
      : undefined,
  }

  const json = JSON.stringify(slim)

  // Enforce size limit on the *uncompressed* JSON
  if (new TextEncoder().encode(json).length > MAX_UNCOMPRESSED_BYTES) {
    return null
  }

  const compressed = deflate(json, { level: 6 })
  return uint8ToUrlBase64(compressed)
}

/**
 * Decodes an encoded string back to a `ProblemInstance`.
 *
 * Returns `null` if decoding fails or Zod validation fails — the caller should
 * silently show an empty workspace.
 */
export function decodeProblem(encoded: string): ParsedProblemInstance | null {
  try {
    const bytes = urlBase64ToUint8(encoded)
    const json = inflate(bytes, { to: 'string' })
    const raw = JSON.parse(json) as unknown

    const result = ProblemInstanceSchema.safeParse(raw)
    if (!result.success) return null

    // Truncate metadata.name if it exceeds the maximum length
    const data = result.data
    if (data.metadata?.name && data.metadata.name.length > MAX_NAME_LENGTH) {
      return {
        ...data,
        metadata: {
          ...data.metadata,
          name: data.metadata.name.slice(0, MAX_NAME_LENGTH),
        },
      }
    }

    return data
  } catch {
    return null
  }
}

/**
 * Builds a full share URL from the current `window.location`, adding `?p=<encoded>`.
 * Returns `null` if the problem is too large to encode.
 */
export function buildShareURL(instance: ParsedProblemInstance): URL | null {
  const encoded = encodeProblem(instance)
  if (encoded === null) return null

  const url = new URL(window.location.href)
  url.searchParams.set('p', encoded)
  return url
}
