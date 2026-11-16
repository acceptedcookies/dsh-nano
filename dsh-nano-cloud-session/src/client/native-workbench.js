/** Native workbench page for one Devin carrier session.
 *  This is deliberately a right-side workbench tab, not a chat surface:
 *  Chat belongs to conversation.view / ui-chat; this page only owns the
 *  carrier-specific details, attachments, tags and lifecycle actions. */
import React from 'react'
import {
  Button, Input,
  IconAlarmClockOutlineRegular,
  IconArchiveOutlineRegular,
  IconChecklistOutlineRegular,
  IconDataOutlineRegular,
  IconLinkOutlineRegular,
  IconPaperclipOutlineRegular,
  IconRefreshOutlineRegular,
  IconUnarchiveOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { api } from './api.js'

const { createElement: h, useEffect, useState } = React
const ID = 'dsh-nano-cloud-session.workbench'
const KIND = 'devin-workbench'

const remoteByLocal = new Map()
/** Remember the remote Devin id for a local projection session. */
export const rememberWorkbenchSession = (localId, remoteId) => { remoteByLocal.set(localId, remoteId) }

const textOf = value => {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try { return JSON.stringify(value, null, 2) } catch { return String(value) }
}

function WorkbenchBody(props) {
  const { useTabInfo, sessionId, t, openTerminal } = props
  const { tab } = useTabInfo()
  const remoteId = remoteByLocal.get(sessionId) ?? tab?.navigation?.params?.remoteId
  const [detail, setDetail] = useState(null)
  const [attachments, setAttachments] = useState([])
  const [tags, setTags] = useState([])
  const [tagText, setTagText] = useState('')
  const [insights, setInsights] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const load = async ({ quiet = false } = {}) => {
    if (!remoteId) return
    try {
      const [info, files, currentTags, currentInsights] = await Promise.all([
        api.session('get', { session_id: remoteId }),
        api.session('attachments', { session_id: remoteId }).catch(() => []),
        api.session('tags', { session_id: remoteId }).catch(() => ({ tags: [] })),
        api.session('insights', { session_id: remoteId }).catch(() => null),
      ])
      setDetail(info)
      setAttachments(Array.isArray(files) ? files : (files?.items ?? []))
      setTags(currentTags?.tags ?? [])
      setTagText((currentTags?.tags ?? []).join(', '))
      setInsights(currentInsights)
      if (!quiet) setError('')
    } catch (cause) { if (!quiet) setError(cause?.message ?? String(cause)) }
  }

  useEffect(() => {
    void load()
    const timer = window.setInterval(() => { void load({ quiet: true }) }, 3000)
    return () => window.clearInterval(timer)
  }, [remoteId, tab?.navigation?.revision])

  const action = async fn => {
    setBusy(true); setError(''); setNotice('')
    try { await fn(); await load(); setNotice(t('accessSaved')) }
    catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }
  const saveTags = async replace => {
    setBusy(true); setError(''); setNotice('')
    try {
      await api.session(replace ? 'set_tags' : 'append_tags', {
        session_id: remoteId,
        tags: tagText.split(',').map(item => item.trim()).filter(Boolean),
      })
      await load(); setNotice(replace ? t('tagsReplaced') : t('tagsAppended'))
    } catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }
  const uploadFile = async file => {
    if (!file || !remoteId) return
    if (file.size > 16 * 1024 * 1024) { setError(t('attachmentTooLarge')); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const data = await file.arrayBuffer()
      const bytes = new Uint8Array(data)
      let binary = ''
      for (const byte of bytes) binary += String.fromCharCode(byte)
      const uploaded = await api.upload(file.name, file.type || 'application/octet-stream', btoa(binary))
      const url = uploaded?.attachment?.url
      if (!url) throw new Error(t('attachmentsEmpty'))
      await api.message(remoteId, `ATTACHMENT:"${url}"\n${file.name}`)
      await load()
      setNotice(t('uploadSent'))
    } catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }
  const generate = async () => {
    setBusy(true); setError(''); setNotice('')
    try { await api.session('generate_insights', { session_id: remoteId }); await load(); setNotice(t('insightsQueued')) }
    catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  if (!remoteId) return h('div', { className: 'dncs-note' }, t('accessIntro'))
  return h('div', { className: 'dncs-working-page' },
    h('div', { className: 'dncs-working-head' },
      h('div', null,
        h('div', { className: 'dncs-working-title' }, detail?.title || t('carrierDevin')),
        h('div', { className: 'dncs-working-meta' }, detail ? `${detail.status ?? ''}${detail.status_detail ? ` · ${detail.status_detail}` : ''} · ACU ${detail.acus_consumed ?? 0} · ${detail.devin_mode ?? ''}` : t('loading'))),
      h('div', { className: 'dncs-profile-actions' },
        h(Button, { variant: 'ghost', size: 'sm', icon: h(IconRefreshOutlineRegular, { size: 16 }), onClick: load, 'aria-label': t('refresh') }),
        h(Button, { variant: 'ghost', size: 'sm', onClick: () => openTerminal?.(sessionId), 'aria-label': t('terminal') }, t('terminal')),
        h(Button, { variant: 'ghost', size: 'sm', icon: h(IconAlarmClockOutlineRegular, { size: 16 }), onClick: () => action(() => api.session('sleep', { session_id: remoteId })), 'aria-label': t('sleep') }),
        h(Button, { variant: 'ghost', size: 'sm', icon: h(detail?.is_archived ? IconUnarchiveOutlineRegular : IconArchiveOutlineRegular, { size: 16 }), onClick: () => action(() => detail?.is_archived ? api.unarchive(remoteId) : api.archive(remoteId)), 'aria-label': detail?.is_archived ? t('unarchive') : t('archive') }),
        h(Button, { variant: 'ghost', size: 'sm', onClick: () => { if (window.confirm(t('terminateConfirm'))) action(() => api.terminate(remoteId)) }, 'aria-label': t('terminate') }, t('terminate')),
      )),
    error === '' ? null : h('div', { className: 'dncs-note', 'data-kind': 'error' }, error),
    notice === '' ? null : h('div', { className: 'dncs-note' }, notice),
    h('div', { className: 'dncs-working-section' },
      h('div', { className: 'dncs-working-section-title' },
        h(IconPaperclipOutlineRegular, { size: 15 }),
        t('attachmentsTitle'),
        h('span', { className: 'dncs-working-kind' }, String(attachments.length))),
      h('div', { className: 'dncs-profile-actions' },
        h(Button, { variant: 'outline', size: 'sm', disabled: busy, onClick: () => {
          const input = document.createElement('input')
          input.type = 'file'
          input.onchange = () => { const file = input.files?.[0]; if (file) void uploadFile(file) }
          input.click()
        } }, t('uploadAttachment'))),
      h('div', { className: 'dncs-note' }, t('attachmentsCloudHint')),
      attachments.length === 0 ? h('div', { className: 'dncs-note' }, t('attachmentsEmpty')) : h('div', { className: 'dncs-file-list', role: 'list' }, attachments.map(item => h('div', { key: item.attachment_id || item.url, className: 'dncs-working-row', role: 'listitem', title: item.name },
        h(IconPaperclipOutlineRegular, { size: 15 }),
        h('span', { className: 'dncs-working-name' }, item.name || item.attachment_id),
        h('span', { className: 'dncs-working-kind' }, item.content_type || item.source || ''),
        h(Button, { variant: 'ghost', size: 'sm', icon: h(IconLinkOutlineRegular, { size: 14 }), onClick: () => item.url && window.open(item.url, '_blank', 'noreferrer'), 'aria-label': t('open') }))))),
    h('div', { className: 'dncs-working-section' },
      h('div', { className: 'dncs-working-section-title' }, h(IconChecklistOutlineRegular, { size: 15 }), t('tagsTitle')),
      h(Input, { value: tagText, placeholder: 'tag-a, tag-b', onChange: event => setTagText(event.currentTarget.value) }),
      h('div', { className: 'dncs-profile-actions' },
        h(Button, { variant: 'outline', size: 'sm', onClick: () => saveTags(false), disabled: busy }, t('tagsAppend')),
        h(Button, { variant: 'primary', size: 'sm', onClick: () => saveTags(true), disabled: busy }, t('tagsReplace'))),
      tags.length === 0 ? null : h('div', { className: 'dncs-note' }, tags.join(' · '))),
    h('div', { className: 'dncs-working-section' },
      h('div', { className: 'dncs-working-section-title' }, h(IconDataOutlineRegular, { size: 15 }), t('insightsTitle')),
      h(Button, { variant: 'outline', size: 'sm', icon: h(IconRefreshOutlineRegular, { size: 14 }), onClick: generate, disabled: busy }, t('generateInsights')),
      insights == null ? h('div', { className: 'dncs-note' }, t('insightsEmpty')) : h('div', { className: 'dncs-note' }, t('insightsReady'))),
    detail?.url ? h('div', { className: 'dncs-working-section' },
      h(Button, { variant: 'outline', size: 'sm', icon: h(IconLinkOutlineRegular, { size: 14 }), onClick: () => window.open(detail.url, '_blank', 'noreferrer') }, t('openInWebapp'))) : null)
}

/** Register the real workbench tab type and its body. */
export function registerNativeWorkbench(ctx, t) {
  const openTerminal = sessionId => {
    const cwd = ctx.sessions?.list?.getSnapshot?.().byId?.[sessionId]?.cwd
    const dnt = ctx.get?.('nanoTerminal')
    if (dnt?.openLocal) { dnt.openLocal(sessionId, cwd); return }
    ctx.sidebarRight.openTabIn(sessionId, 'terminal')
  }
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: ID,
    kind: KIND,
    priority: 'extension',
    keepMounted: true,
    title: () => t('carrierDevin'),
  }), 'nano-cloud-session: workbench type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: ID,
    inject: () => ({ t, openTerminal }),
  }, WorkbenchBody)), 'nano-cloud-session: workbench body')
  return KIND
}
