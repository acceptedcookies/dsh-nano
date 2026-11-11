/**
 * checkImage — platform-neutral image payload gate (P3-04).
 *
 * Mirror of the v1 `image` schema rules WITHOUT `Buffer`, so it runs in the
 * browser bundle (notepad src/client/sync.js + markdown.js) where remote
 * image payloads {mime, base64} land before they reach `<img src="data:…">`.
 * The host's validate('image') in schema/v1.js stays the transport-level
 * authority; this check shares the same whitelist + limits at the
 * consumption point.
 *
 * Returns `true` for an acceptable payload, `false` otherwise — callers
 * decide the local consequence (skip record / render missing-image span).
 */

import { MAX_IMAGE_BYTES } from './schema/v1.js'

/** Same whitelist as v1.js IMAGE_MIMES (storeImage's IMAGE_TYPES). */
export const IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/

/**
 * Decoded byte length of a canonical base64 string — no allocation, so a
 * hostile 100 MB string never forces a decode pass.
 */
function decodedLength(s) {
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0
  return (s.length / 4) * 3 - pad
}

/**
 * @param {{mime?: unknown, base64?: unknown}} obj - remote image payload
 * @param {{maxBytes?: number}} [opts] - byte cap (default MAX_IMAGE_BYTES)
 * @returns {boolean}
 */
export function checkImage(obj, { maxBytes = MAX_IMAGE_BYTES } = {}) {
  if (obj === null || typeof obj !== 'object') return false
  if (typeof obj.mime !== 'string' || !IMAGE_MIMES.has(obj.mime)) return false
  const s = obj.base64
  if (typeof s !== 'string' || s.length % 4 !== 0 || !BASE64_RE.test(s)) return false
  if (decodedLength(s) > maxBytes) return false
  /* Canonical-form guard: decode+re-encode must round-trip — a lenient
     decoder accepting junk must never reach <img src>. atob/btoa exist in
     both the browser and Node ≥16. */
  try {
    return s.length === 0 || btoa(atob(s)) === s
  } catch {
    return false
  }
}
