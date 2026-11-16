/**
 * Async-compaction audit ledger (DNMS01 observability).
 *
 * One JSON line per engine decision, per session, under
 * `$DSH_HOME/plugins/nano-model-selector/async-history/<sessionId>.jsonl`.
 *
 * This is a DERIVED TELEMETRY surface, never an authority. The durable truth
 * for one compaction is the session journal's `compaction/start|summary|end`
 * bracket; this ledger only records the engine's own decisions. It exists
 * because an episode dropped before `prepareCompactionTransaction` (for
 * example `no-range`) leaves **no durable trace at all**, which made silent
 * async failures invisible in the GUI.
 *
 * Writes are best-effort: telemetry must never break compaction, so every
 * failure is swallowed.
 */
import { appendFileSync, mkdirSync, renameSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const STATE_ROOT = process.env.DSH_DATA_DIR ?? process.env.DSH_HOME ?? join(homedir(), '.dsh')

/** Directory holding one `<sessionId>.jsonl` ledger per session. */
export const ASYNC_HISTORY_DIR = join(STATE_ROOT, 'plugins', 'nano-model-selector', 'async-history')

/** Rotate at 256 KiB so a long-lived session cannot grow the ledger unbounded. */
const MAX_BYTES = 256 * 1024

/** Session ids only; anything else could escape the ledger directory. */
const SAFE_ID = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,128}$/

/**
 * Absolute ledger path for a session id, or null when the id is not a plain
 * filesystem-safe token.
 * @param {string} sessionId
 * @returns {string|null}
 */
export function asyncHistoryPath(sessionId) {
  return SAFE_ID.test(String(sessionId)) ? join(ASYNC_HISTORY_DIR, `${sessionId}.jsonl`) : null
}

/**
 * Append one decision record. `at` is stamped here so callers never re-derive
 * time. Returns nothing: a failed write is not a compaction failure.
 * @param {string} sessionId
 * @param {Record<string, unknown>} record
 */
export function recordAsyncDecision(sessionId, record) {
  const path = asyncHistoryPath(sessionId)
  if (path === null) return
  try {
    mkdirSync(ASYNC_HISTORY_DIR, { recursive: true, mode: 0o700 })
    try {
      if (statSync(path).size > MAX_BYTES) renameSync(path, `${path}.1`)
    } catch { /* first write for this session */ }
    appendFileSync(path, `${JSON.stringify({ at: new Date().toISOString(), ...record })}\n`, { mode: 0o600 })
  } catch { /* telemetry only */ }
}
