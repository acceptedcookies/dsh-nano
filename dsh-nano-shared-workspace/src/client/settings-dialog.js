/**
 * The settings card, built on the shared `NanoDialog` (the shared package is
 * the visual truth — chrome, mask, action row come from there). The body adds
 * the join fields: username, MinIO token, optional access key; the endpoint
 * rows are read-only facts from the host config.
 */

import React from 'react'
import { NanoDialog } from 'dsh-nano-ui'
import { Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { saveSettings } from './api.js'

const { createElement, useState } = React

function Field({ label, children }) {
  return createElement('label', { className: 'nsw-field' },
    createElement('span', { className: 'nsw-field-label' }, label),
    children)
}

export function SettingsDialog({ face, settings }) {
  const copy = face.copy()
  const [username, setUsername] = useState(settings?.username ?? '')
  const [token, setToken] = useState('')
  const [accessKey, setAccessKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(undefined)

  const trimmedUser = username.trim()
  const canSubmit = trimmedUser !== '' && token.trim() !== '' && !busy

  const submit = async () => {
    if (!canSubmit) {
      setError(trimmedUser === '' ? copy.usernameRequired : copy.tokenRequired)
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await saveSettings({
        username: trimmedUser,
        token: token.trim(),
        accessKey: accessKey.trim() === '' ? undefined : accessKey.trim(),
      })
      face.settings.close()
    } catch (cause) {
      setError(`${copy.errorSave}: ${cause instanceof Error ? cause.message : String(cause)}`)
    } finally {
      setBusy(false)
    }
  }

  return createElement(NanoDialog, {
    copy,
    title: copy.settingsTitle,
    description: copy.settingsDescription,
    confirmLabel: copy.save,
    confirmDisabled: !canSubmit,
    busy,
    error,
    width: 420,
    onConfirm: submit,
    onCancel: face.settings.close,
  },
    createElement('div', { className: 'nsw-endpoint' },
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
    createElement(Field, { label: copy.token },
      createElement(Input, {
        type: 'password',
        value: token,
        placeholder: settings?.configured === true ? `${copy.configured} · ${settings?.maskedSecret ?? ''}` : copy.tokenPlaceholder,
        onChange: event => setToken(event.currentTarget.value),
      })),
    createElement(Field, { label: copy.accessKeyOptional },
      createElement(Input, {
        value: accessKey,
        placeholder: copy.accessKeyPlaceholder,
        onChange: event => setAccessKey(event.currentTarget.value),
      })),
    createElement('p', { className: 'nsw-join-hint' }, copy.joinHint))
}
