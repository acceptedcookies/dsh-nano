/**
 * dsh-performance-review — pure report aggregation.
 *
 * Spec: performance-review spec §5/§6.4/§6.5.
 * No DOM, no PerformanceObserver, no I/O — the browser collector feeds
 * finalized interactions/events in; this module decides attribution and
 * renders the report object.
 */

import {
  INTERACTION_CAP,
  EVENT_DURATION_THRESHOLD,
  WINDOW_PAD_AFTER_MS,
  WINDOW_PAD_BEFORE_MS,
  REPORT_VERSION,
  percentile,
  roundMs,
  targetBucket,
} from './state.js'

/**
 * Append a finalized interaction to the window list, dropping the OLDEST when
 * past INTERACTION_CAP (never duration-order truncation — that biases p75).
 * @param {object} collector - createCollectorState()
 * @param {object} interaction - {interactionId,start,duration,owner,bucket,samples}
 */
export function pushInteraction(collector, interaction) {
  collector.interactions.push(interaction)
  while (collector.interactions.length > INTERACTION_CAP) collector.interactions.shift()
}

/**
 * Compute one interaction's per-plugin samples by scanning the span/track
 * event buffers for overlap with the interaction window.
 *
 * Window = [start - 1, start + duration + 8]. A span [s0,s1] overlaps when
 * s0 <= wEnd && s1 >= wStart; a track callback at `at` counts when inside.
 * An async span settling after the window still counts when it started inside —
 * its settle time may exceed the window end (recorded via `spanAfterWindow`).
 *
 * `spanMs` is the NET (union) of the window-clipped span intervals, not the
 * sum of their durations: a plugin's `apply-status` span runs *inside*
 * `list-level` / `git-refresh` / `stats-count`, so summing raw durations
 * double-counts the same main-thread milliseconds (§10.3 / A4).
 *
 * @param {object} interaction - {start,duration}
 * @param {Array} spanEvents - [{start,end,pluginId,name}]
 * @param {Array} trackEvents - [{at,ms,pluginId,name}]
 * @returns {Object<pluginId,{spans:number,callbacks:number,spanMs:number,trackMs:number,spanAfterWindow:boolean}>}
 */
export function interactionSamples(interaction, spanEvents, trackEvents) {
  const wStart = interaction.start - WINDOW_PAD_BEFORE_MS
  const wEnd = interaction.start + interaction.duration + WINDOW_PAD_AFTER_MS
  const samples = {}
  const bucket = pluginId => {
    let entry = samples[pluginId]
    if (entry === undefined) {
      entry = { spans: 0, callbacks: 0, spanMs: 0, trackMs: 0, spanAfterWindow: false }
      samples[pluginId] = entry
    }
    return entry
  }
  const intervals = new Map()
  for (const event of spanEvents) {
    if (event.start <= wEnd && event.end >= wStart) {
      const entry = bucket(event.pluginId)
      entry.spans += 1
      if (event.end > wEnd) entry.spanAfterWindow = true
      // Clip to the window before merging; time outside the interaction is not
      // chargeable to this interaction.
      const lo = Math.max(event.start, wStart)
      const hi = Math.min(event.end, wEnd)
      if (hi > lo) {
        let list = intervals.get(event.pluginId)
        if (list === undefined) { list = []; intervals.set(event.pluginId, list) }
        list.push([lo, hi])
      }
    }
  }
  for (const [pluginId, list] of intervals) {
    list.sort((a, b) => a[0] - b[0])
    let merged = 0
    let [curLo, curHi] = list[0]
    for (let i = 1; i < list.length; i += 1) {
      const [lo, hi] = list[i]
      if (lo > curHi) { merged += curHi - curLo; curLo = lo; curHi = hi }
      else if (hi > curHi) curHi = hi
    }
    merged += curHi - curLo
    bucket(pluginId).spanMs = merged
  }
  for (const event of trackEvents) {
    if (event.at >= wStart && event.at <= wEnd) {
      const entry = bucket(event.pluginId)
      entry.callbacks += 1
      entry.trackMs += event.ms
    }
  }
  return samples
}

