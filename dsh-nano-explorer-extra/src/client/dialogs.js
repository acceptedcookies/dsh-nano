/** The commit and name-entry cards, drawn with the shell's own modal, button, and input primitives. */

import React from 'react'
import { Button, Input, Modal } from '@deepseek-ai/dsh-client-ui-primitives'

const { useState } = React

/**
 * One modal card.
 *
 * The chrome, the mask, Escape handling, focus return, and the action row all come from the shell's
 * Modal and Button primitives, so this plugin adds no dialog styling of its own.
 *
 * @param props - copy, title, body, and the two actions.
 * @returns the dialog.
 */
export function Dialog({ copy, title, children, confirmDisabled, busy, error, onConfirm, onCancel, confirmLabel }) {
  return React.createElement(Modal, {
    open: true,
    onClose: onCancel,
    title,
    closeLabel: copy.cancel,
    // The shipped modal takes a fragment, and its own action rows pair `outline` with `primary`.
    footer: React.createElement(React.Fragment, null,
      React.createElement(Button, { variant: 'outline', className: 'nxe-modal-action', onClick: onCancel }, copy.cancel),
      React.createElement(Button, {
        variant: 'primary', className: 'nxe-modal-action',
        disabled: confirmDisabled === true || busy === true,
        onClick: onConfirm,
      }, confirmLabel ?? copy.confirm)),
  },
  children,
  error === undefined ? null : React.createElement('p', { className: 'nxe-dialog-error', role: 'alert' }, error))
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
  },
  React.createElement(Field, null,
    React.createElement('p', null, copy.commitBody(files.length)),
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
  },
  React.createElement(Field, null,
    React.createElement('p', null, creating ? copy.newEntryBody(currentName) : copy.renameBody(currentName)),
    React.createElement(Input, {
      value: name,
      'data-modal-autofocus': true,
      spellCheck: false,
      autoComplete: 'off',
      onChange: event => setName(event.currentTarget.value),
      onKeyDown: event => { if (event.key === 'Enter' && !invalid) { event.preventDefault(); onConfirm(name) } },
    })))
}
