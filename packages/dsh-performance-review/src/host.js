/**
 * dsh-performance-review — host singleton.
 *
 * Bundled into each plugin's lib/host.js (esbuild --packages=external) or consumed
 * via the plugin-built lib/observe-host.js for unbundled index.js entries. One
 * dsh host process owns exactly one `globalThis.__perfReviewHost` (spec §3.3);
 * every bundled copy registers itself in `contributors`.
 *
 * Enablement: DSH_PERF_REVIEW=1 read lazily at first span/snapshot, or an
 * explicit host.setEnabled(bool) which always wins. Resolution is deferred so
 * a plugin that sets the env var inside apply() (after module import, where
 * hostJoin fires) still turns collection on. While enabled a writer flushes
 *   <dataDir>/plugins/perf-review/host.json
 * every 30 s (timer.unref()) and once more on process beforeExit.
 */

import { LIB_VERSION, NAME_RE, percentile, recordSpanSample, createSpanRow, RESERVOIR_CAP, MAX_USAGE_KEYS, roundMs } from './state.js'

const WRITE_INTERVAL_MS = 30_000
/** Bound the per-window sample list when no lab drains it for a long time. */
const WINDOW_SAMPLE_CAP = 512
/** Ring of recent {ms,at,err,traceId} events per span — answers "which call was slow/failed". */
const EVENT_CAP = 32
/** Rotate host-snapshots.jsonl past this size so a long-lived host cannot grow it forever. */
const JSONL_CAP_BYTES = 8 * 1024 * 1024

const isPromiseLike = value => value !== null && typeof value === 'object' && typeof value.then === 'function'

/**
 * Pre-aggregated per-span stats — computed once at snapshot time from the
 * reservoir (≤64 numbers) rather than making every consumer re-derive p95.
 * `errors` counts calls whose fn threw/rejected; `lastErrorAt` says when.
 */
function spanStats(span) {
  const reservoir = span.reservoir ?? []
  return {
    n: span.n,
    p50: roundMs(percentile(reservoir, 0.5)),
    p95: roundMs(percentile(reservoir, 0.95)),
    max: roundMs(reservoir.length === 0 ? null : Math.max(...reservoir)),
    errors: span.errors ?? 0,
    lastMs: span.lastMs ?? null,
    lastAt: span.lastAt ?? null,
    lastErrorAt: span.lastErrorAt ?? null,
    lastTraceId: span.lastTraceId ?? null,
  }
}

/**
 * The host-side snapshot that host.json carries and aggregate.hostSpanObject()
 * merges into the browser report. `stats` is additive (P1-4): consumers that
 * only know `samples` keep working unchanged.
 */
export function hostSnapshot(state) {
  const plugins = {}
  for (const [pluginId, row] of state.plugins) {
    const spans = {}
    for (const [name, span] of row.spans) {
      spans[name] = {
        n: span.n,
        samples: [...span.reservoir],
        windowN: span.window.length,
        windowSamples: [...span.window],
        stats: spanStats(span),
        events: [...(span.events ?? [])],
      }
    }
    const counts = {}
    if (row.counts instanceof Map) {
      for (const [name, n] of row.counts) counts[name] = n
    }
    plugins[pluginId] = { version: row.version ?? null, spans, counts }
  }
  return {
    version: 2,
    enabled: state.enabled,
    observerVersion: LIB_VERSION,
    contributors: state.contributors.map(c => ({ ...c })),
    sinceStart: state.sinceStart,
    writtenAt: new Date().toISOString(),
    plugins,
    structure: { hostWriteErrors: state.writeErrors },
  }
}

/**
 * A1: return ONLY the samples recorded since the last takeWindow()/writer
 * flush, in the same shape `buildReport`/`mergeHostSnapshot` consume, then
 * clear that window. The lab calls this at scenario start (discard) and at
 * scenario end (use) so `hostSpan.n` is a true per-scenario count rather than
 * a process-cumulative blob.
 */
export function takeWindow(state) {
  const snap = hostSnapshot(state)
  const plugins = {}
  for (const [pluginId, row] of state.plugins) {
    const spans = {}
    for (const [name, span] of row.spans) {
      spans[name] = { n: span.window.length, samples: [...span.window] }
    }
    const counts = {}
    if (row.counts instanceof Map) {
      for (const [name, n] of row.counts) counts[name] = n
    }
    plugins[pluginId] = { version: row.version ?? null, spans, counts }
  }
  for (const row of state.plugins.values()) {
    for (const span of row.spans.values()) span.window.length = 0
  }
  return { ...snap, window: true, plugins }
}

/**
 * @param {object} [env] - injectable for tests:
 *   {process, fs, path, setInterval, clearInterval, global, forceEnabled}
 */
