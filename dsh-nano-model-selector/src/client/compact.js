/** Browser-side fetch helpers for the async-compaction takeover panel (-20). */
import { jsonOp, call } from './jsonClient.js'

const BASE = '/nano-model-selector/async-compact'
/** The U1–U4 inventory projection has its own read surface: it is the only
 *  read that costs a `pluginManager.listBundles()` on the host, so the status
 *  poll must never touch it. */
const BUNDLE_BASE = `${BASE}/bundle`

const GET_OP = jsonOp({ method: 'GET', url: BASE })
const BUNDLE_GET_OP = jsonOp({ method: 'GET', url: BUNDLE_BASE })
const PUT_OP = jsonOp({ method: 'PUT', url: BASE })
const SWITCH_OP = jsonOp({ method: 'POST', url: `${BASE}/switch` })

/** GET the stored policy + derived read-only fields + ledger `history`.
 * Returns null when the face is unreachable (non-domain failure). */
export async function fetchCompactState() {
  try {
    const data = await call(GET_OP)
    return data?.ok === true ? data : null
  } catch { return null }
}

/** GET the companion-bundle projection ({installed, enabled, known, availability}).
 * Read once when the panel opens; never on the status heartbeat. */
export async function fetchBundleState() {
  try {
    const data = await call(BUNDLE_GET_OP)
    return data?.ok === true ? data.bundle : null
  } catch { return null }
}

/** PUT a partial policy update. Returns the updated payload or throws the error reason. */
export async function putCompactPolicy(patch) {
  return call(PUT_OP, patch) // {ok, policy:{…, effective, runtime}, bundle} — caller merges, no refetch
}

/**
 * -20⑦: the panel's only write path for the takeover toggle.
 * @returns {{application:'applied'|'restart-required'|'overridden', restartReason?}}
 */
export async function postCompactSwitch(enabled) {
  return call(SWITCH_OP, { enabled })
}

/**
 * GET the policy face plus the companion's audit ledger for one session.
 * The ledger is additive (`history`), so this reuses the same route the panel
 * already reads — no second contract, no extra route.
 * @param {string} sessionId
 */
export async function fetchCompactHistory(sessionId) {
  const op = jsonOp({ method: 'GET', url: `${BASE}?${new URLSearchParams({ sessionId }).toString()}` })
  return call(op)
}
