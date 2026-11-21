/** One sandbox: status, the primary open action, and its sections behind tabs. */
import React from 'react'
import {
  Button, CodeBlock, Input, SegmentedControl, StateDot, Tag,
  IconChevronLeftOutlineRegular, IconEllipsisOutlineRegular, IconPlusOutlineRegular,
  IconRefreshOutlineRegular, IconTrashOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { Card, FactGrid, IconButton, Meter, NanoDialog, NanoTabs, PlainTable, SplitRow, Toolbar } from 'dsh-nano-ui'
import { createTicket } from './managed.js'
import { fill } from './i18n.js'
import { formatBytes, serviceAddress } from './format.js'
import { sandboxAddress, terminalAddress } from '../host/terminal-resource.js'
import {
  DOT, OP_DOT, actionText, cores, nameOf, opText, pendingRevision, ratio, shortId, sizeLine, stateText, when, whole,
} from './model.js'
import { ErrorLine, Muted, ReceiptList, Section, StateMinutes, UsageCharts, WindowControl } from './parts.jsx'

const h = React.createElement
const PLANES = ['container', 'engine', 'bridge', 'page', 'dom', 'terminal']
const HEALTH_TONE = { healthy: 'success', unhealthy: 'danger' }
const DANGER = 'nano-modal-action nano-modal-danger'

function useTickets() {
  const ref = React.useRef(null)
  if (!ref.current) ref.current = {}
  React.useEffect(() => () => { for (const ticket of Object.values(ref.current)) ticket.kill() }, [])
  return (key) => {
    if (!ref.current[key]) ref.current[key] = createTicket()
    return ref.current[key].take()
  }
}

function handlersFor(host, address) {
  try { return host.handlers(address) ?? [] } catch { return [] }
}

function handlerTitle(handler, address, fallback) {
  try {
    const title = typeof handler?.title === 'function' ? handler.title(address) : handler?.title
    return typeof title === 'string' && title !== '' ? title : fallback
  } catch { return fallback }
}

function idleText(copy, configuration) {
  const ms = configuration?.idleTimeoutMs
  if (!Number.isFinite(ms) || ms <= 0) return copy.idleOff
  return fill(copy.idleAfter, { n: Math.round(ms / 60000) })
}

/* ── monitor ─────────────────────────────────────────────────────────── */

function MonitorTab({ copy, target, detail, running, usageWindow, setUsageWindow, procs }) {
  const minute = running ? (detail?.lastMinute ?? target.lastMinute) : null
  const cpus = target.resources?.cpus
  const memory = target.resources?.memoryBytes
  const usage = detail?.usage
  const sortedProcs = procs?.list ? [...procs.list].sort((a, b) => (b.rssBytes ?? 0) - (a.rssBytes ?? 0)) : []
  return h(React.Fragment, null,
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
        h(PlainTable, { columns: [copy.procPid, copy.procName, copy.procState, copy.procRss] },
          sortedProcs.map((proc) => h('tr', { key: proc.pid },
            h('td', null, String(proc.pid)),
            h('td', null, proc.name),
            h('td', null, proc.state ?? copy.none),
            h('td', null, formatBytes(proc.rssBytes) ?? copy.none)))),
        procs.truncated ? h(Muted, null, fill(copy.processesTruncated, { n: sortedProcs.length })) : null)),
    h(Section, { title: copy.deployment },
      detail == null ? h(Muted, null, copy.loading) : h(React.Fragment, null,
        h(SplitRow, { label: copy.imageDigest },
          typeof detail.applied?.imageDigest === 'string'
            ? h('span', { className: 'dnls-mono', title: detail.applied.imageDigest }, detail.applied.imageDigest.slice(0, 19))
            : copy.none),
        h(SplitRow, { label: copy.verifiedAt }, when(copy, detail.applied?.verifiedAt) ?? copy.none),
        h(SplitRow, { label: copy.observed }, when(copy, detail.observedAt) ?? copy.none))),
    Array.isArray(detail?.mounts) && detail.mounts.length > 0 ? h(Section, { title: copy.storage },
      detail.mounts.map((mount, index) => h(SplitRow, {
        key: `${mount.target}:${index}`,
        label: h('span', { className: 'dnls-mono' }, mount.target ?? copy.none),
      }, `${mount.type ?? ''} · ${mount.readOnly ? copy.readOnly : copy.readWrite}`))) : null)
}

