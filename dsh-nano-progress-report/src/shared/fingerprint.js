/** Shared fingerprints for the progress ledger and the condensed timeline.
 *  Pure JS (no `node:crypto`): the client bundle needs the same digests, so the
 *  hash is a small self-contained SHA-256 that produces identical bytes on both
 *  sides. 64-hex output strings, same shape node:crypto would give. */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]

/** SHA-256 over a UTF-8 string → 64-char lowercase hex. */
export function digest(text) {
  const bytes = utf8(String(text))
  const bitLen = bytes.length * 8
  const padded = [...bytes]
  padded.push(0x80)
  while (padded.length % 64 !== 56) padded.push(0)
  // 8-byte big-endian bit length; high word is 0 for messages < 2^32 bits.
  const hi = Math.floor(bitLen / 0x100000000)
  padded.push(
    (hi >>> 24) & 0xff, (hi >>> 16) & 0xff, (hi >>> 8) & 0xff, hi & 0xff,
    (bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff)

  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19]
  const w = new Int32Array(64)
  for (let off = 0; off < padded.length; off += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = (padded[off + i * 4] << 24) | (padded[off + i * 4 + 1] << 16)
        | (padded[off + i * 4 + 2] << 8) | padded[off + i * 4 + 3]
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rot(w[i - 15], 7) ^ rot(w[i - 15], 18) ^ (w[i - 15] >>> 3)
      const s1 = rot(w[i - 2], 17) ^ rot(w[i - 2], 19) ^ (w[i - 2] >>> 10)
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0
    }
    let [a, b, c, d, e, f, g, hh] = h
    for (let i = 0; i < 64; i += 1) {
      const s1 = rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)
      const ch = (e & f) ^ (~e & g)
      const t1 = (hh + s1 + ch + K[i] + w[i]) | 0
      const s0 = rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)
      const maj = (a & b) ^ (a & c) ^ (b & c)
      const t2 = (s0 + maj) | 0
      hh = g; g = f; f = e; e = (d + t1) | 0
      d = c; c = b; b = a; a = (t1 + t2) | 0
    }
    h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0
    h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0
  }
  return h.map(word => (word >>> 0).toString(16).padStart(8, '0')).join('')
}

const rot = (word, bits) => ((word >>> bits) | (word << (32 - bits))) | 0

function utf8(text) {
  const out = []
  for (let i = 0; i < text.length; i += 1) {
    let code = text.charCodeAt(i)
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1)
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00)
        i += 1
      }
    }
    if (code < 0x80) out.push(code)
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code < 0x10000) out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else out.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
  }
  return out
}

export const isDigest = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value)

/** Parse wire-call arguments (string or object) into an object, or null. */
export function parseArgsRaw(raw) {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'object') return raw
  if (typeof raw !== 'string') return null
  try {
    const parsed = JSON.parse(raw)
    return parsed && typeof parsed === 'object' ? parsed : null
  } catch (error) {
    if (!(error instanceof SyntaxError)) throw error
    return null
  }
}

/** Sorted-key, description-free canonical form for stable arg digests.
 *  `description`/`justification`-style UI copy is not part of call identity. */
const NON_IDENTITY_KEYS = new Set(['description', 'justification', 'reason'])

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const out = {}
    for (const key of Object.keys(value).sort()) {
      if (NON_IDENTITY_KEYS.has(key)) continue
      out[key] = canonicalize(value[key])
    }
    return out
  }
  return value
}

/** Bash recovery fingerprint: sha256 of [cwd, workdir, command].
 *  Background launches return null — they never participate in recovery. */
export function bashFingerprint(raw, cwd) {
  const args = parseArgsRaw(raw)
  if (args === null) return null
  if (typeof args.command === 'string' && args.command.length > 0 && args.run_in_background !== true) {
    return digest(JSON.stringify([cwd ?? null, args.workdir ?? null, args.command]))
  }
  return null
}

/** Per-file fingerprints for a file-touching call (write/edit/apply_patch).
 *  Call-side: path(s) from the args. Result-side `meta` may carry real paths;
 *  pass `{ args, meta }` and meta paths win when present. */
export function fileFingerprints(raw, meta) {
  const args = parseArgsRaw(raw) ?? {}
  let paths = []
  if (Array.isArray(meta?.diffs)) paths = meta.diffs.map(diff => diff?.path)
  else if (meta?.path !== undefined) paths = [meta.path]
  if (paths.every(path => typeof path !== 'string' || path === '')) {
    const argPath = args.file_path ?? args.path
    paths = typeof argPath === 'string' && argPath !== '' ? [argPath] : []
  }
  return paths.filter(path => typeof path === 'string' && path !== '')
    .map(path => digest(`file:${path}`))
}

/** Fingerprint keys for one tool call, in ledger terms.
 *  - bash/foreground: one key from [cwd, workdir, command]; background → [].
 *  - write/edit/apply_patch: one `file:` key per touched path (args at call
 *    time; meta paths override when the call finished).
 *  - anything else: one key from canonicalized args; null args → [].
 *  Pass `row.tool`, `row.detail.argsRaw`, and (result-side) `meta`. */
export function callFingerprints(name, raw, { cwd = null, meta = null } = {}) {
  if (name === 'bash') {
    const key = bashFingerprint(raw, cwd)
    return key === null ? [] : [key]
  }
  if (name === 'write' || name === 'edit' || name === 'apply_patch') {
    return fileFingerprints(raw, meta)
  }
  const args = parseArgsRaw(raw)
  if (args === null) return []
  return [digest(`call:${name}:${JSON.stringify(canonicalize(args))}`)]
}

/** Bash success check for failure recovery — the terminal-marker rule.
 *  rc.5 emits a text result and cwd for Bash, including promoted calls.
 *  Known terminal markers only withhold recovery; they never infer a failure. */
export function successfulBash({ message, meta } = {}) {
  const block = message?.content?.at(-1)
  if (typeof meta?.cwd !== 'string' || block?.type !== 'text' || typeof block.text !== 'string') return false
  const tail = block.text.slice(-1024).trimEnd()
  return !/^(?:started background job |\[(?:still running after |timed out after |stopped: |killed by signal: |exit code: |sandbox: ))/m.test(tail)
}
