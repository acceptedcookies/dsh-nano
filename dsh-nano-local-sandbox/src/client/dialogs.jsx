/** Create form and lifecycle confirmations. Both sit on the host Modal. */
import React from 'react'
import { Input, RiskConfirmation, SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'
import { fill } from './i18n.js'
import { ErrorLine, Muted } from './parts.jsx'

const h = React.createElement

export const profileIdOf = (profile) => (typeof profile === 'string' ? profile : profile?.profileId ?? profile?.id ?? '')

export function CreateDialog({ copy, profiles, busy, error, onCancel, onSubmit }) {
  const [name, setName] = React.useState('')
  const ready = (profiles ?? []).filter((profile) => profile?.ready !== false)
  const [profileId, setProfileId] = React.useState('')
  const chosen = profileId || profileIdOf(ready[0])
  const facts = (profiles ?? []).find((profile) => profileIdOf(profile) === chosen)
  return h(NanoDialog, {
    copy,
    title: copy.createTitle,
    confirmLabel: busy ? copy.creating : copy.createSubmit,
    confirmDisabled: busy || name.trim() === '' || chosen === '',
    busy,
    onCancel,
    onConfirm: () => onSubmit({ name: name.trim(), profileId: chosen }),
  },
  h('label', { className: 'dnls-field' }, copy.createName,
    h(Input, { value: name, 'aria-label': copy.createName, autoFocus: true, onChange: (event) => setName(event.target.value) })),
  h(Muted, null, copy.createNameHint),
  h('div', { className: 'dnls-field' }, copy.createProfile,
    profiles == null ? h(Muted, null, copy.loading)
    : profiles.length === 0 ? h(Muted, null, copy.noProfiles)
    : h(SegmentedControl, {
      label: copy.createProfile,
      value: chosen,
      onChange: setProfileId,
      options: profiles.map((profile) => {
        const id = profileIdOf(profile)
        return { value: id, label: profile?.ready === false ? `${id} · ${copy.profileNotReady}` : id, disabled: profile?.ready === false }
      }),
    })),
  facts && (facts.version != null || facts.maxInstances != null)
    ? h(Muted, null, fill(copy.profileFacts, { version: facts.version ?? copy.none, max: facts.maxInstances ?? copy.none }))
    : null,
  h(ErrorLine, { error }))
}

export function LifecycleConfirm({ copy, request, busy, onCancel, onConfirm }) {
  const [acknowledged, setAcknowledged] = React.useState(false)
  const { action, target } = request
  return h(RiskConfirmation, {
    open: true,
    title: copy.confirmTitle[action],
    description: fill(copy.confirmBody[action], { name: target.name }),
    acknowledgeLabel: copy.acknowledge[action],
    acknowledged,
    onAcknowledgedChange: setAcknowledged,
    confirmLabel: copy.action[action],
    cancelLabel: copy.cancel,
    closeLabel: copy.close,
    disabled: busy,
    onCancel,
    onConfirm,
  })
}
