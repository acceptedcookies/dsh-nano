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
        api.session('attachments', { session_id: remoteId }).catch(() => ({ items: [] })),
        api.session('tags', { session_id: remoteId }).catch(() => ({ tags: [] })),
        api.session('insights', { session_id: remoteId }).catch(() => null),
      ])
      setDetail(info)
      setAttachments(files?.items ?? files ?? [])
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
      h('div', { className: 'dncs-working-section-title' }, h(IconPaperclipOutlineRegular, { size: 15 }), t('attachmentsTitle')),
      attachments.length === 0 ? h('div', { className: 'dncs-note' }, t('attachmentsEmpty')) : attachments.map(item => h('div', { key: item.attachment_id, className: 'dncs-working-row' },
        h('span', { className: 'dncs-working-name' }, item.name),
        h('span', { className: 'dncs-working-meta' }, `${item.source ?? ''} · ${item.content_type ?? ''}`),
        h(Button, { variant: 'ghost', size: 'sm', icon: h(IconLinkOutlineRegular, { size: 14 }), onClick: () => window.open(item.url, '_blank', 'noreferrer'), 'aria-label': t('open') })))),
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
      insights == null ? h('div', { className: 'dncs-note' }, t('insightsEmpty')) : h('pre', { className: 'dncs-code dncs-pre' }, textOf(insights))),
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
