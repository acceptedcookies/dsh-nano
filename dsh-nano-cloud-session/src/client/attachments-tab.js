/** External cloud-attachments tab body: a verified-registration read through
 *  the host route, native primitives only, loading/empty/error+retry states,
 *  and target-scoped stale-response guards. Never renders message content. */
import React from 'react'
import {
  Button,
  IconDownloadOutlineRegular,
  IconPaperclipOutlineRegular,
  IconRefreshOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'

import { safeUrl } from './safe-url.js'

const { createElement: h, useEffect, useRef, useState } = React

export function CloudAttachmentsTab({ useSession, fetchAttachments, t }) {
  const sessionId = useSession?.(s => s.sessionId)
  const [state, setState] = useState({ status: 'loading', items: [], error: '' })
  const gen = useRef(0)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  const load = () => {
    const generation = ++gen.current
    setState({ status: 'loading', items: [], error: '' })
    fetchAttachments(sessionId).then((res) => {
      if (!mounted.current || gen.current !== generation) return
      const items = Array.isArray(res?.items) ? res.items : []
      setState({ status: 'ready', items, error: '' })
    }).catch((error) => {
      if (!mounted.current || gen.current !== generation) return
      setState({ status: 'error', items: [], error: error?.message ?? 'failed' })
    })
  }
  useEffect(load, [sessionId])

  const { status, items, error } = state
  return h('div', { className: 'dncs-attach-tab' },
    h('div', { className: 'dncs-attach-head' },
      h('span', { className: 'dncs-attach-title' }, t('attachmentsTitle')),
      h(Button, {
        variant: 'ghost', size: 'sm', disabled: status === 'loading', onClick: load,
        'aria-label': t('refresh'), title: t('refresh'),
      }, h(IconRefreshOutlineRegular, { size: 14 }))),
    status === 'error' && h('div', { className: 'dncs-attach-state', role: 'alert' },
      h('span', null, `${t('attachmentsLoadFailed')} ${error}`),
      h(Button, { variant: 'outline', size: 'sm', onClick: load }, t('retry'))),
    status === 'loading' && items.length === 0
      && h('div', { className: 'dncs-attach-state', role: 'status', 'aria-busy': 'true' }, t('loading')),
    status === 'ready' && items.length === 0
      && h('div', { className: 'dncs-attach-state' }, t('attachmentsEmpty')),
    h('ul', { className: 'dncs-attach-list' }, items.map((item, index) => {
      const url = safeUrl(item.url)
      const name = String(item.name ?? item.attachment_id ?? `attachment-${index}`)
      return h('li', { key: item.attachment_id ?? index, className: 'dncs-attach-row' },
        h(IconPaperclipOutlineRegular, { size: 14, className: 'dncs-attach-icon' }),
        h('span', { className: 'dncs-attach-name', title: name }, name),
        item.content_type && h('span', { className: 'dncs-attach-type' }, String(item.content_type)),
        url === null ? null : h('a', {
          href: url, target: '_blank', rel: 'noopener noreferrer', download: name,
          className: 'dncs-attach-open', title: t('openAttachment'), 'aria-label': `${t('openAttachment')} ${name}`,
        }, h(IconDownloadOutlineRegular, { size: 14 })))
    })),
    status === 'loading' && items.length > 0
      && h('div', { className: 'dncs-attach-state', role: 'status', 'aria-busy': 'true' }, t('loading')))
}
