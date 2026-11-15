/** New cloud session, shown in a native NanoDialog. */
import React from 'react'
import { NanoDialog } from 'dsh-nano-ui'
import { Button, Input, IconPlusOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { api } from './api.js'

const { createElement: h, useState } = React

export function NewSessionDialog({ face, onClose, onCreated }) {
  const t = face.t
  const [form, setForm] = useState({ prompt: '', title: '', repos: '', devin_mode: '', max_acu_limit: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const set = key => event => setForm({ ...form, [key]: event.currentTarget.value })

  const create = async () => {
    if (form.prompt.trim() === '' || busy) return
    setBusy(true); setError('')
    try {
      const result = await api.create({
        prompt: form.prompt,
        title: form.title || undefined,
        repos: form.repos.split('\n').map(value => value.trim()).filter(Boolean),
        devin_mode: form.devin_mode || undefined,
        max_acu_limit: form.max_acu_limit ? Number(form.max_acu_limit) : undefined,
        resumable: true,
        tags: ['dsh-dncs'],
      })
      const id = result.session_id ?? result.id
      face.refresh()
      if (id != null) onCreated?.(id)
      else onClose()
    } catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const copy = { cancel: t('cancel'), confirm: t('create'), close: t('close') }
  const body = h('div', { className: 'dncs-settings-panel' },
    error === '' ? null : h('div', { className: 'dncs-note', 'data-kind': 'error' }, error),
    h('div', { className: 'dncs-field-row' },
      h('span', { className: 'dncs-field-label' }, `${t('prompt')} *`),
      h(Input, { value: form.prompt, placeholder: t('promptPlaceholder'), onChange: set('prompt') })),
    h('div', { className: 'dncs-field-row' },
      h('span', { className: 'dncs-field-label' }, t('titleField')),
      h(Input, { value: form.title, onChange: set('title') })),
    h('div', { className: 'dncs-field-row' },
      h('span', { className: 'dncs-field-label' }, t('repos')),
      h(Input, { value: form.repos, placeholder: 'owner/repo', onChange: set('repos') })),
    h('div', { className: 'dncs-field-row' },
      h('span', { className: 'dncs-field-label' }, t('devinMode')),
      h(Input, { value: form.devin_mode, placeholder: 'default / lite / normal / fast / ultra / fusion', onChange: set('devin_mode') })),
    h('div', { className: 'dncs-field-row' },
      h('span', { className: 'dncs-field-label' }, t('maxAcu')),
      h(Input, { type: 'number', value: form.max_acu_limit, onChange: set('max_acu_limit') })))

  return h(NanoDialog, {
    copy,
    title: t('newSession'),
    width: 560,
    maxHeight: 560,
    confirmDisabled: form.prompt.trim() === '' || busy,
    busy,
    onConfirm: create,
    onCancel: onClose,
    confirmLabel: t('create'),
  }, h('div', { className: 'dncs-new-root' }, body))
}
