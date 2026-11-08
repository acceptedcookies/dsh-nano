/** The commit and name-entry cards, drawn through the shared nano-ui primitives. */

import React from 'react'
import { Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'

const { useState } = React

/**
 * One modal card. The chrome, the mask, Escape handling, focus return, and the outline+primary
 * action row all come from `dsh-nano-ui`'s NanoDialog, which is a thin forwarder over the shell's
 * Modal and Button, so this plugin adds no dialog styling of its own.
 *
 * @param props - copy, title, body, and the two actions.
 * @returns the dialog.
 */
export function Dialog(props) {
  return React.createElement(NanoDialog, props)
}

/**
 * A labelled field: the sentence that explains the input, then the input itself.
 * @param props - the explaining line and the control.
 * @returns the stacked field.
 */
function Field({ children }) {
  return React.createElement('div', { className: 'nxe-dialog-field' }, children)
}


/**
 * The commit dialog: one message field over the changed-file summary.
 * @param props - copy, changed files, busy flag, error, and actions.
 * @returns the dialog.
 */
export function CommitDialog({ copy, files, busy, error, onConfirm, onCancel }) {
  const [message, setMessage] = useState('')
  const empty = message.trim() === ''
  return React.createElement(Dialog, {
    copy, title: copy.commitTitle, confirmLabel: copy.commit, confirmDisabled: empty, busy, error,
    onConfirm: () => onConfirm(message), onCancel,
    description: copy.commitBody(files.length),
  },
  React.createElement(Field, null,
    React.createElement('ul', { className: 'nxe-dialog-changed' }, files.slice(0, 40).map(file =>
      React.createElement('li', { key: file.path, title: file.path }, `${file.status} ${file.path}`))),
    React.createElement(Input, {
      value: message,
      placeholder: copy.commitPlaceholder,
      'data-modal-autofocus': true,
      onChange: event => setMessage(event.currentTarget.value),
    })))
}

/**
 * The name card: rename an existing entry, or name a new one.
 *
 * One component serves both because the field and its rules are identical; only the wording and the
 * result differ, and the reader is told which task they are in.
 *
 * @param props - copy, the current name, busy flag, error, actions, and the task kind.
 * @returns the dialog.
 */
export function RenameDialog({ copy, currentName, busy, error, onConfirm, onCancel, mode = 'rename' }) {
  const [name, setName] = useState(currentName)
  const invalid = name.trim() === ''
  const creating = mode === 'create'
  return React.createElement(Dialog, {
    copy,
    title: creating ? copy.newEntryTitle : copy.renameTitle,
    confirmLabel: creating ? copy.create : copy.confirm,
    busy, error, confirmDisabled: invalid,
    onConfirm: () => onConfirm(name), onCancel,
    description: creating ? copy.newEntryBody(currentName) : copy.renameBody(currentName),
  },
  React.createElement(Field, null,
    React.createElement(Input, {
      value: name,
      'data-modal-autofocus': true,
      spellCheck: false,
      autoComplete: 'off',
      onChange: event => setName(event.currentTarget.value),
      onKeyDown: event => { if (event.key === 'Enter' && !invalid) { event.preventDefault(); onConfirm(name) } },
    })))
}
