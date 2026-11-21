/** One sandbox: its status, the apps that can open it, and its sections behind tabs.
 *  Terminals live in the shell's dock. */
import React from 'react'
import {
  Button, CodeBlock, DisclosureRow, Input, SegmentedControl, StateDot, Tag, IconRefreshOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { FactGrid, IconButton, Meter, NanoTabs, SplitRow } from 'dsh-nano-ui'
import { createTicket } from './managed.js'
import { fill } from './i18n.js'
import { formatBytes, serviceAddress } from './format.js'
import { sandboxAddress } from '../host/terminal-resource.js'
import {
  DOT, OP_DOT, actionText, cores, driverText, idleStatusText, lastActivityText, lastOperationText, nameOf, opText,
  pendingRevision, ratio, serviceHealthText, sizeLine, stateText, stepText, when, whole,
} from './model.js'
import { AppList, ErrorLine, Group, Muted, ReceiptList, Section, StateMinutes, UsageCharts, WindowControl } from './parts.jsx'

const h = React.createElement
const PLANES = ['container', 'engine', 'bridge', 'page', 'dom', 'terminal']
const HEALTH_TONE = { healthy: 'success', unhealthy: 'danger' }
// Linux process state letters; only a live verdict earns a coloured dot.
const PROC_DOT = { R: 'done', Z: 'error', T: 'warning' }
const DANGER = 'nano-modal-action nano-modal-danger'
// Engine logs carry terminal colour codes that a code block would print literally.
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g

function useTickets() {
  const ref = React.useRef(null)
  if (!ref.current) ref.current = {}
  React.useEffect(() => () => { for (const ticket of Object.values(ref.current)) ticket.kill() }, [])
  return (key) => {
    if (!ref.current[key]) ref.current[key] = createTicket()
    return ref.current[key].take()
  }
}

function idleText(copy, configuration) {
  const ms = configuration?.idleTimeoutMs
  if (!Number.isFinite(ms) || ms <= 0) return copy.idleOff
  return fill(copy.idleAfter, { n: Math.round(ms / 60000) })
}

/* ── monitor ─────────────────────────────────────────────────────────── */

function MonitorTab({ copy, target, detail, running, usageWindow, setUsageWindow, procs, host, address, onError }) {
  const minute = running ? (detail?.lastMinute ?? target.lastMinute) : null
  const cpus = target.resources?.cpus
  const memory = target.resources?.memoryBytes
  const usage = detail?.usage
  const sortedProcs = procs?.list ? [...procs.list].sort((a, b) => (b.rssBytes ?? 0) - (a.rssBytes ?? 0)) : []
  return h(React.Fragment, null,
    h(Section, { title: copy.apps, aside: h('span', { className: 'dnls-muted' }, copy.newPane) },
      h(AppList, { copy, host, address, onError })),
    h(Section, { title: copy.allocated, aside: h('span', { className: 'dnls-muted' }, running ? copy.lastMinute : copy.notSampling) },
      h(Meter, {
        label: copy.usageCpu,
        text: `${cores(minute?.cpuCores) ?? copy.none} / ${fill(copy.cores, { n: cpus ?? copy.none })}`,
        value: ratio(minute?.cpuCores, cpus),
      }),
      h(Meter, {
        label: copy.usageMemory,
        text: `${formatBytes(minute?.memoryBytes) ?? copy.none} / ${formatBytes(memory) ?? copy.none}`,
        value: ratio(minute?.memoryBytes, memory),
      })),
    h(Section, { title: copy.usage, aside: h(WindowControl, { copy, value: usageWindow, onChange: setUsageWindow }) },
      detail == null ? h(Muted, null, copy.loading)
      : usage ? h(React.Fragment, null, h(UsageCharts, { copy, usages: [usage] }), h(StateMinutes, { copy, usage }))
      : h(Muted, null, copy.usageDenied)),
    h(Section, { title: copy.processes, aside: procs?.list ? h('span', { className: 'dnls-muted' }, String(procs.list.length)) : null },
      !running ? h(Muted, null, copy.notSampling)
      : procs == null ? h(Muted, null, copy.loading)
      : procs.error ? h(ErrorLine, { error: procs.error })
      : sortedProcs.length === 0 ? h(Muted, null, copy.processesEmpty)
      : h(React.Fragment, null,
        h('div', { className: 'dnls-procs' }, sortedProcs.map((proc) => h(DisclosureRow, {
          key: proc.pid,
          icon: h(StateDot, { state: PROC_DOT[proc.state] ?? 'idle' }),
          title: proc.name ?? String(proc.pid),
          expandable: false,
          headerAccessory: h('span', { className: 'dnls-proc-meta' }, `${proc.pid} · ${formatBytes(proc.rssBytes) ?? copy.none}`),
        }))),
        procs.truncated ? h(Muted, null, fill(copy.processesTruncated, { n: sortedProcs.length })) : null)),
    h(Section, { title: copy.deployment },
      detail == null ? h(Muted, null, copy.loading) : h(Group, null,
        h(SplitRow, { label: copy.imageDigest },
          typeof detail.applied?.imageDigest === 'string'
            ? h('span', { className: 'dnls-mono', title: detail.applied.imageDigest }, detail.applied.imageDigest.slice(0, 19))
            : copy.none),
        h(SplitRow, { label: copy.verifiedAt }, when(copy, detail.applied?.verifiedAt) ?? copy.none),
        h(SplitRow, { label: copy.observed }, when(copy, detail.observedAt) ?? copy.none))),
    Array.isArray(detail?.mounts) && detail.mounts.length > 0 ? h(Section, { title: copy.storage }, h(Group, null,
      detail.mounts.map((mount, index) => h(SplitRow, {
        key: `${mount.target}:${index}`,
        label: h('span', { className: 'dnls-mono' }, mount.target ?? copy.none),
      }, `${mount.type ?? ''} · ${mount.readOnly ? copy.readOnly : copy.readWrite}`)))) : null)
}

/* ── services ────────────────────────────────────────────────────────── */

function planeDot(plane) {
  if (plane?.skipped) return 'idle'
  if (plane?.ok === true) return 'done'
  if (plane?.ok === false) return 'error'
  return 'idle'
}

function ServicesTab({ copy, detail, running, probe, control, canProbe, canControl, busy, onProbe, onControl }) {
  const services = Array.isArray(detail?.services) ? detail.services : []
  const status = probe?.result
  const degraded = Array.isArray(status?.degraded) ? status.degraded : []
  return h(React.Fragment, null,
    h(Section, { title: copy.services },
      detail == null ? h(Muted, null, copy.loading)
      : services.length === 0 ? h(Muted, null, copy.servicesEmpty)
      : h(Group, null, services.map((service) => {
        const address = serviceAddress(service)
        const role = service.role && service.role !== service.serviceId ? `${service.role} · ` : ''
        return h(SplitRow, {
          key: service.serviceId,
          label: h('span', { className: 'dnls-row-copy' },
            h('span', { className: 'dnls-mono' }, service.serviceId),
            h('span', { className: 'dnls-row-meta' }, `${role}${service.containerPort ?? copy.none}/${service.protocol ?? 'tcp'}`)),
        }, h('span', { className: 'dnls-inline' },
          address ? h('span', { className: 'dnls-mono' }, address) : h('span', { className: 'dnls-muted' }, copy.unpublished),
          // Only a recorded verdict earns a tag; live state is the probe below.
          HEALTH_TONE[service.health] ? h(Tag, { tone: HEALTH_TONE[service.health] }, copy.health[service.health]) : null))
      }))),
    canProbe ? h(Section, {
      title: copy.probeTitle,
      aside: h(Button, { variant: 'outline', size: 'sm', disabled: !running || probe?.busy, onClick: onProbe },
        probe?.busy ? copy.probing : copy.probe),
    },
    !running ? h(Muted, null, copy.probeStopped)
    : probe?.error ? h(ErrorLine, { error: probe.error })
    : status ? h(React.Fragment, null,
      h('div', { className: 'dnls-inline' },
        h(Tag, { tone: status.healthy ? 'success' : 'danger' },
          status.healthy ? copy.probeHealthy : fill(copy.probeDegraded, { planes: degraded.map((p) => copy.plane[p] ?? p).join(', ') })),
        h('span', { className: 'dnls-muted' }, fill(copy.probeAt, { at: when(copy, status.observedAt) ?? copy.none }))),
      h(Group, null, PLANES.filter((key) => status.planes?.[key]).map((key) => {
        const plane = status.planes[key]
        return h(SplitRow, {
          key,
          label: h('span', { className: 'dnls-term' }, h(StateDot, { state: planeDot(plane) }), copy.plane[key] ?? key),
        }, h('span', { className: 'dnls-muted' }, plane.skipped ? copy.planeSkipped : (copy.planeState[plane.state] ?? plane.state ?? copy.none)))
      })))
    : null) : null,
    canControl ? h(Section, { title: copy.manualControl },
      control?.error ? h(ErrorLine, { error: control.error })
      : control?.state == null ? h(Muted, null, running ? copy.loading : copy.probeStopped)
      : h(Group, null, h(SplitRow, {
        label: h('span', { className: 'dnls-term' },
          h(StateDot, { state: control.state.humanHold?.active ? 'warning' : 'done' }),
          control.state.humanHold?.active ? copy.manualHeld : copy.manualFree),
      }, h(Button, {
        variant: 'outline', size: 'sm', disabled: busy || control.busy,
        onClick: () => onControl(control.state.humanHold?.active ? 'release' : 'takeover'),
      }, control.state.humanHold?.active ? copy.release : copy.takeover)))) : null)
}

/* ── logs ────────────────────────────────────────────────────────────── */

function LogsTab({ copy, running, logs, onTail, onReload }) {
  return h(Section, {
    title: copy.logs,
    aside: h(React.Fragment, null,
      h(SegmentedControl, {
        label: copy.logsLines,
        value: String(logs.tail),
        onChange: (value) => onTail(Number(value)),
        options: [{ value: '50', label: '50' }, { value: '100', label: '100' }, { value: '200', label: '200' }],
      }),
      h(IconButton, { icon: h(IconRefreshOutlineRegular, { size: 16 }), 'aria-label': copy.refresh, disabled: !running || logs.busy, onClick: onReload })),
  },
  !running ? h(Muted, null, copy.logsStopped)
  : logs.error ? h(ErrorLine, { error: logs.error })
  : logs.text == null ? h(Muted, null, copy.loading)
  : logs.text.trim() === '' ? h(Muted, null, copy.logsEmpty)
  : h('div', { className: 'dnls-log' },
    h(CodeBlock, {
      code: logs.text.replace(ANSI, '').replace(/\n$/, ''),
      lang: 'text',
      wrap: true,
      copyLabel: copy.copy,
      copiedLabel: copy.copied,
      toolbarLabels: { codeLabel: fill(copy.logsTail, { n: logs.tail }), wrapLabel: copy.wrapOn, unwrapLabel: copy.wrapOff },
    })))
}

/* ── activity ────────────────────────────────────────────────────────── */

function ActivityTab({ copy, detail, receipts, lookup, setLookup, onLookup, onRecheck }) {
  const operations = Array.isArray(detail?.operations) ? [...detail.operations].reverse() : []
  return h(React.Fragment, null,
    receipts.length > 0 ? h(Section, { title: copy.receipts },
      h(Group, null, h(ReceiptList, { copy, receipts, onRecheck })),
      h(Muted, null, copy.receiptHint)) : null,
    h(Section, { title: copy.lookup },
      h('div', { className: 'dnls-inline' },
        h('span', { className: 'dnls-grow' },
          h(Input, {
            value: lookup.text,
            placeholder: copy.lookupPlaceholder,
            'aria-label': copy.lookupPlaceholder,
            onChange: (event) => setLookup({ ...lookup, text: event.target.value }),
          })),
        h(Button, { variant: 'outline', size: 'sm', disabled: lookup.busy || lookup.text.trim() === '', onClick: onLookup }, copy.lookupGo)),
      lookup.error ? h(ErrorLine, { error: lookup.error }) : null,
      lookup.result ? h(Group, null, h(SplitRow, {
        label: h('span', { className: 'dnls-term' },
          h(StateDot, { state: OP_DOT[lookup.result.state] ?? 'idle' }),
          fill(copy.receiptLine, { action: actionText(copy, lookup.result.action), state: opText(copy, lookup.result.state) })),
      }, h('span', { className: 'dnls-muted' }, [stepText(copy, lookup.result.step), when(copy, lookup.result.finishedAt ?? lookup.result.at)].filter(Boolean).join(' · ')))) : null),
    h(Section, { title: copy.history },
      detail == null ? h(Muted, null, copy.loading)
      : operations.length === 0 ? h(Muted, null, copy.historyEmpty)
      : h(Group, null, operations.map((op, index) => h(SplitRow, {
        key: `${op.action}:${op.at ?? index}`,
        label: h('span', { className: 'dnls-term' },
          h(StateDot, { state: OP_DOT[op.state] ?? 'idle' }),
          fill(copy.receiptLine, { action: actionText(copy, op.action), state: opText(copy, op.state) })),
      }, h('span', { className: 'dnls-muted' }, when(copy, op.finishedAt ?? op.at) ?? copy.none))))))
}

/* ── settings ────────────────────────────────────────────────────────── */

function SettingsTab({ copy, target, detail, running, busy, supports, draft, setDraft, onAction, onSaveIdle, onSaveResources }) {
  const configuration = detail?.configuration
  const field = (key, label) => h(Input, {
    value: draft[key], 'aria-label': label, inputMode: 'numeric',
    onChange: (event) => setDraft({ ...draft, [key]: event.target.value, message: null }),
  })
  const num = (key, label) => h('span', { className: 'dnls-num' }, field(key, label))
  const labelled = (label, value) => h('span', { className: 'dnls-label' },
    h('span', null, label), h('span', { className: 'dnls-muted' }, fill(copy.current, { value })))
  if (detail == null) return h(Muted, null, copy.loading)
  return h(React.Fragment, null,
    h(Section, { title: copy.power }, h(Group, null,
      running
        ? h(SplitRow, { label: copy.powerState }, h(Button, { variant: 'outline', size: 'sm', disabled: busy || !supports('sandbox.instance.stop'), onClick: () => onAction('stop') }, copy.action.stop))
        : h(SplitRow, { label: copy.powerState }, h(Button, { variant: 'primary', size: 'sm', disabled: busy || !supports('sandbox.instance.start'), onClick: () => onAction('start') }, copy.action.start)),
      running ? h(SplitRow, { label: copy.restartRow },
        h(Button, { variant: 'outline', size: 'sm', disabled: busy || !supports('sandbox.instance.restart'), onClick: () => onAction('restart') }, copy.action.restart)) : null,
      configuration && supports('sandbox.idle.configure') ? h(SplitRow, { label: labelled(copy.idleMinutes, idleText(copy, configuration)) },
        h('span', { className: 'dnls-inline' },
          num('idle', copy.idleMinutes),
          h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: onSaveIdle }, copy.save))) : null)),
    configuration && supports('sandbox.revision.save') ? h(Section, { title: copy.resources },
      h(Muted, null, copy.resourcesHint),
      h(Group, null,
        h(SplitRow, { label: labelled(copy.cpus, target.resources?.cpus ?? copy.none) }, num('cpus', copy.cpus)),
        h(SplitRow, { label: labelled(copy.memoryMiB, formatBytes(target.resources?.memoryBytes) ?? copy.none) }, num('memory', copy.memoryMiB))),
      h('div', { className: 'dnls-inline' },
        h(Button, { variant: 'primary', size: 'sm', disabled: busy, onClick: onSaveResources }, copy.save),
        pendingRevision(detail) && supports('sandbox.instance.recreate')
          ? h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => onAction('recreate') }, copy.applyNow)
          : null)) : null,
    !configuration ? h(Muted, null, copy.configDenied) : null,
    draft.message ? h(draft.error ? ErrorLine : Muted, draft.error ? { error: draft.message } : null, draft.error ? undefined : draft.message) : null,
    h(Section, { title: copy.danger }, h(Group, null,
      h(SplitRow, { label: copy.recreateRow },
        h(Button, { variant: 'outline', size: 'sm', className: DANGER, disabled: busy || !supports('sandbox.instance.recreate'), onClick: () => onAction('recreate') }, `${copy.action.recreate}…`)),
      h(SplitRow, { label: copy.removeRow },
        h(Button, { variant: 'outline', size: 'sm', className: DANGER, disabled: busy || !supports('sandbox.instance.remove'), onClick: () => onAction('remove') }, `${copy.action.remove}…`)))))
}

