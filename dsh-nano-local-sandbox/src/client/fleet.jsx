/** Overview: the system as a whole, then one card per sandbox with what it is
 *  doing, how healthy it is, what it uses and what can open it. */
import React from 'react'
import { Button, StateDot, Tag, IconEllipsisOutlineRegular, IconPlusOutlineRegular, PluginArtworkDefault } from '@deepseek-ai/dsh-client-ui-primitives'
import { EmptyState, FactGrid, IconButton, Meter } from 'dsh-nano-ui'
import { createTicket } from './managed.js'
import { fill } from './i18n.js'
import { formatBytes } from './format.js'
import { sandboxAddress } from '../host/terminal-resource.js'
import {
  DOT, combine, cores, driverText, idleStatusText, lastOperationText, nameOf, needsAttention,
  pendingRevision, ratio, serviceHealthText, sizeLine, stateText,
} from './model.js'
import { AppList, ErrorLine, Group, Muted, Pending, ReceiptList, Section, UsageCharts, WindowControl } from './parts.jsx'
import { profileIdOf } from './dialogs.jsx'

const h = React.createElement
const HEALTH_TONE = { healthy: 'success', unhealthy: 'danger' }

function addressOf(row) {
  try { return sandboxAddress({ envId: row.envId, sandboxId: row.sandboxId }) } catch { return null }
}

function SystemPlate({ copy, rows, envs, complete, profiles, usages, usageWindow }) {
  const running = rows.filter((row) => row.observedState === 'running').length
  const stopped = rows.filter((row) => row.observedState === 'stopped').length
  const attention = rows.filter(needsAttention).length
  const terminals = rows.reduce((sum, row) => sum + (Number.isInteger(row.visibleTerminalCount) ? row.visibleTerminalCount : 0), 0)
  const envText = Array.isArray(envs) && envs.length > 0
    ? envs.map((env) => fill(env.complete === false ? copy.envSilent : copy.envAnswered, { env: env.envId })).join(' · ')
    : complete ? copy.none : copy.listPartial
  const quota = Array.isArray(profiles)
    ? profiles.filter((profile) => Number.isInteger(profile?.maxInstances)).map((profile) => {
      const id = profileIdOf(profile)
      return fill(copy.quotaLine, { profile: id, used: rows.filter((row) => row.profileId === id).length, max: profile.maxInstances })
    }).join(' · ')
    : ''
  const cpu = usages ? combine(usages, 'cpu', 'core', 'cpuCores') : null
  const sampling = cpu && cpu.expected > 0
    ? fill(copy.samplingLine, { valid: cpu.valid, expected: cpu.expected, window: copy[`window${usageWindow === '24h' ? '24' : usageWindow === '7d' ? '7' : '30'}`] })
    : copy.none
  return h(Section, { title: copy.system },
    h(FactGrid, { items: [
      { label: copy.envs, value: envText },
      { label: copy.typeLabel, value: fill(copy.sandboxesCount, { running, stopped, attention }) },
      { label: copy.quota, value: quota || copy.none },
      { label: copy.sampling, value: sampling },
      { label: copy.terminalsTotal, value: String(terminals) },
    ] }))
}

function SandboxCard({ copy, host, row, detail, control, busy, supports, onOpen, onMenu, onStart, onError }) {
  const running = row.observedState === 'running'
  const stopped = row.observedState === 'stopped'
  const minute = running ? row.lastMinute : null
  const own = (event) => event.target === event.currentTarget
  const stop = (event) => event.stopPropagation()
  const idle = detail?.idle
  // Long values are clipped to one line so late-arriving detail never grows
  // the card; the full text stays on the tooltip.
  const fact = (text) => h('span', { title: text }, text)
  return h('div', {
    className: 'dnls-card',
    role: 'button',
    tabIndex: 0,
    'data-dnls-card': row.sandboxId,
    'aria-label': `${nameOf(row)} · ${stateText(copy, row.observedState)}`,
    onClick: () => onOpen(row),
    onKeyDown: (event) => {
      if (!own(event) || (event.key !== 'Enter' && event.key !== ' ')) return
      event.preventDefault()
      onOpen(row)
    },
  },
  h('div', { className: 'dnls-card-head' },
    h(StateDot, { state: DOT[row.observedState] ?? 'idle' }),
    h('span', { className: 'dnls-card-name' }, nameOf(row)),
    h('span', { className: 'dnls-card-state' }, stateText(copy, row.observedState)),
    HEALTH_TONE[row.health] ? h(Tag, { tone: HEALTH_TONE[row.health] }, copy.health[row.health]) : null,
    pendingRevision(row) ? h(Tag, { tone: 'neutral' }, copy.pendingApply) : null,
    h('span', { className: 'dnls-card-tail', onClick: stop, onKeyDown: stop },
      stopped && supports('sandbox.instance.start')
        ? h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => onStart(row) }, copy.action.start)
        : null,
      h(IconButton, {
        icon: h(IconEllipsisOutlineRegular, { size: 16 }),
        'aria-label': `${copy.more} · ${nameOf(row)}`,
        onClick: (event) => onMenu(event, row),
      }))),
  running
    ? h('div', { className: 'dnls-meters' },
      h(Meter, {
        label: copy.usageCpu,
        text: `${cores(minute?.cpuCores) ?? copy.none} / ${fill(copy.cores, { n: row.resources?.cpus ?? copy.none })}`,
        value: ratio(minute?.cpuCores, row.resources?.cpus) ?? 0,
      }),
      h(Meter, {
        label: copy.usageMemory,
        text: `${formatBytes(minute?.memoryBytes) ?? copy.none} / ${formatBytes(row.resources?.memoryBytes) ?? copy.none}`,
        value: ratio(minute?.memoryBytes, row.resources?.memoryBytes) ?? 0,
      }))
    : h(Muted, null, [
      row.observedState === 'missing' ? copy.containerMissing : copy.notSampling,
      sizeLine(copy, row),
    ].filter(Boolean).join(' · ')),
  h(FactGrid, { items: [
    { label: copy.services, value: serviceHealthText(copy, row.services) },
    { label: copy.terminals, value: String(row.visibleTerminalCount ?? copy.none) },
    { label: copy.activation, value: fact([idleStatusText(copy, idle), driverText(copy, control, running)].filter(Boolean).join(' · ')) },
    { label: copy.lastOperation, value: fact(lastOperationText(copy, row, detail)) },
  ] }),
  h(AppList, { copy, host, address: addressOf(row), compact: true, onError }))
}

