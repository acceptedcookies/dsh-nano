/**
 * DNLS sandbox dashboard: one right-sidebar session tab — an object list
 * with explicit pick, then a three-strip detail (Overview / Services /
 * Settings). Session is only host UI context: a real props.sessionId gates
 * render and is never sent as a selector or credential.
 *
 * Concurrency model: each read channel (list/detail/process/profiles/
 * operation/engine/term/settings) owns an independent staleness ticket
 * scoped to the current target and mount — a refresh or probe read can
 * never invalidate an in-flight write or its durable receipt. Writes are
 * single-flight under a synchronous lock; every read ticket is invalidated
 * on target change while the receipt itself survives reads.
 */

const React = require('react')
const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
const { Toolbar, EmptyState, NanoTabs, NanoDialog, NANO_STYLES, PanelLayout, PanelSection, FactGrid } = require('dsh-nano-ui')
const { createDnlsClient, createTicket } = require('./managed.js')
const { copyFor, fill } = require('./i18n.js')
const { formatBytes, serviceAddress } = require('./format.js')
const { terminalAddress } = require('../host/terminal-resource.js')
const { DeviceFace, MetricChart, CardBody } = require('./instruments.jsx')
const h = React.createElement

const KIND = 'dnls-sandbox'
const Button = primitives.Button
const RiskConfirmation = primitives.RiskConfirmation
const DisclosureRow = primitives.DisclosureRow
const InfoIcon = primitives.IconInfoOutlineRegular

const STATE_KEYS = {
  running: 'stateRunning',
  stopped: 'stateStopped',
  failed: 'stateFailed',
  missing: 'stateMissing',
  creating: 'stateCreating',
  starting: 'stateStarting',
}

const stateLabel = (copy, state) => copy[STATE_KEYS[state]] ?? copy.stateUnknown

