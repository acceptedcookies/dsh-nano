/**
 * dsh-performance-review — pure report aggregation.
 *
 * Spec: docs/specs/dsh-nano-performance-review/spec-26nov.md §5/§6.4/§6.5.
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
})

/**
 * Merge a host snapshot ({plugins:{id:{spans:{name:{n,samples:[ms]}}}}})
 * into the report's per-plugin hostSpan rows. Cumulative across the host
 * process; the lab diffs between scenarios.
 */
function hostSpanObject(hostSnapshot, pluginId) {
  const out = {}
  const source = hostSnapshot?.plugins?.[pluginId]?.spans
  if (source == null) return out
  for (const [name, row] of Object.entries(source)) {
    const samples = Array.isArray(row.samples) ? row.samples : []
    out[name] = {
      n: row.n ?? samples.length,
      p50: roundMs(percentile(samples, 0.5)),
      p95: roundMs(percentile(samples, 0.95)),
    }
  }
  return out
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
  const notes = []
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
    for (const [name, n] of row.usage) usage[name] = n
    pluginOut[pluginId] = {
      meta: {
        version: row.meta.version ?? null,
        implantedAt: row.meta.implantedAt ?? null,
        implanted: true,
      },
      own: {
        inpP75: roundMs(percentile(ownDurations, 0.75)),
        inpCount: ownDurations.length,
      },
      native: {
        spanMsP95: roundMs(percentile(row.native.spanMs, 0.95)),
        trackMsP95: roundMs(percentile(row.native.trackMs, 0.95)),
        samples: { spans: row.samples.spans, callbacks: row.samples.callbacks },
      },
      spans,
      tracks,
      usage,
      hostSpan: hostSpanObject(input.hostSnapshot, pluginId),
      profiler: {
        commits: row.profiler.commits,
        commitP95: roundMs(percentile(row.profiler.durations, 0.95)),
      },
      // Uniquely-attributable script ms live on the collector (single-nano-
      // package URLs only), NOT on the plugin row. Reading row.scriptMs here
      // used to return a field that was never written (§10.4.3 / A3).
      scriptMs: roundMs(collector.pluginScriptMs.get(pluginId) ?? 0),
    }
  }

  const counts = {}
  for (const [name, n] of collector.counts) counts[name] = n

  // Explanatory notes (spec §6.4 / §6.5).
  const afterWindow = collector.interactions.some(ix =>
    Object.values(ix.samples ?? {}).some(sample => sample.spanAfterWindow))
  if (afterWindow) {
    notes.push('spanAfterWindow: 有异步 span 在交互窗口结束后才 settle，仍按起点划入该窗口。')
  }
  if (collector.nanoBlockingMs > 0) {
    notes.push('nanoBlockingMs 按整条 LoAF 条目归并；含非 nano 脚本的帧会把那部分时间一并计入。')
  }
  if (durations.length > 0 && durations.length < 8) {
    notes.push(`nativeInpCount=${durations.length} < 8：p75 仅供参考，不作预算判断；这不是 web-vitals INP。`)
  }
  notes.push('Event Timing 三段：inputDelay=主线程忙/排队，processing=事件处理器，presentation=等下一次绘制。页级 nativeInpP75 含 presentation，属环境级读数，不抄进插件行（spec §5.1）；插件预算以 inputDelayP95/processingP95 与 native.spanMsP95/trackMsP95 为准。')
  notes.push('lab 的 composer-type 用 CDP 合成按键（page.keyboard.type），抬起的是 presentation 段；读数标注为 synthetic input，不等同真实用户 INP。')
  notes.push('nanoCombined.scriptMs 只统计 >50ms 长帧里 >5ms 的脚本条目，不是总脚本耗时；快而频繁的脚本工作不可见。')
  notes.push('nanoCombined.blockingMs 把「含任一 nano 脚本」的整条 LoAF blockingDuration 计入，含非 nano 部分，属过度归因。')
  notes.push('nanoCombined.clientJsBytes 是所有 dsh-nano-* 包 combo 的 encodedBodySize 合计，不是单个插件的体积。')
  if (collector.pluginScriptMs.size === 0) {
    notes.push('逐包 scriptMs 全为 0：combo URL 含多个包名，单包 URL 极少出现；按 §3.1 不予拆分。')
  }

  return {
    version: REPORT_VERSION,
    meta: {
      generatedAt: input.meta?.generatedAt ?? null,
      scenario: input.meta?.scenario ?? null,
      arm: input.meta?.arm ?? 'on',
      dshVersion: input.meta?.dshVersion ?? null,
      chromeMajor: input.meta?.chromeMajor ?? null,
      observerVersion: input.meta?.observerVersion ?? null,
      contributors: input.meta?.contributors ?? [],
      gitSha: input.meta?.gitSha ?? null,
      labels: input.meta?.labels ?? {},
    },
    enabled: input.enabled === true,
    loafSupported: input.loafSupported !== false,
    page,
    plugins: pluginOut,
    counts,
    structure: { ...structure },
    notes,
  }
}

