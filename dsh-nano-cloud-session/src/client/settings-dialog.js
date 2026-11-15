/** Cloud-session settings modal.
 *
 *  Tabs are deliberately ordered as 接入 / 会话 / 安全 / SSH:
 *  everything needed to connect a carrier lives in the first tab; session
 *  defaults are separate from credentials; security and SSH are read-only or
 *  account-level follow-ups. NanoDialog supplies the native Modal shell and
 *  nanoTabs the native tab contract; every control is a primitive Button/Input
 *  and every glyph is dsh artwork.
 */
import React from 'react'
import { NanoDialog, nanoTabs } from 'dsh-nano-ui'
import {
  Button,
  Input,
  IconCheckCircleOutlineRegular,
  IconCodeOutlineRegular,
  IconGlobeOutlineRegular,
  IconLinkOutlineRegular,
  IconShieldOutlineRegular,
  IconUserOutlineRegular,
} from '@deepseek-ai/dsh-client-ui-primitives'
import { api } from './api.js'
import { DEVIN_PRESET } from './carriers.js'
import { readPrefs, writePrefs } from './prefs.js'

const { createElement: h, useEffect, useRef, useState } = React

function field(label, control) {
  return h('div', { className: 'dncs-field-row' },
    h('span', { className: 'dncs-field-label' }, label),
    control)
}

function note(text, kind) {
  return h('div', { className: 'dncs-note', 'data-kind': kind ?? undefined }, text)
}

