/**
 * DNLS sandbox dashboard: one right-sidebar session tab with two views —
 * Overview (paired discovery → sandbox.list, explicit pick, create) and
 * Control (inspect/usage/services/ports/processes + confirmed lifecycle).
 * Session is only host UI context: a real props.sessionId gates render and
 * is never sent as a selector or credential.
 *
 * Concurrency model: each read channel (list/detail/process/profiles/
 * operation) owns an independent staleness ticket scoped to the current
 * target and mount — a refresh or process read can never invalidate an
 * in-flight lifecycle write or its durable receipt. Writes are single-
 * flight under a synchronous lock; every read ticket is invalidated on
 * target change while the receipt itself survives reads.
 */

const React = require('react')
const primitives = require('@deepseek-ai/dsh-client-ui-primitives')
const { createDnlsClient, createTicket } = require('./managed.js')
const { copyFor, fill } = require('./i18n.js')
const { formatBytes, formatCores, serviceLine, serviceSummary } = require('./format.js')
const h = React.createElement

const KIND = 'dnls-sandbox'

const box = {
  display: 'flex', flexDirection: 'column', gap: 10, padding: 12,
  minWidth: 0, width: '100%', maxWidth: '100%', boxSizing: 'border-box',
  overflowWrap: 'anywhere',
  color: 'var(--dsw-alias-label-primary)', font: 'var(--dsw-font-xxs-12)',
}
const row = { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', minWidth: 0 }
const field = { display: 'grid', gridTemplateColumns: 'minmax(0,110px) minmax(0,1fr)', gap: '2px 10px' }
const muted = { color: 'var(--dsw-alias-label-tertiary)' }
const card = { border: '.5px solid var(--dsw-alias-border-l2)', borderRadius: 6, padding: 8, minWidth: 0 }
const errorStyle = { color: 'var(--dsw-alias-status-error)' }

function Field({ label, value }) {
  return h('div', { style: field },
    h('span', { style: muted }, label),
    h('span', null, value ?? '—'))
}

/** Two-step lifecycle control: the confirm bar names the sandbox; one
 * click submits exactly one requestId and nothing is ever resent. */
function ConfirmBar({ copy, action, name, busy, onConfirm, onCancel }) {
  return h('div', { style: { ...row, ...card } },
    h('span', { style: { flex: 1, minWidth: 0 } },
      fill(copy.confirmBody, { action: copy[action] ?? action, name })),
    h(primitives.Button, { variant: 'primary', size: 'sm', disabled: busy, onClick: onConfirm }, copy.confirmGo),
    h(primitives.Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: onCancel }, copy.cancel))
}

/** One declared service row of the detail projection — published only
 * when the provider reports a verified host publication. */
function ServiceLine({ service }) {
  return h('div', null, serviceLine(service))
}

