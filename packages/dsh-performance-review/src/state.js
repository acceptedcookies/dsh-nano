/**
 * dsh-performance-review — shared pure data structures.
 *
 * Everything in this file is dependency-free and DOM-free so it can be bundled into
 * client.js, host.js, and unit tests alike. The report schema is
 * docs/specs/dsh-nano-performance-review/spec-26nov.md §6.5.
 */

export const LIB_VERSION = '0.1.0'
export const REPORT_VERSION = 1

/** span/track/usage 名字：用于 nano:<pluginId>:<name> 的 measure 名，不含冒号。 */
export const NAME_RE = /^[a-z0-9][a-z0-9-]{0,39}$/

export const MAX_SPAN_KEYS = 32
export const MAX_USAGE_KEYS = 32
export const INTERACTION_CAP = 50

/** span/track 毫秒样本的 reservoir 上限。容量内全部保留，超容量随机替换（p50/p95 近似）。 */
export const RESERVOIR_CAP = 64

/** Event Timing 上报阈值，写进报告供读数方解释「快交互没有条目」。 */
export const EVENT_DURATION_THRESHOLD = 16

/** 一次交互的归属窗口：[start-1, start+duration+8]。 */
export const WINDOW_PAD_BEFORE_MS = 1
export const WINDOW_PAD_AFTER_MS = 8

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key)

/**
 * Nearest-rank percentile over a reservoir sample. Returns null on empty input.
 * @param {number[]} values
 * @param {number} p - 0..1
 */
export function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1))
  return sorted[index]
}

export function createSpanRow() {
  return { n: 0, window: [], reservoir: [] }
}

/**
 * Push one duration sample into a span row: exact window array plus reservoir.
 * @param {object} row - from createSpanRow()
 * @param {number} ms
 * @param {number} [cap]
 */
export function recordSpanSample(row, ms, cap = RESERVOIR_CAP) {
  row.n += 1
  row.window.push(ms)
  if (row.reservoir.length < cap) row.reservoir.push(ms)
  else {
    const slot = Math.floor(Math.random() * row.n)
    if (slot < cap) row.reservoir[slot] = ms
  }
}

/**
 * Fresh per-window collector state. `plugins` rows persist only counters that are
 * cumulative by contract; everything the report calls a "window" lives here.
 */
export function createCollectorState() {
  return {
    startedAt: 0,
    /** Finalized interactions, oldest first, capped at INTERACTION_CAP. */
    interactions: [],
    /** interactionId → open interaction accumulator {start,duration,target,windowEnd}. */
    pendingInteractions: new Map(),
    /** [{start,end,pluginId,name}] — both sync and settled-async spans. */
    spanEvents: [],
    /** [{at,ms,pluginId,name}] — one entry per track callback. */
    trackEvents: [],
    loafCount: 0,
    blockingMs: 0,
    forcedLayoutMs: 0,
    nanoScriptMs: 0, // scripts whose URL names ≥1 nano package and ≥2 nano packages (combined only)
    nanoLoafCount: 0,
    nanoBlockingMs: 0,
    /** pluginId → script ms on single-nano-package URLs (uniquely attributable). */
    pluginScriptMs: new Map(),
    resources: {
      nanoClientJsBytes: 0,
      comboResources: 0,
      totalJsBytes: 0,
    },
    counts: new Map(), // name → n (page-level count())
  }
}

export function createStructure() {
  return {
    rootErrors: 0,
    badNames: 0,
    overflowSpans: 0,
    overflowUsage: 0,
    observerErrors: 0,
    // A single observe() can fail silently (e.g. LoAF unsupported) while the
    // other two succeed. `observerErrors` only fires when ALL fail; this
    // counter makes a partial observer install visible (A5 / §10.4.6).
    observersMissing: 0,
    hostWriteErrors: 0,
  }
}

export function createPluginRow() {
  return {
    meta: { version: null, implantedAt: null },
    own: { interactions: [] },          // durations of plugin-owned interactions (window)
    native: { spanMs: [], trackMs: [] }, // per-native-interaction totals (window)
    samples: { spans: 0, callbacks: 0 }, // counts inside native windows (window)
    spans: new Map(),                  // name → createSpanRow()
    tracks: new Map(),                 // name → {kind,callbacks,live,callbackMs}
    usage: new Map(),                  // name → n (cumulative, cleared by resetCounters)
    profiler: { commits: 0, durations: [] },
  }
}

