/**
 * Two-stage setup, built on `NanoDialog`.
 *
 * Stage `bind` collects the identity and probes the bucket with its own signed
 * LIST; a spinner runs while the request is in flight and the dialog only
 * advances after the probe resolves. Stage `workspace` then creates the first
 * shared workspace. The two stages use different glyphs so the sidebar copy
 * never leaves doubt about which step is waiting.
 */

import React from 'react'
import { NanoDialog } from 'dsh-nano-ui'
import { IconDatabaseOutlineRegular, IconLinkOutlineRegular, Input, Switch } from '@deepseek-ai/dsh-client-ui-primitives'
import { saveSettings, testSettings } from './api.js'

const { createElement, useState } = React

function Field({ label, children }) {
  return createElement('label', { className: 'nsw-field' },
    createElement('span', { className: 'nsw-field-label' }, label),
    children)
}

/**
 * @param props.face - plugin face (copy, settings actions).
 * @param props.settings - current settings snapshot.
 * @param props.stage - `'bind'` or `'workspace'`.
 * @param props.onBound - called with `{username}` after the probe succeeds.
 */
export function SettingsDialog({ face, settings, stage = 'bind', onBound, onOpenCreate }) {
  const copy = face.copy()
  const [username, setUsername] = useState(settings?.username ?? '')
  const [accessKey, setAccessKey] = useState('')
  const [secretKey, setSecretKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState('idle')
  const [error, setError] = useState(undefined)

  const trimmedUser = username.trim()
  const ak = accessKey.trim()
  const sk = secretKey.trim()
  const configured = settings?.configured === true
  const canSubmit = trimmedUser !== '' && !busy && (configured || (ak !== '' && sk !== ''))

  const submit = async () => {
    if (trimmedUser === '') {
      setError(copy.usernameRequired)
      return
    }
    if ((ak === '') !== (sk === '')) {
      setError(copy.keysRequired)
      return
    }
    if (!configured && ak === '') {
      setError(copy.keysRequired)
      return
    }
    setBusy(true)
    setError(undefined)
    setPhase('probe')
    try {
      await testSettings({
        username: trimmedUser,
        token: sk === '' ? undefined : sk,
        accessKey: ak === '' ? undefined : ak,
      })
      setPhase('save')
      await saveSettings({
        username: trimmedUser,
        token: sk === '' ? undefined : sk,
        accessKey: ak === '' ? undefined : ak,
      })
      setBusy(false)
      setPhase('done')
      onBound?.({ username: trimmedUser })
    } catch (cause) {
      setPhase('idle')
      setBusy(false)
      setError(`${copy.bindFailed}: ${cause instanceof Error ? cause.message : String(cause)}`)
    }
  }

  const probing = phase === 'probe'
  const saving = phase === 'save'
  const bindTitle = createElement('span', { className: 'nsw-stage-title' },
    createElement(IconLinkOutlineRegular, { size: 16 }),
    createElement('span', null, copy.bindStage))
  const workspaceTitle = createElement('span', { className: 'nsw-stage-title' },
    createElement(IconDatabaseOutlineRegular, { size: 16 }),
    createElement('span', null, copy.workspaceStage))

  if (stage === 'workspace') {
    return createElement(NanoDialog, {
      copy,
      title: workspaceTitle,
      description: copy.workspaceStageDescription,
      confirmLabel: copy.newWorkspace,
      width: 420,
      onConfirm: () => { face.settings.close(); onOpenCreate?.() },
      onCancel: face.settings.close,
    },
      createElement('div', { className: 'nsw-stage-done', role: 'status' },
        createElement(IconLinkOutlineRegular, { size: 16 }),
        createElement('span', null, copy.bindSucceeded.replace('{bucket}', settings?.bucket ?? ''))),
      createElement('p', { className: 'nsw-join-hint' }, copy.workspaceStageHint))
  }

  return createElement(NanoDialog, {
    copy,
    title: bindTitle,
    description: copy.bindStageDescription,
    confirmLabel: probing ? copy.binding : saving ? copy.binding : copy.bindConfirm,
    confirmDisabled: !canSubmit,
    busy,
    error,
    width: 420,
    onConfirm: submit,
    onCancel: face.settings.close,
  },
    createElement('div', { className: 'nsw-endpoint' },
      createElement('span', { className: 'nsw-endpoint-row nsw-identity' },
        createElement('span', { className: 'nsw-endpoint-key' }, copy.status),
        createElement('span', { className: 'nsw-identity-value' },
          configured ? `${copy.configured} · ${settings.username ?? '—'}` : copy.unconfigured)),
      createElement('span', { className: 'nsw-endpoint-row' },
        createElement('span', { className: 'nsw-endpoint-key' }, copy.endpointLabel),
        createElement('code', { className: 'nsw-endpoint-value' }, settings?.endpoint ?? '—')),
      createElement('span', { className: 'nsw-endpoint-row' },
        createElement('span', { className: 'nsw-endpoint-key' }, copy.bucketLabel),
        createElement('code', { className: 'nsw-endpoint-value' }, settings?.bucket ?? '—'))),
    createElement(Field, { label: copy.username },
      createElement(Input, {
        value: username,
        placeholder: copy.usernamePlaceholder,
        'data-modal-autofocus': true,
        onChange: event => setUsername(event.currentTarget.value),
      })),
    createElement(Field, { label: copy.accessKey },
      createElement(Input, {
        value: accessKey,
        placeholder: configured ? copy.secretKeep : copy.accessKeyPlaceholder,
        autoComplete: 'off',
        onChange: event => setAccessKey(event.currentTarget.value),
      })),
    createElement(Field, { label: copy.secretKey },
      createElement(Input, {
        type: 'password',
        value: secretKey,
        placeholder: configured ? copy.secretKeep : copy.secretKeyPlaceholder,
        autoComplete: 'new-password',
        onChange: event => setSecretKey(event.currentTarget.value),
      })),
    (probing || saving)
      ? createElement('div', { className: 'nsw-probe', role: 'status', 'aria-live': 'polite' },
        createElement('span', { className: 'nsw-probe-dot' }),
        createElement('span', null, probing ? copy.probingBucket : copy.bindSaving))
      : null,
    createElement('div', { className: 'nsw-switch-row' },
      createElement('span', null,
        createElement('span', { className: 'nsw-field-label' }, copy.expandOnLoad),
        createElement('span', { className: 'nsw-join-hint' }, copy.expandOnLoadHint)),
      createElement(Switch, {
        checked: settings?.expandOnLoad !== false,
        label: copy.expandOnLoad,
        onChange: checked => face.setExpandOnLoad(checked),
      })),
    createElement('p', { className: 'nsw-join-hint' }, copy.joinHint))
}
