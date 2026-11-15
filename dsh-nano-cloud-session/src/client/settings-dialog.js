/** Cloud-session settings modal. Native NanoDialog + nanoTabs; every control
 *  is a dsh primitive Button/Input and every glyph is dsh artwork. */
import React from 'react'
import { NanoDialog, nanoTabs } from 'dsh-nano-ui'
import {
  Button,
  Input,
  IconCodeOutlineRegular,
  IconRefreshOutlineRegular,
  IconShieldOutlineRegular,
  IconUserOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { api } from './api.js'

const { createElement: h, useEffect, useRef, useState } = React

function field(label, control) {
  return h('div', { className: 'dncs-field-row' },
    h('span', { className: 'dncs-field-label' }, label),
    control)
}

export function SettingsDialog({ face, onClose }) {
  const t = face.t
  const [profiles, setProfiles] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [security, setSecurity] = useState(null)
  const [sshKey, setSshKey] = useState(null)
  const [form, setForm] = useState({ label: '', orgId: '', secret: '', baseUrl: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const tabsHost = useRef(null)
  const credPanel = useRef(null)
  const secPanel = useRef(null)
  const sshPanelRef = useRef(null)

  const load = async () => {
    try {
      const status = await api.status()
      setProfiles(status.profiles ?? [])
      setActiveId(status.activeId ?? null)
      const sec = await api.config('security').catch(() => null)
      setSecurity(sec?.security ?? null)
      setError('')
    } catch (cause) {
      setError(cause?.message ?? String(cause))
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (tabsHost.current == null || credPanel.current == null || secPanel.current == null || sshPanelRef.current == null) return
    const tabs = nanoTabs({
      label: t('settingsTitle'),
      value: 'credentials',
      items: [
        { value: 'credentials', label: t('tabCredentials'), panel: credPanel.current },
        { value: 'security', label: t('tabSecurity'), panel: secPanel.current },
        { value: 'ssh', label: t('tabSsh'), panel: sshPanelRef.current },
      ],
    })
    tabsHost.current.append(tabs.el)
    return () => tabs.el.remove()
  }, [])

  const save = async () => {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try {
      await api.config('save', { profile: { label: form.label, orgId: form.orgId, secret: form.secret || undefined, baseUrl: form.baseUrl || undefined } })
      setForm({ label: '', orgId: '', secret: '', baseUrl: '' })
      setNotice(t('saved'))
      await load()
      face.refresh()
    } catch (cause) {
      setError(cause?.message ?? String(cause))
    } finally { setBusy(false) }
  }

  const test = async id => {
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await api.config('test', { profileId: id })
      const org = result.orgMatch === false ? ` · ${t('orgMatchWarn')} (${result.self?.devin_sessions_org_id ?? '?'})` : result.orgMatch === true ? ` · ${t('orgMatchOk')}` : ''
      setNotice(`${result.self?.principal_type ?? ''} ${result.self?.api_key_name ?? ''} ${result.self?.devin_sessions_org_id ?? ''}${org}`.trim() || t('testOk'))
    } catch (cause) {
      setError(cause?.message ?? String(cause))
    } finally { setBusy(false) }
  }

  const activate = async id => {
    setBusy(true); setError('')
    try { await api.config('activate', { profileId: id }); await load(); face.refresh() }
    catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const remove = async id => {
    if (!window.confirm(t('deleteConfirm'))) return
    setBusy(true); setError('')
    try { await api.config('remove', { profileId: id }); await load(); face.refresh() }
    catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const makeSshKey = async () => {
    setBusy(true); setError('')
    try { setSshKey(await api.config('ssh-key')) }
    catch (cause) { setError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const copy = { cancel: t('cancel'), confirm: t('save'), close: t('close') }
  const profileCards = profiles.length === 0
    ? h('div', { className: 'dncs-note' }, t('guideTitle'), ' · ', t('guideStep1'), ' ', t('guideStep2'), ' ', t('guideStep3'))
    : profiles.map(profile => h('div', {
      key: profile.id,
      className: 'dncs-profile-card',
      'data-active': profile.active === true ? 'true' : undefined,
    },
      h('div', { className: 'dncs-profile-head' },
        h(IconUserOutlineRegular, { size: 16 }),
        h('b', null, profile.label),
        profile.active === true ? h('span', { className: 'dncs-profile-meta' }, t('active')) : null),
      h('div', { className: 'dncs-profile-meta' }, profile.orgId, ' · ', profile.baseUrl, ' · ', profile.hasSecret ? 'token ••••' : 'no token'),
      h('div', { className: 'dncs-profile-actions' },
        h(Button, { variant: 'outline', size: 'sm', onClick: () => test(profile.id), disabled: busy }, t('test')),
        profile.active === true ? null : h(Button, { variant: 'outline', size: 'sm', onClick: () => activate(profile.id), disabled: busy }, t('activate')),
        profile.active === true ? null : h(Button, { variant: 'outline', size: 'sm', onClick: () => remove(profile.id), disabled: busy }, t('delete')))))

  const credentials = h('div', { className: 'dncs-settings-panel' },
    profileCards,
    h('b', null, t('profileNew')),
    field(t('label'), h(Input, { value: form.label, onChange: e => setForm({ ...form, label: e.currentTarget.value }) })),
    field(t('orgId'), h(Input, { value: form.orgId, onChange: e => setForm({ ...form, orgId: e.currentTarget.value }), placeholder: 'org-…' })),
    field(t('token'), h(Input, { type: 'password', value: form.secret, onChange: e => setForm({ ...form, secret: e.currentTarget.value }), placeholder: 'cog_…' })),
    h('div', { className: 'dncs-profile-meta' }, t('tokenHint')),
    field(t('baseUrl'), h(Input, { value: form.baseUrl, onChange: e => setForm({ ...form, baseUrl: e.currentTarget.value }), placeholder: 'https://api.devin.ai' })),
    h(Button, { variant: 'primary', onClick: save, disabled: busy }, t('save')))

  const securityPanel = h('div', { className: 'dncs-settings-panel' },
    h('div', { className: 'dncs-profile-head' }, h(IconShieldOutlineRegular, { size: 16 }), h('b', null, t('secTitle'))),
    security == null ? h('div', { className: 'dncs-note' }, t('loading')) : h('dl', { className: 'dncs-kv' },
      h('dt', null, t('secStore')), h('dd', { className: 'dncs-code' }, security.storePath),
      h('dt', null, t('secMode')), h('dd', null, security.storeMode ?? '—'),
      h('dt', null, t('secEnv')), h('dd', { className: 'dncs-code' }, `${security.seededFromEnv ? t('secSeeded') : t('secNotSeeded')} · ${security.envPath}`),
      h('dt', null, t('secPolicy')), h('dd', null, security.secretPolicy)))

  const sshPanel = h('div', { className: 'dncs-settings-panel' },
    h('div', { className: 'dncs-profile-head' }, h(IconCodeOutlineRegular, { size: 16 }), h('b', null, t('sshLane'))),
    h(Button, { variant: 'outline', size: 'sm', onClick: makeSshKey, disabled: busy }, t('genKey')),
    sshKey == null ? null : h('div', null,
      h('div', { className: 'dncs-profile-meta' }, t('pubkeyLabel')),
      h('div', { className: 'dncs-code' }, sshKey.publicKey),
      h('div', { className: 'dncs-inline' },
        h(Button, { variant: 'outline', size: 'sm', onClick: () => navigator.clipboard?.writeText(sshKey.publicKey).catch(() => {}) }, t('copy'))),
      h('div', { className: 'dncs-profile-meta' }, t('enrollSteps'))))

  return h(NanoDialog, {
    copy,
    title: t('settingsTitle'),
    footer: h(Button, { variant: 'outline', onClick: onClose }, t('close')),
    onConfirm: onClose,
    onCancel: onClose,
  },
    h('div', { className: 'dncs-settings-root' },
      h('div', { ref: tabsHost, className: 'dncs-tabs-host' }),
      h('div', { ref: credPanel }, credentials),
      h('div', { ref: secPanel }, securityPanel),
      h('div', { ref: sshPanelRef }, sshPanel),
      error === '' ? null : h('div', { className: 'dncs-note', 'data-kind': 'error' }, error),
      notice === '' ? null : h('div', { className: 'dncs-note' }, notice)))
}