/* ── terminals ───────────────────────────────────────────────────────── */

function TerminalsTab({ copy, host, terms, running, busy, canCreate, canClose, onCreate, onOpen, onClose }) {
  const list = terms?.list ?? []
  let body
  if (terms?.denied) body = h(Muted, null, copy.terminalsDenied)
  else if (terms == null) body = h(Muted, null, copy.loading)
  else if (terms.error) body = h(ErrorLine, { error: terms.error })
  else if (list.length === 0) body = h(Muted, null, running ? copy.terminalsEmpty : copy.terminalsStopped)
  else {
    body = list.map((term) => {
      const handlers = typeof term.address === 'string' ? handlersFor(host, term.address) : []
      return h(SplitRow, {
        key: term.terminalId,
        label: h('span', { className: 'dnls-term' },
          h(StateDot, { state: term.state === 'active' ? 'done' : 'idle' }),
          h('span', { className: 'dnls-mono' }, fill(copy.terminalLabel, { id: shortId(term.terminalId) })),
          term.state ? h(Tag, { tone: 'neutral' }, term.state) : null),
      }, h('span', { className: 'dnls-inline' },
        handlers.length === 0
          ? h('span', { className: 'dnls-muted' }, copy.terminalUnavailable)
          : handlers.map((handler, index) => h(Button, {
            key: index, variant: 'ghost', size: 'sm', onClick: () => onOpen(term),
          }, handlers.length === 1 ? copy.terminalOpen : fill(copy.openIn, { name: handlerTitle(handler, term.address, copy.none) }))),
        canClose ? h(IconButton, {
          icon: h(IconTrashOutlineRegular, { size: 16 }),
          'aria-label': `${copy.terminalClose} ${shortId(term.terminalId)}`,
          disabled: busy,
          onClick: () => onClose(term),
        }) : null))
    })
  }
  return h(Section, {
    title: copy.terminals,
    aside: canCreate && !terms?.denied ? h(Button, {
      variant: 'primary', size: 'sm', disabled: busy || !running,
      icon: h(IconPlusOutlineRegular, { size: 14 }),
      onClick: onCreate,
    }, copy.terminalNew) : null,
  }, body, terms?.denied ? null : h(Muted, null, copy.terminalsHint))
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
      : services.map((service) => {
        const address = serviceAddress(service)
        const role = service.role && service.role !== service.serviceId ? `${service.role} · ` : ''
        return h(SplitRow, {
          key: service.serviceId,
          label: h('span', { className: 'dnls-row-copy' },
            h('span', { className: 'dnls-mono' }, service.serviceId),
            h('span', { className: 'dnls-row-meta' }, `${role}${service.containerPort ?? copy.none}/${service.protocol ?? 'tcp'}`)),
        }, h('span', { className: 'dnls-inline' },
          address ? h('span', { className: 'dnls-mono' }, address) : h('span', { className: 'dnls-muted' }, copy.unpublished),
          h(Tag, { tone: HEALTH_TONE[service.health] ?? 'neutral' }, copy.health[service.health] ?? copy.health.unknown)))
      })),
    canProbe ? h(Section, {
      title: copy.probe,
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
      PLANES.filter((key) => status.planes?.[key]).map((key) => {
        const plane = status.planes[key]
        return h(SplitRow, {
          key,
          label: h('span', { className: 'dnls-term' }, h(StateDot, { state: planeDot(plane) }), copy.plane[key] ?? key),
        }, h('span', { className: 'dnls-muted' }, plane.skipped ? copy.planeSkipped : (plane.state ?? copy.none)))
      }))
    : null) : null,
    canControl ? h(Section, { title: copy.manualControl },
      control?.error ? h(ErrorLine, { error: control.error })
      : control?.state == null ? h(Muted, null, running ? copy.loading : copy.probeStopped)
      : h(SplitRow, {
        label: h('span', { className: 'dnls-term' },
          h(StateDot, { state: control.state.humanHold?.active ? 'warning' : 'done' }),
          control.state.humanHold?.active ? copy.manualHeld : copy.manualFree),
      }, h(Button, {
        variant: 'outline', size: 'sm', disabled: busy || control.busy,
        onClick: () => onControl(control.state.humanHold?.active ? 'release' : 'takeover'),
      }, control.state.humanHold?.active ? copy.release : copy.takeover))) : null)
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
    h(CodeBlock, { code: logs.text.replace(/\n$/, ''), lang: 'text', copyLabel: copy.copy, copiedLabel: copy.copied })))
}