const spanStats = row => ({
  n: row.n,
  windowN: row.window.length,
  p50: roundMs(percentile(row.window, 0.5)),
  p95: roundMs(percentile(row.window, 0.95)),
  maxMs: roundMs(row.window.length === 0 ? null : Math.max(...row.window)),
  basis: 'window',
})

/** Serialized report budget (T-O-PRE1116-08.3). Evidence is trimmed first. */
export const MAX_REPORT_BYTES = 256 * 1024
export const EVIDENCE_CAPS = Object.freeze({ interactions: 5, frames: 5, hostErrors: 20 })

const byteLength = value => new TextEncoder().encode(JSON.stringify(value)).length

/**
 * If the report exceeds {@link MAX_REPORT_BYTES}, drop evidence and count
 * `structure.oversize` once. Mutates `report`.
 */
export function clipOversize(report) {
  if (byteLength(report) <= MAX_REPORT_BYTES) return report
  if (report.page) {
    report.page.evidence = { interactions: [], frames: [], hostErrors: [] }
  }
  if (report.structure) report.structure.oversize = (report.structure.oversize ?? 0) + 1
  return report
}

/** A host snapshot is usable only when `plugins` is a plain object. */
export function hostSnapshotUsable(value) {
  if (value == null || typeof value !== 'object' || Array.isArray(value)) return false
  const plugins = value.plugins
  if (plugins == null || typeof plugins !== 'object' || Array.isArray(plugins)) return false
  return true
}

/**
 * Merge a host snapshot ({plugins:{id:{spans:{name:{n,samples:[ms]}}}}})
 * into the report's per-plugin hostSpan rows. Cumulative across the host
 * process; the lab diffs between scenarios.
 */
function hostSpanObject(hostSnapshot, pluginId) {
  const out = {}
  const source = hostSnapshot?.plugins?.[pluginId]?.spans
  if (source == null || typeof source !== 'object') return out
  for (const [name, row] of Object.entries(source)) {
    const samples = Array.isArray(row?.samples) ? row.samples : []
    out[name] = {
      n: row?.n ?? samples.length,
      p50: roundMs(percentile(samples, 0.5)),
      p95: roundMs(percentile(samples, 0.95)),
      errors: row?.stats?.errors ?? row?.errors ?? 0,
      basis: row?.basis === 'window' ? 'window' : 'cumulative',
    }
  }
  return out
}

const usageCell = cell => {
  if (typeof cell === 'number') return { window: cell, total: cell }
  return { window: cell?.window ?? 0, total: cell?.total ?? 0 }
}

/**
 * Build the report object (schema v1, spec §6.5).
 *
 * @param {object} input
 * @param {object} input.meta - {generatedAt,scenario,arm,dshVersion,chromeMajor,observerVersion,contributors,gitSha,labels}
 * @param {object} input.collector - createCollectorState(); interactions must be
 *   finalized ({interactionId,start,duration,owner,bucket,samples}).
 * @param {Map<string,object>} input.plugins - pluginId → createPluginRow()
 * @param {object} input.structure - createStructure()
 * @param {object} [input.hostSnapshot] - latest host.json content, if present
 * @param {boolean} [input.enabled]
 * @param {boolean} [input.loafSupported]
 */