function DnlsPane({ sessionId, copy }) {
  const [view, setView] = React.useState('overview')
  const [phase, setPhase] = React.useState('loading') // loading | ready | failed
  const [error, setError] = React.useState(null)
  const [rows, setRows] = React.useState(null)
  const [total, setTotal] = React.useState(null)
  const [selection, setSelection] = React.useState(null)
  const [detail, setDetail] = React.useState(null)
  const [usageWindow, setUsageWindow] = React.useState('24h')
  const [procs, setProcs] = React.useState(null)
  const [procsBusy, setProcsBusy] = React.useState(false)
  const [pendingAction, setPendingAction] = React.useState(null)
  const [receipt, setReceipt] = React.useState(null)
  const [opBody, setOpBody] = React.useState(null)
  const [busy, setBusy] = React.useState(false)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [profiles, setProfiles] = React.useState(null)
  const [profilesFailed, setProfilesFailed] = React.useState(false)
  const [createName, setCreateName] = React.useState('')
  const [createProfile, setCreateProfile] = React.useState('')
  const [bootSeq, setBootSeq] = React.useState(0)

  /* Independent read channels; a late answer can only be discarded by the
   * guard of its own channel, never by another channel's newer take. */
  const channels = React.useRef({})
  const clientRef = React.useRef(null)
  const writeLock = React.useRef(false)
  const nameId = React.useId()
  const profileId = React.useId()

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
    }, stale)
  }, [run])

  React.useEffect(() => {
    if (!sessionId) return undefined
    // A remount starts fresh channels; the cleanup killed the old ones.
    channels.current = {}
    writeLock.current = false
    setPhase('loading')
    setError(null)
    setRows(null)
    setTotal(null)
    setSelection(null)
    setDetail(null)
    setProcs(null)
    setReceipt(null)
    setOpBody(null)
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
        setPhase('ready')
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
    invalidate('detail', 'process', 'operation', 'profiles')
    setSelection({ sandboxId: found.sandboxId, name: found.name ?? found.sandboxId })
    setDetail(null)
    setProcs(null)
    setPendingAction(null)
    setOpBody(null)
    setReceipt(null)
    setError(null)
    setProcsBusy(false)
    setCreateOpen(false)
  }

  const loadDetail = React.useCallback(() => {
    if (!selection) return
    const target = selection.sandboxId
    const stale = ticket('detail')
    run(async () => {
      const answer = await client().inspect(target, { window: usageWindow })
      if (!stale()) return
      setDetail(answer)
    }, stale)
  }, [selection?.sandboxId, usageWindow, run])

  // One targeted detail read per (target, window, control view) — the
  // window buttons and refresh clear `detail` before re-entering here.
  React.useEffect(() => {
    if (!selection || view !== 'control' || detail) return undefined
    loadDetail()
    return undefined
  }, [selection?.sandboxId, view, usageWindow, detail, loadDetail])

  function refresh() {
    if (phase === 'failed') { setBootSeq((n) => n + 1); return }
    if (view === 'control' && selection) {
      // clearing detail lets the effect re-read the targeted projection
      setDetail(null)
    } else {
      loadList()
    }
  }

  /** Single-flight write: the lock is taken synchronously so a second
   * click or a retarget can never interleave. The receipt keeps its own
   * operation reference; reads must not invalidate it — the write guard
   * lives on its own channel so a manual recheck can't strand `busy`. */
  function submitLifecycle(action, extra = {}) {
    if (writeLock.current) return
    writeLock.current = true
    const stale = ticket('write')
    setBusy(true)
    setError(null)
    run(async () => {
      const body = await client().lifecycle({
        action,
        requestId: crypto.randomUUID(),
        ...extra,
      })
      if (!stale()) return
      const record = {
        operationId: body.operationId,
        sandboxId: extra.sandboxId ?? body.sandboxId,
        action,
      }
      setReceipt(record)
      setPendingAction(null)
      setCreateOpen(false)
      setOpBody(body)
      if (action === 'create') loadList()
    }, stale).finally(() => {
      writeLock.current = false
      if (stale()) setBusy(false)
    })
  }

  function confirmPending() {
    if (!selection || !pendingAction) return
    submitLifecycle(pendingAction, { sandboxId: selection.sandboxId })
  }

  /** Manual recheck — reads the exact operation of the CURRENT receipt;
   * errors surface through `run`, never as unhandled rejections. */
  function recheck() {
    if (!receipt?.operationId || !receipt.sandboxId || !client()) return
    const stale = ticket('operation')
    run(async () => {
      const body = await client().readOperation(receipt.sandboxId, receipt.operationId)
      if (!stale()) return
      setOpBody(body)
    }, stale)
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

  function openCreate() {
    setCreateOpen(true)
    setProfiles(null)
    setProfilesFailed(false)
    const stale = ticket('profiles')
    // A refused profile list is shown, never an endless spinner.
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

  if (!sessionId) return null
  const sandboxName = selection?.name ?? selection?.sandboxId ?? ''
  const selectedProfile = (profiles ?? []).find((p) => p.id === createProfile)
  const createBlocked = busy || !createName || !createProfile || selectedProfile?.ready === false

  const header = h('div', { style: row },
    h(primitives.Button, {
      variant: view === 'overview' ? 'primary' : 'ghost', size: 'sm',
      'aria-pressed': view === 'overview',
      title: copy.overview,
      onClick: () => setView('overview'),
    }, copy.overview),
    h(primitives.Button, {
      variant: view === 'control' ? 'primary' : 'ghost', size: 'sm',
      'aria-pressed': view === 'control',
      title: copy.control,
      disabled: !selection,
      onClick: () => setView('control'),
    }, copy.control),
    h('span', { style: { flex: 1 } }),
    h(primitives.Button, { variant: 'ghost', size: 'sm', onClick: refresh }, copy.refresh))

  const errorBox = error
    ? h('div', { 'data-dnls-error': '1', style: errorStyle, role: 'alert' },
        `${error?.errorId ? `${error.errorId} ` : ''}${error?.message ?? error}`)
    : null

  const receiptBox = receipt
    ? h('div', { 'data-dnls-receipt': '1', style: { ...row, ...card } },
        h('span', { style: { flex: 1, minWidth: 0 } },
          fill(copy.opState, {
            operationId: receipt.operationId,
            state: opBody?.state ?? copy.opPending,
          })),
        h(primitives.Button, { variant: 'ghost', size: 'sm', onClick: recheck }, copy.opRecheck))
    : null

  const overview = () => {
    if (phase === 'loading' && rows === null) return h('div', { 'data-dnls-loading': '1' }, copy.loading)
    const picker = h('div', { style: row },
      h('select', {
        'data-dnls-sandbox-select': '1',
        'aria-label': copy.sandboxPick,
        value: selection?.sandboxId ?? '',
        disabled: busy,
        onChange: (event) => { if (event.target.value) choose(event.target.value) },
        style: { flex: 1, minWidth: 0 },
      },
        h('option', { value: '', disabled: true }, copy.sandboxPick),
        (rows ?? []).map((entry) => h('option', { key: entry.sandboxId, value: entry.sandboxId },
          `${entry.name || entry.sandboxId.slice(0, 8)} · ${entry.envId ?? '—'} · ${entry.observedState ?? 'unknown'}`))),
      h(primitives.Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: openCreate }, copy.create))
    const list = (rows ?? []).map((entry) => h('div', {
      key: entry.sandboxId,
      'data-dnls-row': entry.sandboxId,
      style: card,
    },
      h(Field, { label: copy.fieldName, value: entry.name ?? entry.sandboxId }),
      h(Field, { label: copy.fieldProfile, value: entry.profileId }),
      h(Field, { label: copy.fieldEnv, value: entry.envId }),
      h(Field, { label: copy.fieldState, value: entry.observedState }),
      h(Field, { label: copy.fieldServices, value: serviceSummary(entry.services) || undefined })))
    const createForm = createOpen
      ? h('div', { 'data-dnls-create': '1', style: { ...card, display: 'grid', gap: 8 } },
          h('div', { style: field },
            h('label', { htmlFor: nameId }, copy.createName),
            h('input', {
              id: nameId,
              'data-dnls-create-name': '1',
              value: createName,
              disabled: busy,
              onChange: (event) => setCreateName(event.target.value),
            })),
          h('div', { style: field },
            h('label', { htmlFor: profileId }, copy.createProfile),
            profiles === null
              ? h('span', { style: muted }, copy.loading)
              : h('select', {
                  id: profileId,
                  'data-dnls-create-profile': '1',
                  value: createProfile,
                  disabled: busy,
                  onChange: (event) => setCreateProfile(event.target.value),
                },
                  h('option', { value: '', disabled: true }, copy.sandboxPick),
                  profiles.map((p) => h('option', { key: p.id, value: p.id, disabled: p.ready === false },
                    `${p.id}${p.ready === false ? ` · ${copy.profileNotReady}` : ''}`)))),
          profiles !== null && profiles.length === 0 ? h('div', { style: muted }, copy.noProfiles) : null,
          profilesFailed ? h('div', { style: errorStyle }, copy.failed) : null,
          h('div', { style: row },
            h(primitives.Button, {
              variant: 'primary', size: 'sm', disabled: createBlocked,
              onClick: () => submitLifecycle('create', { name: createName, profileId: createProfile }),
            }, busy ? copy.creating : copy.createSubmit),
            h(primitives.Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: () => setCreateOpen(false) }, copy.cancel)))
      : null
    return h(React.Fragment, null,
      picker,
      total !== null ? h('div', { style: muted }, fill(copy.listShort, { shown: (rows ?? []).length, total })) : null,
      rows !== null && rows.length === 0 && !createOpen ? h('div', { 'data-dnls-empty': '1', style: muted }, copy.empty) : null,
      !selection && (rows ?? []).length > 0 ? h('div', { style: muted }, copy.pick) : null,
      createForm,
      list)
  }

  const usageBox = (usage) => usage && h('div', { 'data-dnls-usage': '1', style: card },
    h('div', { style: row },
      ['24h', '7d', '30d'].map((w) => h(primitives.Button, {
        key: w, variant: usageWindow === w ? 'primary' : 'ghost', size: 'sm',
        'aria-pressed': usageWindow === w,
        disabled: busy,
        onClick: () => { setDetail(null); setUsageWindow(w) },
      }, w))),
    h(Field, {
      label: copy.usageStates,
      value: `${copy.stateRunning} ${usage.states?.running ?? 0} · ${copy.stateStopped} ${usage.states?.stopped ?? 0} · ${copy.stateFailed} ${usage.states?.failed ?? 0} · ${copy.stateMissing} ${usage.states?.missing ?? 0}`,
    }),
    h(Field, {
      label: copy.usageMemory,
      value: `${copy.expected} ${usage.memory?.expected ?? '—'} · ${copy.valid} ${usage.memory?.valid ?? '—'} · ${copy.mean} ${formatBytes(usage.memory?.mean) ?? '—'} · ${copy.peak} ${formatBytes(usage.memory?.peak) ?? '—'}`,
    }),
    h(Field, {
      label: copy.usageCpu,
      value: `${copy.expected} ${usage.cpu?.expected ?? '—'} · ${copy.valid} ${usage.cpu?.valid ?? '—'} · ${copy.mean} ${formatCores(usage.cpu?.mean) ?? '—'} · ${copy.peak} ${formatCores(usage.cpu?.peak) ?? '—'}`,
    }))

  const control = () => {
    if (!selection) return h('div', { style: muted }, copy.pick)
    const services = detail?.services ?? []
    return h(React.Fragment, null,
      h('div', { style: { fontWeight: 600 } }, sandboxName),
      h(Field, { label: 'sandboxId', value: detail?.sandboxId ?? selection.sandboxId }),
      h(Field, { label: copy.fieldEnv, value: detail?.envId }),
      h(Field, { label: copy.fieldState, value: detail?.observedState ?? copy.loading }),
      h(Field, { label: copy.health, value: detail?.health }),
      h(Field, { label: copy.fieldGeneration, value: detail?.generation }),
      h(Field, { label: copy.fieldRevision, value: detail ? `${copy.desiredRev} ${detail.desiredRevision ?? '—'} · ${copy.appliedRev} ${detail.appliedRevision ?? '—'}` : undefined }),
      h(Field, { label: copy.observedAt, value: detail?.observedAt }),
      services.length > 0 ? h('div', { style: card }, services.map((service) =>
        h(ServiceLine, { key: service.serviceId, service }))) : null,
      usageBox(detail?.usage),
      h('div', { style: row },
        h(primitives.Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: () => setPendingAction('start') }, copy.start),
        h(primitives.Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: () => setPendingAction('stop') }, copy.stop),
        h(primitives.Button, { variant: 'ghost', size: 'sm', disabled: busy, onClick: () => setPendingAction('restart') }, copy.restart),
        h(primitives.Button, {
          variant: 'ghost', size: 'sm', disabled: procsBusy || busy,
          onClick: () => (procs ? setProcs(null) : loadProcesses()),
        }, procs ? copy.processesHide : copy.processes)),
      pendingAction ? h(ConfirmBar, {
        copy, action: pendingAction, name: sandboxName, busy,
        onConfirm: confirmPending,
        onCancel: () => setPendingAction(null),
      }) : null,
      procs
        ? h('div', { 'data-dnls-processes': '1', style: card },
            (procs.processes ?? []).length === 0
              ? h('div', { style: muted }, copy.processesEmpty)
              : (procs.processes ?? []).map((p) => h('div', { key: p.pid },
                  `${p.pid} ${p.name ?? ''} ${p.state ?? ''} ${p.rssBytes != null ? `${p.rssBytes}B` : ''}`)))
        : null)
  }

  return h('div', { 'data-dnls-pane': '1', style: box },
    header,
    errorBox,
    receiptBox,
    view === 'overview' ? overview() : control())
}

export const inject = ['slots', 'sidebarRightTabs', 'locale']

export function apply(ctx) {
  const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith('zh') === true
  const copy = () => copyFor(zh() ? 'zh' : 'en')
  const Pane = (props) => h(DnlsPane, { sessionId: props.sessionId, copy: copy() })

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
