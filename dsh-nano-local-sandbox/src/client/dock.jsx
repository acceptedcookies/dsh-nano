/** Terminal dock behind the status line: list, create, open through the host
 *  and close this sandbox's terminals. Without a handler for sandbox terminal
 *  addresses it offers the host's local terminal, labelled as not sandboxed. */
import React from 'react'
import { Button, StateDot, Tag, IconPlusOutlineRegular, IconTrashOutlineRegular, PluginArtworkTerminal } from '@deepseek-ai/dsh-client-ui-primitives'
import { IconButton, NanoDialog, SplitRow } from 'dsh-nano-ui'
import { createTicket } from './managed.js'
import { fill } from './i18n.js'
import { terminalAddress } from '../host/terminal-resource.js'
import { nameOf, shortId } from './model.js'
import { ErrorLine, Group, Muted, handlersFor } from './parts.jsx'

const h = React.createElement
// Any well-formed id: handler routing reads only the address shape.
const PROBE_TERMINAL = '00000000-0000-4000-8000-000000000000'

function LocalTerminal({ copy, host, onError }) {
  return h(Group, null, h(SplitRow, {
    label: h('span', { className: 'dnls-term' },
      h(PluginArtworkTerminal, { size: 16 }),
      h('span', { className: 'dnls-label' },
        h('span', null, copy.localTerminal),
        h('span', { className: 'dnls-muted', 'data-dnls-local-note': '1' }, copy.localTerminalNote))),
  }, h(Button, {
    variant: 'outline', size: 'sm', title: copy.newPane,
    onClick: () => { if (host.openLocalTerminal() !== true) onError(new Error(copy.localTerminalFailed)) },
  }, copy.localTerminalOpen)))
}

// Terminal counts on the status line and cards come from the object list,
// so every create/close re-reads it.
export function TerminalDock({ copy, api, host, paneId, row, supports, busy, refreshKey, onWrite, onChanged }) {
  const [terms, setTerms] = React.useState(null)
  const [error, setError] = React.useState(null)
  const [closing, setClosing] = React.useState(null)
  const [closeError, setCloseError] = React.useState(undefined)
  const ticket = React.useRef(null)
  if (!ticket.current) ticket.current = createTicket()
  React.useEffect(() => () => ticket.current.kill(), [])

  const sandboxId = row?.sandboxId ?? null
  const running = row?.observedState === 'running'
  let probe = null
  if (row) {
    try { probe = terminalAddress({ envId: row.envId, sandboxId, terminalId: PROBE_TERMINAL }) } catch { probe = null }
  }
  const sandboxHandlers = handlersFor(host, probe).length > 0

  const load = React.useCallback(async () => {
    const ok = ticket.current.take()
    if (!sandboxId) { setTerms(null); return }
    if (!supports('term.session.list')) { setTerms({ denied: true }); return }
    // Shells live only in a running container; the host answers 503 otherwise.
    if (!running) { setTerms({ list: [] }); return }
    try {
      const out = await api.terminalList(sandboxId)
      if (ok()) setTerms({ list: out.terminals })
    } catch (caught) {
      if (ok()) setTerms(caught?.status === 403 ? { denied: true } : { error: caught })
    }
  }, [sandboxId, running])

  React.useEffect(() => { load() }, [sandboxId, running, refreshKey])

  function openTerm(term) {
    let address = typeof term?.address === 'string' ? term.address : null
    if (!address) {
      try { address = terminalAddress({ envId: row.envId, sandboxId, terminalId: term.terminalId }) } catch { address = null }
    }
    if (!address || host.openResource(address, { preferNewPane: true }) !== true) setError(new Error(copy.terminalUnavailable))
  }

  async function createTerm() {
    await onWrite(async () => {
      const out = await api.terminalCreate(sandboxId, { paneId, openId: crypto.randomUUID() })
      const listed = await api.terminalList(sandboxId)
      setTerms({ list: listed.terminals })
      setError(null)
      if (sandboxHandlers) openTerm(listed.terminals.find((item) => item.terminalId === out.terminalId) ?? out)
    }, setError)
    onChanged?.()
  }

  async function closeTerm() {
    const term = closing
    await onWrite(async () => {
      await api.terminalClose(sandboxId, term.terminalId)
      setClosing(null)
      await load()
    }, (caught) => {
      setCloseError(caught?.status === 503 ? copy.terminalCloseUnavailable : caught?.message ?? String(caught))
      load()
    })
    onChanged?.()
  }

  if (!row) {
    return h(React.Fragment, null,
      h(Muted, null, copy.dockPick),
      h(LocalTerminal, { copy, host, onError: setError }),
      h(ErrorLine, { error }))
  }

  const list = terms?.list ?? []
  // Without a viewer a created shell could not be opened, so none is created.
  const canCreate = supports('term.session.create') && !terms?.denied && sandboxHandlers
  const canClose = supports('term.session.close')
  let body
  if (terms?.denied) body = h(Muted, null, copy.terminalsDenied)
  else if (terms == null) body = h(Muted, null, copy.loading)
  else if (terms.error) body = h(ErrorLine, { error: terms.error })
  else if (list.length === 0) body = h(Muted, null, running ? copy.terminalsEmpty : copy.terminalsStopped)
  else {
    body = h(Group, null, list.map((term) => h(SplitRow, {
      key: term.terminalId,
      label: h('span', { className: 'dnls-term' },
        h(StateDot, { state: term.state === 'active' ? 'done' : 'idle' }),
        h('span', { className: 'dnls-mono' }, fill(copy.terminalLabel, { id: shortId(term.terminalId) })),
        term.state ? h(Tag, { tone: 'neutral' }, copy.termState[term.state] ?? term.state) : null),
    }, h('span', { className: 'dnls-inline' },
      term.state === 'active' && sandboxHandlers
        ? h(Button, { variant: 'ghost', size: 'sm', title: copy.newPane, onClick: () => openTerm(term) }, copy.terminalOpen)
        : null,
      canClose && term.state !== 'ended' ? h(IconButton, {
        icon: h(IconTrashOutlineRegular, { size: 16 }),
        'aria-label': `${copy.terminalClose} ${shortId(term.terminalId)}`,
        disabled: busy,
        onClick: () => { setCloseError(undefined); setClosing(term) },
      }) : null))))
  }

  return h(React.Fragment, null,
    h('div', { className: 'dnls-dock-head' },
      h('span', { className: 'dnls-section-title' }, `${copy.terminals} · ${nameOf(row)}`),
      canCreate ? h(Button, {
        variant: 'primary', size: 'sm', disabled: busy || !running,
        icon: h(IconPlusOutlineRegular, { size: 14 }),
        onClick: createTerm,
      }, copy.terminalNew) : null),
    h(ErrorLine, { error }),
    body,
    sandboxHandlers
      ? (terms?.denied ? null : h(Muted, null, copy.terminalsHint))
      : h(React.Fragment, null, h(Muted, null, copy.terminalUnavailable), h(LocalTerminal, { copy, host, onError: setError })),
    closing ? h(NanoDialog, {
      copy,
      title: copy.terminalCloseTitle,
      confirmLabel: copy.terminalClose,
      danger: true,
      busy,
      error: closeError,
      onCancel: () => setClosing(null),
      onConfirm: closeTerm,
    }, h('p', { className: 'dnls-muted' }, fill(copy.terminalCloseBody, { id: shortId(closing.terminalId) }))) : null)
}