export function FleetView({
  copy, api, host, rows, envs, complete, phase, error, busy, supports, receipts, refreshKey,
  onRetry, onCreate, onOpen, onMenu, onStart, onRecheck, onError,
}) {
  const [usageWindow, setUsageWindow] = React.useState('24h')
  const [details, setDetails] = React.useState({})
  const [controls, setControls] = React.useState({})
  const [usages, setUsages] = React.useState(null)
  const [profiles, setProfiles] = React.useState(null)
  const ticket = React.useRef(null)
  if (!ticket.current) ticket.current = createTicket()
  React.useEffect(() => () => ticket.current.kill(), [])

  // The view mounts while discovery is still running, so the announced
  // capability is part of the dependency list, not just the refresh key.
  const canListProfiles = supports('sandbox.profile.list')
  React.useEffect(() => {
    if (!canListProfiles) return
    let live = true
    api.listProfiles().then((list) => { if (live) setProfiles(list) }, () => { if (live) setProfiles([]) })
    return () => { live = false }
  }, [refreshKey, canListProfiles])

  // One sequential pass per refresh: object detail (usage, idle, timeline) and,
  // for running objects, the shared-engine control state.
  React.useEffect(() => {
    if (!rows || rows.length === 0) return
    const ok = ticket.current.take()
    ;(async () => {
      const nextDetails = {}
      const nextControls = {}
      const found = []
      for (const row of rows) {
        if (supports('sandbox.inspect')) {
          try {
            const body = await api.inspect(row.sandboxId, { window: usageWindow })
            nextDetails[row.sandboxId] = body
            if (body?.usage) found.push(body.usage)
          } catch {
            try { nextDetails[row.sandboxId] = await api.inspect(row.sandboxId, { window: null }) } catch { /* the card keeps row facts */ }
          }
        }
        if (row.observedState === 'running' && supports('dnls.control')) {
          try {
            const body = await api.control(row.sandboxId)
            nextControls[row.sandboxId] = { state: body.control }
          } catch (caught) {
            nextControls[row.sandboxId] = { error: caught }
          }
        }
        if (!ok()) return
      }
      setDetails(nextDetails)
      setControls(nextControls)
      setUsages(found)
    })()
  }, [rows, usageWindow])

  const list = rows ?? []
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
      h(SystemPlate, { copy, rows: list, envs, complete, profiles, usages, usageWindow }),
      h('section', { className: 'dnls-section' },
        h('div', { className: 'dnls-cards', 'data-dnls-list': '1' },
          list.map((row) => h(SandboxCard, {
            key: row.sandboxId, copy, host, row, busy, supports,
            detail: details[row.sandboxId], control: controls[row.sandboxId],
            onOpen, onMenu, onStart, onError,
          }))),
        !complete ? h(Muted, null, copy.listPartial) : null),
      supports('sandbox.inspect') ? h(Section, {
        title: copy.usage,
        aside: h(WindowControl, { copy, value: usageWindow, onChange: setUsageWindow }),
      },
      h(Muted, null, copy.usageFleet),
      usages == null ? h(Pending, { copy, className: 'dnls-pending-usage' }) : h('div', { className: 'dnls-usage' }, h(UsageCharts, { copy, usages }))) : null)
  }

  return h('div', { className: 'dnls-view', 'data-dnls-view': 'fleet' },
    h('div', { className: 'dnls-scroll' },
      h('div', { className: 'dnls-page-head' },
        h('div', { className: 'dnls-page-copy' },
          h('h2', { className: 'dnls-page-title' }, copy.typeLabel),
          h('p', { className: 'dnls-page-desc' }, copy.typeDescription)),
        supports('sandbox.instance.create')
          ? h(Button, {
            variant: 'primary', size: 'md', disabled: busy,
            icon: h(IconPlusOutlineRegular, { size: 14 }),
            onClick: onCreate,
          }, copy.create)
          : null),
      rows ? h(ErrorLine, { error }) : null,
      recent.length > 0
        ? h(Section, { title: copy.receipts }, h(Group, null, h(ReceiptList, { copy, receipts: recent, onRecheck, showName: true })))
        : null,
      body))
}
