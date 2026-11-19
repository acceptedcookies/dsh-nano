/** Browser-side fetch helpers + shared store for the async-compaction takeover (-20/P5-02). */
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

/** GET the stored policy + derived read-only fields. With a sessionId the
 * runtime block (fill, window, last compaction) and `history` describe that
 * session. Returns null when the face is unreachable (non-domain failure). */
export async function fetchCompactState(sessionId) {
  try {
    const op = typeof sessionId === 'string' && sessionId.length > 0
      ? jsonOp({ method: 'GET', url: `${BASE}?${new URLSearchParams({ sessionId }).toString()}` })
      : GET_OP
    const data = await call(op)
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
export async function putCompactPolicy(patch, sessionId) {
  // The response's runtime block is per session; without the id it comes back empty.
  const op = typeof sessionId === 'string' && sessionId.length > 0
    ? jsonOp({ method: 'PUT', url: `${BASE}?${new URLSearchParams({ sessionId }).toString()}` })
    : PUT_OP
  return call(op, patch) // {ok, policy:{…, effective, runtime}, bundle} — caller merges, no refetch
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

/* ---------------- shared async-compaction store (P5-02e) ---------------- */

/** Interval between in-flight continuation reads; locked by T16 + declaration. */
export const INFLIGHT_POLL_MS = 3000

/**
 * Kinds that close an episode. `select` is deliberately NOT here (an episode
 * can sit between select and commit for a while); `skip` means "suppressed"
 * and settles immediately; `health` is the post-commit verdict and only ever
 * follows a commit. An unknown kind counts as in-flight — never let a record
 * this build does not know silently stop the pump.
 */
const SETTLED_KINDS = new Set(['commit', 'drop', 'skip', 'health'])

function tailRecord(data) {
  const records = data?.history?.records
  return Array.isArray(records) && records.length > 0 ? records[records.length - 1] : null
}

/**
 * Per-session ledger state shared by the badge and the history dialog. The
 * store owns the ONLY continuation schedule: a fetch happens when a component
 * asks (mount/refresh), when `setRunning` reports the session's running flag
 * changed, and after that every INFLIGHT_POLL_MS ONLY while the session is
 * running AND the ledger tail is unsettled (`commit`/`drop`/`skip` stop it).
 */
class AsyncCompactStore {
  constructor({ fetcher = fetchCompactHistory } = {}) {
    this.sessions = new Map() // sessionId -> entry
    this.fetcher = fetcher
  }

  entry(sessionId) {
    let e = this.sessions.get(sessionId)
    if (e === undefined) {
      e = {
        data: null,
        fetched: false,
        running: false,
        subscribers: new Set(),
        timer: null,
        inFlight: null,
      }
      this.sessions.set(sessionId, e)
    }
    return e
  }

  snapshot(sessionId) {
    return this.sessions.get(sessionId)?.data ?? null
  }

  /** True while the newest ledger row leaves an episode open. */
  inflightOf(e) {
    const tail = tailRecord(e.data)
    if (tail === null || typeof tail.kind !== 'string') return false
    return !SETTLED_KINDS.has(tail.kind)
  }

  clearTimer(e) {
    if (e.timer !== null) { clearTimeout(e.timer); e.timer = null }
  }

  /** Re-arm the continuation timer when the pump condition holds. */
  schedule(e, sessionId) {
    this.clearTimer(e)
    if (e.subscribers.size === 0) return
    if (!e.running || !this.inflightOf(e)) return
    e.timer = setTimeout(() => {
      e.timer = null
      this.refresh(sessionId)
    }, INFLIGHT_POLL_MS)
  }

  async refresh(sessionId) {
    const e = this.entry(sessionId)
    if (e.inFlight !== null) return e.inFlight
    e.inFlight = this.fetcher(sessionId)
      .then(data => {
        e.data = data
        e.fetched = true
        for (const listener of e.subscribers) {
          try { listener(data) } catch { /* a bad listener must not break the pump */ }
        }
      })
      .catch(() => { /* a read failure is not a compaction failure */ })
      .finally(() => {
        e.inFlight = null
        this.schedule(e, sessionId)
      })
    return e.inFlight
  }

  /**
   * Subscribe a component. The first subscriber fetches once; unsubscribe
   * removes the entry when nobody is left (no timer outlives its UI).
   */
  subscribe(sessionId, listener) {
    const e = this.entry(sessionId)
    e.subscribers.add(listener)
    this.refresh(sessionId)
    this.schedule(e, sessionId)
    return () => {
      e.subscribers.delete(listener)
      if (e.subscribers.size === 0) {
        this.clearTimer(e)
        this.sessions.delete(sessionId)
      }
    }
  }

  /** The session's running flag, from `useSessionStatus` where available. */
  setRunning(sessionId, running) {
    const e = this.entry(sessionId)
    const next = running === true
    if (e.running === next) return
    e.running = next
    // Both edges matter: going running while in-flight starts the pump;
    // going idle stops the schedule (the next open/fetch re-reads anyway).
    if (next) this.refresh(sessionId)
    this.schedule(e, sessionId)
  }

  /** Test seam: total scheduled timer count across sessions. */
  scheduledCount() {
    let n = 0
    for (const e of this.sessions.values()) if (e.timer !== null) n += 1
    return n
  }
}

export const asyncCompactStore = new AsyncCompactStore()

/** Exported for tests (T16): constructing a store with a fake fetcher. */
export { AsyncCompactStore }