export function createPerfReviewHost(env = {}) {
  const processRef = env.process ?? globalThis.process
  const state = {
    enabled: env.forceEnabled !== undefined ? env.forceEnabled === true : null,
    plugins: new Map(),
    contributors: [],
    writeErrors: 0,
    sinceStart: new Date().toISOString(),
    writer: null,
  }

  const dataDir = () =>
    processRef.env?.DSH_DATA_DIR ?? processRef.env?.DSH_HOME ?? null

  const writeFile = async () => {
    const fs = env.fs ?? (await import('node:fs/promises'))
    const path = env.path ?? (await import('node:path'))
    const dir = dataDir() ?? `${processRef.env?.HOME ?? ''}/.dsh`
    const target = path.join(dir, 'plugins', 'perf-review')
    try {
      await fs.mkdir(target, { recursive: true })
      const snap = hostSnapshot(state)
      await fs.writeFile(path.join(target, 'host.json'), JSON.stringify(snap, null, 2))
      // P1-4 time series: one compact JSONL row per write cycle — a lab can
      // replay p95 over time without holding the host process open. Rotates
      // by truncating when the file passes the cap (keeps tail rows, drops
      // the oldest by rewriting — coarse but bounded and dependency-free).
      const series = { at: snap.writtenAt, plugins: {} }
      for (const [pluginId, row] of state.plugins) {
        const spans = {}
        for (const [name, span] of row.spans) {
          spans[name] = { n: span.n, p95: roundMs(percentile(span.reservoir, 0.95)), errors: span.errors ?? 0 }
        }
        series.plugins[pluginId] = { spans }
      }
      const jsonlPath = path.join(target, 'host-snapshots.jsonl')
      let existing = ''
      try {
        existing = await fs.readFile(jsonlPath, 'utf8')
      } catch { /* first write */ }
      if (existing.length > JSONL_CAP_BYTES) {
        existing = existing.slice(-Math.floor(JSONL_CAP_BYTES / 2))
        const nl = existing.indexOf('\n')
        if (nl >= 0) existing = existing.slice(nl + 1)
      }
      await fs.writeFile(jsonlPath, existing + JSON.stringify(series) + '\n')
    } catch {
      state.writeErrors += 1
    }
  }

  const startWriter = () => {
    if (state.writer !== null) return
    const setIntervalRef = env.setInterval ?? setInterval
    state.writer = setIntervalRef(() => { void writeFile() }, WRITE_INTERVAL_MS)
    if (typeof state.writer?.unref === 'function') state.writer.unref()
    try {
      processRef.once?.('beforeExit', () => { void writeFile() })
    } catch { /* fake process without once() */ }
  }

  /**
   * Resolve `enabled` lazily and exactly once — but only when something
   * actually reads it, never at hostJoin time. Freezing on hostJoin meant a
   * plugin that sets DSH_PERF_REVIEW inside apply() (which runs AFTER module
   * import, where hostJoin fires) could never turn collection on: the switch
   * looked on but recorded nothing. An explicit setEnabled() always wins;
   * otherwise the env var is read at first span/snapshot, by which point
   * apply() has run.
   */
  const isEnabled = () => {
    if (state.enabled === null) {
      state.enabled = env.forceEnabled !== undefined
        ? env.forceEnabled === true
        : processRef.env?.DSH_PERF_REVIEW === '1'
      if (state.enabled) startWriter()
    }
    return state.enabled
  }

  /** Explicit on/off — wins over the env var and over lazy resolution. */
  const setEnabled = (value) => {
    state.enabled = value === true
    if (state.enabled) startWriter()
  }

  const recordSpan = (row, name, t0, t1, err = false, traceId = null) => {
    if (!NAME_RE.test(name) || !isEnabled()) return
    let span = row.spans.get(name)
    if (span === undefined) {
      span = createSpanRow()
      span.errors = 0
      span.events = []
      row.spans.set(name, span)
    }
    // host keeps a cumulative reservoir plus a per-window list (A1: the lab
    // drains the window between scenarios; the 30 s writer drains it too),
    // plus a small events ring carrying the {ms,at,err} triple so a reader
    // can answer "which call was slow/failed" without replaying samples.
    span.n += 1
    const ms = t1 - t0
    const at = new Date().toISOString()
    span.lastMs = ms
    span.lastAt = at
    if (traceId != null) span.lastTraceId = traceId
    if (err) { span.errors += 1; span.lastErrorAt = at }
    span.window.push(ms)
    while (span.window.length > WINDOW_SAMPLE_CAP) span.window.shift()
    if (span.reservoir.length < RESERVOIR_CAP) span.reservoir.push(ms)
    else {
      const slot = Math.floor(Math.random() * span.n)
      if (slot < RESERVOIR_CAP) span.reservoir[slot] = ms
    }
    span.events.push(traceId != null ? { ms: Math.round(ms * 10) / 10, at, err, traceId } : { ms: Math.round(ms * 10) / 10, at, err })
    while (span.events.length > EVENT_CAP) span.events.shift()
  }

  /**
   * hostJoin(pluginId, impl) — impl: {version?}.
   * Returns { hostSpan(name, fn) } where fn may be sync or async (timed to settle).
   * One API regardless of enablement: recording is gated inside recordSpan so
   * a setEnabled(true) that lands after join still starts collecting.
   */
  const hostJoin = (pluginId, impl = {}) => {
    let row = state.plugins.get(pluginId)
    if (row === undefined) {
      row = { version: impl.version ?? null, spans: new Map(), counts: new Map() }
      state.plugins.set(pluginId, row)
    }
    if (!(row.counts instanceof Map)) row.counts = new Map()
    state.contributors.push({ pluginId, libVersion: impl.libVersion ?? LIB_VERSION })
    const clock = env.performance ?? globalThis.performance
    const now = () => clock.now()
    return {
      /**
       * hostSpan(name, fn, ctx?) — ctx: {traceId?, incidentId?} correlates the
       * span event with a caller-side trace (e.g. an incidentId from the
       * operations ring); only the LAST-seen trace is kept per span plus the
       * traceId on each event row.
       */
      hostSpan(name, fn, ctx = null) {
        if (!NAME_RE.test(name)) return fn()
        const traceId = ctx && (ctx.traceId ?? ctx.incidentId ?? null)
        const t0 = now()
        let result
        try {
          result = fn()
        } catch (error) {
          recordSpan(row, name, t0, now(), true, traceId)
          throw error
        }
        if (isPromiseLike(result)) {
          return result.then(
            (value) => { recordSpan(row, name, t0, now(), false, traceId); return value },
            (error) => { recordSpan(row, name, t0, now(), true, traceId); throw error },
          )
        }
        recordSpan(row, name, t0, now(), false, traceId)
        return result
      },
      /** count(name, n?) — cumulative counter per name (usage-style). */
      count(name, n = 1) {
        if (!NAME_RE.test(name) || !isEnabled()) return
        if (!(row.counts instanceof Map)) row.counts = new Map()
        if (!row.counts.has(name) && row.counts.size >= MAX_USAGE_KEYS) return
        row.counts.set(name, (row.counts.get(name) ?? 0) + n)
      },
      snapshot: () => { isEnabled(); return hostSnapshot(state) },
      takeWindow: () => takeWindow(state),
    }
  }

  return {
    hostJoin,
    setEnabled,
    snapshot: () => { isEnabled(); return hostSnapshot(state) },
    takeWindow: () => takeWindow(state),
    flush: () => writeFile(),
    _state: () => state,
    libVersion: LIB_VERSION,
  }
}

