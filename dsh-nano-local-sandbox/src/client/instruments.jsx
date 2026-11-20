/**
 * Fleet readings and historical samples are observations, not defaults.
 */

const React = require('react')
const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
const h = React.createElement
const Button = primitives.Button

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** One metric band: bars over real minute spans; holes stay holes, a real
 * zero is a baseline hairline. Server summary quantities, never bin means. */
// nano-ui-exempt: neither catalog provides a discontinuous minute-history chart.
function MetricChart({ title, bins, unit, range, summary, tone, copy }) {
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
    h('div', null, title, ' · ',
      mean != null ? h('span', null, `${copy.chartMean} ${fmt(mean)} ${unit}`) : null,
      peak != null ? h('span', null, ` · ${copy.chartPeak} ${fmt(peak)} ${unit}`) : null,
      h(primitives.Tag, { tone: 'quiet' }, `${valid}/${expected} ${copy.samplesWord}`)),
    bins.length === 0 || span == null || !bins.some(b => num(b.value) !== null)
      ? h('p', null, copy.noSamples)
      : h(React.Fragment, null,
          h('svg', { width: '100%', height: 32, viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'none',
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
            }))))
}

function SandboxRow({ entry, copy, onSelect, disabled, formatBytes, stateLabel }) {
  const pending = Number.isInteger(entry.desiredRevision) && Number.isInteger(entry.appliedRevision) &&
    entry.desiredRevision !== entry.appliedRevision
  const running = entry.observedState === 'running'
  const note = pending ? copy.pendingConfig : ['failed', 'indeterminate'].includes(entry.operation?.state)
    ? copy.opStates[entry.operation.state] : null
  const alloc = entry.resources ?? {}
  const cpu = num(entry.lastMinute?.cpuCores)
  const meter = (label, used, max) => Number.isFinite(used) && Number.isFinite(max) && max > 0 && used <= max
    ? h('div', null, h('meter', { min: 0, max, value: used, 'aria-label': label })) : null
  return h('tr', null,
    h('td', null, h(Button, { variant: 'ghost', size: 'md', 'data-dnls-row': entry.sandboxId,
      icon: h(primitives.StateDot, { state: running ? 'done' : entry.observedState === 'stopped' ? 'idle' : 'warning' }),
      disabled, onClick: () => onSelect(entry.sandboxId) }, entry.name ?? entry.sandboxId),
      h('div', null, h(primitives.Tag, { tone: 'quiet' }, stateLabel(entry.observedState)),
        note ? h(primitives.Tag, { tone: 'warning' }, note) : null,
        running && entry.services?.some(s => s.published === true) ? h(primitives.Tag, { tone: 'quiet' },
          `${copy.servicesVerified} ${entry.services.filter(s => s.published === true).length}`) : null)),
    h('td', { align: 'right' }, `${cpu === null ? '—' : Number(cpu.toFixed(2))} / ${alloc.cpus ?? '—'}`,
      meter(copy.usageCpu, cpu, alloc.cpus)),
    h('td', { align: 'right' }, `${formatBytes(entry.lastMinute?.memoryBytes) ?? '—'} / ${formatBytes(alloc.memoryBytes) ?? '—'}`,
      meter(copy.usageMemory, entry.lastMinute?.memoryBytes, alloc.memoryBytes)))
}

export { MetricChart, SandboxRow }
