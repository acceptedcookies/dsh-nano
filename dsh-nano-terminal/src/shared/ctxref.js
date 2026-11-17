// Terminal context reference — shared by the browser tab menu (format) and
// the host MCP control plane (parse/resolve).
//
// Form: `[ DNT:{conv8}@{term8} ]` — modelled on notepad's
// `[ DNN:{workspaceStamp}@{path} ]` anchor (vfs file-view context reference).
//   DNT    — the dsh-nano-terminal domain
//   conv8  — the conversation session, stamped to 8 hex (uuid → own prefix,
//            otherwise a deterministic hash, never a slice of a non-uuid id)
//   term8  — the pane's own uuid's first 8 hex, recorded host-side as the
//            session label `t` when the pane creates its terminal
//
// `stamp8`: notepad keeps uuid prefixes verbatim and hashes everything else
// (md5). Node wasm hosts have crypto but the browser bundle keeps to one
// tiny FNV-1a implementation — 32 bits is all 8 hex needs.

/** 8-hex stamp for an id-ish string; uuid keeps its own first 8. */
export function stamp8(id) {
  if (typeof id !== 'string' || id.length === 0) return '00000000'
  const s = id.toLowerCase()
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) return s.slice(0, 8)
  // FNV-1a 32-bit — deterministic, dependency-free.
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

/**
 * `[ DNT:{conv8}@{term8} ]` — the clipboard/paste payload.
 * A null conv degrades to `[ DNT:@{term8} ]` — the same conv-less form
 * `info().ctx` renders for `t`-only sessions — never a fake `00000000`
 * conv stamp that could never match.
 */
export function formatCtxRef(sessionId, termId) {
  const conv = stampOrKeep8(sessionId)
  const term = stampOrKeep8(termId) ?? '00000000'
  return conv ? `[ DNT:${conv}@${term} ]` : `[ DNT:@${term} ]`
}

/**
 * Split slash-command input into { sub, rest } with `[ DNT:…@… ]` refs
 * protected as single tokens — a pasted clipboard ref must reach every
 * ref-taking subcommand verbatim, brackets and spaces included.
 */
export function splitSlashArgs(rawInput) {
  const REF = /\[\s*DNT:[0-9a-f]{0,8}@[0-9a-f]{8}\s*\]|DNT:[0-9a-f]{0,8}@[0-9a-f]{8}/gi
  const protected_ = []
  const text = String(rawInput ?? '').trim().replace(REF, (m) => (protected_.push(m), `\x00${protected_.length - 1}\x00`))
  const [sub, ...rest0] = text.split(/\s+/)
  // Restore refs inside tokens too — `file[DNT:..@..].txt` must not carry
  // literal NUL bytes into the pty.
  const unprotect = (t) => t.replace(/\x00(\d+)\x00/g, (_, i) => protected_[Number(i)])
  return { sub, rest: rest0.map(unprotect) }
}

/**
 * Parse any of the accepted spellings into { conv, term }:
 *   `[ DNT:abcd1234@deadbeef ]` (whitespace-tolerant, case-insensitive)
 *   `DNT:abcd1234@deadbeef`
 * Returns null for anything else. Missing conv is allowed as `{ conv: null }`
 * so a bare `DNT:@deadbeef` still names a terminal.
 */
export function parseCtxRef(input) {
  if (typeof input !== 'string') return null
  const m = input.trim().match(/^\[?\s*DNT:([0-9a-f]{8})?@([0-9a-f]{8})\s*\]?$/i)
  if (!m) return null
  return { conv: m[1] ? m[1].toLowerCase() : null, term: m[2].toLowerCase() }
}

/** A plain 8-hex term stamp without the DNT wrapper also resolves. */
export function bareTermStamp(input) {
  return /^[0-9a-f]{8}$/i.test(input ?? '') ? input.toLowerCase() : null
}

/**
 * Normalize an id-ish value to its 8-hex label form: an already-8-hex value
 * keeps its own digits (the client sends `conv` pre-stamped); anything else
 * (uuid, session id, arbitrary name) passes through `stamp8`.
 */
export function stampOrKeep8(input) {
  if (typeof input !== 'string' || input.length === 0) return null
  return /^[0-9a-f]{8}$/i.test(input) ? input.toLowerCase() : stamp8(input)
}