export function SettingsDialog({ face, onClose }) {
  const t = face.t
  const [profiles, setProfiles] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [security, setSecurity] = useState(null)
  const [sshKey, setSshKey] = useState(null)
  const [form, setForm] = useState({ id: null, label: '', orgId: '', secret: '', baseUrl: DEVIN_PRESET.auth.defaultBaseUrl })
  const [profileNotice, setProfileNotice] = useState('')
  const [profileError, setProfileError] = useState('')
  const [busy, setBusy] = useState(false)
  const [prefs, setPrefs] = useState(() => readPrefs())
  const [prefsNotice, setPrefsNotice] = useState('')
  const tabsHost = useRef(null)
  const accessPanel = useRef(null)
  const prefsPanel = useRef(null)
  const securityPanelRef = useRef(null)
  const sshPanelRef = useRef(null)

  const load = async () => {
    try {
      const status = await api.status()
      setProfiles(status.profiles ?? [])
      setActiveId(status.activeId ?? null)
      const sec = await api.config('security').catch(() => null)
      setSecurity(sec?.security ?? null)
      setProfileError('')
    } catch (cause) {
      setProfileError(cause?.message ?? String(cause))
    }
  }

  useEffect(() => { void load() }, [])

  useEffect(() => {
    if (tabsHost.current == null || accessPanel.current == null || prefsPanel.current == null
      || securityPanelRef.current == null || sshPanelRef.current == null) return
    const tabs = nanoTabs({
      label: t('settingsTitle'),
      value: 'access',
      items: [
        { value: 'access', label: t('tabAccess'), panel: accessPanel.current },
        { value: 'session', label: t('tabSession'), panel: prefsPanel.current },
        { value: 'security', label: t('tabSecurity'), panel: securityPanelRef.current },
        { value: 'ssh', label: t('tabSsh'), panel: sshPanelRef.current },
      ],
    })
    tabsHost.current.append(tabs.el)
    return () => tabs.el.remove()
  }, [])

  const save = async () => {
    if (busy) return
    setBusy(true); setProfileError(''); setProfileNotice('')
    try {
      const saved = await api.config('save', {
        profile: {
          id: form.id ?? undefined,
          label: form.label,
          orgId: form.orgId,
          secret: form.secret || undefined,
          baseUrl: form.baseUrl || undefined,
        },
      })
      // First profile becomes active immediately; later profiles need an explicit "设为当前".
      if (saved?.profile?.id != null && (activeId == null)) {
        await api.config('activate', { profileId: saved.profile.id })
      }
      setForm({ id: null, label: '', orgId: '', secret: '', baseUrl: DEVIN_PRESET.auth.defaultBaseUrl })
      setProfileNotice(t('accessSaved'))
      await load()
      await face.refresh()
    } catch (cause) {
      setProfileError(cause?.message ?? String(cause))
    } finally { setBusy(false) }
  }

  const test = async id => {
    setBusy(true); setProfileError(''); setProfileNotice('')
    try {
      const result = await api.config('test', { profileId: id })
      const org = result.orgMatch === false ? ` · ${t('orgMatchWarn')} (${result.self?.devin_sessions_org_id ?? '?'})` : result.orgMatch === true ? ` · ${t('orgMatchOk')}` : ''
      setProfileNotice(`${result.self?.principal_type ?? ''} ${result.self?.service_user_name ?? result.self?.api_key_name ?? ''} ${result.self?.devin_sessions_org_id ?? ''}${org}`.trim() || t('testOk'))
    } catch (cause) {
      setProfileError(cause?.message ?? String(cause))
    } finally { setBusy(false) }
  }

  const activate = async id => {
    setBusy(true); setProfileError('')
    try { await api.config('activate', { profileId: id }); await load(); face.refresh() }
    catch (cause) { setProfileError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const remove = async id => {
    if (!window.confirm(t('deleteConfirm'))) return
    setBusy(true); setProfileError('')
    try { await api.config('remove', { profileId: id }); await load(); face.refresh() }
    catch (cause) { setProfileError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const makeSshKey = async () => {
    setBusy(true); setProfileError('')
    try { setSshKey(await api.config('ssh-key')) }
    catch (cause) { setProfileError(cause?.message ?? String(cause)) }
    finally { setBusy(false) }
  }

  const savePrefs = () => {
    writePrefs(prefs)
    setPrefsNotice(t('defaultsSaved'))
    face.refresh()
  }

  const copy = { cancel: t('cancel'), confirm: t('save'), close: t('close') }
  const active = profiles.find(profile => profile.id === activeId) ?? null
  const profileCards = profiles.length === 0
    ? null
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
        h(Button, { variant: 'primary', onClick: () => test(profile.id), disabled: busy }, t('test')),
        h(Button, { variant: 'outline', size: 'sm', onClick: () => setForm({ id: profile.id, label: profile.label, orgId: profile.orgId, secret: '', baseUrl: profile.baseUrl }), disabled: busy }, t('edit')),
        profile.active === true ? null : h(Button, { variant: 'outline', size: 'sm', onClick: () => activate(profile.id), disabled: busy }, t('activate')),
        profile.active === true ? null : h(Button, { variant: 'outline', size: 'sm', onClick: () => remove(profile.id), disabled: busy }, t('delete')))))

  const guide = profiles.length === 0 ? h('div', { className: 'dncs-guide' },
    h('div', { className: 'dncs-profile-head' }, h(IconCheckCircleOutlineRegular, { size: 16 }), h('b', null, t('guideTitle'))),
    ...DEVIN_PRESET.onboardingSteps.map((key, index) => h('div', { className: 'dncs-guide-step', key },
      h('span', { className: 'dncs-guide-num' }, String(index + 1)),
      h('span', null, t(key))))) : null

  const permissions = h('div', { className: 'dncs-preset-block' },
    h('div', { className: 'dncs-profile-head' }, h(IconCheckCircleOutlineRegular, { size: 16 }), h('b', null, t('permissionsTitle'))),
    h('ul', { className: 'dncs-list' },
      h('li', null, t('permissionUse')),
      h('li', null, t('permissionView')),
      h('li', null, t('permissionImpersonate'))))

  const docLinks = h('div', { className: 'dncs-preset-block' },
    h('div', { className: 'dncs-profile-head' }, h(IconLinkOutlineRegular, { size: 16 }), h('b', null, t('docsTitle'))),
    h('div', { className: 'dncs-profile-actions' },
      h(Button, { variant: 'ghost', size: 'sm', onClick: () => window.open(DEVIN_PRESET.docs.api, '_blank', 'noreferrer') }, t('docsApi')),
      h(Button, { variant: 'ghost', size: 'sm', onClick: () => window.open(DEVIN_PRESET.docs.org, '_blank', 'noreferrer') }, t('docsOrg')),
      h(Button, { variant: 'ghost', size: 'sm', onClick: () => window.open(DEVIN_PRESET.docs.ssh, '_blank', 'noreferrer') }, t('docsSsh'))))

  const access = h('div', { className: 'dncs-settings-panel' },
    h('div', { className: 'dncs-preset-card' },
      h('div', { className: 'dncs-profile-head' },
        h(IconGlobeOutlineRegular, { size: 18 }),
        h('b', null, t(DEVIN_PRESET.labelKey)),
        active == null ? h('span', { className: 'dncs-profile-meta' }, t('notConnected')) : h('span', { className: 'dncs-profile-meta' }, t('connected'))),
      h('div', { className: 'dncs-profile-meta' }, t(DEVIN_PRESET.descriptionKey))),
    note(t('accessIntro')),
    guide,
    profileCards,
    h('b', null, t('profileNew')),
    field(t('label'), h(Input, { value: form.label, onChange: e => setForm({ ...form, label: e.currentTarget.value }) })),
    field(t('orgId'), h(Input, { value: form.orgId, onChange: e => setForm({ ...form, orgId: e.currentTarget.value }), placeholder: 'org-…' })),
    field(t('token'), h(Input, { type: 'password', value: form.secret, onChange: e => setForm({ ...form, secret: e.currentTarget.value }), placeholder: 'cog_…' })),
    h('div', { className: 'dncs-profile-meta' }, active == null ? t('tokenHint') : t('tokenKeep')),
    field(t('baseUrl'), h(Input, { value: form.baseUrl, onChange: e => setForm({ ...form, baseUrl: e.currentTarget.value }), placeholder: DEVIN_PRESET.auth.defaultBaseUrl })),
    h('div', { className: 'dncs-profile-actions' },
      h(Button, { variant: 'primary', onClick: save, disabled: busy }, t('saveAndConnect')),
      active == null ? null : h(Button, { variant: 'primary', onClick: () => test(active.id), disabled: busy }, t('test'))),
    profileError === '' ? null : note(profileError, 'error'),
    profileNotice === '' ? null : note(profileNotice),
    permissions,
    docLinks)

  const session = h('div', { className: 'dncs-settings-panel' },
    h('div', { className: 'dncs-profile-head' }, h(IconGlobeOutlineRegular, { size: 16 }), h('b', null, t('defaultsTitle'))),
    h('div', { className: 'dncs-profile-meta' }, t('defaultsHint')),
    field(t('defaultMode'), h(Input, { value: prefs.devinMode, onChange: e => setPrefs({ ...prefs, devinMode: e.currentTarget.value }), placeholder: 'normal / fast / lite / ultra / fusion' })),
    field(t('defaultMaxAcu'), h(Input, { type: 'number', value: prefs.maxAcuLimit, onChange: e => setPrefs({ ...prefs, maxAcuLimit: e.currentTarget.value }) })),
    field(t('defaultTags'), h(Input, { value: prefs.tags, onChange: e => setPrefs({ ...prefs, tags: e.currentTarget.value }), placeholder: 'tag-a, tag-b' })),
    field(t('defaultPlaybook'), h(Input, { value: prefs.playbookId, onChange: e => setPrefs({ ...prefs, playbookId: e.currentTarget.value }), placeholder: 'playbook-…' })),
    field(t('defaultRepos'), h(Input, { value: prefs.repos, onChange: e => setPrefs({ ...prefs, repos: e.currentTarget.value }), placeholder: 'owner/repo' })),
    field(t('pollInterval'), h(Input, { type: 'number', value: prefs.pollIntervalMs, onChange: e => setPrefs({ ...prefs, pollIntervalMs: Number(e.currentTarget.value) || 30000 }) })),
    h('div', { className: 'dncs-profile-actions' }, h(Button, { variant: 'primary', onClick: savePrefs }, t('saveDefaults'))),
    prefsNotice === '' ? null : note(prefsNotice))

  const securityPanel = h('div', { className: 'dncs-settings-panel' },
    h('div', { className: 'dncs-profile-head' }, h(IconShieldOutlineRegular, { size: 16 }), h('b', null, t('secTitle'))),
    security == null ? note(t('loading')) : h('dl', { className: 'dncs-kv' },
      h('dt', null, t('secStore')), h('dd', { className: 'dncs-code' }, security.storePath),
      h('dt', null, t('secMode')), h('dd', null, security.storeMode ?? '—'),
      h('dt', null, t('secEnv')), h('dd', { className: 'dncs-code' }, `${security.seededFromEnv ? t('secSeeded') : t('secNotSeeded')} · ${security.envPath}`),
      h('dt', null, t('secPolicy')), h('dd', null, security.secretPolicy)))

  const sshPanel = h('div', { className: 'dncs-settings-panel' },
    h('div', { className: 'dncs-profile-head' }, h(IconCodeOutlineRegular, { size: 16 }), h('b', null, t('sshLane'))),
    note(t('sshNotApi')),
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
      h('div', { ref: accessPanel }, access),
      h('div', { ref: prefsPanel }, session),
      h('div', { ref: securityPanelRef }, securityPanel),
      h('div', { ref: sshPanelRef }, sshPanel)))
}