export function buildReport(input) {
  const { collector, plugins, structure } = input
  const durations = collector.interactions.map(ix => ix.duration)
  // L1: Event Timing three-way split. `nativeInpP75` alone cannot say whether
  // a slow interaction was our main thread, our handlers, or the paint
  // pipeline; these fields make the report self-explanatory (§12).
  const part = key => roundMs(percentile(
    collector.interactions.map(ix => ix[key]).filter(v => typeof v === 'number'), 0.95))

  const page = {
    nativeInpP75: roundMs(percentile(durations, 0.75)),
    nativeInpCount: durations.length,
    nativeInpDurationThreshold: EVENT_DURATION_THRESHOLD,
    inputDelayP95: part('inputDelay'),
    processingP95: part('processing'),
    presentationP95: part('presentation'),
    loafCount: collector.loafCount,
    blockingMs: roundMs(collector.blockingMs),
    forcedLayoutMs: roundMs(collector.forcedLayoutMs),
    nanoCombined: {
      scriptMs: roundMs(collector.nanoScriptMs),
      loafCount: collector.nanoLoafCount,
      blockingMs: roundMs(collector.nanoBlockingMs),
      clientJsBytes: collector.resources.nanoClientJsBytes,
      comboResources: collector.resources.comboResources,
    },
    resources: {
      nanoClientJsBytes: collector.resources.nanoClientJsBytes,
      totalJsBytes: collector.resources.totalJsBytes,
    },
  }

  const pluginOut = {}
  for (const [pluginId, row] of plugins) {
    const ownDurations = row.own.interactions
    const spans = {}
    for (const [name, span] of row.spans) spans[name] = spanStats(span)
    const tracks = {}
    for (const [name, track] of row.tracks) {
      tracks[name] = {
        kind: track.kind,
        callbacks: track.callbacks,
        live: track.live,
        callbackMs: roundMs(track.callbackMs),
        totalCallbacks: track.totalCallbacks ?? track.callbacks,
        totalCallbackMs: roundMs(track.totalCallbackMs ?? track.callbackMs),
      }
    }
    const usage = {}
    for (const [name, cell] of row.usage) usage[name] = usageCell(cell)
    const contract = {}
    if (row.contract instanceof Map) {
      for (const [key, bucket] of row.contract) {
        contract[key] = {
          n: bucket.n,
          windowN: bucket.window,
          basis: 'window',
          outcomes: { ...(bucket.outcomes ?? {}) },
          status: { ...(bucket.status ?? {}) },
        }
      }
    }
    const usableHost = hostSnapshotUsable(input.hostSnapshot) ? input.hostSnapshot : null
    pluginOut[pluginId] = {
      hand: {
        spans,
        tracks,
        usage,
        own: {
          inpP75: roundMs(percentile(ownDurations, 0.75)),
          inpCount: ownDurations.length,
        },
        native: {
          spanMsP95: roundMs(percentile(row.native.spanMs, 0.95)),
          trackMsP95: roundMs(percentile(row.native.trackMs, 0.95)),
          samples: { spans: row.samples.spans, callbacks: row.samples.callbacks },
        },
        profiler: {
          commits: row.profiler.commits,
          commitP95: roundMs(percentile(row.profiler.durations, 0.95)),
        },
        scriptMs: roundMs(collector.pluginScriptMs.get(pluginId) ?? 0),
        version: row.meta?.version ?? null,
      },
      contract,
      host: hostSpanObject(usableHost, pluginId),
    }
  }

  const counts = {}
  for (const [name, cell] of collector.counts) counts[name] = usageCell(cell)
  page.counts = counts
  page.scenario = input.meta?.scenario ?? null
  page.arm = input.meta?.arm ?? 'on'
  page.chromeMajor = input.meta?.chromeMajor ?? null
  page.contributors = input.meta?.contributors ?? []
  page.enabled = input.enabled === true
  page.loafSupported = input.loafSupported !== false

  const ranked = [...collector.interactions].sort((a, b) => (b.duration ?? 0) - (a.duration ?? 0))
  const hostErrors = []
  const usableHost = hostSnapshotUsable(input.hostSnapshot) ? input.hostSnapshot : null
  if (usableHost) {
    for (const plugin of Object.values(usableHost.plugins)) {
      for (const span of Object.values(plugin?.spans ?? {})) {
        for (const event of span?.events ?? []) {
          if (event?.err === true) hostErrors.push({ ms: event.ms ?? null, at: event.at ?? null })
        }
      }
    }
  }
  page.evidence = {
    interactions: ranked.slice(0, EVIDENCE_CAPS.interactions).map(ix => ({
      interactionId: ix.interactionId ?? null,
      duration: ix.duration ?? null,
      owner: ix.owner ?? null,
      bucket: ix.bucket ?? null,
    })),
    frames: Array.isArray(collector.heavyFrames)
      ? collector.heavyFrames.slice(0, EVIDENCE_CAPS.frames)
      : [],
    hostErrors: hostErrors.slice(0, EVIDENCE_CAPS.hostErrors),
  }
  page.host = usableHost
    ? {
      source: usableHost.source ?? 'snapshot',
      epoch: usableHost.epoch ?? null,
      from: usableHost.from ?? usableHost.sinceStart ?? null,
      to: usableHost.to ?? usableHost.writtenAt ?? null,
      truncated: Array.isArray(usableHost.truncated) ? [...usableHost.truncated] : [],
      sinceStart: usableHost.sinceStart ?? null,
      writtenAt: usableHost.writtenAt ?? null,
      enabled: usableHost.enabled ?? null,
    }
    : { source: null, epoch: null, from: null, to: null, truncated: [], sinceStart: null, writtenAt: null, enabled: null }

  const notes = []
  const note = (id, text) => notes.push({ id, text })
  const afterWindow = collector.interactions.some(ix =>
    Object.values(ix.samples ?? {}).some(sample => sample.spanAfterWindow))
  if (afterWindow) {
    note('span-after-window', '有异步 span 在交互窗口结束后才 settle，仍按起点划入该窗口。')
  }
  if (collector.nanoBlockingMs > 0) {
    note('nano-blocking-over-attribute', 'nanoBlockingMs 按整条 LoAF 条目归并；含非 nano 脚本的帧会把那部分时间一并计入。')
  }
  if (durations.length > 0 && durations.length < 8) {
    note('native-inp-small-sample', `nativeInpCount=${durations.length} < 8：p75 仅供参考，不作预算判断；这不是 web-vitals INP。`)
  }
  if (collector.pluginScriptMs.size === 0) {
    note('script-ms-unsplit', '逐包 scriptMs 全为 0：combo URL 含多个包名，单包 URL 极少出现；按 §3.1 不予拆分。')
  }
  if (page.host.source == null) {
    note('host-source-absent', 'no host read source')
  }

  const structureOut = {
    ...structure,
    audits: Array.isArray(structure?.audits) ? structure.audits.map(item => ({ ...item })) : [],
  }
  if (input.hostBad === true) structureOut.badShape = (structureOut.badShape ?? 0) + 1

  const contributors = (input.meta?.contributors ?? []).map(item => ({
    plugin: item.plugin ?? item.pluginId ?? null,
    build: item.build ?? null,
    decl: item.decl ?? null,
  }))
  return clipOversize({
    schema: 'dnpr.report/2',
    meta: {
      protocol: REPORT_VERSION,
      generatedAt: input.meta?.generatedAt ?? null,
      contributors,
      window: {
        startedAt: input.meta?.windowStartedAt ?? null,
        ms: input.meta?.windowMs ?? null,
      },
      host: {
        source: page.host.source,
        epoch: page.host.epoch,
        from: page.host.from,
        to: page.host.to,
        truncated: page.host.truncated,
      },
    },
    page,
    plugins: pluginOut,
    evidence: page.evidence,
    structure: structureOut,
    notes,
  })
}

/** Unconditional explanations. They are not copied into every report (T-O-PRE1116-08.4). */
export const NOTE_GLOSSARY = Object.freeze([
  { id: 'event-timing-split', text: 'Event Timing 三段：inputDelay、processing、presentation。页级 nativeInpP75 含 presentation，不抄进插件行。' },
  { id: 'synthetic-input', text: 'lab 的 composer-type 用合成按键，presentation 段不等同真实用户 INP。' },
  { id: 'script-ms-long-frames', text: 'nanoCombined.scriptMs 只统计长帧里的长脚本，不是总脚本耗时。' },
  { id: 'blocking-over-attribute', text: 'nanoCombined.blockingMs 把含 nano 脚本的整条 LoAF 计入，含非 nano 部分。' },
  { id: 'client-js-bytes', text: 'nanoCombined.clientJsBytes 是全部 nano 包 combo 的合计，不是单个插件的体积。' },
])

/**
 * Target-bucket helper re-export for callers that hold descriptors.
 * (Client builds descriptors from Elements; tests pass them directly.)
 */
export { targetBucket }
