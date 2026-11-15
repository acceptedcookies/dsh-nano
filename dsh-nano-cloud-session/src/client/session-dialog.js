/** One cloud session, shown in a native NanoDialog. */
import React from 'react'
import { NanoDialog } from 'dsh-nano-ui'
import { Button, Input, IconArchiveOutlineRegular, IconCopyOutlineRegular, IconLinkOutlineRegular, IconSendOutlineRegular, IconUnarchiveOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { api } from './api.js'

const { createElement: h, useEffect, useState } = React

const ago = ts => {
  const s = Math.max(0, Date.now() / 1000 - ts)
  if (s < 60) return `${s | 0}s`
  if (s < 3600) return `${s / 60 | 0}m`
  if (s < 86400) return `${s / 3600 | 0}h`
  return `${s / 86400 | 0}d`
}

export function SessionDialog({ face, sessionId, onClose }) {
  const t = face.t
  const [detail, setDetail] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    try {
      const [info, transcript] = await Promise.all([
        api.session('get', { session_id: sessionId }),
        api.session('messages', { session_id: sessionId, first: 100 }),
      ])
      setDetail(info)
      setMessages((transcript.items ?? transcript.messages ?? []).slice().sort((a, b) => (a.created_at ?? 0) - (b.created_at ?? 0)))
      setError('')
    } catch (cause) { setError(cause?.message ?? String(cause)) }
  }

  useEffect(() => { void load() }, [sessionId])

  const send = async () => {
    const message = text.trim()
    if (message === '' || busy) return
    setBusy(true); setError('')
    try { await api.message(sessionId, message); setText(''); await load() }
    catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const archive = async () => {
    setBusy(true); setError('')
    try { await (detail?.is_archived ? api.unarchive(sessionId) : api.archive(sessionId)); await load(); face.refresh() }
    catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const terminate = async () => {
    if (!window.confirm(t('terminateConfirm'))) return
    setBusy(true); setError('')
    try { await api.terminate(sessionId); face.refresh(); onClose() }
    catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const copy = { cancel: t('cancel'), confirm: t('close'), close: t('close') }
  const status = detail == null ? t('loading') : `${detail.status ?? ''}${detail.status_detail ? ` · ${detail.status_detail}` : ''}`
  const footer = h('div', { className: 'dncs-dialog-actions' },
    detail?.url ? h(Button, {
      variant: 'outline', size: 'sm', icon: h(IconLinkOutlineRegular, { size: 14 }),
      onClick: () => window.open(detail.url, '_blank', 'noreferrer'),
    }, t('openInWebapp')) : null,
    h(Button, {
      variant: 'outline', size: 'sm', icon: h(detail?.is_archived ? IconUnarchiveOutlineRegular : IconArchiveOutlineRegular, { size: 14 }),
      onClick: archive, disabled: busy,
    }, detail?.is_archived ? t('unarchive') : t('archive')),
    h(Button, { variant: 'outline', size: 'sm', onClick: terminate, disabled: busy }, t('terminate')),
    h(Button, { variant: 'outline', onClick: onClose }, t('close')))

  const body = h('div', null,
    error === '' ? null : h('div', { className: 'dncs-note', 'data-kind': 'error' }, error),
    detail == null ? h('div', { className: 'dncs-note' }, t('loading')) : h('dl', { className: 'dncs-kv' },
      h('dt', null, 'id'), h('dd', { className: 'dncs-code' }, detail.session_id),
      h('dt', null, t('status')), h('dd', null, status),
      h('dt', null, 'ACU'), h('dd', null, String(detail.acus_consumed ?? '0')),
      h('dt', null, 'mode'), h('dd', null, detail.devin_mode ?? '')),
    h('div', { className: 'dncs-messages' },
      messages.length === 0 ? h('div', { className: 'dncs-note' }, t('noMessages')) : messages.map((message, index) => h('div', {
        key: `${message.created_at ?? index}-${index}`,
        className: 'dncs-message',
        'data-role': message.source ?? 'system',
      },
        h('div', { className: 'dncs-message-meta' },
          h('span', null, message.source === 'user' ? t('role_user') : message.source === 'devin' ? t('role_devin') : t('role_system')),
          message.username ? h('span', null, message.username) : null,
          h('span', null, ago(message.created_at ?? 0))),
        message.message))),
    h('div', { className: 'dncs-inline' },
      h(Input, {
        value: text,
        placeholder: t('messagePlaceholder'),
        onChange: event => setText(event.currentTarget.value),
        onKeyDown: event => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send() } },
      }),
      h(Button, { variant: 'primary', size: 'sm', icon: h(IconSendOutlineRegular, { size: 14 }), onClick: send, disabled: busy || text.trim() === '' }, t('send'))))

  return h(NanoDialog, {
    copy,
    title: detail?.title || detail?.session_id || sessionId,
    description: status,
    width: 640,
    maxHeight: 620,
    footer,
    onConfirm: onClose,
    onCancel: onClose,
  }, h('div', { className: 'dncs-session-root' }, body))
}
