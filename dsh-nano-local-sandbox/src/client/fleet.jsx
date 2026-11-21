/** Sandbox list: what exists, whether it runs and what it uses, without opening anything. */
import React from 'react'
import {
  Button, DisclosureRow, StateDot, IconPlusOutlineRegular, IconRefreshOutlineRegular,
  IconEllipsisOutlineRegular, PluginArtworkDefault,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { EmptyState, IconButton, Toolbar } from 'dsh-nano-ui'
import { createTicket } from './managed.js'
import { fill } from './i18n.js'
import { DOT, needsAttention, nameOf, rowMeta, stateText } from './model.js'
import { ErrorLine, Muted, ReceiptList, Section, UsageCharts, WindowControl } from './parts.jsx'

const h = React.createElement

function SandboxRow({ copy, row, busy, supports, onOpen, onMenu, onStart }) {
  const stopped = row.observedState === 'stopped'
  return h(DisclosureRow, {
    icon: h(StateDot, { state: DOT[row.observedState] ?? 'idle' }),
    title: h('span', { className: 'dnls-row-copy' },
      h('span', { className: 'dnls-row-name' },
        h('span', null, nameOf(row)),
        h('span', { className: 'dnls-row-state' }, stateText(copy, row.observedState))),
      h('span', { className: 'dnls-row-meta' }, rowMeta(copy, row))),
    open: false,
    expandable: true,
    expandOnRowClick: true,
    previewChevron: false,
    onToggle: () => onOpen(row),
    headerAccessory: h('span', { className: 'dnls-row-tail' },
      stopped && supports('sandbox.instance.start')
        ? h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => onStart(row) }, copy.action.start)
        : null,
      h(IconButton, {
        icon: h(IconEllipsisOutlineRegular, { size: 16 }),
        'aria-label': `${copy.more} · ${nameOf(row)}`,
        onClick: (event) => onMenu(event, row),
      })),
  })
}

export function FleetView({
  copy, api, rows, total, complete, phase, error, busy, supports, receipts,
  onRetry, onRefresh, onCreate, onOpen, onMenu, onStart, onRecheck,
}) {
  const [usageWindow, setUsageWindow] = React.useState('24h')
  const [usages, setUsages] = React.useState(null)
  const ticket = React.useRef(null)
  if (!ticket.current) ticket.current = createTicket()
  React.useEffect(() => () => ticket.current.kill(), [])

  React.useEffect(() => {
    if (!rows || rows.length === 0 || !supports('sandbox.inspect')) return
    const ok = ticket.current.take()
    ;(async () => {
      const found = []
      for (const row of rows) {
        try {
          const body = await api.inspect(row.sandboxId, { window: usageWindow })
          if (body?.usage) found.push(body.usage)
        } catch { /* a sandbox without readable usage simply adds no samples */ }
        if (!ok()) return
      }
      setUsages(found)
    })()
  }, [rows, usageWindow])

  const list = rows ?? []
  const running = list.filter((row) => row.observedState === 'running').length
  const stopped = list.filter((row) => row.observedState === 'stopped').length
  const attention = list.filter(needsAttention).length
  const recent = receipts.slice(0, 3)

  let body
  if (phase === 'loading' && !rows) body = h(EmptyState, { title: copy.loading })
  else if (phase === 'failed' && !rows) {
    body = h(EmptyState, {
      title: copy.failed,
      description: error?.message,
      action: h(Button, { variant: 'outline', onClick: onRetry }, copy.retry),
    })
  } else if (list.length === 0) {
    body = h(EmptyState, {
      icon: h(PluginArtworkDefault, { size: 40 }),
      title: copy.emptyTitle,
      description: copy.emptyHint,
      action: supports('sandbox.instance.create')
        ? h(Button, { variant: 'primary', onClick: onCreate }, copy.create)
        : undefined,
    })
  } else {
    body = h(React.Fragment, null,
      h('div', { className: 'dnls-list', 'data-dnls-list': '1' },
        list.map((row) => h(SandboxRow, { key: row.sandboxId, copy, row, busy, supports, onOpen, onMenu, onStart }))),
      !complete ? h(Muted, null, copy.listPartial) : null,
      supports('sandbox.inspect') ? h(Section, {
        title: copy.usage,
        aside: h(WindowControl, { copy, value: usageWindow, onChange: setUsageWindow }),
      },
      h(Muted, null, copy.usageFleet),
      usages == null ? h(Muted, null, copy.loading) : h(UsageCharts, { copy, usages })) : null)
  }

  return h('div', { className: 'dnls-view', 'data-dnls-view': 'fleet' },
    h(Toolbar, { label: copy.workbench },
      h('span', { className: 'dnls-heading' },
        h('span', null, copy.typeLabel),
        rows ? h('span', { className: 'dnls-count' }, String(total ?? list.length)) : null),
      h(IconButton, {
        icon: h(IconRefreshOutlineRegular, { size: 16 }),
        'aria-label': copy.refresh,
        disabled: phase === 'loading',
        onClick: onRefresh,
      }),
      supports('sandbox.instance.create') ? h(Button, {
        variant: 'primary', size: 'sm', disabled: busy,
        icon: h(IconPlusOutlineRegular, { size: 14 }),
        onClick: onCreate,
      }, copy.create) : null),
    h('div', { className: 'dnls-scroll' },
      rows ? h(ErrorLine, { error }) : null,
      recent.length > 0
        ? h(Section, { title: copy.receipts }, h(ReceiptList, { copy, receipts: recent, onRecheck, showName: true }))
        : null,
      body),
    rows && list.length > 0 ? h('footer', { className: 'dnls-foot' },
      h('span', null, fill(copy.footRunning, { running, stopped })),
      attention > 0 ? h('span', null, fill(copy.footAttention, { count: attention })) : null) : null)
}