/** Each bundled copy carries its own LIB_VERSION: implants must pass it to hostJoin(). */
export { LIB_VERSION }

/**
 * Install-or-reuse the process singleton.
 *
 * Version skew: each plugin bundles its own copy of this host. An older
 * bundle that loads first wins the singleton and lacks `setEnabled`/`_state`;
 * a newer bundle then crashes calling host.setEnabled(). Fix by upgrading in
 * place — when the incumbent lacks an API the newer copy provides, swap in a
 * fresh host and carry the accumulated state across (spans, contributors,
 * enablement) so already-recorded data is not lost. The upgrade only fires
 * when the incumbent is actually missing something, so a same-version call is
 * a cheap reuse.
 */
export function ensurePerfReviewHost(env = {}) {
  const global = env.global ?? globalThis
  const incumbent = global.__perfReviewHost
  if (incumbent == null) {
    global.__perfReviewHost = createPerfReviewHost(env)
    return global.__perfReviewHost
  }
  // The new copy needs setEnabled + _state to manage/inspect the host. An
  // older incumbent without them is upgraded; a peer that already has them is
  // reused as-is.
  if (typeof incumbent.setEnabled !== 'function' || typeof incumbent._state !== 'function') {
    const fresh = createPerfReviewHost(env)
    try {
      const old = typeof incumbent._state === 'function' ? incumbent._state() : null
      const next = fresh._state()
      if (old && typeof old === 'object') {
        if (old.plugins instanceof Map) next.plugins = old.plugins
        if (Array.isArray(old.contributors)) next.contributors = old.contributors
        if (typeof old.enabled === 'boolean') next.enabled = old.enabled
        if (typeof old.writeErrors === 'number') next.writeErrors = old.writeErrors
        if (typeof old.sinceStart === 'string') next.sinceStart = old.sinceStart
        // Keep the incumbent's writer if it is already running so we do not
        // double-subscribe the interval.
        if (old.writer) next.writer = old.writer
      }
    } catch { /* upgrade is best-effort; never break apply() */ }
    global.__perfReviewHost = fresh
    return fresh
  }
  return incumbent
}
