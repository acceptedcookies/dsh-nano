/**
 * Stateless instrument renderers for the DNLS workbench. Native SVG with
 * theme-token attributes only — no inline CSS, no hardcoded colors, no
 * invented numbers: an unproven measurement draws no fill.
 */

const React = require('react')
const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
const h = React.createElement
const Button = primitives.Button

const ratio = (value, total) =>
  Number.isFinite(value) && Number.isFinite(total) && total > 0 ? Math.min(value / total, 1) : null
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)
const mib = (v) => (num(v) != null ? Math.round(v / 1048576) : null)

/** Device card face: a recognizable sandbox unit, never a marketing glyph. */
function DeviceFace({ entry, copy, stateLabel: labelOf }) {
  const state = entry.observedState
  const running = state === 'running'
  const stopped = state === 'stopped'
  const title = labelOf(state) ?? (running ? copy.faceRunning : stopped ? copy.faceStopped : copy.faceUnverified)
  const mem = num(entry.lastMinute?.memoryBytes)
  const cpu = num(entry.lastMinute?.cpuCores)
  const alloc = entry.resources ?? {}
  const memRatio = ratio(mem, alloc.memoryBytes)
  const cpuRatio = ratio(cpu, alloc.cpus)
  const bar = (y, label, r, used, cap, unit) =>
    h(React.Fragment, { key: label },
      h('text', { x: 14, y, fontSize: 12, fill: 'var(--dsw-alias-label-primary)' }, label),
      used != null && cap != null
        ? h('text', { x: 238, y, fontSize: 12, textAnchor: 'end', fill: 'var(--dsw-alias-label-primary)' },
            `${used} / ${cap} ${unit}`)
        : h('text', { x: 238, y, fontSize: 12, textAnchor: 'end', fill: 'var(--dsw-alias-label-secondary)' }, copy.unknown),
      h('rect', { x: 14, y: y + 6, width: 224, height: 10, rx: 3,
        fill: 'var(--dsw-alias-bg-layer-1)', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1 }),
      r != null && r > 0
        ? h('rect', { x: 14, y: y + 6, width: Math.max(2, Math.round(224 * r)), height: 10, rx: 3,
            fill: 'var(--dsw-alias-state-done-primary)' })
        : null)
  return h('svg', {
    viewBox: '0 0 252 126', width: '100%', role: 'img', focusable: 'false',
    'aria-label': running ? `${title} · ${copy.lastMinute} · CPU ${cpu ?? '—'} / ${alloc.cpus ?? '—'} ${copy.coresUnit} · RAM ${mib(mem) ?? '—'} / ${mib(alloc.memoryBytes) ?? '—'} MiB` : title,
  },
    h('title', null, title),
    h('rect', { x: 3, y: 3, width: 246, height: 113, rx: 10,
      fill: running ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-1)',
      stroke: 'var(--dsw-alias-border-l2)' }),
    h('circle', { cx: 18, cy: 18, r: 4,
      fill: running ? 'var(--dsw-alias-state-success-primary)' : 'var(--dsw-alias-border-l2)' }),
    h('text', { x: 30, y: 22, fontSize: 12, fill: 'var(--dsw-alias-label-primary)' }, title),
    running
      ? h(React.Fragment, null,
          bar(48, 'CPU', cpuRatio, cpu != null ? Number(cpu.toFixed(2)) : null, num(alloc.cpus), copy.coresUnit),
          bar(78, 'RAM', memRatio, mib(mem), mib(alloc.memoryBytes), 'MiB'),
          h('text', { x: 14, y: 107, fontSize: 10, fill: 'var(--dsw-alias-label-secondary)' },
            entry.lastMinute?.at ? copy.lastMinute : copy.noSamples))
      : h(React.Fragment, null,
          stopped
            ? h(React.Fragment, null,
                h('line', { x1: 126, y1: 40, x2: 126, y2: 66, stroke: 'var(--dsw-alias-label-secondary)', strokeWidth: 4, strokeLinecap: 'round' }),
                h('path', { d: 'M108 48 a26 26 0 1 0 36 0', fill: 'none', stroke: 'var(--dsw-alias-label-secondary)', strokeWidth: 4, strokeLinecap: 'round' }))
            : null,
          h('text', { x: 126, y: 100, textAnchor: 'middle', fontSize: 12, fill: 'var(--dsw-alias-label-secondary)' },
            stopped ? copy.samplingStopped : copy.faceUnverifiedHint)),
    h('path', { d: 'M96 116 L156 116 L168 125 L84 125 Z',
      fill: 'var(--dsw-alias-bg-layer-1)', stroke: 'var(--dsw-alias-border-l2)' }))
}

