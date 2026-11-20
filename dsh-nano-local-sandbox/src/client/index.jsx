/**
 * Sandbox workbench. One right-sidebar tab. The shell (bar, drawer, status
 * sheet) comes from dsh-nano-ui; rows and actions are host primitives.
 * A real sessionId only gates rendering. It is never sent as a selector.
 * Search and refresh never choose a sandbox.
 */

const React = require('react')
const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
const {
  EmptyState, NanoDialog, NANO_STYLES, FactGrid, PanelSection, Card, SplitRow, Meter, PlainTable, openNanoMenu,
  WorkbenchShell, ShellGap, ShellToggle, ShellIcon, ShellTail,
  TabDrawer, DrawerHead, DrawerRow, StatusDock,
} = require('dsh-nano-ui')
const { createDnlsClient, createTicket } = require('./managed.js')
const { copyFor, fill } = require('./i18n.js')
const { formatBytes, serviceAddress } = require('./format.js')
const { terminalAddress } = require('../host/terminal-resource.js')
const { HistoryLine } = require('./history.jsx')

const h = React.createElement
const KIND = 'dnls-sandbox'
const {
  Button, Input, SegmentedControl, DisclosureRow, StateDot, Tag, RiskConfirmation,
  IconChevronLeftOutlineRegular, IconRefreshOutlineRegular, IconSettingsOutlineRegular,
  IconPlusOutlineRegular, IconPanelLeftOutlineRegular,
} = primitives

const DOT = {
  running: 'done', stopped: 'idle', failed: 'error', missing: 'warning',
  creating: 'ongoing', starting: 'ongoing',
}
const TONE = { running: 'success', failed: 'warning', missing: 'warning' }
const STATE_KEY = {
  running: 'stateRunning', stopped: 'stateStopped', failed: 'stateFailed',
  missing: 'stateMissing', creating: 'stateCreating', starting: 'stateStarting',
}
const CONFIRM = {
  start: ['startConfirmTitle', 'startConfirmBody', 'lifecycleAcknowledge'],
  stop: ['stopConfirmTitle', 'confirmBody', 'lifecycleAcknowledge'],
  restart: ['restartConfirmTitle', 'confirmBody', 'lifecycleAcknowledge'],
  recreate: ['recreateConfirmTitle', 'recreateConfirmBody', 'recreateAcknowledge'],
  remove: ['removeConfirmTitle', 'removeConfirmBody', 'removeAcknowledge'],
}

const STYLE = `
/* Page inset. The shell body has none; the gap is nano space-3. */
.dnls-stack{display:flex;flex-direction:column;gap:var(--nano-space-3);padding:var(--nano-space-3)}
/* Muted line. No host text role; tertiary label, 11px. */
.dnls-muted{margin:0;color:var(--dsw-alias-label-tertiary);font:var(--dsw-font-xxxs-11)}
/* Column under a heading that is not a PanelSection: the history block and the dock. */
.dnls-section{display:flex;flex-direction:column;gap:var(--nano-space-2)}
/* Window control on the left, coverage count on the right. */
.dnls-head{display:flex;align-items:center;justify-content:space-between;gap:var(--nano-space-2);color:var(--dsw-alias-label-secondary)}
/* Host Button has no group, so the row only sets the gap. */
.dnls-actions{display:flex;flex-wrap:wrap;gap:var(--nano-space-2)}
/* The one primary entry under the summary. Host Button sizes to its label. */
.dnls-primary{display:flex}
.dnls-primary>*{flex:1 1 auto}
/* Error line. No host alert paragraph; the color is the error token. */
.dnls-error{margin:0;color:var(--dsw-alias-state-error-primary)}
/* Dialog fields. SettingsForm writes host preferences, not a sandbox revision. */
.dnls-settings,.dnls-field{display:flex;flex-direction:column;gap:var(--nano-space-2)}
.dnls-field{gap:4px;color:var(--dsw-alias-label-secondary)}
/* Box for the exempt history polyline. The path lives in history.jsx. */
.dnls-history{display:block;width:100%;height:48px;color:var(--dsw-alias-label-secondary)}
/* Native select. Host and nano-ui have no Select. 28px matches the tool seat; tokens only. */
.dnls-select{height:28px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:var(--dsh-hairline-width) solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-sm);font:var(--dsw-font-xxs-12)}
`

const stateLabel = (copy, state) => copy[STATE_KEY[state]] ?? copy.stateUnknown
const shownHealth = (copy, value) => (!value || value === 'unknown' ? copy.unknown : value)
const pending = (row) => Number.isInteger(row?.desiredRevision) && row.desiredRevision > 0 && row.desiredRevision !== row.appliedRevision
const profileIdOf = (profile) => (typeof profile === 'string' ? profile : profile?.profileId ?? profile?.id ?? '')
const when = (copy, value) => {
  const ms = typeof value === 'number' ? value : Date.parse(value ?? '')
  if (!Number.isFinite(ms)) return null
  try { return new Intl.DateTimeFormat(copy.localeTag, { dateStyle: 'short', timeStyle: 'short' }).format(ms) } catch { return null }
}
const whole = (text) => {
  if (text === '') return null
  return /^\d+$/.test(text) ? Number(text) : undefined
}
const ratio = (measured, allocated) => (
  typeof measured === 'number' && typeof allocated === 'number' && allocated > 0
    ? Math.max(0, Math.min(100, (measured / allocated) * 100))
    : null
)

