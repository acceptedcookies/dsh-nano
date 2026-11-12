/**
 * Shared-workspace create/join dialog with its own in-app directory browser.
 * Two modes:
 *   - `create`: name input + browse → POST /workspaces/create (S3 first).
 *   - `join`  : browse only → POST /workspaces/join against an existing marker.
 * The browser lists and creates folders through the plugin's own `/ls` and
 * `/mkdir` routes — the directoryPicker browse backend (the sole owner of
 * `list`/`createDirectory`) is not composed on every instance.
 * A "use this directory" target creates a *replica* — no local workspace row.
 */

import React from 'react'
import { NanoDialog } from 'dsh-nano-ui'

const { createElement, useEffect, useRef, useState } = React

export function CreateWorkspaceDialog({ face, mode, workspaceId }) {
  const copy = face.copy()
  const [name, setName] = useState('')
  const [listing, setListing] = useState(null)
  const [current, setCurrent] = useState(null)
  const [newFolderOpen, setNewFolderOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const listRef = useRef(0)

  const browse = path => {
    const ticket = ++listRef.current
    setBusy(true)
    face.listDirectory(path)
      .then(result => { if (listRef.current === ticket) setListing(result) })
      .catch(cause => setError(cause instanceof Error ? cause.message : String(cause)))
      .finally(() => { if (listRef.current === ticket) setBusy(false) })
  }
  useEffect(() => { browse(undefined) }, [])

  const submit = localPath => {
    setBusy(true)
    const action = mode === 'join'
      ? face.joinWorkspace(workspaceId, localPath)
      : face.createWorkspace(name.trim(), localPath)
    action
      .then(() => face.onCloseCreateDialog?.(true))
      .catch(cause => setError(`${copy.createFailed}: ${cause instanceof Error ? cause.message : String(cause)}`))
      .finally(() => setBusy(false))
  }

  const canSubmit = mode === 'join' || name.trim() !== ''

  return createElement(NanoDialog, {
    copy,
    title: mode === 'join' ? copy.pickReplicaTitle : copy.createTitle,
    confirmLabel: mode === 'join' ? copy.joinHere : copy.createHere,
    confirmDisabled: !canSubmit || busy || listing === null,
    busy,
    onConfirm: () => submit(current ?? listing?.path),
    onCancel: () => face.onCloseCreateDialog?.(false),
  },
    createElement('div', { className: 'nsw-create-body' },
      mode === 'create' ? createElement('label', { className: 'nsw-field' },
        createElement('span', { className: 'nsw-field-label' }, copy.workspaceName),
        createElement('input', {
          className: 'nsw-input',
          value: name,
          onChange: event => setName(event.target.value),
          placeholder: copy.workspaceNameHint,
        })) : null,
      createElement('p', { className: 'nsw-field-label' }, copy.pickReplicaHint),
      // Breadcrumb
      createElement('div', { className: 'nsw-crumbs' },
        (listing?.crumbs ?? []).map((crumb, index, all) => createElement(React.Fragment, { key: crumb.path },
          // The root crumb is already printed as "/", so the next separator
          // would render "// Users" (F-11).
          index > 0 && !(index === 1 && all[0]?.name === '') ? createElement('span', { className: 'nsw-crumb-sep' }, '/') : null,
          createElement('button', {
            type: 'button',
            className: 'nsw-crumb',
            onClick: () => browse(crumb.path),
          }, crumb.name === '' ? '/' : crumb.name)))),
      // Entries
      createElement('div', { className: 'nsw-entries' },
        busy && listing === null ? createElement('p', { className: 'nsw-notice' }, copy.loading) : null,
        (listing?.entries ?? []).filter(entry => !entry.hidden).map(entry =>
          createElement('button', {
            type: 'button',
            key: entry.path,
            className: `nsw-entry${current === entry.path ? ' nsw-entry-selected' : ''}`,
            onClick: () => setCurrent(entry.path),
            onDoubleClick: () => browse(entry.path),
          }, entry.name)),
        listing !== null && (listing.entries ?? []).filter(entry => !entry.hidden).length === 0
          ? createElement('p', { className: 'nsw-notice' }, copy.emptyDir) : null),
      // New folder
      newFolderOpen
        ? createElement('div', { className: 'nsw-new-folder' },
            createElement('input', {
              className: 'nsw-input',
              value: newFolderName,
              onChange: event => setNewFolderName(event.target.value),
              placeholder: copy.newFolder,
            }),
            createElement('button', {
              type: 'button',
              className: 'nsw-button',
              disabled: newFolderName.trim() === '' || busy,
              onClick: () => {
                setBusy(true)
                face.createDirectory(listing.path, newFolderName.trim())
                  .then(created => { setNewFolderOpen(false); setNewFolderName(''); setCurrent(created); browse(listing.path) })
                  .catch(cause => setError(cause instanceof Error ? cause.message : String(cause)))
                  .finally(() => setBusy(false))
              },
            }, copy.createFolder))
        : createElement('button', {
            type: 'button',
            className: 'nsw-link-button',
            onClick: () => setNewFolderOpen(true),
          }, `＋ ${copy.newFolder}`),
      error !== null ? createElement('p', { className: 'nsw-notice' }, error) : null))
}
