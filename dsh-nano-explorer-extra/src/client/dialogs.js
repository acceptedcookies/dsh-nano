/** The commit and name-entry cards, drawn in this plugin's own layer through nano-ui. */

import React from 'react'
import { Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoWindowDialog } from 'dsh-nano-ui'
import { perf } from './perf.js'

const { useState } = React

/**
 * The element every card is drawn into (DESIGN.md §5).
 *
 * A card raised from the files panel is a window overlay, not a main-window Modal: it belongs to this
 * region of the shell, so it takes the region's own box, theme, and stacking. The carrier draws the
 * mask and the card inside a container this plugin owns; a missing container means the layer has not
 * mounted yet, and the card waits a commit instead of falling back to `document.body` (nano-ui
 * refuses that fallback, and a files-panel card has no business covering the conversation).
 */
export const DialogLayerContext = React.createContext(null)

/**
 * The plugin's own positioning layer: one absolutely positioned box inside the page root.
 *
 * It is the containing block for every card this plugin draws, which is what keeps a card in the
 * files panel while the panel moves, resizes, scrolls, or belongs to another session. The layer
 * itself never takes a pointer event; nano-ui's overlay turns hit-testing back on for the open card.
 *
 * @param props - the page, whose subtree becomes the container consumers.
 * @returns the page followed by the empty layer element.
 */
export function DialogLayer({ children }) {
  const [layer, setLayer] = useState(null)
  return React.createElement(React.Fragment, null,
    React.createElement(DialogLayerContext.Provider, { value: layer }, children),
    React.createElement('div', { className: 'nxe-dialog-layer', ref: setLayer }))
}

/**
 * The container cards are drawn into.
 * @returns the layer element, or null until it mounts.
 */
export function useDialogContainer() {
  return React.useContext(DialogLayerContext)
}

/**
 * One modal card.
 *
 * The mask, the chrome, Escape handling, focus return, and the outline+primary action row all come
 * from `dsh-nano-ui`'s window dialog, which is a thin forwarder over the shell's own Button and
 * `useModalLayer`; this plugin adds no dialog chrome of its own.
 *
 * @param props - copy, title, body, and the two actions.
 * @returns the dialog, or null while the layer is not mounted.
 */
export function Dialog(props) {
  const container = useDialogContainer()
  React.useEffect(() => { perf.count('dialog-open') }, [])
  if (container === null) return null
  return React.createElement(NanoWindowDialog, { ...props, container })
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
 * The second confirmation a folder move asks for.
 *
 * A dropped folder can stand for thousands of files, and a move has no one-click undo, so the
 * gesture alone never writes. The confirm action stays disabled through a two-second countdown:
 * long enough to read where the folder is going, short enough not to become a ritual. The clock is
 * a deadline rather than N one-second ticks, so a throttled background tab cannot let the button
 * unlock early, and the component remounts on every new request to restart it.
 *
 * @param props - copy, the folder name, its destination label, and the two actions.
 * @returns the dialog.
 */
export function MoveConfirmDialog({ copy, name, destination, onConfirm, onCancel }) {
  const [remaining, setRemaining] = useState(2)
  React.useEffect(() => {
    const deadline = Date.now() + 2000
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) window.clearInterval(timer)
    }, 100)
    return () => window.clearInterval(timer)
  }, [])
  const waiting = remaining > 0
  return React.createElement(Dialog, {
    copy, title: copy.moveFolderTitle,
    confirmLabel: waiting ? copy.moveFolderWait(remaining) : copy.moveFolderConfirm,
    confirmDisabled: waiting,
    onConfirm, onCancel,
    description: React.createElement(React.Fragment, null,
      copy.moveFolderBody(name, destination),
      React.createElement('span', { className: 'nxe-dialog-note-inline' }, ` ${copy.moveFolderNote}`)),
  },
  waiting ? React.createElement('p', {
    className: 'nxe-move-countdown', role: 'status', 'data-nxe-move-countdown': 'true',
  }, copy.moveFolderCountdown(remaining)) : null)
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
