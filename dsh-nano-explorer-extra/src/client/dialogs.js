/** The two dialogs: one commit message, one rename. Both share the same modal material. */

import React from 'react'

const { useEffect, useRef } = React

/**
 * Trap focus inside one dialog and answer Escape.
 * @param ref - the dialog card element.
 * @param onEscape - called for an Escape press.
 */
function useDialogFocus(ref, onEscape) {
  useEffect(() => {
    const node = ref.current
    if (node === null) return undefined
    const previous = document.activeElement
    const focusable = () => [...node.querySelectorAll('input, textarea, button, [tabindex]:not([tabindex="-1"])')]
      .filter(item => !item.disabled && item.offsetParent !== null)
    const first = focusable()[0]
    first?.focus()
    const onKey = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onEscape()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) return
      const head = items[0]
      const tail = items[items.length - 1]
      if (event.shiftKey && document.activeElement === head) {
        event.preventDefault()
        tail.focus()
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault()
        head.focus()
      }
    }
    node.addEventListener('keydown', onKey)
    return () => {
      node.removeEventListener('keydown', onKey)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [ref, onEscape])
}

/**
 * One modal shell: mask, card, heading, body, and actions.
 * @param props - copy, title, children, and the two actions.
 * @returns the dialog element.
 */
export function Dialog({ copy, title, children, confirmDisabled, busy, error, onConfirm, onCancel, confirmLabel }) {
  const ref = useRef(null)
  useDialogFocus(ref, onCancel)
  return React.createElement('div', { className: 'nxe-mask', role: 'presentation', onMouseDown: event => { if (event.target === event.currentTarget) onCancel() } },
    React.createElement('div', {
      className: 'nxe-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-label': title, ref,
    },
    React.createElement('h2', null, title),
    children,
    error === undefined ? null : React.createElement('p', { className: 'nxe-dialog-error', role: 'alert' }, error),
    React.createElement('div', { className: 'nxe-dialog-actions' },
      React.createElement('button', { type: 'button', className: 'nxe-btn', onClick: onCancel }, copy.cancel),
      // The confirming button is last and never the initially focused element: the input takes focus.
      React.createElement('button', {
        type: 'button', className: 'nxe-btn', 'data-primary': 'true',
        disabled: confirmDisabled === true || busy === true,
        onClick: onConfirm,
      }, confirmLabel ?? copy.confirm))))
}

/**
 * The commit dialog: one message field over the changed-file summary.
 * @param props - copy, changed files, busy flag, error, and actions.
 * @returns the dialog.
 */
export function CommitDialog({ copy, files, busy, error, onConfirm, onCancel }) {
  const [message, setMessage] = React.useState('')
  const empty = message.trim() === ''
  return React.createElement(Dialog, {
    copy, title: copy.commitTitle, confirmLabel: copy.commit, confirmDisabled: empty, busy, error, onConfirm: () => onConfirm(message), onCancel,
  },
  React.createElement('p', null, copy.commitBody(files.length)),
  React.createElement('ul', { className: 'nxe-dialog-changed' }, files.slice(0, 40).map(file =>
    React.createElement('li', { key: file.path, title: file.path }, `${file.status} ${file.path}`))),
  React.createElement('label', { htmlFor: 'nxe-commit-message', style: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' } }, copy.commitMessage),
  React.createElement('textarea', {
    id: 'nxe-commit-message', value: message, placeholder: copy.commitPlaceholder,
    onChange: event => setMessage(event.currentTarget.value),
  }))
}

/**
 * The rename dialog: one name field.
 * @param props - copy, the current name, busy flag, error, and actions.
 * @returns the dialog.
 */
export function RenameDialog({ copy, currentName, busy, error, onConfirm, onCancel }) {
  const [name, setName] = React.useState(currentName)
  const invalid = name.trim() === ''
  return React.createElement(Dialog, {
    copy, title: copy.renameTitle, busy, error, confirmDisabled: invalid, onConfirm: () => onConfirm(name), onCancel,
  },
  React.createElement('p', null, copy.renameBody(currentName)),
  React.createElement('input', {
    type: 'text', value: name, spellCheck: false, autoComplete: 'off',
    onChange: event => setName(event.currentTarget.value),
    onKeyDown: event => { if (event.key === 'Enter' && !invalid) { event.preventDefault(); onConfirm(name) } },
  }))
}