/* ── activity ────────────────────────────────────────────────────────── */

function ActivityTab({ copy, detail, receipts, lookup, setLookup, onLookup, onRecheck }) {
  const operations = Array.isArray(detail?.operations) ? [...detail.operations].reverse() : []
  return h(React.Fragment, null,
    receipts.length > 0 ? h(Section, { title: copy.receipts },
      h(ReceiptList, { copy, receipts, onRecheck }),
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
      lookup.result ? h(SplitRow, {
        label: h('span', { className: 'dnls-term' },
          h(StateDot, { state: OP_DOT[lookup.result.state] ?? 'idle' }),
          fill(copy.receiptLine, { action: actionText(copy, lookup.result.action), state: opText(copy, lookup.result.state) })),
      }, h('span', { className: 'dnls-muted' }, [lookup.result.step, when(copy, lookup.result.finishedAt ?? lookup.result.at)].filter(Boolean).join(' · '))) : null),
    h(Section, { title: copy.history },
      detail == null ? h(Muted, null, copy.loading)
      : operations.length === 0 ? h(Muted, null, copy.historyEmpty)
      : operations.map((op, index) => h(SplitRow, {
        key: `${op.action}:${op.at ?? index}`,
        label: h('span', { className: 'dnls-term' },
          h(StateDot, { state: OP_DOT[op.state] ?? 'idle' }),
          fill(copy.receiptLine, { action: actionText(copy, op.action), state: opText(copy, op.state) })),
      }, h('span', { className: 'dnls-muted' }, when(copy, op.finishedAt ?? op.at) ?? copy.none)))))
}

/* ── settings ────────────────────────────────────────────────────────── */

function SettingsTab({ copy, target, detail, running, busy, supports, draft, setDraft, onAction, onSaveIdle, onSaveResources }) {
  const configuration = detail?.configuration
  const field = (key, label) => h('span', { className: 'dnls-narrow' }, h(Input, {
    value: draft[key], 'aria-label': label, inputMode: 'numeric',
    onChange: (event) => setDraft({ ...draft, [key]: event.target.value, message: null }),
  }))
  if (detail == null) return h(Muted, null, copy.loading)
  return h(React.Fragment, null,
    h(Section, { title: copy.power },
      running
        ? h(SplitRow, { label: copy.powerState }, h(Button, { variant: 'outline', size: 'sm', disabled: busy || !supports('sandbox.instance.stop'), onClick: () => onAction('stop') }, copy.action.stop))
        : h(SplitRow, { label: copy.powerState }, h(Button, { variant: 'primary', size: 'sm', disabled: busy || !supports('sandbox.instance.start'), onClick: () => onAction('start') }, copy.action.start)),
      running ? h(SplitRow, { label: copy.restartRow },
        h(Button, { variant: 'outline', size: 'sm', disabled: busy || !supports('sandbox.instance.restart'), onClick: () => onAction('restart') }, copy.action.restart)) : null,
      configuration && supports('sandbox.idle.configure') ? h(SplitRow, { label: copy.idleMinutes },
        h('span', { className: 'dnls-inline' },
          h('span', { className: 'dnls-muted' }, idleText(copy, configuration)),
          field('idle', copy.idleMinutes),
          h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: onSaveIdle }, copy.save))) : null),
    configuration && supports('sandbox.revision.save') ? h(Section, { title: copy.resources },
      h(Muted, null, copy.resourcesHint),
      h(SplitRow, { label: copy.cpus },
        h('span', { className: 'dnls-inline' },
          h('span', { className: 'dnls-muted' }, fill(copy.current, { value: target.resources?.cpus ?? copy.none })),
          field('cpus', copy.cpus))),
      h(SplitRow, { label: copy.memoryMiB },
        h('span', { className: 'dnls-inline' },
          h('span', { className: 'dnls-muted' }, fill(copy.current, { value: formatBytes(target.resources?.memoryBytes) ?? copy.none })),
          field('memory', copy.memoryMiB))),
      h('div', { className: 'dnls-inline' },
        h(Button, { variant: 'primary', size: 'sm', disabled: busy, onClick: onSaveResources }, copy.save),
        pendingRevision(detail) && supports('sandbox.instance.recreate')
          ? h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => onAction('recreate') }, copy.applyNow)
          : null)) : null,
    !configuration ? h(Muted, null, copy.configDenied) : null,
    draft.message ? h(draft.error ? ErrorLine : Muted, draft.error ? { error: draft.message } : null, draft.error ? undefined : draft.message) : null,
    h(Section, { title: copy.danger },
      h(SplitRow, { label: copy.recreateRow },
        h(Button, { variant: 'outline', size: 'sm', className: DANGER, disabled: busy || !supports('sandbox.instance.recreate'), onClick: () => onAction('recreate') }, `${copy.action.recreate}…`)),
      h(SplitRow, { label: copy.removeRow },
        h(Button, { variant: 'outline', size: 'sm', className: DANGER, disabled: busy || !supports('sandbox.instance.remove'), onClick: () => onAction('remove') }, `${copy.action.remove}…`))))
}

