/** Small building blocks shared by the fleet list and the sandbox page. */
import React from 'react'
import { Button, PluginArtworkDefault, SegmentedControl, StateDot, TextShimmer } from '@deepseek-ai/dsh-client-ui-primitives'
import { SplitRow } from 'dsh-nano-ui'
import { HistoryLine } from './history.jsx'
import { fill } from './i18n.js'
import { formatBytes } from './format.js'
import { OP_DOT, SETTLED, actionText, combine, cores, opText, shortId, stateText } from './model.js'

const h = React.createElement

/** One semantic block: its title outside, its content on its own plate. */
export function Section({ title, aside, children }) {
  return h('section', { className: 'dnls-section' },
    h('div', { className: 'dnls-section-head' },
      h('h3', { className: 'dnls-section-title' }, title),
      aside ? h('div', { className: 'dnls-inline' }, aside) : null),
    h('div', { className: 'dnls-plate' }, children))
}

export function handlersFor(host, address) {
  if (typeof address !== 'string') return []
  try { return host.handlers(address) ?? [] } catch { return [] }
}

export function handlerTitle(handler, address, fallback) {
  try {
    const title = typeof handler?.title === 'function' ? handler.title(address) : handler?.title
    return typeof title === 'string' && title !== '' ? title : fallback
  } catch { return fallback }
}

function handlerIcon(handler) {
  const Icon = Array.isArray(handler?.guide) ? handler.guide.find((entry) => entry?.icon)?.icon : null
  return h(Icon ?? PluginArtworkDefault, { size: 16 })
}

/**
 * Every host handler that accepts the sandbox address is one app; its name is
 * the handler's own tab title. Opening names that handler's kind so the host
 * opens exactly the app the user picked.
 */
export function AppList({ copy, host, address, compact, onError }) {
  const handlers = handlersFor(host, address)
  const open = (handler) => {
    if (host.openResource(address, { kind: handler.kind, preferNewPane: true }) !== true) onError?.(new Error(copy.workspaceUnavailable))
  }
  if (handlers.length === 0) return compact ? null : h(Muted, null, copy.workspaceUnavailable)
  if (compact) {
    return h('span', { className: 'dnls-apps', onClick: (event) => event.stopPropagation(), onKeyDown: (event) => event.stopPropagation() },
      handlers.map((handler) => {
        const title = handlerTitle(handler, address, copy.none)
        return h(Button, {
          key: handler.id ?? handler.kind,
          variant: 'outline', size: 'sm',
          icon: handlerIcon(handler),
          title: copy.newPane,
          'aria-label': `${copy.appOpen} ${title}`,
          onClick: () => open(handler),
        }, title)
      }))
  }
  return h(Group, null, handlers.map((handler) => {
    const title = handlerTitle(handler, address, copy.none)
    return h(SplitRow, {
      key: handler.id ?? handler.kind,
      label: h('span', { className: 'dnls-term' }, handlerIcon(handler), h('span', null, title)),
    }, h(Button, {
      variant: 'outline', size: 'sm', title: copy.newPane,
      'aria-label': `${copy.appOpen} ${title}`,
      onClick: () => open(handler),
    }, copy.appOpen))
  }))
}

/** Rows that belong together, on one bordered surface. */
export function Group({ children }) {
  return h('div', { className: 'dnls-group' }, children)
}

export function Muted({ children }) {
  return h('p', { className: 'dnls-muted' }, children)
}

/** The server message, then its registered errorId so the operator can search it. */
export function ErrorLine({ error }) {
  if (!error) return null
  const message = typeof error === 'string' ? error : error.message
  const id = typeof error === 'object' && typeof error.errorId === 'string' ? error.errorId : null
  return h('p', { className: 'dnls-error', role: 'alert' }, id && id !== message ? `${message} (${id})` : message)
}

export function WindowControl({ copy, value, onChange }) {
  return h(SegmentedControl, {
    label: copy.usageWindow,
    value,
    onChange,
    options: [
      { value: '24h', label: copy.window24 },
      { value: '7d', label: copy.window7 },
      { value: '30d', label: copy.window30 },
    ],
  })
}

function Chart({ copy, label, series, format }) {
  return h('div', { className: 'dnls-chart' },
    h('div', { className: 'dnls-chart-head' },
      h('span', null, label, ' · ', series.mean == null
        ? copy.noSamples
        : fill(copy.meanPeak, { mean: format(series.mean), peak: format(series.peak) })),
      h('span', null, fill(copy.coverage, { valid: series.valid, expected: series.expected }))),
    h(HistoryLine, { points: series.points }))
}

/** CPU and memory history over one window. Several usages are summed per minute. */
export function UsageCharts({ copy, usages }) {
  const cpu = combine(usages, 'cpu', 'core', 'cpuCores')
  const memory = combine(usages, 'memory', 'bytes', 'memoryBytes')
  if (cpu.objects === 0 && memory.objects === 0) return h(Muted, null, copy.noSamples)
  return h(React.Fragment, null,
    h(Chart, { copy, label: copy.usageCpu, series: cpu, format: (value) => fill(copy.cores, { n: cores(value) }) }),
    h(Chart, { copy, label: copy.usageMemory, series: memory, format: (value) => formatBytes(value) ?? copy.none }))
}

export function StateMinutes({ copy, usage }) {
  const states = usage?.states
  if (!states || typeof states !== 'object') return null
  const parts = Object.entries(states)
    .filter(([, minutes]) => Number.isFinite(minutes) && minutes > 0)
    .map(([state, minutes]) => `${stateText(copy, state)} ${minutes}`)
  return parts.length ? h(Muted, null, `${copy.stateMinutes}: ${parts.join(' · ')}`) : null
}

/** Lifecycle requests sent from this page, read back by operation id. */
export function ReceiptList({ copy, receipts, onRecheck, showName }) {
  return receipts.map((receipt) => {
    const settled = SETTLED.has(receipt.state)
    const line = fill(copy.receiptLine, { action: actionText(copy, receipt.action), state: opText(copy, receipt.state) })
    return h(SplitRow, {
      key: receipt.operationId,
      label: h('span', { className: 'dnls-term' },
        h(StateDot, { state: OP_DOT[receipt.state] ?? 'idle' }),
        h(TextShimmer, { active: !settled }, showName ? `${receipt.name} · ${line}` : line),
        h('span', { className: 'dnls-muted dnls-mono' }, shortId(receipt.operationId)),
        receipt.error ? h('span', { className: 'dnls-error' }, receipt.error) : null),
    }, h(Button, {
      variant: 'ghost', size: 'sm', disabled: receipt.checking === true,
      onClick: () => onRecheck(receipt),
    }, copy.recheck))
  })
}
