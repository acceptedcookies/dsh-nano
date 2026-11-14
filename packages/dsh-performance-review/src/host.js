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

import { LIB_VERSION, NAME_RE, percentile, recordSpanSample, createSpanRow, RESERVOIR_CAP } from './state.js'

const WRITE_INTERVAL_MS = 30_000
/** Bound the per-window sample list when no lab drains it for a long time. */
const WINDOW_SAMPLE_CAP = 512

const isPromiseLike = value => value !== null && typeof value === 'object' && typeof value.then === 'function'

/**
 * The host-side snapshot that host.json carries and aggregate.hostSpanObject()
 * merges into the browser report.
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
      }
    }
    plugins[pluginId] = { version: row.version ?? null, spans }
  }
  return {
    version: 1,
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
    plugins[pluginId] = { version: row.version ?? null, spans }
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
      await fs.writeFile(path.join(target, 'host.json'), JSON.stringify(hostSnapshot(state), null, 2))
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

  const recordSpan = (row, name, t0, t1) => {
    if (!NAME_RE.test(name) || !isEnabled()) return
    let span = row.spans.get(name)
    if (span === undefined) {
      span = createSpanRow()
      row.spans.set(name, span)
    }
    // host keeps a cumulative reservoir plus a per-window list (A1: the lab
    // drains the window between scenarios; the 30 s writer drains it too).
    span.n += 1
    const ms = t1 - t0
    span.window.push(ms)
    while (span.window.length > WINDOW_SAMPLE_CAP) span.window.shift()
    if (span.reservoir.length < RESERVOIR_CAP) span.reservoir.push(ms)
    else {
      const slot = Math.floor(Math.random() * span.n)
      if (slot < RESERVOIR_CAP) span.reservoir[slot] = ms
    }
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
      row = { version: impl.version ?? null, spans: new Map() }
      state.plugins.set(pluginId, row)
    }
    state.contributors.push({ pluginId, libVersion: impl.libVersion ?? LIB_VERSION })
    const clock = env.performance ?? globalThis.performance
    const now = () => clock.now()
    return {
      hostSpan(name, fn) {
        if (!NAME_RE.test(name)) return fn()
        const t0 = now()
        let result
        try {
          result = fn()
        } catch (error) {
          recordSpan(row, name, t0, now())
          throw error
        }
        if (isPromiseLike(result)) {
          return result.finally(() => recordSpan(row, name, t0, now()))
        }
        recordSpan(row, name, t0, now())
        return result
      },
      count() {},
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
