/**
 * Async-compaction bundle inventory projection (U1–U4), read strictly on demand.
 *
 * Why this is a module and not a helper in `index.js`: the only sanctioned
 * source is `pluginManager.listBundles()`, and that read is expensive. Measured
 * on a 32-bundle profile (2026-11-16, dsh-dev): **~0.92 s of synchronous disk
 * work per call** — it resolves every bundle's patch, then every declared row's
 * package metadata (`readdir` + `readFileSync` per locale dictionary), all on
 * the host's event loop. Putting that behind a polling route starves every
 * other request and surfaces as Caddy 502.
 *
 * So the inventory is treated as what it is: a slow, rarely-changing,
 * operator-facing read that is **never** on a status path. This module gives it
 * three properties that make that safe:
 *
 *  - **single-flight** — concurrent callers share one in-flight read, so N open
 *    panels cost one `listBundles()`, not N;
 *  - **long TTL** — a snapshot is reused for `ttlMs` (30 min by default), so the
 *    15 s header poll and a reopened panel never pay again. Correctness does not
 *    depend on it: `plugin-manager/changed` drops the snapshot on every real
 *    change, so the TTL only bounds how long a *missed* event could stay unseen;
 *  - **event invalidation** — `plugin-manager/changed` (the only event the
 *    manager emits, from every install/remove/update/enable operation) drops
 *    the snapshot immediately. The TTL is a backstop for a missed event, not
 *    the correctness mechanism.
 *
 * It never throws: an absent manager or a failed read projects
 * `{installed:false, enabled:false, known:false}` (U1 — "the inventory could not
 * be read"), and a failed read with a previous good snapshot keeps that
 * snapshot rather than flapping the panel to U1.
 */

/** The host-only companion bundle this plugin's panel drives on and off. */
export const COMPACTION_BUNDLE_NAME = 'dsh-nano-model-selector-compaction'

/** U1: the inventory itself is unreachable. Frozen so callers cannot mutate shared state. */
const UNKNOWN = Object.freeze({ installed: false, enabled: false, known: false })

/** Project one `listBundles()` row onto the four fields the panel derives from. */
function project(row) {
  if (row === undefined) return { installed: false, enabled: false, known: true }
  return {
    installed: row.installed === true,
    enabled: row.enabled === true,
    known: true,
    ...(row.availability === undefined ? {} : { availability: row.availability }),
  }
}

/**
 * @param {import('@deepseek-ai/cordis').Context} ctx - host context; the
 *   manager is read through `ctx.get()` (a Context is a Proxy — see the
 *   route-guard comment on the `ctx.webServer` shadow provision).
 * @param {{ ttlMs?: number, now?: () => number, read?: () => Promise<any[]> }} [options]
 *   `read` is a test seam for the sanctioned inventory; production omits it.
 */
export function createBundleInventory(ctx, options = {}) {
  const ttlMs = Number.isFinite(options.ttlMs) && options.ttlMs >= 0 ? options.ttlMs : 1_800_000
  const now = typeof options.now === 'function' ? options.now : Date.now
  const readRows = typeof options.read === 'function'
    ? options.read
    : async () => {
      const pm = ctx.get('pluginManager')
      if (pm === undefined || pm === null) return null
      return await pm.listBundles()
    }

  /** @type {{ value: object, at: number } | null} */
  let snapshot = null
  /** @type {Promise<object> | null} */
  let inFlight = null
  let generation = 0

  /**
   * Read the inventory once and project the companion row.
   * @returns {Promise<object | undefined | null>} `undefined` = the manager is
   *   not reachable yet (activation order), `null` = the read failed. Neither is
   *   cached: caching "no manager" would pin U1 for a whole TTL.
   */
  async function read() {
    try {
      const rows = await readRows()
      if (rows === null) return undefined
      if (!Array.isArray(rows)) return UNKNOWN
      return project(rows.find(item => item?.name === COMPACTION_BUNDLE_NAME))
    } catch {
      return null
    }
  }

  return {
    /** Drop the snapshot; the next `get()` reads the manager again. */
    invalidate() {
      snapshot = null
      generation += 1
    },

    /** The last served value without reading, or null. Diagnostics only. */
    peek() {
      return snapshot === null ? null : snapshot.value
    },

    /**
     * The companion bundle projection.
     * @returns {Promise<{installed: boolean, enabled: boolean, known: boolean, availability?: string}>}
     */
    get() {
      if (snapshot !== null && now() - snapshot.at < ttlMs) return Promise.resolve(snapshot.value)
      if (inFlight !== null) return inFlight
      const mine = generation
      const run = (async () => {
        const value = await read()
        if (value === undefined) return UNKNOWN
        if (value === null) return snapshot === null ? UNKNOWN : snapshot.value
        // An invalidation that landed while this read was running wins: the
        // manager changed, so this answer may already be stale.
        if (mine === generation) snapshot = { value, at: now() }
        return value
      })()
      inFlight = run.then(
        value => { inFlight = null; return value },
        () => { inFlight = null; return UNKNOWN },
      )
      return inFlight
    },
  }
}
