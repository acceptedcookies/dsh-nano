/**
 * dsh-performance-review — browser singleton.
 *
 * Bundled into each plugin's lib/client.js. One page owns exactly one
 * `window.__perfReview` regardless of how many plugin bundles carry a copy
 * (spec §3.3); the first copy to run installs it, later copies join the same
 * instance and record themselves in `meta.contributors`.
 *
 * Enablement: localStorage['dsh-perf-review'] === '1' or ?perf-review=1,
 * decided once at the FIRST join() call, never re-read (spec §6.2).
 * Disabled path = identity wrappers: fn() is called, no marks, no clocks.
 */

import {
  createCollectorState,
  createStructure,
  ensurePlugin,
  LIB_VERSION,
  NAME_RE,
  nanoPackagesInUrl,
  packageNameToPluginId,
  recordSpanSample,
  spanRowFor,
  targetBucket,
  trackRowFor,
  usageAdd,
  WINDOW_PAD_AFTER_MS,
  EVENT_DURATION_THRESHOLD,
} from './state.js'
import { buildReport, interactionSamples, pushInteraction, mergeHostSnapshot } from './aggregate.js'

const TRACK_EVENT_CAP = 4096
const SPAN_EVENT_CAP = 4096
const PROFILER_SAMPLE_CAP = 128

const now = perf => perf.now()

const isPromiseLike = value => value !== null && typeof value === 'object' && typeof value.then === 'function'

/**
 * Does the document/env say "observe"? Checked once, at first join().
 * @param {object} env - {localStorage?, location?, forceEnabled?}
 */
export function readEnabledFlag(env) {
  if (env.forceEnabled !== undefined) return env.forceEnabled === true
  try {
    if (env.localStorage?.getItem?.('dsh-perf-review') === '1') return true
  } catch { /* private mode / access denied → disabled */ }
  try {
    const search = env.location?.search ?? ''
    if (/(?:^|[?&])perf-review=1(?:&|$)/.test(search)) return true
  } catch { /* ignore */ }
  return false
}

/**
 * Build the sanitized descriptor for targetBucket() by walking up the
 * ancestor chain (a click on a row's icon should still hit `files-row`).
 * Returns the first non-'other' bucket, else 'other'.
 * @param {Element|null} el
 * @param {string[]} attrs - data-* names, priority order
 */
export function bucketForElement(el, attrs) {
  let node = el
  let depth = 0
  while (node != null && typeof node === 'object' && depth < 12) {
    const descriptor = { tag: node.tagName, attrs: {} }
    for (const name of attrs) {
      try {
        if (typeof node.hasAttribute === 'function' && node.hasAttribute(name)) {
          descriptor.attrs[name] = true
        }
      } catch { /* ignore */ }
    }
    const bucket = targetBucket(descriptor)
    if (bucket !== 'other') return bucket
    node = node.parentElement ?? null
    depth += 1
  }
  return targetBucket({ tag: el?.tagName, attrs: {} })
}

const BUCKET_ATTRS = [
  'data-composer', 'data-chat-input',
  'data-nano-notepad', 'data-nano-model-selector',
  'data-nxe', 'data-nano-shared-workspace',
  'data-row-key', 'data-sidebar-row',
]

const HIDDEN_SELECTOR = '[hidden],[aria-hidden="true"]'

/**
 * Layout-read-free visibility for join() impls (spec §6.3): a root() may only
 * use isConnected, el.hidden, closest('[hidden],[aria-hidden="true"]') and
 * offsetParent. Never getBoundingClientRect / getComputedStyle — a root() that
 * forces layout makes the observer itself a layout source.
 * @param {Element|null|undefined} element
 * @param {Element|null|undefined} [hiddenScope] - ancestor whose [hidden] gate
 *   applies (e.g. explorer: closest('[data-sidebar-right-pane]')); null ⇒ skip
 */
export function isUsableRoot(element, hiddenScope = null) {
  if (element == null || typeof element !== 'object') return false
  if (element.isConnected === false) return false
  if (element.hidden === true) return false
  try {
    if (typeof element.closest === 'function' && element.closest(HIDDEN_SELECTOR) !== null) {
      return false
    }
  } catch { /* treat as usable */ }
  if (hiddenScope != null) {
    if (hiddenScope.hidden === true) return false
    try {
      if (typeof hiddenScope.closest === 'function' && hiddenScope.closest(HIDDEN_SELECTOR) !== null) {
        return false
      }
    } catch { /* treat as usable */ }
  }
  return true
}