/* ── page ────────────────────────────────────────────────────────────── */

export function SandboxView({
  copy, api, row, host, paneId, busy, supports, receipts, refreshKey, outerError,
  onBack, onRefresh, onMenu, onAction, onRecheck, onWrite,
}) {
  const sandboxId = row.sandboxId
  const take = useTickets()
  const [tick, setTick] = React.useState(0)
  const [tab, setTab] = React.useState('monitor')
  const [usageWindow, setUsageWindow] = React.useState('24h')
  const [detail, setDetail] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [procs, setProcs] = React.useState(null)
  const [terms, setTerms] = React.useState(null)
  const [closing, setClosing] = React.useState(null)
  const [probe, setProbe] = React.useState(null)
  const [control, setControl] = React.useState(null)
  const [logs, setLogs] = React.useState({ tail: 100, text: null })
  const [lookup, setLookup] = React.useState({ text: '' })
  const [draft, setDraft] = React.useState({ cpus: '', memory: '', idle: '' })

  const target = detail ? { ...row, ...detail } : row
  const observed = target.observedState
  const running = observed === 'running'
  const reload = () => setTick((value) => value + 1)
  const refreshAll = () => { reload(); onRefresh() }

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

  const loadTerms = React.useCallback(async () => {
    const ok = take('terms')
    if (!supports('term.session.list')) { setTerms({ denied: true }); return }
    try {
      const out = await api.terminalList(sandboxId)
      if (ok()) setTerms({ list: out.terminals })
    } catch (caught) {
      if (ok()) setTerms(caught?.status === 403 ? { denied: true } : { error: caught })
    }
  }, [sandboxId])

  React.useEffect(() => {
    if (tab === 'terminals') loadTerms()
  }, [tab, sandboxId, refreshKey, tick])

  React.useEffect(() => {
    if (tab !== 'services' || !running || !supports('dnls.control')) return
    const ok = take('control')
    ;(async () => {
      try {
        const body = await api.control(sandboxId)
        if (ok()) setControl({ state: body.control })
      } catch (caught) {
        if (ok()) setControl({ error: caught })
      }
    })()
  }, [tab, sandboxId, running, refreshKey, tick])

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
    setTerms(null)
    setProcs(null)
  }, [sandboxId])

  function openWorkspace() {
    let address = null
    try { address = sandboxAddress({ envId: target.envId, sandboxId }) } catch { address = null }
    if (!address || host.openResource(address) !== true) setError(new Error(copy.workspaceUnavailable))
  }

  function openTerm(term) {
    let address = typeof term?.address === 'string' ? term.address : null
    if (!address) {
      try { address = terminalAddress({ envId: target.envId, sandboxId, terminalId: term.terminalId }) } catch { address = null }
    }
    if (!address || host.openResource(address) !== true) setError(new Error(copy.terminalUnavailable))
  }

  async function createTerm() {
    await onWrite(async () => {
      const out = await api.terminalCreate(sandboxId, { paneId, openId: crypto.randomUUID() })
      const listed = await api.terminalList(sandboxId)
      setTerms({ list: listed.terminals })
      openTerm(listed.terminals.find((item) => item.terminalId === out.terminalId) ?? out)
    }, setError)
  }

  async function closeTerm() {
    const term = closing
    await onWrite(async () => {
      await api.terminalClose(sandboxId, term.terminalId)
      setClosing(null)
      await loadTerms()
    }, setError)
  }

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
      setLookup({ text: lookup.text, error: caught })
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
  const objectHandlers = objectAddress ? handlersFor(host, objectAddress) : []
  const mine = receipts.filter((receipt) => receipt.sandboxId === sandboxId)
  const drivers = Array.isArray(target.drivers) && target.drivers.length > 0 ? target.drivers.join(' · ') : copy.none

  const tabs = [
    { value: 'monitor', label: copy.tabMonitor, content: tab === 'monitor' ? h(MonitorTab, { copy, target, detail, running, usageWindow, setUsageWindow, procs }) : null },
    { value: 'terminals', label: copy.tabTerminals, content: tab === 'terminals' ? h(TerminalsTab, {
      copy, host, terms, running, busy,
      canCreate: supports('term.session.create'), canClose: supports('term.session.close'),
      onCreate: createTerm, onOpen: openTerm, onClose: setClosing,
    }) : null },
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

  return h('div', { className: 'dnls-view', 'data-dnls-view': 'sandbox' },
    h(Toolbar, { label: copy.workbench },
      h(IconButton, { icon: h(IconChevronLeftOutlineRegular, { size: 16 }), 'aria-label': copy.back, onClick: onBack }),
      h('span', { className: 'dnls-heading' }, h('span', null, nameOf(target))),
      h(IconButton, { icon: h(IconRefreshOutlineRegular, { size: 16 }), 'aria-label': copy.refresh, onClick: refreshAll }),
      h(IconButton, {
        icon: h(IconEllipsisOutlineRegular, { size: 16 }),
        'aria-label': copy.more,
        onClick: (event) => onMenu(event, lifecycleTarget),
      })),
    h('div', { className: 'dnls-scroll' },
      h(ErrorLine, { error: error ?? outerError }),
      h(Card, null,
        h('div', { className: 'dnls-status' },
          h(StateDot, { state: DOT[observed] ?? 'idle' }),
          h('span', { className: 'dnls-status-label' }, stateText(copy, observed)),
          h('span', { className: 'dnls-status-size' }, sizeLine(copy, target) ?? copy.none)),
        h(FactGrid, { items: [
          { label: copy.profile, value: target.profileId ?? copy.none },
          { label: copy.revision, value: pendingRevision(target)
            ? fill(copy.revisionPending, { applied: target.appliedRevision ?? 0, desired: target.desiredRevision })
            : String(target.appliedRevision ?? copy.none) },
          { label: copy.idleSleep, value: detail ? idleText(copy, detail.configuration) : copy.none },
          { label: copy.terminals, value: String(target.visibleTerminalCount ?? copy.none) },
          { label: copy.drivers, value: drivers },
          { label: copy.observed, value: when(copy, target.observedAt) ?? copy.none },
        ] })),
      mine.some((receipt) => receipt.checking || !receipt.settled)
        ? h(ReceiptList, { copy, receipts: mine.filter((receipt) => !receipt.settled), onRecheck })
        : null,
      objectHandlers.length === 0
        ? h(Muted, null, copy.workspaceUnavailable)
        : h('div', { className: 'dnls-cta' }, objectHandlers.map((handler, index) => h(Button, {
          key: index,
          variant: index === 0 ? 'primary' : 'outline',
          onClick: openWorkspace,
        }, index === 0 ? copy.openWorkspace : fill(copy.openIn, { name: handlerTitle(handler, objectAddress, copy.none) })))),
      h(NanoTabs, { className: 'dnls-detail', label: copy.tabs, value: tab, onChange: setTab, items: tabs })),
    closing ? h(NanoDialog, {
      copy,
      title: copy.terminalCloseTitle,
      confirmLabel: copy.terminalClose,
      danger: true,
      busy,
      onCancel: () => setClosing(null),
      onConfirm: closeTerm,
    }, h('p', { className: 'dnls-muted' }, fill(copy.terminalCloseBody, { id: shortId(closing.terminalId) }))) : null)
}