/**
 * Merge a host snapshot into an ALREADY-BUILT report (A1).
 *
 * The browser's `report()` has no access to the host's host.json by itself —
 * `hostSnapshotProvider` is a test injection only. The lab reads host.json on
 * the Node side and calls this pure function (or passes the snapshot as the
 * second argument to `report()`), so `hostSpan` finally reaches the report.
 *
 * Mutates and returns `report`.
 */
export function mergeHostSnapshot(report, hostSnapshot) {
  if (hostSnapshot == null || typeof hostSnapshot !== 'object') return report
  for (const [pluginId, plugin] of Object.entries(report.plugins ?? {})) {
    const source = hostSnapshot.plugins?.[pluginId]?.spans
    if (source == null) continue
    const merged = { ...(plugin.hostSpan ?? {}) }
    for (const [name, row] of Object.entries(source)) {
      const samples = Array.isArray(row.samples) ? row.samples : []
      merged[name] = {
        n: row.n ?? samples.length,
        p50: roundMs(percentile(samples, 0.5)),
        p95: roundMs(percentile(samples, 0.95)),
      }
    }
    plugin.hostSpan = merged
  }
  report.structure = {
    ...(report.structure ?? {}),
    hostWriteErrors: (report.structure?.hostWriteErrors ?? 0) +
      (hostSnapshot.structure?.hostWriteErrors ?? 0),
  }
  report.meta = {
    ...(report.meta ?? {}),
    hostSinceStart: hostSnapshot.sinceStart ?? null,
    hostWrittenAt: hostSnapshot.writtenAt ?? null,
    hostEnabled: hostSnapshot.enabled ?? null,
    hostWindow: hostSnapshot.window === true,
  }
  return report
}

/**
 * Diff two cumulative host snapshots into a scenario-scoped one (A1).
 * `n` becomes the per-scenario delta; samples stay the latest reservoir
 * (host samples are a reservoir, so exact per-window quantiles are not
 * recoverable — `n` is exact, p50/p95 are labelled as cumulative in notes).
 * Prefer host `takeWindow()` when an exact window is available.
 */
export function diffHostSnapshots(before, after) {
  const out = { ...(after ?? {}), plugins: {} }
  for (const [pluginId, plugin] of Object.entries(after?.plugins ?? {})) {
    const spans = {}
    for (const [name, row] of Object.entries(plugin?.spans ?? {})) {
      const prevN = before?.plugins?.[pluginId]?.spans?.[name]?.n ?? 0
      spans[name] = {
        n: Math.max(0, (row.n ?? 0) - prevN),
        samples: Array.isArray(row.samples) ? row.samples : [],
      }
    }
    out.plugins[pluginId] = { ...plugin, spans }
  }
  return out
}

/**
 * Target-bucket helper re-export for callers that hold descriptors.
 * (Client builds descriptors from Elements; tests pass them directly.)
 */
export { targetBucket }
