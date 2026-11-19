/** New cloud session. Native NanoDialog; all buttons are primitive Button,
 *  all glyphs are dsh artwork. The form exposes the complete documented
 *  SessionCreateRequest surface, with browser-local defaults pre-filled. */
import React from 'react'
import { NanoDialog } from 'dsh-nano-ui'
import { Button, Input, IconGlobeOutlineRegular, IconPlusOutlineRegular, IconRefreshOutlineRegular, IconPaperclipOutlineRegular } from '@deepseek-ai/dsh-client-ui-primitives'
import { api } from './api.js'
import { readPrefs } from './prefs.js'
import { formToCreateInput } from '../providers/devin/profile-codec.js'

const { createElement: h, useEffect, useRef, useState } = React

const lines = value => String(value ?? '').split('\n').map(item => item.trim()).filter(Boolean)

function field(label, control, hint) {
  return h('div', { className: 'dncs-field-row' },
    h('span', { className: 'dncs-field-label' }, label),
    control,
    hint == null ? null : h('div', { className: 'dncs-profile-meta' }, hint))
}

function Picker({ title, items, selected, onToggle, labelOf }) {
  if (!items || items.length === 0) return null
  return h('div', { className: 'dncs-picker' },
    h('div', { className: 'dncs-profile-meta' }, title),
    h('div', { className: 'dncs-picker-items' }, items.slice(0, 40).map(item => h(Button, {
      key: item.id,
      variant: selected.includes(item.id) ? 'primary' : 'outline',
      size: 'sm',
      onClick: () => onToggle(item.id),
      title: item.id,
    }, labelOf(item)))))
}