function usageLine(row) {
  const cpu = row.resources?.cpus
  const memory = formatBytes(row.resources?.memoryBytes)
  const allocated = `${cpu ?? '—'} · ${memory ?? '—'}`
  if (row.observedState !== 'running' || !row.lastMinute) return allocated
  const usedCpu = typeof row.lastMinute.cpuCores === 'number' ? Number(row.lastMinute.cpuCores).toFixed(2) : '—'
  const usedMemory = formatBytes(row.lastMinute.memoryBytes) ?? '—'
  return `${usedCpu} / ${cpu ?? '—'} · ${usedMemory} / ${memory ?? '—'}`
}

function pointsOf(usage, key, unit, valueKey) {
  if (usage?.[key]?.unit !== unit || !Array.isArray(usage.history)) return []
  return usage.history.flatMap((bin) => (
    typeof bin?.at === 'number' && typeof bin[valueKey] === 'number' && Number.isFinite(bin[valueKey])
      ? [{ at: bin.at, value: bin[valueKey] }]
      : []
  ))
}

function aggregate(usages, key, unit, valueKey) {
  let objects = 0
  let expected = 0
  let valid = 0
  const byAt = new Map()
  for (const usage of usages) {
    const metric = usage?.[key]
    if (!metric || metric.unit !== unit) continue
    objects += 1
    expected += Number(metric.expected) || 0
    valid += Number(metric.valid) || 0
    for (const point of pointsOf(usage, key, unit, valueKey)) {
      const slot = byAt.get(point.at) ?? { at: point.at, sum: 0, n: 0 }
      slot.sum += point.value
      slot.n += 1
      byAt.set(point.at, slot)
    }
  }
  return {
    objects, expected, valid,
    points: [...byAt.values()].sort((a, b) => a.at - b.at).map((slot) => ({ at: slot.at, value: slot.sum / slot.n })),
  }
}

function Track({ label, measured, allocated, text }) {
  return h(Meter, { label, text, value: ratio(measured, allocated) })
}

