/**
 * dsh-performance-review — render a report object (schema v1) to Markdown.
 * Pure function; used by lab/run.mjs to write `lab/out/*.md`. The JSON report
 * stays the single source of truth — this renderer only formats it.
 */

const fmt = (value, unit = 'ms') => (value == null ? '—' : `${value}${unit}`)
const fmtBytes = bytes => (bytes == null ? '—' : `${(bytes / 1024).toFixed(1)} KB`)

const row = cells => `| ${cells.join(' | ')} |`

/**
 * @param {object} report - object produced by buildReport()
 * @returns {string} Markdown
 */
export function renderMarkdown(report) {
  const lines = []
  const meta = report.meta ?? {}
  lines.push(`# perf-review · ${meta.scenario ?? 'manual'} · arm=${meta.arm ?? 'on'}`)
  lines.push('')
  lines.push(
    `generated ${meta.generatedAt ?? '?'} · dsh ${meta.dshVersion ?? '?'} · chrome ${meta.chromeMajor ?? '?'}` +
    ` · observer ${meta.observerVersion ?? '?'} · enabled=${report.enabled === true}` +
    (meta.gitSha ? ` · ${meta.gitSha}` : ''))
  if (Array.isArray(meta.contributors) && meta.contributors.length > 0) {
    lines.push(`contributors: ${meta.contributors.map(c => `${c.pluginId}@${c.libVersion}`).join(', ')}`)
  }
  if (report.loafSupported === false) lines.push('> LoAF unsupported in this environment; Event Timing + spans only.')
  if (meta.hostWrittenAt) {
    lines.push(`host snapshot ${meta.hostWrittenAt} · sinceStart=${meta.hostSinceStart ?? '?'} · enabled=${meta.hostEnabled} · window=${meta.hostWindow === true}`)
  }
  lines.push('')

  // Page level
  const page = report.page ?? {}
  lines.push('## page')
  lines.push('')
  lines.push(row(['metric', 'value']))
  lines.push(row(['---', '---']))
  lines.push(row(['nativeInpP75 (页级 audit，见 §12)', fmt(page.nativeInpP75)]))
  lines.push(row(['nativeInpCount', String(page.nativeInpCount ?? 0)]))
  lines.push(row(['inputDelayP95 (主线程/排队)', fmt(page.inputDelayP95)]))
  lines.push(row(['processingP95 (事件处理器)', fmt(page.processingP95)]))
  lines.push(row(['presentationP95 (等下一次绘制)', fmt(page.presentationP95)]))
  lines.push(row(['loafCount', String(page.loafCount ?? 0)]))
  lines.push(row(['blockingMs', fmt(page.blockingMs)]))
  lines.push(row(['forcedLayoutMs', fmt(page.forcedLayoutMs)]))
  lines.push(row(['nanoCombined.scriptMs', fmt(page.nanoCombined?.scriptMs)]))
  lines.push(row(['nanoCombined.clientJsBytes', fmtBytes(page.nanoCombined?.clientJsBytes)]))
  lines.push('')

  // Plugins
  const plugins = report.plugins ?? {}
  for (const [pluginId, plugin] of Object.entries(plugins)) {
    lines.push(`## ${pluginId} ${plugin.meta?.version != null ? `v${plugin.meta.version}` : ''}`)
    lines.push('')
    lines.push(row(['metric', 'value']))
    lines.push(row(['---', '---']))
    lines.push(row(['own.inpP75 / n', `${fmt(plugin.own?.inpP75)} / ${plugin.own?.inpCount ?? 0}`]))
    lines.push(row(['native.spanMsP95', fmt(plugin.native?.spanMsP95)]))
    lines.push(row(['native.trackMsP95', fmt(plugin.native?.trackMsP95)]))
    lines.push(row(['native.samples', `${plugin.native?.samples?.spans ?? 0} spans, ${plugin.native?.samples?.callbacks ?? 0} callbacks`]))
    lines.push(row(['scriptMs', fmt(plugin.scriptMs)]))
    lines.push('')

    const spans = Object.entries(plugin.spans ?? {})
    if (spans.length > 0) {
      lines.push(row(['span', 'n', 'windowN', 'p50', 'p95', 'maxMs']))
      lines.push(row(['---', '---', '---', '---', '---', '---']))
      for (const [name, s] of spans) {
        lines.push(row([name, String(s.n ?? 0), String(s.windowN ?? 0), fmt(s.p50), fmt(s.p95), fmt(s.maxMs)]))
      }
      lines.push('')
    }

    const tracks = Object.entries(plugin.tracks ?? {})
    if (tracks.length > 0) {
      lines.push(row(['track', 'kind', 'callbacks', 'live', 'callbackMs', 'totalCallbacks']))
      lines.push(row(['---', '---', '---', '---', '---', '---']))
      for (const [name, t] of tracks) {
        lines.push(row([name, t.kind, String(t.callbacks ?? 0), String(t.live ?? 0), fmt(t.callbackMs), String(t.totalCallbacks ?? 0)]))
      }
      lines.push('')
    }

    const usage = Object.entries(plugin.usage ?? {})
    if (usage.length > 0) {
      lines.push(`usage: ${usage.map(([k, v]) => `${k}=${v}`).join(', ')}`)
      lines.push('')
    }

    const hostSpan = Object.entries(plugin.hostSpan ?? {})
    if (hostSpan.length > 0) {
      lines.push(row(['hostSpan', 'n', 'p50', 'p95']))
      lines.push(row(['---', '---', '---', '---']))
      for (const [name, h] of hostSpan) {
        lines.push(row([name, String(h.n ?? 0), fmt(h.p50), fmt(h.p95)]))
      }
      lines.push('')
    }

    if ((plugin.profiler?.commits ?? 0) > 0) {
      lines.push(`profiler: commits=${plugin.profiler.commits} commitP95=${fmt(plugin.profiler.commitP95)}`)
      lines.push('')
    }
  }

  const counts = Object.entries(report.counts ?? {})
  if (counts.length > 0) {
    lines.push('## counts')
    lines.push('')
    lines.push(counts.map(([k, v]) => `- ${k}: ${v}`).join('\n'))
    lines.push('')
  }

  lines.push('## structure')
  lines.push('')
  const structure = report.structure ?? {}
  lines.push(row(['check', 'value']))
  lines.push(row(['---', '---']))
  for (const [key, value] of Object.entries(structure)) lines.push(row([key, String(value)]))
  lines.push('')

  const notes = report.notes ?? []
  if (notes.length > 0) {
    lines.push('## notes')
    lines.push('')
    for (const note of notes) lines.push(`- ${note}`)
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}
