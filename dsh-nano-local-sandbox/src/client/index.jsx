/**
 * Sandbox workbench: one right-sidebar tab with a list and a per-sandbox page.
 * Controls are host primitives and nano-ui. A real sessionId only gates
 * rendering; it is never sent as a selector, and refreshing never chooses a
 * sandbox for the user.
 */
import React from 'react'
import { NANO_STYLES, openNanoMenu } from 'dsh-nano-ui'
import { createDnlsClient, createTicket } from './managed.js'
import { copyFor } from './i18n.js'
import { openResourceAddress, sandboxAddress } from '../host/terminal-resource.js'
import { STYLE } from './styles.js'
import { FleetView } from './fleet.jsx'
import { SandboxView } from './sandbox.jsx'
import { CreateDialog, LifecycleConfirm } from './dialogs.jsx'
import { SETTLED, nameOf } from './model.js'

const h = React.createElement
const KIND = 'dnls-sandbox'
const CONFIRMED = new Set(['stop', 'restart', 'recreate', 'remove'])
const POLL_MS = 1500
const POLL_TRIES = 40
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function DnlsPane({ sessionId, copy, host }) {
  const paneId = React.useId()
  const clientRef = React.useRef(null)
  const listTicket = React.useRef(null)
  if (!listTicket.current) listTicket.current = createTicket()
  const alive = React.useRef(true)
  const writeLock = React.useRef(false)
  const [phase, setPhase] = React.useState('loading')
  const [error, setError] = React.useState(null)
  const [list, setList] = React.useState(null)
  const [boot, setBoot] = React.useState(0)
  const [selected, setSelected] = React.useState(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [receipts, setReceipts] = React.useState([])
  const [confirm, setConfirm] = React.useState(null)
  const [create, setCreate] = React.useState(null)
  const [busy, setBusy] = React.useState(false)

  React.useEffect(() => () => {
    alive.current = false
    listTicket.current.kill()
  }, [])

  const supports = (id) => clientRef.current?.supports(id) === true
  const api = clientRef.current

  const loadList = React.useCallback(async () => {
    const ok = listTicket.current.take()
    try {
      const client = clientRef.current ?? createDnlsClient()
      clientRef.current = client
      if (!client.capabilities()) await client.discover()
      const out = await client.listSandboxes()
      if (!ok()) return
      setList(out)
      setPhase('ready')
      setError(null)
    } catch (caught) {
      if (!ok()) return
      setError(caught)
      setPhase((prev) => (prev === 'ready' ? 'ready' : 'failed'))
    }
  }, [])

  React.useEffect(() => {
    if (sessionId) loadList()
  }, [sessionId, boot, loadList])

  if (!sessionId) return null

  const rows = list?.rows ?? null
  const current = selected ? (rows ?? []).find((row) => row.sandboxId === selected.sandboxId) ?? selected : null
  const refresh = () => { setBoot((value) => value + 1); setRefreshKey((value) => value + 1) }
  const patchReceipt = (operationId, patch) => setReceipts((all) => all.map((item) => (item.operationId === operationId ? { ...item, ...patch } : item)))

  async function readBack(receipt) {
    patchReceipt(receipt.operationId, { checking: true, error: null })
    try {
      const op = await clientRef.current.readOperation(receipt.sandboxId, receipt.operationId)
      patchReceipt(receipt.operationId, { checking: false, state: op.state, settled: SETTLED.has(op.state) })
      return op.state
    } catch (caught) {
      patchReceipt(receipt.operationId, { checking: false, error: caught.message })
      return null
    }
  }

  // Reads the original operation until it settles; the request itself is never resent.
  async function follow(receipt) {
    for (let attempt = 0; attempt < POLL_TRIES && alive.current; attempt += 1) {
      await pause(POLL_MS)
      if (!alive.current) return
      const state = await readBack(receipt)
      if (state === null) return
      if (SETTLED.has(state)) { refresh(); return }
    }
  }

  async function recheck(receipt) {
    const state = await readBack(receipt)
    if (state && SETTLED.has(state)) refresh()
  }

  async function write(task, onError) {
    if (writeLock.current) return
    writeLock.current = true
    setBusy(true)
    try {
      await task()
    } catch (caught) {
      (onError ?? setError)(caught)
    } finally {
      writeLock.current = false
      setBusy(false)
    }
  }

  async function dispatch(action, target, fields = {}) {
    await write(async () => {
      const answer = await clientRef.current.lifecycle({
        action,
        sandboxId: action === 'create' ? undefined : target.sandboxId,
        name: action === 'create' ? fields.name : undefined,
        profileId: action === 'create' ? fields.profileId : undefined,
        requestId: crypto.randomUUID(),
        args: action === 'recreate'
          ? { expectedRevision: target.desiredRevision ?? 0, preserveVolume: true, interruptTerminals: true }
          : undefined,
      })
      const receipt = {
        operationId: answer.operationId,
        sandboxId: answer.sandboxId ?? target.sandboxId,
        action,
        name: action === 'create' ? fields.name : target.name,
        state: answer.state ?? 'accepted',
        settled: SETTLED.has(answer.state),
      }
      setReceipts((all) => [receipt, ...all].slice(0, 20))
      setConfirm(null)
      setCreate(null)
      setError(null)
      if (action === 'remove' && selected?.sandboxId === target.sandboxId) setSelected(null)
      refresh()
      if (!receipt.settled) follow(receipt)
    }, (caught) => {
      setConfirm(null)
      if (action === 'create') setCreate((prev) => (prev ? { ...prev, error: caught } : prev))
      else setError(caught)
    })
  }

  function ask(action, target) {
    if (CONFIRMED.has(action)) setConfirm({ action, target })
    else dispatch(action, target)
  }

  async function openCreate() {
    setCreate({ profiles: null })
    try {
      const profiles = supports('sandbox.profile.list') ? await clientRef.current.listProfiles() : []
      setCreate((prev) => (prev ? { ...prev, profiles } : prev))
    } catch (caught) {
      setCreate((prev) => (prev ? { ...prev, profiles: [], error: caught } : prev))
    }
  }

  function openWorkspace(target) {
    let address = null
    try { address = sandboxAddress({ envId: target.envId, sandboxId: target.sandboxId }) } catch { address = null }
    if (!address || host.openResource(address) !== true) setError(new Error(copy.workspaceUnavailable))
  }

  function choose(row) {
    setSelected({ sandboxId: row.sandboxId, envId: row.envId, name: row.name })
    setError(null)
  }

  function openMenu(event, target) {
    event.stopPropagation()
    const running = target.observedState === 'running'
    const can = (action) => !busy && supports(`sandbox.instance.${action}`)
    const items = [
      { id: 'workspace', label: copy.openWorkspace, run: () => openWorkspace(target) },
      selected ? null : { id: 'details', label: copy.details, run: () => choose(target) },
      { id: 'power', separator: true },
      running
        ? { id: 'stop', label: copy.action.stop, disabled: !can('stop'), run: () => ask('stop', target) }
        : { id: 'start', label: copy.action.start, disabled: !can('start'), run: () => ask('start', target) },
      running ? { id: 'restart', label: copy.action.restart, disabled: !can('restart'), run: () => ask('restart', target) } : null,
      { id: 'danger', separator: true },
      { id: 'recreate', label: `${copy.action.recreate}…`, disabled: !can('recreate'), run: () => ask('recreate', target) },
      { id: 'remove', label: `${copy.action.remove}…`, tone: 'danger', disabled: !can('remove'), run: () => ask('remove', target) },
    ].filter(Boolean)
    openNanoMenu({ anchor: event.currentTarget.getBoundingClientRect(), width: 200, items })
  }

  const rowTarget = (row) => ({
    sandboxId: row.sandboxId, envId: row.envId, name: nameOf(row),
    desiredRevision: row.desiredRevision, observedState: row.observedState,
  })

  const view = current
    ? h(SandboxView, {
      key: current.sandboxId,
      copy, api, row: current, host, paneId, busy, supports, receipts, refreshKey, outerError: error,
      onBack: () => { setSelected(null); setError(null) },
      onRefresh: refresh,
      onMenu: openMenu,
      onAction: ask,
      onRecheck: recheck,
      onWrite: write,
    })
    : h(FleetView, {
      copy, api, rows, total: list?.total, complete: list?.complete !== false, phase, error, busy, supports, receipts,
      onRetry: refresh,
      onRefresh: refresh,
      onCreate: openCreate,
      onOpen: choose,
      onMenu: (event, row) => openMenu(event, rowTarget(row)),
      onStart: (row) => ask('start', rowTarget(row)),
      onRecheck: recheck,
    })

  return h('div', { className: 'dnls-pane', 'data-dnls-pane': '1' },
    h('style', null, NANO_STYLES, STYLE),
    view,
    create ? h(CreateDialog, {
      copy, profiles: create.profiles, busy, error: create.error,
      onCancel: () => setCreate(null),
      onSubmit: (fields) => dispatch('create', {}, fields),
    }) : null,
    confirm ? h(LifecycleConfirm, {
      copy, request: confirm, busy,
      onCancel: () => setConfirm(null),
      onConfirm: () => dispatch(confirm.action, confirm.target),
    }) : null)
}

export const inject = ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale']

export function apply(ctx) {
  const zh = () => ctx.locale?.getSnapshot?.().active?.startsWith('zh') === true
  const copy = () => copyFor(zh() ? 'zh' : 'en')
  // T-O-61: an address's open actions are the host's ranked handlers; the
  // plugin never names a handler kind. `openResource` re-runs the same handoff.
  const host = {
    handlers: (address) => ctx.sidebarRightTabs?.candidates?.(address),
    openResource: (address) => openResourceAddress({
      candidates: (value) => ctx.sidebarRightTabs?.candidates?.(value),
      openResource: (value) => ctx.sidebarRight?.openResource?.(value),
      address,
    }),
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