/**
 * First usable element from an iterable — e.g. explorer's per-pane roots:
 *   join('nano-explorer-extra', { root: () => firstVisibleRoot(
 *     document.querySelectorAll('[data-nxe]'),
 *     el => el.closest('[data-sidebar-right-pane]')) })
 * @param {Iterable<Element>} elements
 * @param {(el: Element) => Element|null} [scopeOf] - element → hidden-scope ancestor
 */
export function firstVisibleRoot(elements, scopeOf = null) {
  for (const element of elements ?? []) {
    const scope = scopeOf === null ? null : scopeOf(element)
    if (isUsableRoot(element, scope)) return element
  }
  return null
}

const contains = (parent, child) => {
  if (parent == null || child == null) return false
  if (parent === child) return true
  return typeof parent.contains === 'function' ? parent.contains(child) : false
}

/**
 * Pick the owning pluginId for an interaction target.
 * Candidates: every joined plugin whose root() is truthy and contains(target).
 * Winner = deepest root (another root contains it); first-registered wins ties.
 * @returns {string} pluginId or 'native'
 */
export function pickOwner(plugins, target, structure) {
  let chosen = null
  for (const [pluginId, row] of plugins) {
    if (typeof row._root !== 'function') continue
    let root
    try {
      root = row._root()
    } catch {
      structure.rootErrors += 1
      continue
    }
    if (root == null) continue
    let hit = false
    try {
      hit = contains(root, target)
    } catch {
      structure.rootErrors += 1
      continue
    }
    if (!hit) continue
    if (chosen === null) {
      chosen = { pluginId, root }
      continue
    }
    // deeper wins: if the current root contains this candidate, candidate is deeper
    try {
      if (contains(chosen.root, root) && root !== chosen.root) chosen = { pluginId, root }
    } catch {
      structure.rootErrors += 1
    }
  }
  return chosen?.pluginId ?? 'native'
}

/**
 * @param {object} [env] - injectable for tests:
 *   {performance, PerformanceObserver, localStorage, location, forceEnabled,
 *    navigator, hostSnapshotProvider}
 */