/* ── page ────────────────────────────────────────────────────────────── */

export function SandboxView({
  copy, api, row, host, busy, supports, receipts, refreshKey, outerError,
  onAction, onRecheck, onWrite,
}) {
  const sandboxId = row.sandboxId
  const take = useTickets()
  const [tick, setTick] = React.useState(0)
  const [tab, setTab] = React.useState('monitor')
  const [usageWindow, setUsageWindow] = React.useState('24h')
  const [detail, setDetail] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [procs, setProcs] = React.useState(null)
  const [probe, setProbe] = React.useState(null)
  const [control, setControl] = React.useState(null)
  const [logs, setLogs] = React.useState({ tail: 100, text: null })
  const [lookup, setLookup] = React.useState({ text: '' })
  const [draft, setDraft] = React.useState({ cpus: '', memory: '', idle: '' })

  const target = detail ? { ...row, ...detail } : row
  const observed = target.observedState
  const running = observed === 'running'
  const reload = () => setTick((value) => value + 1)

  React.useEffect(() => {
    const ok = take('detail')
    ;(async () => {
      try {
        let body
        try {
          body = await api.inspect(sandboxId, { window: usageWindow })
        } catch (caught) {
          // Usage can be scoped away from a principal that may still read the object.
          if (caught?.status !== 403) throw caught
          body = await api.inspect(sandboxId, { window: null })
        }
        if (!ok()) return
        setDetail(body)
        setError(null)
      } catch (caught) {
        if (ok()) setError(caught)
      }
    })()
  }, [sandboxId, usageWindow, refreshKey, tick])

  React.useEffect(() => {
    const cfg = detail?.configuration
    setDraft((prev) => (prev.touched ? prev : {
      cpus: cfg?.overrides?.cpus == null ? '' : String(cfg.overrides.cpus),
      memory: cfg?.overrides?.memoryBytes == null ? '' : String(Math.round(cfg.overrides.memoryBytes / (1024 * 1024))),
      idle: cfg?.idleTimeoutMs == null ? '' : String(Math.round(cfg.idleTimeoutMs / 60000)),
    }))
  }, [detail?.configuration])

  React.useEffect(() => {
    if (tab !== 'monitor' || !running || !supports('sandbox.processes')) return
    const ok = take('procs')
    ;(async () => {
      try {
        const body = await api.processes(sandboxId, { limit: 200 })
        if (ok()) setProcs({ list: body.processes ?? [], truncated: body.truncated === true })
      } catch (caught) {
        if (ok()) setProcs({ error: caught })
      }
    })()
  }, [sandboxId, tab, running, refreshKey, tick])

  // Who drives the shared engine is part of the status header, not only of the services tab.
  React.useEffect(() => {
    if (!running || !supports('dnls.control')) { setControl(null); return }
    const ok = take('control')
    ;(async () => {
      try {
        const body = await api.control(sandboxId)
        if (ok()) setControl({ state: body.control })
      } catch (caught) {
        if (ok()) setControl({ error: caught })
      }
    })()
  }, [sandboxId, running, refreshKey, tick])

  React.useEffect(() => {
    if (tab !== 'logs' || !running || !supports('dnls.logs')) return
    const ok = take('logs')
    setLogs((prev) => ({ ...prev, busy: true }))
    ;(async () => {
      try {
        const body = await api.logs(sandboxId, { tail: logs.tail })
        if (ok()) setLogs((prev) => ({ ...prev, busy: false, error: null, text: typeof body.text === 'string' ? body.text : '' }))
      } catch (caught) {
        if (ok()) setLogs((prev) => ({ ...prev, busy: false, error: caught }))
      }
    })()
  }, [tab, sandboxId, running, logs.tail, tick])

  React.useEffect(() => {
    setProbe(null)
    setControl(null)
    setProcs(null)
  }, [sandboxId])

  async function runProbe() {
    setProbe((prev) => ({ ...prev, busy: true, error: null }))
    try {
      const result = await api.status(sandboxId)
      setProbe({ result })
    } catch (caught) {
      setProbe({ error: caught })
    }
  }

  async function runControl(action) {
    setControl((prev) => ({ ...prev, busy: true }))
    try {
      const body = await api.control(sandboxId, action)
      const read = body?.control ? body : await api.control(sandboxId)
      setControl({ state: read.control })
    } catch (caught) {
      setControl((prev) => ({ ...prev, busy: false, error: caught }))
    }
  }

  async function runLookup() {
    const operationId = lookup.text.trim()
    setLookup({ text: lookup.text, busy: true })
    try {
      const result = await api.readOperation(sandboxId, operationId)
      setLookup({ text: lookup.text, result })
    } catch (caught) {
      setLookup({ text: lookup.text, error: caught?.status === 404 ? copy.lookupMissing : caught })
    }
  }

  async function saveIdle() {
    const minutes = whole(draft.idle)
    if (minutes === undefined || minutes === null) { setDraft({ ...draft, message: copy.wholeNumber, error: true }); return }
    await onWrite(async () => {
      await api.configureIdle(sandboxId, minutes * 60000)
      setDraft({ ...draft, touched: false, message: copy.saved, error: false })
      reload()
    }, (caught) => setDraft({ ...draft, message: caught.message, error: true }))
  }

  async function saveResources() {
    const cpus = whole(draft.cpus)
    const memory = whole(draft.memory)
    if (cpus === undefined || memory === undefined) { setDraft({ ...draft, message: copy.wholeNumber, error: true }); return }
    const overrides = {}
    if (cpus !== null) overrides.cpus = cpus
    if (memory !== null) overrides.memoryBytes = memory * 1024 * 1024
    if (Object.keys(overrides).length === 0) { setDraft({ ...draft, message: copy.nothingToSave, error: false }); return }
    await onWrite(async () => {
      const out = await api.saveRevision(sandboxId, { expectedRevision: detail?.desiredRevision ?? 0, overrides })
      const revision = out?.desiredRevision ?? out?.revision ?? (detail?.desiredRevision ?? 0) + 1
      setDraft({ ...draft, touched: false, message: fill(copy.savedRevision, { revision }), error: false })
      reload()
    }, (caught) => setDraft({ ...draft, message: caught.message, error: true }))
  }

  const lifecycleTarget = { sandboxId, name: nameOf(target), envId: target.envId, desiredRevision: detail?.desiredRevision ?? row.desiredRevision, observedState: observed }
  const act = (action) => onAction(action, lifecycleTarget)

  let objectAddress = null
  try { objectAddress = sandboxAddress({ envId: target.envId, sandboxId }) } catch { objectAddress = null }
  const mine = receipts.filter((receipt) => receipt.sandboxId === sandboxId)
  const drivers = Array.isArray(target.drivers) && target.drivers.length > 0 ? target.drivers.join(' · ') : copy.none

  const tabs = [
    { value: 'monitor', label: copy.tabMonitor, content: tab === 'monitor' ? h(MonitorTab, { copy, target, detail, running, usageWindow, setUsageWindow, procs, host, address: objectAddress, onError: setError }) : null },
    { value: 'services', label: copy.tabServices, content: tab === 'services' ? h(ServicesTab, {
      copy, detail, running, probe, control, busy,
      canProbe: supports('dnls.status'), canControl: supports('dnls.control'),
      onProbe: runProbe, onControl: runControl,
    }) : null },
    supports('dnls.logs') ? { value: 'logs', label: copy.tabLogs, content: tab === 'logs' ? h(LogsTab, {
      copy, running, logs, onTail: (tail) => setLogs((prev) => ({ ...prev, tail, text: null })), onReload: reload,
    }) : null } : null,
    { value: 'activity', label: copy.tabActivity, content: tab === 'activity' ? h(ActivityTab, {
      copy, detail, receipts: mine, lookup, setLookup, onLookup: runLookup, onRecheck,
    }) : null },
    { value: 'settings', label: copy.tabSettings, content: tab === 'settings' ? h(SettingsTab, {
      copy, target, detail, running, busy, supports,
      draft, setDraft: (next) => setDraft({ ...next, touched: true }),
      onAction: act, onSaveIdle: saveIdle, onSaveResources: saveResources,
    }) : null },
  ].filter(Boolean)

  const idle = detail?.idle
  const revisionText = pendingRevision(target)
    ? fill(copy.revisionPending, { applied: target.appliedRevision ?? 0, desired: target.desiredRevision })
    : String(target.appliedRevision ?? copy.none)
  // The head and the tab strip stay put; only the active panel scrolls, so
  // switching tabs never moves the chrome.
  return h('div', { className: 'dnls-view', 'data-dnls-view': 'sandbox' },
    h('div', { className: 'dnls-object-head' },
      h(ErrorLine, { error: error ?? outerError }),
      h('div', { className: 'dnls-head-card', 'data-dnls-status': observed ?? 'unknown' },
        h('div', { className: 'dnls-head-name' },
          h(StateDot, { state: DOT[observed] ?? 'idle' }),
          h('span', { className: 'dnls-head-title' }, nameOf(target)),
          HEALTH_TONE[target.health] ? h(Tag, { tone: HEALTH_TONE[target.health] }, copy.health[target.health]) : null,
          pendingRevision(target) ? h(Tag, { tone: 'neutral' }, copy.pendingApply) : null),
        h('div', { className: 'dnls-head-meta' },
          [stateText(copy, observed), sizeLine(copy, target), target.profileId].filter(Boolean).join(' · ')),
        running && target.lastMinute ? h('div', { className: 'dnls-meters' },
          h(Meter, {
            label: copy.usageCpu,
            text: `${cores(target.lastMinute.cpuCores) ?? copy.none} / ${fill(copy.cores, { n: target.resources?.cpus ?? copy.none })}`,
            value: ratio(target.lastMinute.cpuCores, target.resources?.cpus),
          }),
          h(Meter, {
            label: copy.usageMemory,
            text: `${formatBytes(target.lastMinute.memoryBytes) ?? copy.none} / ${formatBytes(target.resources?.memoryBytes) ?? copy.none}`,
            value: ratio(target.lastMinute.memoryBytes, target.resources?.memoryBytes),
          })) : null,
        h(FactGrid, { items: [
          { label: copy.driver, value: driverText(copy, control, running) },
          { label: copy.idleSleep, value: detail ? idleStatusText(copy, idle) : copy.none },
          { label: copy.lastActivity, value: lastActivityText(copy, idle) },
          { label: copy.lastOperation, value: lastOperationText(copy, target, detail) },
          { label: copy.services, value: serviceHealthText(copy, target.services) },
          // The list row is re-read after every dock create/close; the inspect detail is not.
          { label: copy.terminals, value: String(row.visibleTerminalCount ?? target.visibleTerminalCount ?? copy.none) },
        ] }),
        h('div', { className: 'dnls-head-foot' }, [
          `${copy.revision} ${revisionText}`,
          `${copy.drivers} ${drivers}`,
          `${copy.observed} ${when(copy, target.observedAt) ?? copy.none}`,
        ].join(' · ')))),
    h(NanoTabs, { className: 'dnls-detail', label: copy.tabs, value: tab, onChange: setTab, items: tabs }))
}