function DnlsPane({ sessionId, copy, host }) {
  const [view, setView] = React.useState('overview')
  const [phase, setPhase] = React.useState('loading') // loading | ready | failed
  const [error, setError] = React.useState(null)
  const [rows, setRows] = React.useState(null)
  const [total, setTotal] = React.useState(null)
  const [complete, setComplete] = React.useState(true)
  const [envIds, setEnvIds] = React.useState(null)
  const [search, setSearch] = React.useState('')
  const [selection, setSelection] = React.useState(null)
  const [detail, setDetail] = React.useState(null)
  const [detailError, setDetailError] = React.useState(null)
  const [usageWindow, setUsageWindow] = React.useState('24h')
  const [usageDenied, setUsageDenied] = React.useState(false)
  const [procs, setProcs] = React.useState(null)
  const [procsBusy, setProcsBusy] = React.useState(false)
  const [confirm, setConfirm] = React.useState(null) // {kind, terminalId?}
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [receipt, setReceipt] = React.useState(null)
  const [opBody, setOpBody] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [profiles, setProfiles] = React.useState(null)
  const [profilesFailed, setProfilesFailed] = React.useState(false)
  const [createName, setCreateName] = React.useState('')
  const [createProfile, setCreateProfile] = React.useState('')
  const [engine, setEngine] = React.useState(null)
  const [hold, setHold] = React.useState(null)
  const [terms, setTerms] = React.useState(null) // {list}|{denied}|{error}
  const [termBusy, setTermBusy] = React.useState(false)
  const [detailsOpen, setDetailsOpen] = React.useState(false)
  const [olderOpsOpen, setOlderOpsOpen] = React.useState(false)
  const [svcOpen, setSvcOpen] = React.useState(null)
  const fmtTime = (iso) => {
    const ms = typeof iso === 'number' ? iso : Date.parse(iso ?? '')
    if (!Number.isFinite(ms)) return '—'
    try { return new Intl.DateTimeFormat(copy.localeTag ?? 'en', { dateStyle: 'short', timeStyle: 'short' }).format(ms) } catch { return iso }
  }
  const [cfgCpus, setCfgCpus] = React.useState('')
  const [cfgMem, setCfgMem] = React.useState('')
  const [idleMin, setIdleMin] = React.useState('')
  const [settingsMsg, setSettingsMsg] = React.useState(null)
  const [bootSeq, setBootSeq] = React.useState(0)
  const [profileCaps, setProfileCaps] = React.useState(new Map())
  const [logs, setLogs] = React.useState(null)
  const [logsBusy, setLogsBusy] = React.useState(false)

  /* Independent read channels; a late answer can only be discarded by the
   * guard of its own channel, never by another channel's newer take. */
  const channels = React.useRef({})
  const clientRef = React.useRef(null)
  const writeLock = React.useRef(false)
  const nameId = React.useId()
  const paneId = React.useId()

  const ticket = (key) => {
    const map = channels.current
    if (!map[key]) map[key] = createTicket()
    return map[key].take()
  }
  const invalidate = (...keys) => {
    for (const key of keys) channels.current[key]?.take()
  }
  const killAll = () => {
    for (const channel of Object.values(channels.current)) channel.kill()
    channels.current = {}
  }

  const client = () => clientRef.current
  const supports = (cap) => client()?.supports?.(cap) === true

  const run = React.useCallback(async (work, stale) => {
    try {
      await work()
    } catch (cause) {
      if (!stale || stale()) setError(cause)
    }
  }, [])

  const loadList = React.useCallback(() => {
    const stale = ticket('list')
    setError(null)
    run(async () => {
      const list = await client().listSandboxes()
      if (!stale()) return
      setRows(list.rows)
      setTotal(list.total)
      setComplete(list.complete !== false)
      setEnvIds((list.envs ?? []).map((e) => (typeof e === 'string' ? e : e?.envId)).filter(Boolean))
    }, stale)
  }, [run])

  React.useEffect(() => {
    if (!sessionId) return undefined
    channels.current = {}
    writeLock.current = false
    setPhase('loading')
    setError(null)
    setRows(null)
    setTotal(null)
    setSelection(null)
    setDetail(null)
    setDetailError(null)
    setProcs(null)
    setProcsBusy(false)
    setEngine(null)
    setHold(null)
    setTerms(null)
    setTermBusy(false)
    setReceipt(null)
    setOpBody(null)
    setBusy(false)
    const instance = createDnlsClient({})
    clientRef.current = instance
    const stale = ticket('list')
    ;(async () => {
      try {
        await instance.discover()
        if (!stale()) return
        const list = await instance.listSandboxes()
        if (!stale()) return
        setRows(list.rows)
        setTotal(list.total)
        setComplete(list.complete !== false)
        setEnvIds((list.envs ?? []).map((e) => (typeof e === 'string' ? e : e?.envId)).filter(Boolean))
        setPhase('ready')
        instance.listProfiles?.().then((list2) => {
          if (!stale()) return
          setProfileCaps(new Map((list2 ?? []).map((p) => [p.id, p.maxInstances]).filter(([, v]) => Number.isInteger(v))))
        }).catch(() => {})
      } catch (cause) {
        if (stale()) { setError(cause); setPhase('failed') }
      }
    })()
    return () => { killAll(); clientRef.current = null }
  }, [sessionId, bootSeq, run])

  /** Explicit pick only — never an automatic first row or substitute.
   * Every read channel of the old target is invalidated; the write lock
   * blocks picking while a mutation is in flight. */
  function choose(sandboxId) {
    if (writeLock.current) return
    const found = (rows ?? []).find((entry) => entry.sandboxId === sandboxId)
    if (!found) return
    invalidate('detail', 'process', 'operation', 'profiles', 'engine', 'term', 'settings', 'logs')
    setSelection({ sandboxId: found.sandboxId, name: found.name ?? found.sandboxId, envId: found.envId })
    setDetail(null)
    setDetailError(null)
    setProcs(null)
    setConfirm(null)
    setAcknowledged(false)
    setOpBody(null)
    setReceipt(null)
    setError(null)
    setProcsBusy(false)
    setEngine(null)
    setHold(null)
    setTerms(null)
    setTermBusy(false)
    setLogs(null)
    setLogsBusy(false)
    setDetailsOpen(false)
    setSettingsMsg(null)
    setUsageDenied(false)
    setView('control')
  }

  function unchoose() {
    if (writeLock.current) return
    invalidate('detail', 'process', 'operation', 'engine', 'term', 'settings', 'logs')
    setSelection(null)
    setDetail(null)
    setDetailError(null)
    setReceipt(null)
    setOpBody(null)
    setConfirm(null)
    setEngine(null)
    setHold(null)
    setTerms(null)
    setTermBusy(false)
    setLogs(null)
    setLogsBusy(false)
    setUsageDenied(false)
    setView('overview')
  }

  /** Targeted detail read: marks its own channel pending, clears obsolete
   * errors, and reports a read failure distinctly — never a spinner. A
   * usage-window 403 keeps the object detail via a `window:null` retry. */
  const loadDetail = React.useCallback(() => {
    if (!selection || !client()) return
    const target = selection.sandboxId
    const stale = ticket('detail')
    setDetail(null)
    setDetailError(null)
    setUsageDenied(false)
    setError(null)
    ;(async () => {
      try {
        let answer
        try {
          answer = await client().inspect(target, { window: usageWindow })
        } catch (cause) {
          if (cause?.status !== 403) throw cause
          answer = await client().inspect(target, { window: null })
          if (stale()) setUsageDenied(true)
        }
        if (!stale()) return
        setDetail(answer)
      } catch (cause) {
        if (stale()) setDetailError(cause)
      }
    })()
  }, [selection?.sandboxId, usageWindow])

  React.useEffect(() => {
    if (selection && view === 'control') loadDetail()
    return undefined
  }, [selection?.sandboxId, view, usageWindow, loadDetail])

  /* Settings drafts follow the observed configuration only: an
   * unobserved field stays blank, never an imagined default, and a
   * blank field is never written back over an existing override. */
  React.useEffect(() => {
    const cfg = detail?.configuration
    if (!cfg) return
    setCfgCpus(cfg.overrides?.cpus != null ? String(cfg.overrides.cpus) : '')
    setCfgMem(cfg.overrides?.memoryBytes != null ? String(Math.round(cfg.overrides.memoryBytes / (1024 * 1024))) : '')
    setIdleMin(cfg.idleTimeoutMs != null ? String(Math.round(cfg.idleTimeoutMs / 60000)) : '')
  }, [detail?.configuration])

  function refresh() {
    if (phase === 'failed') { setBootSeq((n) => n + 1); return }
    if (view === 'control' && selection) loadDetail()
    else loadList()
  }

  /** Single-flight write under a synchronous lock; a new receipt replaces
   * the old one and invalidates the operation channel so a late recheck
   * of the previous receipt can never overwrite it. */
  function submitLifecycle(action, { sandboxId, name, profileId, args } = {}) {
    if (writeLock.current) return
    writeLock.current = true
    const stale = ticket('write')
    setBusy(true)
    setError(null)
    run(async () => {
      const body = await client().lifecycle({
        action,
        requestId: crypto.randomUUID(),
        sandboxId,
        name,
        profileId,
        args,
      })
      if (!stale()) return
      invalidate('operation')
      const record = { operationId: body.operationId, sandboxId: sandboxId ?? body.sandboxId, action }
      setReceipt(record)
      setConfirm(null)
      setAcknowledged(false)
      setCreateOpen(false)
      setOpBody(body)
      loadList()
    }, stale).finally(() => {
      writeLock.current = false
      if (stale()) setBusy(false)
    })
  }

  /** Manual recheck — reads the exact operation of the CURRENT receipt;
   * 'accepted' is never inferred as success. */
  function recheck() {
    if (!receipt?.operationId || !receipt.sandboxId || !client()) return
    const record = receipt
    const stale = ticket('operation')
    run(async () => {
      const body = await client().readOperation(record.sandboxId, record.operationId)
      if (!stale()) return
      setOpBody(body)
      if (body.state !== 'succeeded') return
      loadList()
      if (selection?.sandboxId === record.sandboxId && view === 'control') {
        invalidate('process', 'engine', 'term', 'logs')
        setProcs(null)
        setProcsBusy(false)
        setEngine(null)
        setHold(null)
        setTerms(null)
        setTermBusy(false)
        setLogs(null)
        setLogsBusy(false)
        loadDetail()
      }
    }, stale)
  }

  function loadLogs() {
    if (!selection) return
    const target = selection.sandboxId
    const stale = ticket('logs')
    setLogsBusy(true)
    setLogs(null)
    setError(null)
    ;(async () => {
      try {
        const body = await client().logs(target, { tail: 20 })
        if (!stale()) return
        setLogs({ text: typeof body?.text === 'string' ? body.text.slice(0, 64 * 1024) : '' })
      } catch (cause) {
        if (stale()) setLogs({ error: cause })
      } finally {
        if (stale()) setLogsBusy(false)
      }
    })()
  }

  function loadProcesses() {
    if (!selection) return
    const target = selection.sandboxId
    const stale = ticket('process')
    setProcsBusy(true)
    setError(null)
    run(async () => {
      const body = await client().processes(target)
      if (!stale()) return
      setProcs(body)
    }, stale).finally(() => { if (stale()) setProcsBusy(false) })
  }

  /** Explicit engine probe: the announced dnls.status surface for this
   * exact sandbox — whitelisted fields only on render. */
  function probeEngine() {
    if (!selection) return
    const target = selection.sandboxId
    const stale = ticket('engine')
    setEngine(null)
    setHold(null)
    setError(null)
    run(async () => {
      const status = await client().status(target)
      if (!stale()) return
      setEngine(status)
      if (supports('dnls.control')) {
        try {
          const control = await client().control(target)
          if (stale()) setHold(control)
        } catch { if (stale()) setHold(null) }
      }
    }, stale)
  }

  function setHumanHold(active) {
    if (!selection) return
    const target = selection.sandboxId
    const stale = ticket('engine')
    setError(null)
    run(async () => {
      await client().control(target, active ? 'takeover' : 'release')
      if (!stale()) return
      const control = await client().control(target)
      if (stale()) setHold(control)
    }, stale)
  }

  function openKitesurf() {
    if (host?.kitesurf?.() !== true) { setError(new Error(copy.workspaceMissing)); return }
    host?.openKitesurf?.()
  }

  function loadTerminals() {
    if (!selection) return
    const target = selection.sandboxId
    const stale = ticket('term')
    setTermBusy(true)
    setTerms(null)
    setError(null)
    ;(async () => {
      try {
        const out = await client().terminalList(target)
        if (!stale()) return
        setTerms({ list: out.terminals })
      } catch (cause) {
        if (!stale()) return
        setTerms(cause?.status === 403 ? { denied: true } : { error: cause })
      } finally {
        if (stale()) setTermBusy(false)
      }
    })()
  }

  function createTerminal(serviceId) {
    if (!selection) return
    const target = selection.sandboxId
    const stale = ticket('term')
    setTermBusy(true)
    setError(null)
    ;(async () => {
      try {
        await client().terminalCreate(target, {
          service: serviceId,
          paneId,
          openId: crypto.randomUUID(),
        })
        if (!stale()) return
        const out = await client().terminalList(target)
        if (stale()) setTerms({ list: out.terminals })
      } catch (cause) {
        if (stale()) setTerms({ error: cause })
      } finally {
        if (stale()) setTermBusy(false)
      }
    })()
  }

  function closeTerminal(terminalId) {
    if (!selection) return
    const target = selection.sandboxId
    const stale = ticket('term')
    setTermBusy(true)
    setConfirm(null)
    setAcknowledged(false)
    setError(null)
    ;(async () => {
      try {
        await client().terminalClose(target, terminalId)
        if (!stale()) return
        const out = await client().terminalList(target)
        if (stale()) setTerms({ list: out.terminals })
      } catch (cause) {
        if (stale()) setTerms({ error: cause })
      } finally {
        if (stale()) setTermBusy(false)
      }
    })()
  }

  function openTerminal(term) {
    if (!selection || !host?.openTerminal) return
    const envId = detail?.envId ?? selection.envId
    try {
      const address = terminalAddress({ envId, sandboxId: selection.sandboxId, terminalId: term.terminalId })
      if (term.address !== address || host.openTerminal(address) !== true) setError(new Error(copy.terminalUnavailable))
    } catch (cause) {
      setError(cause)
    }
  }

  function openCreate() {
    setCreateOpen(true)
    setProfiles(null)
    setProfilesFailed(false)
    const stale = ticket('profiles')
    run(async () => {
      try {
        const list = await client().listProfiles()
        if (!stale()) return
        setProfiles(list)
        if (list.length === 1 && list[0].ready !== false) setCreateProfile(list[0].id)
      } catch (cause) {
        if (!stale()) return
        setProfiles([])
        setProfilesFailed(true)
        throw cause
      }
    }, stale)
  }

  function saveResources() {
    if (!selection || !detail?.configuration) return
    // The registry replaces the whole overrides map: start from the
    // observed overrides, apply non-blank valid integers only, and a
    // blank field keeps what is already stored.
    const overrides = Object.fromEntries(Object.entries(detail.configuration.overrides ?? {}).filter(([, v]) => v != null))
    if (cfgCpus.trim() !== '') {
      const cpus = Number(cfgCpus)
      if (!Number.isInteger(cpus) || cpus < 1) { setError(new Error(copy.failed)); return }
      overrides.cpus = cpus
    }
    if (cfgMem.trim() !== '') {
      const mem = Number(cfgMem)
      if (!Number.isInteger(mem) || mem < 1) { setError(new Error(copy.failed)); return }
      overrides.memoryBytes = mem * 1024 * 1024
    }
    const target = selection.sandboxId
    const stale = ticket('settings')
    setSettingsMsg(null)
    setError(null)
    run(async () => {
      const out = await client().saveRevision(target, {
        expectedRevision: detail.desiredRevision ?? 0,
        overrides,
      })
      if (!stale()) return
      setSettingsMsg(fill(copy.configSaved, { revision: out.desiredRevision?.revision ?? '?' }))
      loadDetail()
    }, stale)
  }

  function saveIdle() {
    if (!selection || !detail?.configuration) return
    // Blank means "keep the current policy" — never an implicit zero.
    if (idleMin.trim() === '') return
    const minutes = Number(idleMin)
    if (!Number.isInteger(minutes) || minutes < 0) { setError(new Error(copy.failed)); return }
    const target = selection.sandboxId
    const stale = ticket('settings')
    setSettingsMsg(null)
    setError(null)
    run(async () => {
      await client().configureIdle(target, minutes * 60000)
      if (!stale()) return
      setSettingsMsg(copy.idleSaved)
      loadDetail()
    }, stale)
  }

  if (!sessionId) return null
  const sandboxName = selection?.name ?? selection?.sandboxId ?? ''
  const observedState = detail?.observedState ?? null
  /** Management hint: the operator-only configuration plane is present
   * only for a principal the server already authorized — the server
   * remains the authority for every write. */
  const canManage = detail != null && Object.hasOwn(detail, 'configuration')
  const opPending = receipt != null && ['accepted', 'running', 'indeterminate'].includes(opBody?.state)
  const writeBusy = busy || opPending
  const canStart = canManage && observedState === 'stopped' && supports('sandbox.instance.start')
  const canStop = canManage && observedState === 'running' && supports('sandbox.instance.stop')
  const canRestart = canManage && observedState === 'running' && supports('sandbox.instance.restart')
  const selectedProfile = (profiles ?? []).find((p) => p.id === createProfile)
  const createBlocked = busy || !createName || !createProfile || selectedProfile?.ready === false

  const errorBox = error
    ? h('div', { 'data-dnls-error': '1', role: 'alert' },
        `${error?.errorId ? `${error.errorId} ` : ''}${error?.message ?? error}`)
    : null

  const receiptBlock = receipt
    ? h(PanelSection, { title: copy.activity },
        h('p', { 'data-dnls-receipt': '1' },
          fill(copy.opLine, { action: copy[receipt.action] ?? receipt.action, state: opBody?.state ?? copy.opPending }),
          h('br', null),
          fill(copy.opIdLine, { operationId: receipt.operationId })),
        h(Button, { variant: 'ghost', size: 'sm', onClick: recheck }, copy.opRecheck))
    : null

  const visibleRows = (rows ?? []).filter((entry) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return [entry.name, entry.profileId, entry.envId, entry.observedState,
      ...(entry.services ?? []).map((s) => s.serviceId)]
      .some((v) => typeof v === 'string' && v.toLowerCase().includes(q))
  })

  const overview = () => {
    if (phase === 'loading' && rows === null) {
      return h(PanelLayout, { title: copy.fleetTitle, 'data-dnls-pane': '1' },
        h('p', { 'data-dnls-loading': '1' }, copy.loading))
    }
    const stats = {
      running: visibleRows.filter((e) => e.observedState === 'running').length,
      stopped: visibleRows.filter((e) => e.observedState === 'stopped').length,
      attention: visibleRows.filter((e) => !['running', 'stopped'].includes(e.observedState) ||
        ['indeterminate', 'failed'].includes(e.operation?.state)).length,
    }
    if (phase === 'failed') {
      return h(PanelLayout, { title: copy.fleetTitle, 'data-dnls-pane': '1' },
        h(EmptyState, { title: copy.failed, description: error?.message ?? copy.failed,
          action: h(Button, { variant: 'primary', size: 'sm', onClick: () => setBootSeq((n) => n + 1) }, copy.retry) }))
    }
    // Groups keep unfiltered status counts; only cards are filtered.
    const groups = []
    for (const entry of rows ?? []) {
      const key = `${entry.envId}·${entry.profileId}`
      let group = groups.find((g) => g.key === key)
      if (!group) { group = { key, envId: entry.envId, profileId: entry.profileId, rows: [] }; groups.push(group) }
      group.rows.push(entry)
    }
    return h(PanelLayout, {
      'data-dnls-pane': '1',
      title: copy.workbenchTitle,
      kicker: (envIds ?? []).length ? fill(copy.envKicker, { env: (envIds ?? []).join(' · ') }) : undefined,
      description: total !== null
        ? `${fill(copy.listShort, { shown: visibleRows.length, total })}${complete && rows?.length === total ? '' : ` · ${copy.listPartial}`}`
        : undefined,
      actions: h(React.Fragment, null,
        h(Button, { variant: 'primary', size: 'sm', disabled: busy || !supports('sandbox.instance.create'), onClick: openCreate }, copy.create),
        ' ',
        h(Button, { variant: 'ghost', size: 'sm', disabled: phase === 'loading', onClick: refresh }, copy.refresh)),
    },
      h(FactGrid, { items: [
        { label: copy.stateRunning, value: stats.running },
        { label: copy.stateStopped, value: stats.stopped },
        { label: copy.fleetAttention, value: stats.attention },
      ] }),
      h(Toolbar, { label: copy.searchPlaceholder },
        h(primitives.Input, {
          type: 'search',
          'data-dnls-search': '1',
          value: search,
          placeholder: copy.searchPlaceholder,
          'aria-label': copy.searchPlaceholder,
          onChange: (event) => setSearch(event.target.value),
        })),
      rows !== null && rows.length > 0 && visibleRows.length === 0
        ? h(EmptyState, {
            'data-dnls-empty': '1',
            title: copy.searchMiss,
            action: h(Button, { variant: 'ghost', size: 'sm', onClick: () => setSearch('') }, copy.clearFilter),
          })
        : null,
      rows !== null && rows.length === 0
        ? h(EmptyState, {
            'data-dnls-empty': '1',
            title: copy.emptyTitle,
            description: copy.empty,
            action: supports('sandbox.instance.create')
              ? h(Button, { variant: 'primary', size: 'sm', onClick: openCreate }, copy.create)
              : undefined,
          })
        : null,
      groups.map((group) => {
        const cards = group.rows.filter((entry) => visibleRows.includes(entry))
        if (cards.length === 0) return null
        const groupCap = (envIds ?? []).length === 1 ? profileCaps.get(group.profileId) : undefined
        return h(PanelSection, {
          key: group.key,
          title: `${group.profileId} · ${group.envId}${groupCap != null ? ` · ${fill(copy.profileSeats, { count: group.rows.length, limit: groupCap })}` : ''}`,
        },
          h(FactGrid, { items: cards.map((entry) => {
            const running = entry.observedState === 'running'
            return {
              label: ' ',
              value: h(React.Fragment, null,
                h(DeviceFace, { entry, copy, stateLabel: (s) => stateLabel(copy, s) }),
                h(CardBody, { entry, copy, running, Tag: primitives.Tag,
                  formatBytes, stateLabel: (s) => stateLabel(copy, s),
                  disabled: busy, onSelect: choose })),
            }
          }) }))
      }),
      receiptBlock)
  }

  const overviewTab = () => h(React.Fragment, null,
    h(FactGrid, { items: [
      { label: copy.fieldState, value: detail ? stateLabel(copy, detail.observedState) : (detailError ? undefined : copy.loading) },
      { label: copy.observedAt, value: fmtTime(detail?.observedAt) },
      detail?.resources ? { label: copy.resCpus, value: `${copy.allocated} ${detail.resources.cpus ?? '—'}` } : null,
      detail?.resources ? { label: copy.resMemory, value: `${copy.allocated} ${formatBytes(detail.resources.memoryBytes) ?? '—'}` } : null,
    ].filter(Boolean) }),
    detailError ? h('div', { 'data-dnls-detail-error': '1', role: 'alert' },
      `${detailError?.errorId ? `${detailError.errorId} ` : ''}${detailError?.message ?? detailError}`) : null,
    // Candidate strip only on a genuine desired != applied revision, and
    // each line only where the saved override actually differs from the
    // observed allocation.
    canManage && Number.isInteger(detail?.desiredRevision) && Number.isInteger(detail?.appliedRevision) &&
      detail.desiredRevision !== detail.appliedRevision ? (() => {
        const ov = detail.configuration?.overrides ?? {}
        const lines = [
          ov.cpus != null && ov.cpus !== detail.resources?.cpus
            ? fill(copy.cfgPendingCpu, { cur: detail.resources?.cpus ?? copy.unknown, saved: ov.cpus }) : null,
          ov.memoryBytes != null && ov.memoryBytes !== detail.resources?.memoryBytes
            ? fill(copy.cfgPendingMem, {
                cur: formatBytes(detail.resources?.memoryBytes) ?? copy.unknown,
                saved: formatBytes(ov.memoryBytes) }) : null,
        ].filter(Boolean)
        return h('p', { 'data-dnls-pending': '1' },
          lines.length > 0
            ? lines.join(' · ')
            : fill(copy.revPending, { rev: detail.desiredRevision }))
      })() : null,
    usageDenied ? h('p', null, copy.usageNotAuthorized) : null,
    // Window picker + honest metric bands + one coverage sentence.
    detail?.usage ? h(PanelSection, { title: copy.resources },
      h(primitives.SegmentedControl, {
        value: usageWindow,
        label: copy.resources,
        options: ['24h', '7d', '30d'].map((w) => ({ value: w, label: w })),
        onChange: (w) => { if (!busy) setUsageWindow(w) },
      }),
      Array.isArray(detail.usage.history) && detail.usage.history.length > 0
        ? h(FactGrid, { items: [
            { label: copy.usageCpu, value: h(MetricChart, {
              title: copy.usageCpu, unit: copy.coresUnit, range: usageWindow,
              tone: 'var(--dsw-alias-state-business-primary)',
              summary: detail.usage.cpu ? { ...detail.usage.cpu, end: detail.usage.end } : { end: detail.usage.end }, copy, fmtTime,
              bins: detail.usage.history.map((b) => ({ at: b.at, minutes: b.minutes, value: b.cpuCores ?? null })),
            }) },
            { label: copy.usageMemory, value: h(MetricChart, {
              title: copy.usageMemory, unit: 'MiB', range: usageWindow,
              tone: 'var(--dsw-alias-state-success-primary)',
              summary: detail.usage.memory
                ? { ...detail.usage.memory, end: detail.usage.end,
                    mean: detail.usage.memory.mean != null ? detail.usage.memory.mean / 1048576 : null,
                    peak: detail.usage.memory.peak != null ? detail.usage.memory.peak / 1048576 : null }
                : null,
              copy, fmtTime,
              bins: detail.usage.history.map((b) => ({
                at: b.at, minutes: b.minutes,
                value: b.memoryBytes != null ? b.memoryBytes / 1048576 : null })),
            }) },
          ] })
        : h('div', null, copy.noSamples),
      h('small', null,
        `${copy.usageStates} ${copy.stateRunning} ${detail.usage.states?.running ?? '—'} · ` +
        `${copy.stateStopped} ${detail.usage.states?.stopped ?? '—'} · ` +
        `${copy.stateFailed} ${detail.usage.states?.failed ?? '—'} · ` +
        `${copy.stateMissing} ${detail.usage.states?.missing ?? '—'}`)) : null,
    // Guest process read — running + authorized only.
    supports('sandbox.processes') ? h(PanelSection, { title: copy.guestProcesses },
      detail && canManage !== true ? h('p', null, copy.configNotAuthorized)
        : detail && observedState !== 'running' ? h('p', null, stateLabel(copy, observedState))
        : null,
      h('p', null,
        h(Button, { variant: 'ghost', size: 'sm',
          disabled: procsBusy || busy || !canManage || observedState !== 'running',
          onClick: () => (procs ? setProcs(null) : loadProcesses()) },
          procs ? copy.processesHide : copy.processes)),
      procs
        ? h('section', { 'data-dnls-processes': '1', 'aria-label': copy.processes },
            (procs.processes ?? []).length === 0
              ? h('p', null, copy.processesEmpty)
              : h(React.Fragment, null,
                  h('table', { width: '100%' },
                    h('thead', null, h('tr', null,
                      h('th', { scope: 'col', align: 'left' }, 'PID'),
                      h('th', { scope: 'col', align: 'left' }, copy.fieldName),
                      h('th', { scope: 'col', align: 'left' }, copy.fieldState),
                      h('th', { scope: 'col', align: 'left' }, 'RSS'))),
                    h('tbody', null,
                      (procs.processes ?? []).map((p) => h('tr', { key: p.pid },
                        h('td', null, p.pid ?? '—'),
                        h('td', null, p.name ?? '—'),
                        h('td', null, p.state ?? '—'),
                        h('td', null, p.rssBytes != null ? (formatBytes(p.rssBytes) ?? `${p.rssBytes}B`) : '—'))))),
                  procs.truncated === true ? h('p', null, copy.procsTruncated) : null))
        : null) : null,
    detail ? h(DisclosureRow, {
      title: copy.details,
      icon: InfoIcon ? h(InfoIcon) : null,
      open: detailsOpen,
      expandable: true,
      expandOnRowClick: true,
      onToggle: () => setDetailsOpen((open) => !open),
    },
      h(FactGrid, { items: [
        detail.applied ? { label: copy.appliedDigest, value: detail.applied.imageDigest } : null,
        detail.applied ? { label: copy.appliedVerified, value: fmtTime(detail.applied.verifiedAt) } : null,
        { label: copy.fieldGeneration, value: detail.generation },
        { label: copy.fieldSandboxId, value: detail.sandboxId },
        Array.isArray(detail.mounts) && detail.mounts.length > 0
          ? { label: copy.storage, value: detail.mounts.map((m) => `${m.type ?? '—'}:${m.target ?? '—'}${m.readOnly === true ? ` ${copy.readOnly}` : ''}`).join(' · ') }
          : null,
      ].filter(Boolean) })) : null,
    detail?.operations?.length ? h(PanelSection, { title: copy.timeline },
      [...detail.operations].reverse().map((op) => h('div', {
        key: op.operationId ?? `${op.at}-${op.action}`,
        'data-dnls-op': op.operationId ?? undefined,
      },
        h(primitives.StateDot, { state: ({ succeeded: 'done', failed: 'error', indeterminate: 'warning', running: 'ongoing' })[op.state] ?? 'idle' }),
        ' ',
        `${copy[op.action] ?? op.action} · ${copy.opStates?.[op.state] ?? op.state}` +
        `${op.step && op.step !== 'verify' ? `/${op.step}` : ''} · ${fmtTime(op.at)}`))) : null)

  const engineState = engine?.planes?.engine?.state ?? null
  const bridgeState = engine?.planes?.bridge ? (engine.planes.bridge.ok === true ? (engine.planes.bridge.detail ?? 'ok') : 'down') : null
  // `control.humanHold` is rendered only when the bridge answered it —
  // a missing field is unknown, never an inferred "free".
  const holdActive = hold?.control?.humanHold?.active

  const servicesTab = () => {
    const services = detail?.services ?? []
    const termList = terms?.list ?? null
    const declared = services.map((s) => s.serviceId).filter((id) => typeof id === 'string')
    const healthUnknown = services.length > 0 && services.every((s) => (s.health ?? 'unknown') === 'unknown')
    return h(React.Fragment, null,
      services.length > 0
        ? h(PanelSection, { title: copy.fieldServices },
            healthUnknown ? h('p', null, copy.healthUnverified) : null,
            h('table', { width: '100%' },
              h('thead', null, h('tr', null,
                h('th', { scope: 'col', align: 'left' }, copy.fieldServices),
                h('th', { scope: 'col', align: 'left' }, copy.servicePublication),
                h('th', { scope: 'col', align: 'left' }, copy.protocol))),
              h('tbody', null,
                services.map((service) => h('tr', { key: service.serviceId },
                  h('td', null, service.serviceId),
                  h('td', null, serviceAddress(service) ?? copy.unpublished),
                  h('td', null, `${service.protocol ?? '—'}:${service.containerPort ?? '—'}`))))),
            services.map((service) => h(DisclosureRow, {
              key: service.serviceId,
              title: service.serviceId,
              icon: InfoIcon ? h(InfoIcon) : null,
              open: svcOpen === service.serviceId,
              expandable: true,
              expandOnRowClick: true,
              onToggle: () => setSvcOpen((open) => open === service.serviceId ? null : service.serviceId),
            },
              h(FactGrid, { items: [
                service.guestCwd ? { label: copy.guestCwd, value: service.guestCwd } : null,
                { label: copy.observedAt, value: fmtTime(service.observedAt) },
                { label: copy.declaredVersion, value: service.declaredVersion ?? '—' },
                { label: copy.observedVersion, value: service.observedVersion ?? '—' },
              ].filter(Boolean) }))))
        : h('p', null, copy.none),
      // Engine probe — the announced dnls.status surface, rendered only
      // for the installed kitesurf profile and only whitelisted fields.
      (detail?.services ?? []).some((s) => s.role === 'engine' || s.role === 'bridge')
        ? h(PanelSection, { title: copy.engineProbe },
            supports('dnls.status')
              ? h(Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: probeEngine }, copy.engineProbe)
              : h('p', null, copy.engineUnavailable),
            engine ? h(FactGrid, { items: [
              { label: copy.engineState, value: engineState },
              { label: copy.bridgeState, value: bridgeState },
              { label: copy.observedAt, value: engine?.observedAt },
              typeof engine?.networking?.hostGateway === 'string'
                ? { label: copy.netGateway, value: engine.networking.hostGateway } : null,
            ].filter(Boolean) }) : null,
            holdActive === true || holdActive === false ? h(FactGrid, { items: [
              { label: copy.humanHold, value: holdActive === true ? copy.humanHoldActive : copy.humanHoldFree },
            ] }) : null,
            holdActive === true || holdActive === false ? h('p', null,
              h(Button, { variant: 'ghost', size: 'sm', disabled: busy || holdActive === true, onClick: () => setHumanHold(true) }, copy.takeover),
              ' ',
              h(Button, { variant: 'ghost', size: 'sm', disabled: busy || holdActive === false, onClick: () => setHumanHold(false) }, copy.release)) : null,
            h('p', null,
              h(Button, { variant: 'ghost', size: 'sm', disabled: busy || host?.kitesurf?.() !== true, onClick: openKitesurf }, copy.openWorkspace),
              ' ',
              h('span', null, copy.openWorkspaceHint)))
        : null,
      // Operator-only engine log read — bounded text, gated by the
      // announced dnls.logs surface and the operator configuration plane.
      canManage && supports('dnls.logs') ? h(PanelSection, { title: copy.logsTitle },
        h('p', null,
          h(Button, { variant: 'ghost', size: 'sm', disabled: logsBusy || busy, onClick: loadLogs }, copy.readLogs)),
        logs?.error ? h('p', { role: 'alert' }, `${logs.error?.errorId ? `${logs.error.errorId} ` : ''}${logs.error?.message ?? logs.error}`) : null,
        typeof logs?.text === 'string' ? h('pre', { 'data-dnls-logs': '1' }, logs.text) : null) : null,
      // Terminals — explicit list first; create appears only after it.
      supports('term.session.list') ? h(PanelSection, { title: copy.terminals },
        h('p', null,
          h(Button, { variant: 'ghost', size: 'sm', disabled: termBusy || busy, onClick: loadTerminals }, copy.terminalsList)),
        terms?.denied ? h('p', { 'data-dnls-terms-denied': '1', role: 'alert' }, copy.terminalsDenied) : null,
        terms?.error ? h('p', { role: 'alert' }, `${terms.error?.errorId ? `${terms.error.errorId} ` : ''}${terms.error?.message ?? terms.error}`) : null,
        termList && termList.length === 0 ? h('p', null, copy.terminalsEmpty) : null,
        termList ? termList.map((term) => {
          const live = term.state !== 'ended'
          const active = term.state === 'active'
          return h('p', { key: term.terminalId },
            `${term.terminalId.slice(0, 8)} ${term.state ?? ''} `,
            active && typeof term.address === 'string' ? h(Button, { variant: 'ghost', size: 'sm', disabled: termBusy, onClick: () => openTerminal(term) }, copy.terminalOpen) : null,
            ' ',
            live && supports('term.session.close')
              ? h(Button, { variant: 'ghost', size: 'sm', disabled: termBusy, onClick: () => { setConfirm({ kind: 'closeTerminal', terminalId: term.terminalId }); setAcknowledged(false) } }, copy.terminalClose)
              : null)
        }) : null,
        // Create-only is separate from connect/attach and appears only
        // after a successful list — never on a denied or failed read.
        termList && supports('term.session.create') ? h('p', null,
          declared.map((serviceId) => h(React.Fragment, { key: serviceId },
            h(Button, { variant: 'ghost', size: 'sm', disabled: termBusy || busy, onClick: () => createTerminal(serviceId) },
              fill(copy.terminalCreateFor, { service: serviceId })),
            ' '))) : null) : null)
  }

  const settingsTab = () => {
    const cfg = detail?.configuration
    return h(React.Fragment, null,
      h(PanelSection, { title: copy.config },
        cfg
          ? h(React.Fragment, null,
              h(primitives.SettingsValueField, {
                id: `${nameId}-cpus`, label: copy.configCpus,
                text: cfgCpus, numeric: true, overridden: false,
                invalid: cfgCpus.trim() !== '' && (!Number.isInteger(Number(cfgCpus)) || Number(cfgCpus) < 1),
                invalidLabel: copy.draftInvalid,
                disabled: busy || detail == null,
                onEdit: setCfgCpus, placeholder: copy.configUnobserved,
                'data-dnls-cfg-cpus': '1',
              }),
              h(primitives.SettingsValueField, {
                id: `${nameId}-mem`, label: copy.configMemory,
                text: cfgMem, numeric: true, overridden: false,
                invalid: cfgMem.trim() !== '' && (!Number.isInteger(Number(cfgMem)) || Number(cfgMem) < 1),
                invalidLabel: copy.draftInvalid,
                disabled: busy || detail == null,
                onEdit: setCfgMem, placeholder: copy.configUnobserved,
                'data-dnls-cfg-mem': '1',
              }),
              (cfgCpus.trim() !== '' || cfgMem.trim() !== '') ? h('p', null, copy.saveNoChange) : null,
              h('p', null,
                h(Button, { variant: 'primary', size: 'sm', disabled: busy || detail == null || !supports('sandbox.revision.save'), onClick: saveResources }, copy.configSave)))
          : h('p', null, copy.configNotAuthorized)),
      h(PanelSection, { title: copy.idle },
        cfg
          ? h(React.Fragment, null,
              h(primitives.SettingsValueField, {
                id: `${nameId}-idle`, label: copy.idleMinutes,
                text: idleMin, numeric: true, overridden: false,
                invalid: idleMin.trim() !== '' && (!Number.isInteger(Number(idleMin)) || Number(idleMin) < 0),
                invalidLabel: copy.draftInvalid,
                disabled: busy || detail == null,
                onEdit: setIdleMin, placeholder: copy.idleHint,
                'data-dnls-idle': '1',
              }),
              h('p', null,
                h(Button, { variant: 'ghost', size: 'sm', disabled: busy || detail == null || idleMin.trim() === '' || !supports('sandbox.idle.configure'), onClick: saveIdle }, copy.idleSave)))
          : h('p', null, copy.configNotAuthorized)),
      settingsMsg ? h('p', { 'data-dnls-settings-msg': '1' }, settingsMsg) : null,
      canManage && detail != null && !opPending && (supports('sandbox.instance.recreate') || supports('sandbox.instance.remove'))
        ? h(PanelSection, { title: copy.danger },
            h('p', null, copy.persistVolume),
            h('p', null,
              supports('sandbox.instance.recreate')
                ? h(Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: () => { setConfirm({ kind: 'recreate' }); setAcknowledged(false) } }, copy.recreate)
                : null,
              ' ',
              supports('sandbox.instance.remove')
                ? h(Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: () => { setConfirm({ kind: 'remove' }); setAcknowledged(false) } }, copy.remove)
                : null))
        : null)
  }

  const control = () => {
    if (!selection) return h('p', null, copy.pick)
    return h(PanelLayout, {
      'data-dnls-pane': '1',
      title: h(React.Fragment, null, sandboxName, ' ', h(primitives.Tag, null, detail ? stateLabel(copy, detail.observedState) : copy.stateUnknown)),
      kicker: `${detail?.envId ?? selection.envId ?? '—'} · ${detail?.profileId ?? '—'}`,
      description: detail?.health === 'unknown' ? copy.healthUnverified : undefined,
      actions: h(React.Fragment, null,
        h(Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: unchoose }, copy.back),
        ' ',
        h(Button, { variant: 'primary', size: 'sm', disabled: writeBusy || !(observedState === 'stopped' ? canStart : canStop), onClick: () => setConfirm({ kind: observedState === 'stopped' ? 'start' : 'stop' }) },
          observedState === 'stopped' ? copy.start : copy.stop),
        ' ',
        h(Button, { variant: 'ghost', size: 'sm', disabled: writeBusy || !canRestart, onClick: () => setConfirm({ kind: 'restart' }) }, copy.restart),
        ' ',
        h(Button, { variant: 'ghost', size: 'sm', disabled: phase === 'loading', onClick: refresh }, copy.refresh)),
    },
      receiptBlock,
      h(NanoTabs, {
        label: copy.control,
        items: [
          { value: 'overview', label: copy.tabOverview, content: overviewTab() },
          { value: 'services', label: copy.tabServices, content: servicesTab() },
          { value: 'settings', label: copy.tabSettings, content: settingsTab() },
        ],
      }))
  }

  const createDialog = createOpen
    ? h(NanoDialog, {
        copy,
        title: copy.createTitle,
        confirmLabel: busy ? copy.creating : copy.createSubmit,
        confirmDisabled: createBlocked,
        busy,
        onConfirm: () => submitLifecycle('create', { name: createName, profileId: createProfile }),
        onCancel: () => setCreateOpen(false),
      },
        h('p', null,
          h('label', { htmlFor: nameId }, copy.createName), ' ',
          h(primitives.Input, {
            id: nameId, 'data-dnls-create-name': '1', value: createName,
            disabled: busy, onChange: (event) => setCreateName(event.target.value),
          })),
        h('p', null, h('label', null, copy.createProfile)),
        profiles === null
          ? h('p', null, copy.loading)
          : h(primitives.SegmentedControl, {
              'data-dnls-create-profile': '1',
              label: copy.createProfile,
              value: createProfile,
              options: profiles.map((p) => ({
                value: p.id,
                label: `${p.id}${p.ready === false ? ` · ${copy.profileNotReady}` : ''}`,
                disabled: p.ready === false,
              })),
              onChange: (value) => { if (!busy) setCreateProfile(value) },
            }),
        profiles !== null && profiles.length === 0 ? h('p', null, copy.noProfiles) : null,
        profilesFailed ? h('p', { role: 'alert' }, copy.failed) : null)
    : null

  // Risk confirmations: stop/restart/close/recreate/remove need the
  // acknowledgement checkbox; start confirms through a plain NanoDialog.
  const riskDialog = confirm && confirm.kind !== 'start'
    ? h(RiskConfirmation, {
        open: true,
        title: confirm.kind === 'closeTerminal'
          ? copy.closeConfirmTitle
          : (copy[`${confirm.kind}ConfirmTitle`] ?? copy[`${confirm.kind}`]),
        description: confirm.kind === 'closeTerminal'
          ? fill(copy.terminalCloseConfirm, { id: confirm.terminalId?.slice(0, 8) })
          : confirm.kind === 'remove'
            ? fill(copy.removeConfirmBody, { name: sandboxName })
            : confirm.kind === 'recreate'
              ? fill(copy.recreateConfirmBody, { name: sandboxName })
              : fill(copy.confirmBody, { action: copy[confirm.kind] ?? confirm.kind, name: sandboxName }),
        acknowledgeLabel: confirm.kind === 'closeTerminal'
          ? copy.lifecycleAcknowledge
          : confirm.kind === 'remove'
            ? copy.removeAcknowledge
            : confirm.kind === 'recreate'
              ? copy.recreateAcknowledge
              : copy.lifecycleAcknowledge,
        acknowledged,
        onAcknowledgedChange: setAcknowledged,
        cancelLabel: copy.cancel,
        closeLabel: copy.close,
        confirmLabel: copy[confirm.kind] ?? copy.terminalClose,
        disabled: busy,
        onCancel: () => { setConfirm(null); setAcknowledged(false) },
        onConfirm: () => {
          if (confirm.kind === 'closeTerminal') { closeTerminal(confirm.terminalId); return }
          const args = confirm.kind === 'recreate'
            ? { expectedRevision: detail?.desiredRevision ?? 0, preserveVolume: true, interruptTerminals: true }
            : undefined
          submitLifecycle(confirm.kind, { sandboxId: selection.sandboxId, args })
        },
      })
    : null

  const startDialog = confirm?.kind === 'start'
    ? h(NanoDialog, {
        copy,
        title: copy.startConfirmTitle,
        description: fill(copy.startConfirmBody, { name: sandboxName }),
        confirmLabel: busy ? copy.creating : copy.start,
        confirmDisabled: busy,
        busy,
        onConfirm: () => submitLifecycle('start', { sandboxId: selection.sandboxId }),
        onCancel: () => setConfirm(null),
      })
    : null

  return h(React.Fragment, null,
    h('style', null, NANO_STYLES),
    errorBox,
    view === 'overview' ? overview() : control(),
    createDialog,
    riskDialog,
    startDialog)
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
  }, function DnlsTitle() {
    return copy().typeLabel
  })))
}