function DnlsPane({ sessionId, copy, host }) {
  const [phase, setPhase] = React.useState('loading')
  const [error, setError] = React.useState(null)
  const [rows, setRows] = React.useState(null)
  const [total, setTotal] = React.useState(null)
  const [complete, setComplete] = React.useState(true)
  const [boot, setBoot] = React.useState(0)
  const [navOpen, setNavOpen] = React.useState(false)
  const [selection, setSelection] = React.useState(null)
  const [detail, setDetail] = React.useState(null)
  const [usageWindow, setUsageWindow] = React.useState('24h')
  const [fleet, setFleet] = React.useState(null)
  const [procs, setProcs] = React.useState(null)
  const [openAudit, setOpenAudit] = React.useState(null)
  const [probeId, setProbeId] = React.useState(null)
  const [confirm, setConfirm] = React.useState(null)
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [profiles, setProfiles] = React.useState(null)
  const [createName, setCreateName] = React.useState('')
  const [createProfile, setCreateProfile] = React.useState('')
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [cfgCpus, setCfgCpus] = React.useState('')
  const [cfgMem, setCfgMem] = React.useState('')
  const [idleMin, setIdleMin] = React.useState('')
  const [settingsMsg, setSettingsMsg] = React.useState(null)
  const [dock, setDock] = React.useState(0)
  const [terms, setTerms] = React.useState(null)
  const [termBusy, setTermBusy] = React.useState(false)
  const [focused, setFocused] = React.useState(null)
  const rootRef = React.useRef(null)
  const clientRef = React.useRef(null)
  const tickets = React.useRef({})
  const writeLock = React.useRef(false)
  const paneId = React.useId()
  const closeDrawer = React.useCallback(() => setNavOpen(false), [])

  const take = (key) => {
    if (!tickets.current[key]) tickets.current[key] = createTicket()
    return tickets.current[key].take()
  }
  const api = () => clientRef.current
  const supports = (id) => api()?.supports(id) === true

  React.useEffect(() => () => {
    for (const ticket of Object.values(tickets.current)) ticket.kill()
  }, [])

  const loadList = React.useCallback(async () => {
    const ok = take('list')
    try {
      const client = api() ?? createDnlsClient()
      clientRef.current = client
      if (!client.capabilities()) await client.discover()
      const list = await client.listSandboxes()
      if (!ok()) return
      setRows(list.rows)
      setTotal(list.total)
      setComplete(list.complete !== false)
      setError(null)
      setPhase('ready')
    } catch (caught) {
      if (!ok()) return
      setError(caught)
      setPhase((prev) => (prev === 'ready' ? 'ready' : 'failed'))
    }
  }, [])

  React.useEffect(() => {
    if (!sessionId) return undefined
    loadList()
  }, [sessionId, boot, loadList])

  React.useEffect(() => {
    if (!sessionId || !rows || selection) return undefined
    const ok = take('fleet')
    ;(async () => {
      const usages = []
      const audits = []
      for (const row of rows) {
        if (!ok()) return
        try {
          const body = await api().inspect(row.sandboxId, { window: usageWindow })
          if (!ok()) return
          if (body?.usage) usages.push(body.usage)
          const ops = Array.isArray(body?.operations) ? body.operations : []
          for (const op of ops) audits.push({ name: row.name ?? row.sandboxId, ...op })
          if (ops.length === 0 && row.operation) audits.push({ name: row.name ?? row.sandboxId, ...row.operation })
        } catch (caught) {
          if (caught?.status !== 403 && ok()) setError(caught)
        }
      }
      if (ok()) setFleet({ usages, audits })
    })()
  }, [sessionId, rows, selection, usageWindow])

  React.useEffect(() => {
    if (!sessionId || !selection) return undefined
    const ok = take('detail')
    const sandboxId = selection.sandboxId
    ;(async () => {
      try {
        const body = await api().inspect(sandboxId, { window: usageWindow })
        if (ok()) setDetail(body)
      } catch (caught) {
        if (!ok()) return
        setDetail(null)
        setError(caught)
      }
    })()
  }, [sessionId, selection, usageWindow, boot])

  React.useEffect(() => {
    setFocused(null)
    setTerms(null)
    setProcs(null)
    setDetail(null)
  }, [selection?.sandboxId])

  React.useEffect(() => {
    if (!selection || dock <= 0) return undefined
    const ok = take('terms')
    const sandboxId = selection.sandboxId
    ;(async () => {
      try {
        if (!api().supports('term.session.list')) {
          if (ok()) setTerms({ denied: true })
          return
        }
        const out = await api().terminalList(sandboxId)
        if (ok()) setTerms({ list: out.terminals })
      } catch (caught) {
        if (!ok()) return
        setTerms(caught?.status === 403 ? { denied: true } : { error: caught.message })
      }
    })()
  }, [selection, dock > 0])

  React.useEffect(() => {
    const row = (rows ?? []).find((item) => item.sandboxId === selection?.sandboxId)
    const state = detail?.observedState ?? row?.observedState
    if (!selection || state !== 'running' || !supports('sandbox.processes')) return undefined
    const ok = take('procs')
    const sandboxId = selection.sandboxId
    ;(async () => {
      try {
        const body = await api().processes(sandboxId, { limit: 200 })
        if (ok()) setProcs({ list: body.processes ?? [], truncated: body.truncated === true })
      } catch (caught) {
        if (ok()) setProcs({ error: caught.message })
      }
    })()
  }, [selection, rows, detail])

  if (!sessionId) return null

  const visible = rows ?? []
  const running = visible.filter((row) => row.observedState === 'running').length
  const stopped = visible.filter((row) => row.observedState === 'stopped').length
  const current = selection ? visible.find((row) => row.sandboxId === selection.sandboxId) ?? selection : null
  const observed = detail?.observedState ?? current?.observedState

  function choose(row) {
    setSelection({ sandboxId: row.sandboxId, envId: row.envId, name: row.name })
    setNavOpen(false)
    setError(null)
  }

  function unchoose() {
    setSelection(null)
    setDetail(null)
    setSettingsOpen(false)
    setError(null)
  }

  async function submit(action, { sandboxId, name, profileId, args } = {}) {
    if (writeLock.current) return
    writeLock.current = true
    setBusy(true)
    try {
      await api().lifecycle({ action, sandboxId, name, profileId, requestId: crypto.randomUUID(), args })
      setConfirm(null)
      setAcknowledged(false)
      setCreateOpen(false)
      await loadList()
      if (sandboxId) setBoot((value) => value + 1)
    } catch (caught) {
      setError(caught)
    } finally {
      writeLock.current = false
      setBusy(false)
    }
  }

  function ask(kind) {
    setAcknowledged(false)
    setConfirm({ kind })
  }

  async function openCreate() {
    setCreateOpen(true)
    setProfiles(null)
    try {
      const listed = supports('sandbox.profile.list') ? await api().listProfiles() : []
      setProfiles(listed)
      setCreateProfile(profileIdOf(listed[0]) || '')
    } catch (caught) {
      setProfiles([])
      setError(caught)
    }
  }

  function openSettings() {
    const cfg = detail?.configuration
    setCfgCpus(cfg?.overrides?.cpus == null ? '' : String(cfg.overrides.cpus))
    setCfgMem(cfg?.overrides?.memoryBytes == null ? '' : String(Math.round(cfg.overrides.memoryBytes / (1024 * 1024))))
    setIdleMin(cfg?.idleTimeoutMs == null ? '' : String(Math.round(cfg.idleTimeoutMs / 60000)))
    setSettingsMsg(null)
    setSettingsOpen(true)
  }

  async function saveSettings() {
    const cpus = whole(cfgCpus)
    const mem = whole(cfgMem)
    const idle = whole(idleMin)
    if (cpus === undefined || mem === undefined || idle === undefined) {
      setSettingsMsg(copy.draftInvalid)
      return
    }
    const overrides = {}
    if (cpus !== null) overrides.cpus = cpus
    if (mem !== null) overrides.memoryBytes = mem * 1024 * 1024
    if (Object.keys(overrides).length === 0 && idle === null) {
      setSettingsMsg(copy.saveNoChange)
      return
    }
    if (writeLock.current) return
    writeLock.current = true
    setBusy(true)
    try {
      if (Object.keys(overrides).length > 0) {
        await api().saveRevision(selection.sandboxId, { expectedRevision: detail?.desiredRevision ?? 0, overrides })
      }
      if (idle !== null) await api().configureIdle(selection.sandboxId, idle * 60000)
      setSettingsMsg(Object.keys(overrides).length > 0 ? copy.notYetApplied : copy.idleSaved)
      setBoot((value) => value + 1)
    } catch (caught) {
      setSettingsMsg(caught.message)
    } finally {
      writeLock.current = false
      setBusy(false)
    }
  }

  function openDesign() {
    if (host.kitesurf() !== true) { setError(new Error(copy.workspaceMissing)); return }
    host.openKitesurf()
  }

  function openTerm(term) {
    let address
    try {
      address = terminalAddress({ envId: selection.envId, sandboxId: selection.sandboxId, terminalId: term.terminalId })
    } catch {
      setError(new Error(copy.terminalUnavailable))
      return
    }
    if (host.openTerminal(address) !== true) setError(new Error(copy.terminalUnavailable))
    else setFocused(term.terminalId)
  }

  async function createTerm() {
    if (termBusy || !selection) return
    setTermBusy(true)
    try {
      const out = await api().terminalCreate(selection.sandboxId, { paneId, openId: crypto.randomUUID() })
      const listed = await api().terminalList(selection.sandboxId)
      setTerms({ list: listed.terminals })
      openTerm(listed.terminals.find((item) => item.terminalId === out.terminalId) ?? out)
    } catch (caught) {
      if (caught?.status === 403) setTerms({ denied: true })
      else setError(caught)
    } finally {
      setTermBusy(false)
    }
  }

  async function commitDock(px) {
    const node = rootRef.current
    if (!selection || !focused || !node || !supports('term.session.resize')) return
    const cols = Math.min(512, Math.max(2, Math.floor((node.clientWidth - 16) / 8)))
    const rows = Math.min(512, Math.max(2, Math.floor((px - 28) / 16)))
    try { await api().terminalResize(selection.sandboxId, focused, cols, rows) } catch { /* the sheet stays; nothing is spawned */ }
  }

  async function probe(serviceId) {
    setProbeId(serviceId)
    try {
      const body = await api().inspect(selection.sandboxId, { window: usageWindow })
      setDetail(body)
    } catch (caught) {
      setError(caught)
    } finally {
      setProbeId(null)
    }
  }

  const windows = h(SegmentedControl, {
    label: copy.usageStates,
    value: usageWindow,
    onChange: setUsageWindow,
    options: [
      { value: '24h', label: copy.window24 },
      { value: '7d', label: copy.window7 },
      { value: '30d', label: copy.window30 },
    ],
  })

  function rowMenu(event, row) {
    event.stopPropagation()
    const rect = event.currentTarget.getBoundingClientRect()
    openNanoMenu({
      anchor: rect,
      width: 220,
      items: [
        { id: 'open', label: row.name ?? row.sandboxId, run: () => choose(row) },
        { id: 'start', label: copy.start, disabled: busy || !supports('sandbox.instance.start'), run: () => { choose(row); ask('start') } },
        { id: 'stop', label: copy.stop, disabled: busy || !supports('sandbox.instance.stop'), run: () => { choose(row); ask('stop') } },
        { id: 'restart', label: copy.restart, disabled: busy || !supports('sandbox.instance.restart'), run: () => { choose(row); ask('restart') } },
        { id: 'break', separator: true },
        { id: 'design', label: copy.openWorkspace, run: () => { choose(row); openDesign() } },
        { id: 'danger', separator: true },
        { id: 'remove', label: copy.remove, tone: 'danger', disabled: busy || !supports('sandbox.instance.remove'), run: () => { choose(row); ask('remove') } },
      ],
    })
  }

  function reading(row) {
    return h(SplitRow, {
      key: row.sandboxId,
      label: h(Button, { variant: 'ghost', size: 'sm', onClick: () => choose(row) },
        h(StateDot, { state: DOT[row.observedState] ?? 'idle' }),
        ` ${row.name ?? row.sandboxId}`,
        h('span', { className: 'dnls-muted' }, ` ${stateLabel(copy, row.observedState)}`)),
    }, h(React.Fragment, null,
      h('span', { className: 'dnls-muted' }, usageLine(row)),
      h(Button, {
        variant: 'ghost', size: 'sm', 'aria-label': copy.control,
        onClick: (event) => rowMenu(event, row),
      }, '…')))
  }

  function historyBlock(usages, total) {
    const cpu = aggregate(usages, 'cpu', 'core', 'cpuCores')
    const memory = aggregate(usages, 'memory', 'bytes', 'memoryBytes')
    return h('div', { className: 'dnls-section' },
      h('div', { className: 'dnls-head' }, windows,
        h('span', { className: 'dnls-muted' }, fill(copy.objectsData, { shown: cpu.objects, total }))),
      h(HistoryLine, { points: cpu.points }),
      h('p', { className: 'dnls-muted' },
        `${copy.usageCpu} ${fill(copy.coverageLine, { valid: cpu.valid, expected: cpu.expected })}`),
      h('p', { className: 'dnls-muted' },
        `${copy.usageMemory} ${fill(copy.coverageLine, { valid: memory.valid, expected: memory.expected })}`))
  }

  function overview() {
    if (phase === 'loading' && !rows) return h(EmptyState, { title: copy.loading })
    if (phase === 'failed' && !rows) {
      return h(EmptyState, {
        title: copy.failed,
        description: error?.message,
        action: h(Button, { variant: 'ghost', onClick: () => setBoot((value) => value + 1) }, copy.retry),
      })
    }
    if (visible.length === 0) {
      return h(EmptyState, {
        title: copy.emptyTitle,
        description: copy.emptyHint,
        action: h(Button, { variant: 'primary', onClick: openCreate }, copy.create),
      })
    }
    const audits = fleet?.audits ?? []
    return h('div', { className: 'dnls-stack', 'data-dnls-view': 'overview' },
      error ? h('p', { className: 'dnls-error', role: 'alert' }, error.message) : null,
      !complete ? h(Tag, { tone: 'warning' }, copy.listPartial) : null,
      h(Card, null, h(FactGrid, { items: [
        { label: copy.stateRunning, value: String(running) },
        { label: copy.stateStopped, value: String(stopped) },
        { label: copy.typeLabel, value: String(visible.length) },
      ] })),
      h(PanelSection, { title: copy.typeLabel },
        h(SplitRow, { label: fill(copy.listShort, { shown: visible.length, total: total ?? visible.length }) },
          h(Button, { variant: 'primary', size: 'sm', onClick: openCreate }, copy.create)),
        visible.map(reading)),
      h(PanelSection, { title: copy.usageStates }, historyBlock(fleet?.usages ?? [], visible.length)),
      h(PanelSection, { title: copy.timeline },
        audits.length === 0 ? h('p', { className: 'dnls-muted' }, copy.auditEmpty) : audits.map((op, index) => {
          const key = `${op.name}:${op.action ?? op.step ?? index}:${op.at ?? index}`
          const open = openAudit === key
          return h(DisclosureRow, {
            key,
            title: [op.name, op.action, op.state].filter(Boolean).join(' · '),
            open,
            expandable: true,
            expandOnRowClick: true,
            onToggle: () => setOpenAudit(open ? null : key),
          }, open ? h('p', { className: 'dnls-muted' },
            [op.step, when(copy, op.at), when(copy, op.finishedAt), op.operationId].filter(Boolean).join(' · ') || copy.none) : null)
        })))
  }

  function services(list) {
    return (list ?? []).map((service) => {
      const head = `${service.serviceId}:${service.containerPort ?? ''}${service.protocol ? ` ${service.protocol}` : ''}`
      const addr = serviceAddress(service)
      const where = typeof service.guestCwd === 'string' && service.guestCwd !== '/' ? service.guestCwd : null
      const role = typeof service.role === 'string' && service.role !== '' && service.role !== service.serviceId ? service.role : null
      return h(SplitRow, {
        key: service.serviceId,
        label: [head, addr ? `→ ${addr}` : null].filter(Boolean).join(' '),
      }, h('span', { className: 'dnls-actions' },
      role || where ? h('span', { className: 'dnls-muted' }, [role, where].filter(Boolean).join(' · ')) : null,
      h(Tag, { tone: service.health === 'healthy' ? 'success' : 'neutral' }, shownHealth(copy, service.health)),
      h(Button, {
        variant: 'ghost', size: 'sm', disabled: probeId === service.serviceId,
        onClick: () => probe(service.serviceId),
      }, copy.serviceHealth)))
    })
  }

  function sandboxPage() {
    const minute = observed === 'running' ? detail?.lastMinute ?? current?.lastMinute : null
    const usage = detail?.usage
    const cpuText = minute
      ? `${typeof minute.cpuCores === 'number' ? Number(minute.cpuCores).toFixed(2) : '—'} / ${(detail ?? current)?.resources?.cpus ?? '—'}`
      : copy.samplingStopped
    const memoryText = minute
      ? `${formatBytes(minute.memoryBytes) ?? '—'} / ${formatBytes((detail ?? current)?.resources?.memoryBytes) ?? '—'}`
      : copy.samplingStopped
    return h('div', { className: 'dnls-stack', 'data-dnls-view': 'sandbox' },
      error ? h('p', { className: 'dnls-error', role: 'alert' }, error.message) : null,
      h(Card, null,
        h(FactGrid, { items: [
          { label: copy.fieldState, value: stateLabel(copy, observed) },
          { label: copy.health, value: shownHealth(copy, (detail ?? current)?.health) },
          { label: copy.usageCpu, value: cpuText },
          { label: copy.usageMemory, value: memoryText },
          { label: copy.fieldRevision, value: pending(detail ?? current) ? copy.notYetApplied : String((detail ?? current)?.appliedRevision ?? copy.none) },
        ] })),
      h('div', { className: 'dnls-primary' },
        h(Button, { variant: 'primary', onClick: openDesign }, copy.openWorkspace)),
      h(PanelSection, { title: copy.control },
        h('div', { className: 'dnls-actions' },
          h(Button, { variant: 'ghost', size: 'sm', disabled: busy || !supports('sandbox.instance.start'), onClick: () => ask('start') }, copy.start),
          h(Button, { variant: 'ghost', size: 'sm', disabled: busy || !supports('sandbox.instance.stop'), onClick: () => ask('stop') }, copy.stop),
          h(Button, { variant: 'ghost', size: 'sm', disabled: busy || !supports('sandbox.instance.restart'), onClick: () => ask('restart') }, copy.restart),
          h(Button, { variant: 'ghost', size: 'sm', disabled: busy || !supports('sandbox.instance.recreate'), onClick: () => ask('recreate') }, copy.recreate))),
      h(PanelSection, { title: copy.resources },
        h(Track, {
          label: copy.usageCpu,
          measured: minute?.cpuCores,
          allocated: (detail ?? current)?.resources?.cpus,
          text: cpuText,
        }),
        h(Track, {
          label: copy.usageMemory,
          measured: minute?.memoryBytes,
          allocated: (detail ?? current)?.resources?.memoryBytes,
          text: memoryText,
        }),
        detail == null
          ? h('p', { className: 'dnls-muted' }, copy.loading)
          : usage ? historyBlock([usage], 1) : h('p', { className: 'dnls-muted' }, copy.usageNotAuthorized)),
      h(PanelSection, { title: copy.guestProcesses },
        observed !== 'running' ? h('p', { className: 'dnls-muted' }, copy.samplingStopped)
        : procs == null ? h('p', { className: 'dnls-muted' }, copy.loading)
        : procs.error ? h('p', { className: 'dnls-error', role: 'alert' }, procs.error)
        : (procs.list ?? []).length === 0 ? h('p', { className: 'dnls-muted' }, copy.processesEmpty)
          : [
            h(PlainTable, { key: 'procs', columns: [copy.procPid, copy.procPpid, copy.procName, copy.procState, copy.procRss] },
              procs.list.map((proc) => h('tr', { key: proc.pid },
                h('td', null, String(proc.pid)),
                h('td', null, String(proc.ppid ?? '')),
                h('td', null, proc.name),
                h('td', null, proc.state),
                h('td', null, formatBytes(proc.rssBytes) ?? copy.none)))),
            procs.truncated ? h('p', { key: 'trunc', className: 'dnls-muted' }, copy.procsTruncated) : null,
          ]),
      h(PanelSection, { title: copy.fieldServices }, services(detail?.services)),
      h(PanelSection, { title: copy.deployment },
        detail == null ? h('p', { className: 'dnls-muted' }, copy.loading) : [
          h(SplitRow, { key: 'digest', label: copy.appliedDigest },
            typeof detail.applied?.imageDigest === 'string' && detail.applied.imageDigest !== ''
              ? detail.applied.imageDigest.slice(0, 18) : copy.none),
          h(SplitRow, { key: 'verified', label: copy.appliedVerified }, when(copy, detail.applied?.verifiedAt) ?? copy.none),
          h(SplitRow, { key: 'seen', label: copy.observedAt }, when(copy, detail.observedAt) ?? copy.none),
        ]),
      h(PanelSection, { title: copy.storage },
        detail == null ? h('p', { className: 'dnls-muted' }, copy.loading)
        : !Array.isArray(detail.mounts) || detail.mounts.length === 0
          ? h('p', { className: 'dnls-muted' }, copy.none)
          : detail.mounts.map((mount, index) => h(SplitRow, {
            key: `${mount.target ?? 'mount'}:${index}`,
            label: mount.target ?? copy.none,
          }, [mount.type, mount.readOnly ? copy.readOnly : null].filter(Boolean).join(' · ') || copy.none))),
      detail == null || Array.isArray(detail.operations) ? h(PanelSection, { title: copy.timeline },
        detail == null ? h('p', { className: 'dnls-muted' }, copy.loading)
        : detail.operations.length === 0 ? h('p', { className: 'dnls-muted' }, copy.auditEmpty)
        : [...detail.operations].reverse().map((op, index) => h(SplitRow, {
          key: `${op.action ?? 'op'}:${op.at ?? index}`,
          label: [op.action, op.state].filter(Boolean).join(' · ') || copy.none,
        }, when(copy, op.finishedAt ?? op.at) ?? copy.none))) : null,
      h(PanelSection, { title: copy.config },
        detail?.configuration ? [
          h(SplitRow, { key: 'cpus', label: copy.configCpus }, String(detail.configuration.overrides?.cpus ?? copy.none)),
          h(SplitRow, { key: 'mem', label: copy.configMemory }, formatBytes(detail.configuration.overrides?.memoryBytes) ?? copy.none),
          h(SplitRow, { key: 'idle', label: copy.idle }, detail.configuration.idleTimeoutMs == null ? copy.none : `${Math.round(detail.configuration.idleTimeoutMs / 60000)}`),
          h(Button, { key: 'edit', variant: 'ghost', size: 'sm', onClick: openSettings }, copy.tabSettings),
        ] : h('p', { className: 'dnls-muted' }, copy.configNotAuthorized)),
      h(PanelSection, { title: copy.danger },
        h(Button, { variant: 'ghost', size: 'sm', disabled: busy || !supports('sandbox.instance.remove'), onClick: () => ask('remove') }, copy.remove)))
  }

  const title = selection ? (detail?.name ?? current?.name ?? selection.name ?? selection.sandboxId) : copy.typeLabel
  const statusText = selection
    ? [title, stateLabel(copy, observed), current?.lastMinute
      ? `${typeof current.lastMinute.cpuCores === 'number' ? Number(current.lastMinute.cpuCores).toFixed(2) : '—'} · ${formatBytes(current.lastMinute.memoryBytes) ?? '—'}`
      : null].filter(Boolean).join(' · ')
    : `${fill(copy.statusRun, { running, stopped })} · ${fill(copy.listShort, { shown: visible.length, total: total ?? visible.length })}`

  const drawer = h(TabDrawer, { open: navOpen, label: copy.typeLabel, onClose: closeDrawer },
    h(DrawerHead, null, copy.overview),
    h(DrawerRow, { current: !selection, onClick: unchoose, label: copy.overview }),
    visible.map((row) => h(DrawerRow, {
      key: row.sandboxId,
      current: selection?.sandboxId === row.sandboxId,
      onClick: () => choose(row),
      mark: h(StateDot, { state: DOT[row.observedState] ?? 'idle' }),
      label: row.name ?? row.sandboxId,
      meta: [stateLabel(copy, row.observedState), pending(row) ? copy.notYetApplied : null, usageLine(row)].filter(Boolean).join(' · '),
    })))

  const termList = terms?.list ?? []
  const dockBody = !selection
    ? h('p', { className: 'dnls-muted' }, copy.dockNeed)
    : terms?.denied
      ? h('p', { className: 'dnls-muted' }, copy.terminalsDenied)
      : h('div', { className: 'dnls-section' },
        h('p', { className: 'dnls-muted' }, copy.dockHint),
        terms?.error ? h('p', { className: 'dnls-error', role: 'alert' }, terms.error) : null,
        termList.length === 0 ? h('p', { className: 'dnls-muted' }, copy.terminalsEmpty) : termList.map((term) => h('div', { key: term.terminalId, className: 'dnls-actions' },
          h('span', { className: 'dnls-muted' }, `${term.terminalId.slice(0, 8)} ${term.state ?? ''}`),
          h(Button, { variant: 'ghost', size: 'sm', onClick: () => openTerm(term) }, copy.terminalOpen))),
        supports('term.session.create') && !terms?.denied
          ? h(Button, { variant: 'ghost', size: 'sm', disabled: termBusy, onClick: createTerm }, copy.terminalCreate)
          : null)

  const confirmCopy = confirm ? CONFIRM[confirm.kind] : null
  const risk = confirmCopy ? h(RiskConfirmation, {
    open: true,
    title: copy[confirmCopy[0]],
    description: fill(copy[confirmCopy[1]], { action: copy[confirm.kind], name: title }),
    acknowledgeLabel: copy[confirmCopy[2]],
    acknowledged,
    onAcknowledgedChange: setAcknowledged,
    confirmLabel: copy[confirm.kind] ?? copy.confirm,
    cancelLabel: copy.cancel,
    closeLabel: copy.close,
    disabled: busy,
    onCancel: () => { setConfirm(null); setAcknowledged(false) },
    onConfirm: () => {
      const args = confirm.kind === 'recreate'
        ? { expectedRevision: detail?.desiredRevision ?? 0, preserveVolume: true, interruptTerminals: true }
        : undefined
      submit(confirm.kind, { sandboxId: selection.sandboxId, args })
    },
  }) : null

  const createDialog = createOpen ? h(NanoDialog, {
    copy,
    title: copy.createTitle,
    confirmLabel: busy ? copy.creating : copy.createSubmit,
    confirmDisabled: busy || createName.trim() === '' || createProfile === '',
    busy,
    onCancel: () => setCreateOpen(false),
    onConfirm: () => submit('create', { name: createName.trim(), profileId: createProfile }),
  }, h('div', { className: 'dnls-settings' },
    h('label', { className: 'dnls-field' }, copy.createName,
      h(Input, { value: createName, 'aria-label': copy.createName, onChange: (event) => setCreateName(event.target.value) })),
    h('label', { className: 'dnls-field' }, copy.createProfile,
      h('select', {
        className: 'dnls-select',
        'aria-label': copy.createProfile,
        value: createProfile,
        onChange: (event) => setCreateProfile(event.target.value),
      }, (profiles ?? []).map((profile) => {
        const id = profileIdOf(profile)
        return h('option', { key: id, value: id }, profile?.name ?? id)
      }))),
    profiles && profiles.length === 0 ? h('p', { className: 'dnls-muted' }, copy.noProfiles) : null)) : null

  const settings = settingsOpen ? h(NanoDialog, {
    copy,
    title: copy.tabSettings,
    width: 480,
    onCancel: () => setSettingsOpen(false),
    footer: h(Button, { variant: 'outline', onClick: () => setSettingsOpen(false) }, copy.close),
  }, detail?.configuration ? h('div', { className: 'dnls-settings' },
    h('p', { className: 'dnls-muted' }, copy.saveNoChange),
    h('label', { className: 'dnls-field' }, copy.configCpus,
      h(Input, { value: cfgCpus, 'aria-label': copy.configCpus, onChange: (event) => setCfgCpus(event.target.value) })),
    h('label', { className: 'dnls-field' }, copy.configMemory,
      h(Input, { value: cfgMem, 'aria-label': copy.configMemory, onChange: (event) => setCfgMem(event.target.value) })),
    h('label', { className: 'dnls-field' }, copy.idleMinutes,
      h(Input, { value: idleMin, 'aria-label': copy.idleMinutes, onChange: (event) => setIdleMin(event.target.value) })),
    settingsMsg ? h('p', { className: 'dnls-muted' }, settingsMsg) : null,
    h(Button, { variant: 'primary', disabled: busy, onClick: saveSettings }, copy.configSave),
    h('div', { className: 'dnls-actions' },
      h(Button, { variant: 'ghost', size: 'sm', disabled: busy || !supports('sandbox.instance.recreate'), onClick: () => { setSettingsOpen(false); ask('recreate') } }, copy.recreate),
      h(Button, { variant: 'ghost', size: 'sm', disabled: busy || !supports('sandbox.instance.remove'), onClick: () => { setSettingsOpen(false); ask('remove') } }, copy.remove)))
    : h('p', { className: 'dnls-muted' }, copy.configNotAuthorized)) : null

  return h(React.Fragment, null,
    h('style', null, NANO_STYLES, STYLE),
    h(WorkbenchShell, {
      'data-dnls-pane': '1',
      label: copy.workbenchTitle,
      shellRef: rootRef,
      bar: [
        h(ShellToggle, {
          key: 'nav',
          icon: h(IconPanelLeftOutlineRegular, { size: 16 }),
          label: selection ? title : copy.typeLabel,
          pressed: navOpen,
          onClick: () => setNavOpen((open) => !open),
        }),
        selection ? h(ShellIcon, {
          key: 'back',
          icon: h(IconChevronLeftOutlineRegular, { size: 16 }),
          label: copy.back,
          onClick: unchoose,
        }) : null,
        h(ShellGap, { key: 'gap' }),
        h(ShellTail, { key: 'tail' },
          h(ShellIcon, {
            icon: h(IconRefreshOutlineRegular, { size: 16 }),
            label: copy.refresh,
            disabled: phase === 'loading' || busy,
            onClick: () => setBoot((value) => value + 1),
          }),
          selection
            ? h(ShellIcon, {
              icon: h(IconSettingsOutlineRegular, { size: 16 }),
              label: copy.tabSettings,
              disabled: !detail || busy,
              onClick: openSettings,
            })
            : h(ShellIcon, {
              icon: h(IconPlusOutlineRegular, { size: 16 }),
              label: copy.create,
              disabled: busy || !supports('sandbox.instance.create'),
              onClick: openCreate,
            }),
          selection ? h(ShellIcon, {
            icon: h(IconPanelLeftOutlineRegular, { size: 16 }),
            label: copy.openWorkspace,
            onClick: openDesign,
          }) : null),
      ],
      drawer,
      dock: h(StatusDock, {
        label: copy.dockLabel,
        text: statusText,
        height: dock,
        onHeight: setDock,
        onCommit: commitDock,
        actions: [{
          id: 'terminal',
          label: copy.dockLabel,
          pressed: dock > 0,
          disabled: !selection,
          onClick: () => setDock((height) => (height > 0 ? 0 : 160)),
        }],
      }, dockBody),
    }, selection ? sandboxPage() : overview()),
    createDialog,
    settings,
    risk)
}

export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale']

export function apply(ctx) {
  const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith('zh') === true
  const copy = () => copyFor(zh() ? 'zh' : 'en')
  const host = {
    kitesurf: () => ctx.sidebarRightTabs?.get?.('kitesurf') !== undefined,
    openKitesurf: () => ctx.sidebarRight?.openTab?.('kitesurf'),
    openTerminal: (address) => {
      const candidates = ctx.sidebarRightTabs?.candidates?.(address) ?? []
      if (candidates[0]?.kind !== 'dnt-sandbox-terminal' || typeof ctx.sidebarRight?.openResource !== 'function') return false
      ctx.sidebarRight.openResource(address)
      return true
    },
  }
  const Pane = (props) => h(DnlsPane, { sessionId: props.sessionId, copy: copy(), host })
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: KIND,
    kind: KIND,
    priority: 'extension',
    keepMounted: true,
    multiple: false,
    title: () => copy().typeLabel,
    guide: [{
      id: KIND,
      order: 45,
      title: () => copy().typeLabel,
      description: () => copy().typeDescription,
    }],
  }))
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: KIND,
  }, Pane)))
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab.title',
    key: KIND,
  }, function DnlsTitle() { return copy().typeLabel })))
}
