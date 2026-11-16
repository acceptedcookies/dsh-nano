/**
 * dsh-performance-review — render a v2 report object to Markdown.
 * Pure. Does not require the retired top-level keys.
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
  const page = report?.page ?? {}
  const scenario = page.scenario ?? 'manual'
  const arm = page.arm ?? 'on'
  lines.push(`# perf-review · ${scenario} · arm=${arm}`)
  lines.push('')
  lines.push(
    `generated ${report?.meta?.generatedAt ?? '?'} · schema ${report?.schema ?? '?'}` +
    ` · chrome ${page.chromeMajor ?? '?'} · enabled=${page.enabled === true}`)
  const contributors = Array.isArray(page.contributors) ? page.contributors : []
  if (contributors.length > 0) {
    lines.push(`contributors: ${contributors.map(item => `${item.pluginId ?? item.plugin}@${item.build ?? '?'}`).join(', ')}`)
  }
  if (page.loafSupported === false) lines.push('> LoAF unsupported in this environment; Event Timing + spans only.')
  const host = page.host ?? {}
  if (host.writtenAt) {
    lines.push(`host snapshot ${host.writtenAt} · sinceStart=${host.sinceStart ?? '?'} · enabled=${host.enabled} · source=${host.source ?? '?'}`)
  }
  lines.push('')

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

  const plugins = report?.plugins ?? {}
  for (const [pluginId, plugin] of Object.entries(plugins)) {
    const hand = plugin.hand ?? {}
    lines.push(`## ${pluginId} ${hand.version != null ? `v${hand.version}` : ''}`)
    lines.push('')
    lines.push(row(['metric', 'value']))
    lines.push(row(['---', '---']))
    lines.push(row(['own.inpP75 / n', `${fmt(hand.own?.inpP75)} / ${hand.own?.inpCount ?? 0}`]))
    lines.push(row(['native.spanMsP95', fmt(hand.native?.spanMsP95)]))
    lines.push(row(['native.trackMsP95', fmt(hand.native?.trackMsP95)]))
    lines.push(row(['native.samples', `${hand.native?.samples?.spans ?? 0} spans, ${hand.native?.samples?.callbacks ?? 0} callbacks`]))
    lines.push(row(['scriptMs', fmt(hand.scriptMs)]))
    lines.push('')

    const spans = Object.entries(hand.spans ?? {})
    if (spans.length > 0) {
      lines.push(row(['span', 'n', 'windowN', 'p50', 'p95', 'maxMs', 'basis']))
      lines.push(row(['---', '---', '---', '---', '---', '---', '---']))
      for (const [name, span] of spans) {
        lines.push(row([
          name,
          String(span.n ?? 0),
          String(span.windowN ?? 0),
          fmt(span.p50),
          fmt(span.p95),
          fmt(span.maxMs),
          String(span.basis ?? 'window'),
        ]))
      }
      lines.push('')
    }

    const tracks = Object.entries(hand.tracks ?? {})
    if (tracks.length > 0) {
      lines.push(row(['track', 'kind', 'callbacks', 'live', 'callbackMs', 'totalCallbacks']))
      lines.push(row(['---', '---', '---', '---', '---', '---']))
      for (const [name, track] of tracks) {
        lines.push(row([
          name,
          String(track.kind ?? ''),
          String(track.callbacks ?? 0),
          String(track.live ?? 0),
          fmt(track.callbackMs),
          String(track.totalCallbacks ?? 0),
        ]))
      }
      lines.push('')
    }

    const usage = Object.entries(hand.usage ?? {})
    if (usage.length > 0) {
      lines.push(`usage: ${usage.map(([key, value]) => {
        const total = typeof value === 'number' ? value : value?.total
        return `${key}=${total}`
      }).join(', ')}`)
      lines.push('')
    }

    const contract = Object.entries(plugin.contract ?? {})
    if (contract.length > 0) {
      lines.push(row(['contract', 'n', 'windowN', 'basis']))
      lines.push(row(['---', '---', '---', '---']))
      for (const [name, item] of contract) {
        lines.push(row([name, String(item.n ?? 0), String(item.windowN ?? 0), String(item.basis ?? 'window')]))
      }
      lines.push('')
    }

    const hostSpan = Object.entries(plugin.host ?? {})
    if (hostSpan.length > 0) {
      lines.push(row(['hostSpan', 'n', 'p50', 'p95', 'errors']))
      lines.push(row(['---', '---', '---', '---', '---']))
      for (const [name, item] of hostSpan) {
        lines.push(row([name, String(item.n ?? 0), fmt(item.p50), fmt(item.p95), String(item.errors ?? 0)]))
      }
      lines.push('')
    }

    if ((hand.profiler?.commits ?? 0) > 0) {
      lines.push(`profiler: commits=${hand.profiler.commits} commitP95=${fmt(hand.profiler.commitP95)}`)
      lines.push('')
    }
  }

  const counts = Object.entries(page.counts ?? {})
  if (counts.length > 0) {
    lines.push('## counts')
    lines.push('')
    lines.push(counts.map(([key, value]) => {
      const total = typeof value === 'number' ? value : value?.total
      return `- ${key}: ${total}`
    }).join('\n'))
    lines.push('')
  }

  lines.push('## structure')
  lines.push('')
  const structure = report?.structure ?? {}
  lines.push(row(['check', 'value']))
  lines.push(row(['---', '---']))
  for (const [key, value] of Object.entries(structure)) {
    if (key === 'audits') continue
    lines.push(row([key, String(value)]))
  }
  lines.push('')

  const notes = report?.notes ?? []
  if (notes.length > 0) {
    lines.push('## notes')
    lines.push('')
    for (const item of notes) lines.push(`- ${item.id ?? ''}: ${item.text ?? ''}`)
    lines.push('')
  }

  return `${lines.join('\n')}\n`
}