export function createPerfReview(env = {}) {
  const perf = env.performance ?? globalThis.performance
  const structure = createStructure()
  const plugins = new Map()
  const contributors = []
  let collector = createCollectorState()
  // Real callers pass no env: read the flag sources off the page globals then.
  // env.localStorage/env.location only override in tests. `typeof localStorage`
  // itself THROWS on opaque origins (about:blank, sandboxed frames), so each
  // probe is guarded — otherwise importing the library kills the whole bundle.
  if (env.localStorage === undefined) {
    try { if (typeof localStorage !== 'undefined') env = { ...env, localStorage } } catch { /* opaque origin */ }
  }
  if (env.location === undefined) {
    try { if (typeof location !== 'undefined') env = { ...env, location } } catch { /* opaque origin */ }
  }
  let enabled = env.forceEnabled !== undefined ? env.forceEnabled === true : null
  let observers = null
  let loafSupported = true
  // A1: the host snapshot reaches the browser report either by explicit
  // argument (lab), by an injected provider (tests), or by a polled host
  // route (real page, see configure()). Never by a bare import.
  let hostSnapshotProvider = env.hostSnapshotProvider ?? null
  let hostSnapshotCache = null
  let hostSnapshotTimer = null
  let finalizeTimer = null

  collector.startedAt = now(perf)

  const pushCapped = (array, cap, item) => {
    array.push(item)
    while (array.length > cap) array.shift()
  }

  /**
   * L1: split PerformanceEventTiming.duration into input delay (main thread
   * busy / queued), processing (event handlers) and presentation (wait for the
   * next paint). A page-level INP regression can then be attributed to a
   * segment instead of being guessed at (performance-alpha.md §12).
   */
  const eventParts = entry => {
    const start = entry.startTime ?? 0
    const duration = entry.duration ?? 0
    const ps = typeof entry.processingStart === 'number' && entry.processingStart > 0
      ? entry.processingStart : start
    const pe = typeof entry.processingEnd === 'number' && entry.processingEnd >= ps
      ? entry.processingEnd : ps
    return {
      inputDelay: Math.max(0, ps - start),
      processing: Math.max(0, pe - ps),
      presentation: Math.max(0, duration - (pe - start)),
    }
  }

  /** Merge one event-timing entry into its interaction accumulator. */
  const absorbEventEntry = entry => {
    const id = entry.interactionId ?? 0
    if (id === 0) return // non-interaction events (e.g. plain scrolls) carry 0 — not INP data
    const key = String(id)
    let pending = collector.pendingInteractions.get(key)
    if (pending === undefined) {
      pending = {
        interactionId: id,
        start: entry.startTime,
        duration: entry.duration ?? 0,
        target: entry.target ?? null,
        ...eventParts(entry),
      }
      collector.pendingInteractions.set(key, pending)
      return
    }
    pending.start = Math.min(pending.start, entry.startTime)
    if ((entry.duration ?? 0) >= pending.duration) {
      pending.duration = entry.duration ?? 0
      pending.target = entry.target ?? pending.target
      // Keep the three segments from the SAME (max-duration) entry as duration.
      Object.assign(pending, eventParts(entry))
    }
  }

  /**
   * Close pending interactions whose window has fully passed, finalize
   * owner/samples, and feed plugin rows.
   * @param {number} cutoff - finalize anything ending before this time
   */
  const finalizeDue = cutoff => {
    for (const [key, pending] of collector.pendingInteractions) {
      const windowEnd = pending.start + pending.duration + WINDOW_PAD_AFTER_MS
      if (windowEnd > cutoff) continue
      collector.pendingInteractions.delete(key)
      const owner = pickOwner(plugins, pending.target, structure)
      const bucket = bucketForElement(pending.target, BUCKET_ATTRS)
      const samples = interactionSamples(pending, collector.spanEvents, collector.trackEvents)
      pushInteraction(collector, {
        interactionId: pending.interactionId,
        start: pending.start,
        duration: pending.duration,
        inputDelay: pending.inputDelay ?? 0,
        processing: pending.processing ?? 0,
        presentation: pending.presentation ?? 0,
        owner,
        bucket,
        samples,
      })
      const row = plugins.get(owner)
      if (row !== undefined && owner !== 'native') {
        row.own.interactions.push(pending.duration)
        continue
      }
      // native-owned window: charge samples to the plugins that appeared
      for (const [pluginId, sample] of Object.entries(samples)) {
        const targetRow = plugins.get(pluginId)
        if (targetRow === undefined) continue
        targetRow.samples.spans += sample.spans
        targetRow.samples.callbacks += sample.callbacks
        if (sample.spanMs > 0) targetRow.native.spanMs.push(sample.spanMs)
        if (sample.trackMs > 0) targetRow.native.trackMs.push(sample.trackMs)
      }
    }
    // A2: keep only the last 60 s of span/track events. Interactions are
    // finalized promptly (below), so nothing still needed is dropped; a
    // long session can no longer evict events before their window is scored.
    const keepAfter = now(perf) - 60_000
    collector.spanEvents = collector.spanEvents.filter(event => event.end >= keepAfter)
    collector.trackEvents = collector.trackEvents.filter(event => event.at >= keepAfter)
  }

  const absorbLoafEntry = entry => {
    collector.loafCount += 1
    collector.blockingMs += entry.blockingDuration ?? 0
    let nanoInFrame = false
    for (const script of entry.scripts ?? []) {
      collector.forcedLayoutMs += script.forcedStyleAndLayoutDuration ?? 0
      const packages = nanoPackagesInUrl(script.sourceURL ?? '')
      if (packages.length === 0) continue
      nanoInFrame = true
      if (packages.length === 1) {
        const pluginId = packageNameToPluginId(packages[0])
        if (pluginId !== null) {
          collector.pluginScriptMs.set(
            pluginId, (collector.pluginScriptMs.get(pluginId) ?? 0) + (script.duration ?? 0))
        }
      } else {
        collector.nanoScriptMs += script.duration ?? 0
      }
    }
    if (nanoInFrame) {
      collector.nanoLoafCount += 1
      collector.nanoBlockingMs += entry.blockingDuration ?? 0
    }
  }

  const absorbResourceEntry = entry => {
    const name = entry.name ?? ''
    const isJs = entry.initiatorType === 'script' || /\.js(?:[?&]|$)/.test(name)
    if (!isJs) return
    const bytes = entry.encodedBodySize ?? 0
    collector.resources.totalJsBytes += bytes
    if (nanoPackagesInUrl(name).length === 0) return
    collector.resources.nanoClientJsBytes += bytes
    if (name.includes('/plugins/??')) collector.resources.comboResources += 1
  }

  const installObservers = () => {
    if (observers !== null) return
    observers = { installed: true }
    const ObserverCtor = env.PerformanceObserver ?? globalThis.PerformanceObserver
    if (typeof ObserverCtor !== 'function') {
      loafSupported = false
      structure.observerErrors += 1
      return
    }
    const tryObserve = (types, handler) => {
      try {
        const observer = new ObserverCtor(list => {
          try {
            for (const entry of list.getEntries()) handler(entry)
            // A2: settle each interaction as soon as its window has passed.
            // Without this, pendingInteractions only drained at report() and
            // the 4096-event ring silently lost older samples.
            finalizeDue(now(perf))
          } catch {
            structure.observerErrors += 1
          }
        })
        observer.observe({ type: types, buffered: true, durationThreshold: EVENT_DURATION_THRESHOLD })
        return observer
      } catch {
        // A5: a single observe() failure must not be invisible. `observerErrors`
        // only fires when all three fail, so count partial installs separately.
        structure.observersMissing += 1
        return null
      }
    }
    observers.event = tryObserve('event', absorbEventEntry)
    observers.loaf = tryObserve('long-animation-frame', absorbLoafEntry)
    if (observers.loaf === null) loafSupported = false
    observers.resource = tryObserve('resource', absorbResourceEntry)
    if (observers.event === null && observers.loaf === null && observers.resource === null) {
      structure.observerErrors += 1
    }
  }

  /** A2: fallback sweep so an interaction with no further entries still closes. */
  const startFinalizeSweep = () => {
    if (finalizeTimer !== null) return
    const setIntervalRef = env.setInterval ?? globalThis.setInterval
    if (typeof setIntervalRef !== 'function') return
    finalizeTimer = setIntervalRef(() => {
      try { finalizeDue(now(perf)) } catch { structure.observerErrors += 1 }
    }, 250)
    if (typeof finalizeTimer?.unref === 'function') finalizeTimer.unref()
  }

  const decideEnabled = () => {
    if (enabled === null) enabled = readEnabledFlag(env)
    // Install whenever the instance is enabled — including the test-injected
    // forceEnabled path, which used to skip observers entirely.
    if (enabled === true && observers === null) { installObservers(); startFinalizeSweep() }
    return enabled
  }

  const recordSpan = (row, pluginId, name, t0, t1) => {
    const span = spanRowFor(row, structure, name)
    if (span === null) return
    recordSpanSample(span, t1 - t0)
    pushCapped(collector.spanEvents, SPAN_EVENT_CAP, { start: t0, end: t1, pluginId, name })
    try {
      perf.measure?.(`nano:${pluginId}:${name}`, { start: t0, end: t1 })
    } catch { /* measure is best-effort */ }
  }

  const makeApi = (pluginId, row) => ({
    /** span(name, fn) → fn()'s return; promises timed to settle (spec §6.3). */
    span(name, fn) {
      if (!NAME_RE.test(name)) {
        structure.badNames += 1
        return fn()
      }
      const t0 = now(perf)
      let result
      try {
        result = fn()
      } catch (error) {
        recordSpan(row, pluginId, name, t0, now(perf))
        throw error
      }
      if (isPromiseLike(result)) {
        return result.finally(() => recordSpan(row, pluginId, name, t0, now(perf)))
      }
      recordSpan(row, pluginId, name, t0, now(perf))
      return result
    },

    /**
     * track(kind, name, opts) → handle.
     *   wrap(fn)      — counts callbacks + ms into the window
     *   attach(n=1)   — live += n (observer observed / interval started / rAF loop armed)
     *   detach(n=1)   — live -= n
     *   resetLive()   — live = 0 (observer disconnect covers every observed node)
     */
    track(kind, name, _opts = {}) {
      const track = trackRowFor(row, structure, name, kind)
      return {
        name,
        kind,
        wrap(fn) {
          if (track === null) return fn
          return (...args) => {
            const t0 = now(perf)
            try {
              return fn(...args)
            } finally {
              const ms = now(perf) - t0
              track.callbacks += 1
              track.totalCallbacks = (track.totalCallbacks ?? 0) + 1
              track.callbackMs += ms
              track.totalCallbackMs = (track.totalCallbackMs ?? 0) + ms
              pushCapped(collector.trackEvents, TRACK_EVENT_CAP, { at: t0, ms, pluginId, name })
            }
          }
        },
        attach(n = 1) { if (track !== null) track.live += n },
        detach(n = 1) { if (track !== null) track.live = Math.max(0, track.live - n) },
        resetLive() { if (track !== null) track.live = 0 },
      }
    },

    /** count(name, n) — usage.<name> for this plugin plus page-level counts. */
    count(name, n = 1) {
      if (usageAdd(row, structure, name, n)) {
        collector.counts.set(name, (collector.counts.get(name) ?? 0) + n)
      }
    },

    /**
     * profiler(Component) — wraps with <React.Profiler id="nano:<pluginId>:root">.
     * React comes from impl.react at join (it's an external in every bundle).
     */
    profiler(Component) {
      const React = row._react
      if (React == null || typeof React.Profiler !== 'function') return Component
      const capture = (...args) => {
        // onRender(id, phase, actualDuration, baseDuration, startTime, commitTime)
        const actualDuration = args[2]
        row.profiler.commits += 1
        row.profiler.durations.push(actualDuration ?? 0)
        while (row.profiler.durations.length > PROFILER_SAMPLE_CAP) row.profiler.durations.shift()
      }
      return function PerfReviewProfiler(props) {
        return React.createElement(
          React.Profiler,
          { id: `nano:${pluginId}:root`, onRender: capture },
          React.createElement(Component, props),
        )
      }
    },
  })

  /** Disabled API: same shape, pure passthrough, no clocks, no marks. */
  const disabledApi = () => ({
    span(_name, fn) { return fn() },
    track(_kind, name) {
      return { name, kind: _kind, wrap: fn => fn, attach() {}, detach() {}, resetLive() {} }
    },
    count() {},
    profiler(Component) { return Component },
  })

  /**
   * join(pluginId, impl) — impl: {root?, version?, react?}.
   * Idempotent per pluginId (explorer mounts N panes): rows merge, each call
   * registers a contributor entry.
   */
  const join = (pluginId, impl = {}) => {
    decideEnabled()
    const row = ensurePlugin(plugins, pluginId)
    contributors.push({ pluginId, libVersion: impl.libVersion ?? LIB_VERSION })
    if (impl.version != null) row.meta.version = impl.version
    if (row.meta.implantedAt == null) row.meta.implantedAt = new Date().toISOString()
    if (typeof impl.root === 'function') row._root = impl.root
    if (impl.react != null) row._react = impl.react
    if (!enabled) return disabledApi()
    return makeApi(pluginId, row)
  }

  /** Clear per-window accumulators (spans keep n/reservoir; tracks keep totals/live). */
  const resetWindow = () => {
    const counts = collector.counts
    // Resource Timing is an INITIAL-LOAD measurement: buffered entries only
    // arrive once. Preserve it across scenario resets or clientJsBytes is
    // always 0 after the lab's reset() (§10.7 B3).
    const resources = collector.resources
    collector = createCollectorState()
    collector.counts = counts
    collector.resources = resources
    collector.startedAt = now(perf)
    for (const row of plugins.values()) {
      row.own.interactions = []
      row.native.spanMs = []
      row.native.trackMs = []
      row.samples = { spans: 0, callbacks: 0 }
      for (const span of row.spans.values()) span.window = []
      for (const track of row.tracks.values()) {
        track.callbacks = 0
        track.callbackMs = 0
      }
      row.profiler.durations = []
    }
  }

  /**
   * A1: wire a host-snapshot source into the page singleton. The first
   * implant that has a host route calls this; later calls are ignored so four
   * bundles do not start four pollers. Disabled pages pay nothing.
   */
  const configure = (opts = {}) => {
    if (typeof opts.hostSnapshotProvider === 'function') {
      hostSnapshotProvider = opts.hostSnapshotProvider
      return
    }
    if (typeof opts.hostSnapshotUrl !== 'string') return
    if (hostSnapshotProvider !== null || hostSnapshotTimer !== null || enabled !== true) return
    const fetchRef = env.fetch ?? globalThis.fetch
    const setIntervalRef = env.setInterval ?? globalThis.setInterval
    if (typeof fetchRef !== 'function' || typeof setIntervalRef !== 'function') return
    const pull = () => {
      try {
        Promise.resolve(fetchRef(opts.hostSnapshotUrl, { credentials: 'same-origin', cache: 'no-store' }))
          .then(response => response?.json?.())
          .then(snapshot => {
            if (snapshot !== null && typeof snapshot === 'object') hostSnapshotCache = snapshot
          })
          .catch(() => { /* host route absent / not enabled: keep last good snapshot */ })
      } catch { /* best-effort */ }
    }
    pull()
    hostSnapshotTimer = setIntervalRef(pull, 5000)
    if (typeof hostSnapshotTimer?.unref === 'function') hostSnapshotTimer.unref()
  }

  const setHostSnapshotProvider = fn => {
    hostSnapshotProvider = typeof fn === 'function' ? fn : null
  }

  /** A4: clear cumulative usage/counts at a lab scenario boundary. */
  const resetCounters = () => {
    collector.counts.clear()
    for (const row of plugins.values()) row.usage.clear()
  }

  const report = (meta = {}, hostSnapshot = null) => {
    finalizeDue(now(perf) + 60_000) // flush every pending interaction
    const contributorsSeen = []
    const seen = new Set()
    for (const c of contributors) {
      const key = `${c.pluginId}@${c.libVersion}`
      if (seen.has(key)) continue
      seen.add(key)
      contributorsSeen.push(c)
    }
    const navigatorRef = env.navigator ?? globalThis.navigator
    const chrome = /Chrome\/(\d+)/.exec(navigatorRef?.userAgent ?? '')
    const snapshot = hostSnapshot ??
      (typeof hostSnapshotProvider === 'function' ? hostSnapshotProvider() : hostSnapshotCache)
    const result = buildReport({
      meta: {
        generatedAt: new Date().toISOString(),
        chromeMajor: chrome === null ? null : Number(chrome[1]),
        observerVersion: LIB_VERSION,
        contributors: contributorsSeen,
        ...meta,
      },
      collector,
      plugins,
      structure,
      hostSnapshot: snapshot ?? null,
      enabled: enabled === true,
      loafSupported,
    })
    // buildReport fills hostSpan rows; mergeHostSnapshot adds host write errors
    // and host timing metadata so staleness is visible in the report.
    if (snapshot != null) mergeHostSnapshot(result, snapshot)
    resetWindow()
    return result
  }

  return {
    join,
    report,
    configure,
    setHostSnapshotProvider,
    reset: resetWindow,
    resetCounters,
    /** test/diagnostic accessors — not part of the implant contract. */
    _state: () => ({ collector, plugins, structure, enabled, loafSupported, contributors }),
    _finalizeDue: finalizeDue,
    _absorbEventEntry: absorbEventEntry,
    _absorbLoafEntry: absorbLoafEntry,
    _absorbResourceEntry: absorbResourceEntry,
    libVersion: LIB_VERSION,
  }
}

/** Each bundled copy carries its own LIB_VERSION: implants must pass it to join(). */
export { LIB_VERSION }

/**
 * Install-or-reuse the page singleton. Each bundled copy calls this at module
 * evaluation; the first creates it, later copies get the same object.
 */
export function ensurePerfReview(env = {}) {
  const global = env.global ?? globalThis
  if (global.__perfReview == null) global.__perfReview = createPerfReview(env)
  return global.__perfReview
}

// Auto-install in real pages (skipped under node --test where window is absent).
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  ensurePerfReview()
}