/** One metric band: bars over real minute spans; holes stay holes, a real
 * zero is a baseline hairline. Server summary quantities, never bin means. */
function MetricChart({ title, bins, unit, range, summary, tone, copy, fmtTime }) {
  const W = 320
  const H = 64
  const start = bins.length ? num(bins[0].at) ?? Date.parse(bins[0]?.at ?? '') : null
  const end = num(summary?.end) ?? null
  const peak = num(summary?.peak)
  const mean = num(summary?.mean)
  const valid = num(summary?.valid) ?? bins.filter((b) => num(b.value) != null).length
  const expected = num(summary?.expected) ?? bins.length
  const span = start != null && end != null && end > start ? end - start : null
  const scale = peak != null && peak > 0 ? peak : 1
  const fmt = (v) => (unit === 'MiB' ? `${Math.round(v)}` : Number(v).toFixed(2))
  const aria = `${title} ${range}: ${valid}/${expected} ${copy.samplesWord}`
  return h(React.Fragment, null,
    h('div', null,
      h('strong', null, title), ' ',
      mean != null ? h('span', null, `${copy.chartMean} ${fmt(mean)} ${unit}`) : null,
      peak != null ? h('span', null, ` · ${copy.chartPeak} ${fmt(peak)} ${unit}`) : null,
      ' ', h('span', null, `${valid}/${expected} ${copy.samplesWord}`)),
    bins.length === 0 || span == null || !bins.some(b => num(b.value) !== null)
      ? h('p', null, copy.noSamples)
      : h(React.Fragment, null,
          h('small', null, `0 – ${fmt(scale)} ${unit}`),
          h('svg', { width: '100%', height: H, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none',
            role: 'img', 'aria-label': aria },
            h('line', { x1: 0, y1: H - 1, x2: W, y2: H - 1, stroke: 'var(--dsw-alias-border-l2)' }),
            bins.map((bin, i) => {
              const at = num(bin.at) ?? Date.parse(bin.at ?? '')
              const minutes = num(bin.minutes) ?? 1
              if (!Number.isFinite(at)) return null
              const x = ((at - start) / span) * W
              const w = Math.max(1, (minutes * 60000 / span) * W)
              const v = num(bin.value)
              if (v == null) return null // a hole stays a hole
              const height = Math.max(2, Math.round((v / scale) * (H - 14)))
              return h('rect', {
                key: at ?? i, x, y: v === 0 ? H - 2 : H - 1 - height, width: Math.max(1, w - 1),
                height: v === 0 ? 1 : height, // a real zero is a baseline hairline
                fill: tone,
              })
            })),
          h('small', null, `${fmtTime(start)} – ${fmtTime(end)}`)))
}

/** Card caption under the device: name once, lifecycle state, pending
 * configuration only on a genuine desired≠applied revision, verified
 * service count when running, and known allocation even when stopped. */
function CardBody({ entry, copy, running, onSelect, disabled, Tag, formatBytes, stateLabel }) {
  const pending = Number.isInteger(entry.desiredRevision) && Number.isInteger(entry.appliedRevision) &&
    entry.desiredRevision !== entry.appliedRevision
  const services = running ? (entry.services ?? []).filter((s) => s.published === true).length : 0
  const alloc = entry.resources ?? {}
  const allocText = [
    num(alloc.cpus) != null ? `${alloc.cpus} ${copy.coresUnit}` : null,
    num(alloc.memoryBytes) != null ? (formatBytes?.(alloc.memoryBytes) ?? `${Math.round(alloc.memoryBytes / 1048576)} MiB`) : null,
  ].filter(Boolean).join(' / ')
  return h(React.Fragment, null,
    h(Button, { variant: 'outline', 'data-dnls-row': entry.sandboxId,
      'aria-label': entry.name ?? entry.sandboxId, disabled,
      onClick: () => onSelect(entry.sandboxId) },
      h('strong', null, entry.name ?? entry.sandboxId)),
    ' ',
    h(Tag, { tone: running ? 'success' : entry.observedState === 'stopped' ? 'neutral' : 'warning' }, stateLabel(entry.observedState)),
    pending ? h('p', null, copy.pendingConfig) : null,
    running && services > 0 ? h('p', null, `${copy.servicesVerified} ${services}`) : null,
    allocText ? h('p', null, allocText) : null)
}

export { DeviceFace, MetricChart, CardBody }