/**
 * @param {Map} plugins
 * @param {string} pluginId
 */
export function ensurePlugin(plugins, pluginId) {
  let row = plugins.get(pluginId)
  if (row === undefined) {
    row = createPluginRow()
    plugins.set(pluginId, row)
  }
  return row
}

/**
 * Record a span name; refuses keys past MAX_SPAN_KEYS.
 * @returns the row, or null when the name was rejected/overflowed.
 */
export function spanRowFor(row, structure, name) {
  if (!NAME_RE.test(name)) {
    structure.badNames += 1
    return null
  }
  let span = row.spans.get(name)
  if (span === undefined) {
    if (row.spans.size >= MAX_SPAN_KEYS) {
      structure.overflowSpans += 1
      return null
    }
    span = createSpanRow()
    row.spans.set(name, span)
  }
  return span
}

/** @returns true when the name was accepted. */
export function usageAdd(row, structure, name, n) {
  if (!NAME_RE.test(name)) {
    structure.badNames += 1
    return false
  }
  if (!row.usage.has(name) && row.usage.size >= MAX_USAGE_KEYS) {
    structure.overflowUsage += 1
    return false
  }
  row.usage.set(name, (row.usage.get(name) ?? 0) + n)
  return true
}

/**
 * @param {Map} tracks
 * @param {object} structure
 * @returns {object|null} the track row, or null on bad name/overflow.
 */
export function trackRowFor(row, structure, name, kind) {
  if (!NAME_RE.test(name)) {
    structure.badNames += 1
    return null
  }
  let track = row.tracks.get(name)
  if (track === undefined) {
    if (row.tracks.size >= MAX_SPAN_KEYS) {
      structure.overflowSpans += 1
      return null
    }
    track = { kind, callbacks: 0, live: 0, callbackMs: 0 }
    row.tracks.set(name, track)
  }
  return track
}

/**
 * Extract nano package names from a script/resource URL.
 * Combo URLs look like `/plugins/??dsh-nano-explorer-extra/client.js,dsh-nano-notepad/client.js&rev=…`;
 * single-package URLs like `/plugins/dsh-nano-notepad/client.js`.
 * @returns {string[]} unique `dsh-nano-*` package names found, in order.
 */
export function nanoPackagesInUrl(url) {
  if (typeof url !== 'string' || url.length === 0) return []
  const found = []
  const re = /dsh-nano-[a-z0-9-]+/g
  let match
  while ((match = re.exec(url)) !== null) {
    if (!found.includes(match[0])) found.push(match[0])
  }
  return found
}

/**
 * Default package-name → plugin-id table. Packages may override via
 * `join(pluginId, …)`; this exists so script-URL attribution can map
 * `dsh-nano-notepad` → `nano-notepad` without config.
 */
export function packageNameToPluginId(packageName) {
  if (typeof packageName !== 'string') return null
  const match = /^dsh-nano-([a-z0-9-]+)$/.exec(packageName)
  return match === null ? null : `nano-${match[1]}`
}

/**
 * Sanitized interaction-target bucket. Works on a descriptor {tag, attrs} so it is
 * testable without DOM; the client builds the descriptor from a real Element.
 */
export function targetBucket(descriptor) {
  if (descriptor == null || typeof descriptor !== 'object') return 'other'
  const attrs = descriptor.attrs ?? {}
  const has = key => attrs[key] !== undefined && attrs[key] !== null
  if (has('data-composer') || has('data-chat-input')) return 'composer-textarea'
  if (has('data-nano-notepad')) return 'notepad-panel'
  if (has('data-nano-model-selector')) return 'model-trigger'
  if (has('data-nxe')) return 'files-row'
  // Historical anchor for the DEPRECATED (2026-11-12) shared-workspace plugin;
  // see deprecated/README.md. No active producer, kept for old pages.
  if (has('data-nano-shared-workspace')) return 'shared-row'
  if (has('data-row-key') || has('data-sidebar-row')) return 'sidebar-row'
  if (descriptor.tag === 'TEXTAREA') return 'composer-textarea'
  return 'other'
}

/** Round to 0.1 ms for report readability. */
export function roundMs(value) {
  return value == null ? null : Math.round(value * 10) / 10
}