export function NewSessionDialog({ face, onClose, onCreated }) {
  const t = face.t
  const prefs = readPrefs()
  /* The carrier profile is frozen when the dialog opens: catalog, create,
   * uploads and the post-create open all target the same profile even if the
   * sidebar selection changes mid-dialog. */
  const [boundProfile] = useState(() => face.current?.activeId ?? null)
  const [form, setForm] = useState({
    prompt: '',
    title: '',
    repos: prefs.repos,
    tags: prefs.tags,
    devinMode: prefs.devinMode,
    maxAcuLimit: prefs.maxAcuLimit,
    resumable: 'true',
    playbookId: prefs.playbookId,
    knowledgeIds: [],
    secretIds: [],
    attachmentUrls: [],
    createAsUserId: '',
    childPlaybookId: '',
    platform: '',
    bypassApproval: '',
    memoryEnabled: '',
    sessionLinks: '',
    securityProfileMode: 'inherit',
    securityProfileId: '',
    structuredOutputSchema: '',
    structuredOutputRequired: '',
    sessionSecrets: '',
    attachmentUrl: '',
    manualKnowledge: '',
    manualSecret: '',
  })
  const [catalog, setCatalog] = useState({ playbooks: [], knowledge: [], secrets: [], repositories: [] })
  const [catalogError, setCatalogError] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const set = key => event => setForm({ ...form, [key]: event.currentTarget.value })
  const toggle = key => id => setForm({
    ...form,
    [key]: form[key].includes(id) ? form[key].filter(item => item !== id) : [...form[key], id],
  })

  useEffect(() => {
    let alive = true
    const resources = ['playbooks', 'knowledge', 'secrets', 'repositories']
    Promise.all(resources.map(resource => api.catalog(resource, { first: 100, ...(boundProfile == null ? {} : { profileId: boundProfile }) }).catch(cause => ({ ok: false, message: cause?.message }))))
      .then(results => {
        if (!alive) return
        const next = {}
        results.forEach((result, index) => { next[resources[index]] = result?.items ?? [] })
        setCatalog(next)
        const failures = results.filter(result => result?.ok === false)
        if (failures.length > 0) setCatalogError(failures.map(item => item.message).filter(Boolean).join(' · '))
      })
      .catch(cause => { if (alive) setCatalogError(cause?.message ?? String(cause)) })
    return () => { alive = false }
  }, [])

  const addRepo = () => {
    if (!form.manualRepo.trim()) return
    setForm({ ...form, repos: [form.repos, form.manualRepo.trim()].filter(Boolean).join('\n'), manualRepo: '' })
  }

  const addKnowledge = () => {
    if (!form.manualKnowledge.trim()) return
    setForm({ ...form, knowledgeIds: [...new Set([...form.knowledgeIds, form.manualKnowledge.trim()])], manualKnowledge: '' })
  }

  const addSecret = () => {
    if (!form.manualSecret.trim()) return
    setForm({ ...form, secretIds: [...new Set([...form.secretIds, form.manualSecret.trim()])], manualSecret: '' })
  }

  const addAttachmentUrl = () => {
    if (!form.attachmentUrl || !form.attachmentUrl.trim()) return
    setForm({ ...form, attachmentUrls: [...new Set([...form.attachmentUrls, form.attachmentUrl.trim()])], attachmentUrl: '' })
  }

  const uploadFile = async event => {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (!file) return
    if (file.size > 16 * 1024 * 1024) { setError(t('attachmentTooLarge')); return }
    setBusy(true); setError('')
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      let binary = ''
      for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000))
      const result = await api.upload(file.name, file.type, btoa(binary), boundProfile == null ? {} : { profileId: boundProfile })
      const url = result?.attachment?.url
      if (url) setForm({ ...form, attachmentUrls: [...new Set([...form.attachmentUrls, url])] })
    } catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const create = async () => {
    if (form.prompt.trim() === '' || busy) return
    setBusy(true); setError('')
    try {
      const input = formToCreateInput(form)
      const result = await api.create(boundProfile == null ? input : { ...input, profileId: boundProfile })
      const id = result.session_id ?? result.id
      face.refresh()
      if (id != null) onCreated?.(id, { profileId: boundProfile })
      else onClose()
    } catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const copy = { cancel: t('cancel'), confirm: t('create'), close: t('close') }
  const body = h('div', { className: 'dncs-settings-panel' },
    error === '' ? null : h('div', { className: 'dncs-note', 'data-kind': 'error' }, error),
    catalogError === '' ? null : h('div', { className: 'dncs-profile-meta' }, `${t('catalogUnavailable')}: ${catalogError}`),
    h('div', { className: 'dncs-profile-head' }, h(IconGlobeOutlineRegular, { size: 16 }), h('b', null, t('carrierDevin'))),
    field(`${t('prompt')} *`, h('textarea', { className: 'dncs-textarea', value: form.prompt, placeholder: t('promptPlaceholder'), onChange: set('prompt') })),
    field(t('titleField'), h(Input, { value: form.title, onChange: set('title') })),
    field(t('repos'), h('textarea', { className: 'dncs-textarea', value: form.repos, placeholder: 'owner/repo（每行一个）', onChange: set('repos') })),
    field(t('tags'), h(Input, { value: form.tags, placeholder: 'tag-a, tag-b', onChange: set('tags') })),
    field(t('devinMode'), h(Input, { value: form.devinMode, placeholder: 'normal / fast / lite / ultra / fusion', onChange: set('devinMode') })),
    field(t('maxAcu'), h(Input, { type: 'number', value: form.maxAcuLimit, onChange: set('maxAcuLimit') })),
    field(t('resumable'), h(Input, { value: form.resumable, placeholder: 'true / false', onChange: set('resumable') })),
    h('div', { className: 'dncs-profile-head' }, h(IconPlusOutlineRegular, { size: 16 }), h('b', null, t('contextTitle'))),
    Picker({ title: t('playbooks'), items: catalog.playbooks.map(item => ({ id: item.playbook_id, label: item.title || item.playbook_id })), selected: form.playbookId ? [form.playbookId] : [], onToggle: id => setForm({ ...form, playbookId: form.playbookId === id ? '' : id }), labelOf: item => item.label }),
    Picker({ title: t('knowledge'), items: catalog.knowledge.map(item => ({ id: item.note_id, label: item.name || item.note_id })), selected: form.knowledgeIds, onToggle: toggle('knowledgeIds'), labelOf: item => item.label }),
    Picker({ title: t('secrets'), items: catalog.secrets.map(item => ({ id: item.secret_id, label: item.key || item.secret_id })), selected: form.secretIds, onToggle: toggle('secretIds'), labelOf: item => item.label }),
    Picker({ title: t('repositories'), items: catalog.repositories.map(item => ({ id: item.repo_full_name || item.repo_path, label: item.repo_full_name || item.repo_path })), selected: lines(form.repos), onToggle: id => setForm({ ...form, repos: (lines(form.repos).includes(id) ? lines(form.repos).filter(item => item !== id) : [...lines(form.repos), id]).join('\n') }), labelOf: item => item.label }),
    field(t('manualKnowledge'), h('div', { className: 'dncs-inline' }, h(Input, { value: form.manualKnowledge, onChange: set('manualKnowledge') }), h(Button, { variant: 'outline', size: 'sm', onClick: addKnowledge }, t('add')))),
    field(t('manualSecret'), h('div', { className: 'dncs-inline' }, h(Input, { value: form.manualSecret, onChange: set('manualSecret') }), h(Button, { variant: 'outline', size: 'sm', onClick: addSecret }, t('add')))),
    h('div', { className: 'dncs-profile-head' }, h(IconPaperclipOutlineRegular, { size: 16 }), h('b', null, t('attachmentsTitle'))),
    h('div', { className: 'dncs-profile-actions' },
      h(Button, { variant: 'outline', size: 'sm', onClick: () => fileRef.current?.click(), disabled: busy }, t('uploadAttachment')),
      h('input', { ref: fileRef, type: 'file', hidden: true, onChange: uploadFile })),
    h('div', { className: 'dncs-profile-actions' },
      h(Input, { value: form.attachmentUrl ?? '', placeholder: 'https://…', onChange: set('attachmentUrl') }),
      h(Button, { variant: 'outline', size: 'sm', onClick: addAttachmentUrl }, t('add'))),
    form.attachmentUrls.length === 0 ? null : h('ul', { className: 'dncs-list' }, form.attachmentUrls.map(url => h('li', { key: url }, h('span', { className: 'dncs-code' }, url)))),
    h('div', { className: 'dncs-profile-head' }, h(IconRefreshOutlineRegular, { size: 16 }), h('b', null, t('advancedTitle'))),
    field(t('createAsUserId'), h(Input, { value: form.createAsUserId, onChange: set('createAsUserId') })),
    field(t('childPlaybookId'), h(Input, { value: form.childPlaybookId, onChange: set('childPlaybookId') })),
    field(t('platform'), h(Input, { value: form.platform, placeholder: 'windows / outpost-pool', onChange: set('platform') })),
    field(t('bypassApproval'), h(Input, { value: form.bypassApproval, placeholder: 'true / false', onChange: set('bypassApproval') })),
    field(t('memoryEnabled'), h(Input, { value: form.memoryEnabled, placeholder: 'true / false', onChange: set('memoryEnabled') })),
    field(t('sessionLinks'), h(Input, { value: form.sessionLinks, placeholder: 'url-a, url-b', onChange: set('sessionLinks') })),
    field(t('securityProfile'), h('div', { className: 'dncs-inline' },
      ['inherit', 'custom', 'none'].map(mode => h(Button, {
        key: mode,
        variant: form.securityProfileMode === mode ? 'primary' : 'outline',
        size: 'sm',
        onClick: () => setForm({ ...form, securityProfileMode: mode }),
      }, t(`securityProfile_${mode}`))),
      form.securityProfileMode === 'custom'
        ? h(Input, { value: form.securityProfileId, placeholder: 'profile-…', onChange: set('securityProfileId') })
        : null)),
    field(t('structuredOutputSchema'), h('textarea', { className: 'dncs-textarea', value: form.structuredOutputSchema, placeholder: 'JSON Schema Draft 7', onChange: set('structuredOutputSchema') })),
    field(t('structuredOutputRequired'), h(Input, { value: form.structuredOutputRequired, placeholder: 'true / false', onChange: set('structuredOutputRequired') })),
    field(t('sessionSecrets'), h('textarea', { className: 'dncs-textarea', value: form.sessionSecrets, placeholder: '[{"key":"…","value":"…","sensitive":true}]', onChange: set('sessionSecrets') })))

  return h(NanoDialog, {
    copy,
    title: t('newSession'),
    // The old card was 600×680: 560 is the nearest NanoDialog width preset and
    // 640 the tallest height preset, so the form keeps its scrolling body.
    width: 560,
    fixedHeight: 640,
    confirmDisabled: form.prompt.trim() === '' || busy,
    busy,
    onConfirm: create,
    onCancel: onClose,
    confirmLabel: t('create'),
  }, h('div', { className: 'dncs-new-root' }, body))
}
