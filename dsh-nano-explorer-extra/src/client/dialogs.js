/** The commit and name-entry cards, drawn through the shared nano-ui primitives. */

import React from 'react'
import { Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoDialog } from 'dsh-nano-ui'
import { perf } from './perf.js'

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
  usePanelConfinedLayer()
  React.useEffect(() => { perf.count('dialog-open') }, [])
  return React.createElement(NanoDialog, props)
}

/**
 * Keep the open card inside this plugin's own panel instead of the whole workspace.
 *
 * The shell's Modal portals to `document.body` and its layer is a fixed full-viewport box, so a card
 * raised from the files panel covered the conversation too. The shared declarative dialog only tags a
 * class for this; the geometry that class describes is applied by the imperative opener. This reads
 * the panel's rect and mirrors that same geometry onto the portaled layer, following the panel while
 * it is open.
 *
 * @returns nothing; it only affects the DOM.
 */
export function usePanelConfinedLayer(active = true) {
  React.useEffect(() => {
    // D2 (P4, named by the idle-10s budget): a CLOSED drawer must not keep a
    // document.body childList+subtree observer alive. `active` gates the whole
    // effect; when it flips, the previous effect's cleanup detaches exactly
    // once. Dialog passes no argument (always active).
    if (!active) return undefined
    let live = true
    const write = (element, styles) => {
      for (const [key, value] of Object.entries(styles)) {
        if (element.style[key] !== value) element.style[key] = value
      }
    }
    // Several files pages can stay mounted. The first [data-nxe] is often a hidden session
    // with a zero rect, and sizing against that leaves the card as tall as its content.
    const filesPanel = () => {
      let best = null
      let bestArea = 0
      for (const node of document.querySelectorAll('[data-nxe]')) {
        const host = node.closest('[data-sidebar-right-pane]') ?? node
        if (!(host instanceof HTMLElement)) continue
        const box = host.getBoundingClientRect()
        const area = box.width * box.height
        if (area > bestArea) { best = host; bestArea = area }
      }
      return best
    }
    let watched = null
    let resize = null
    const hasCard = () => document.querySelector('.nano-dialog-card [class*="nxe-"]') !== null
    const apply = () => {
      if (!live || !hasCard()) return
      const panel = filesPanel()
      if (!(panel instanceof HTMLElement)) return
      if (panel !== watched && typeof ResizeObserver === 'function') {
        resize?.disconnect()
        watched = panel
        resize = new ResizeObserver(apply)
        resize.observe(panel)
      }
      const rect = panel.getBoundingClientRect()
      if (rect.width < 1 || rect.height < 1) return
      for (const card of document.querySelectorAll('.nano-dialog-card')) {
        // Only fence cards this plugin drew: every dialog here renders nxe-*
        // classes inside the body. Other plugins' cards (e.g. the shared
        // workspace settings) stay full-viewport centered.
        if (card.querySelector('[class*="nxe-"]') === null) continue
        const layer = card.parentElement
        if (!(layer instanceof HTMLElement)) continue
        layer.classList.add('nxe-confined-layer')
        write(layer, {
          position: 'fixed',
          top: `${rect.top}px`, left: `${rect.left}px`,
          right: 'auto', bottom: 'auto',
          // Border-box, so the padding below insets the card instead of growing the fence past the
          // panel's own edges.
          boxSizing: 'border-box',
          width: `${rect.width}px`, height: `${rect.height}px`,
          padding: '12px',
        })
        // The source-control cards rise from the footer and use the pane's width. Height follows
        // the content up to the pane, so a long change list fills it and a short branch list does
        // not leave an empty field under one row. Rename and settings stay compact.
        if (card.querySelector('.nxe-scm') !== null) {
          card.dataset.nxeFill = '1'
          const theme = panel.getAttribute('data-theme')
          if (theme) card.setAttribute('data-theme', theme)
          write(layer, {
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
            alignItems: 'center', overflow: 'hidden',
          })
          // The shell centers the card on the viewport with its own inline position. Pin it back into
          // this layer so a short card cannot drift out of the files pane.
          write(card, { position: 'relative', top: 'auto', left: 'auto', right: 'auto', transform: 'none' })
          // The working-tree card is a fixed half of the window. Filter tabs must not resize it.
          // The repository card still follows its content, capped so it stays inside the pane.
          const kind = card.querySelector('[data-nxe-scm]')?.getAttribute('data-nxe-scm')
          const room = Math.max(240, rect.height - 24)
          if (kind === 'commit') {
            const fixed = `${Math.min(Math.round(window.innerHeight * 0.5), room)}px`
            write(card, {
              width: '100%', maxWidth: '100%', minWidth: '0', margin: '0',
              height: fixed, minHeight: fixed, maxHeight: fixed,
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
            })
          } else {
            write(card, {
              width: '100%', maxWidth: '100%', minWidth: '0', margin: '0',
              height: 'auto', minHeight: '0',
              maxHeight: `${Math.min(room, Math.round(rect.height * 0.68))}px`,
              display: '', flexDirection: '', overflow: '',
            })
          }
        }
      }
    }
    // Idle is almost silent: the only standing listener is the arrival detector below. The
    // MutationObserver, the resize hook, the ResizeObserver, and the frame chain all live only
    // while a card does.
    let observer = null
    let frame = 0
    let following = false
    // perf: card-shape watches mutations while a card is open; card-follow is the
    // rAF chain that pins the layer to the panel; card-wake is the standing
    // arrival detector (itself only alive while a Dialog is mounted).
    const shapeTrack = perf.track('mutation', 'card-shape')
    const followTrack = perf.track('raf', 'card-follow')
    const wakeTrack = perf.track('mutation', 'card-wake')
    const stop = () => {
      // `live` is ONE counter shared by every mounted hook instance (drawers
      // mount two of these even while closed). Detach exactly once per begin()
      // — resetLive() here would zero the other instance's still-live observer
      // and hide a leak (§10.5 / A4).
      if (following) {
        shapeTrack.detach()
        followTrack.detach()
        following = false
      }
      if (observer !== null) { observer.disconnect(); observer = null }
      if (frame !== 0) { window.cancelAnimationFrame(frame); frame = 0 }
      resize?.disconnect()
      resize = null
      watched = null
      window.removeEventListener('resize', apply)
    }
    // A mutation batch containing a mounted card: either the layer arriving or content inside it.
    const cardMutation = mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element && (node.matches('.nano-dialog-card, .nano-dialog-card *') || node.querySelector('.nano-dialog-card') !== null)) return true
        }
      }
      return false
    }
    const follow = followTrack.wrap(() => {
      frame = 0
      if (!live) return
      // The card closed: shed every listener and stop scheduling. Nothing here runs again until
      // the detector sees the next card.
      if (!hasCard()) { stop(); return }
      apply()
      frame = window.requestAnimationFrame(follow)
    })
    const begin = () => {
      if (following || !live || !hasCard()) return
      following = true
      // Child list only. Watching every style write on the page re-entered apply forever and froze
      // it. The observer leaves as soon as the card does, so a closed tree costs zero callbacks.
      observer = new MutationObserver(shapeTrack.wrap(mutations => { if (cardMutation(mutations)) apply() }))
      observer.observe(document.body, { childList: true, subtree: true })
      shapeTrack.attach()
      followTrack.attach()
      window.addEventListener('resize', apply)
      apply()
      frame = window.requestAnimationFrame(follow)
    }
    // The standing wake-up: childList on the shell's modal host (under body, subtree needed because
    // portals nest). A callback here means the page moved, not that a card exists — the cheap
    // `hasCard()` gate inside keeps an idle files pane's per-mutation cost at one querySelector.
    const detect = new MutationObserver(wakeTrack.wrap(mutations => {
      if (!live || following || !cardMutation(mutations)) return
      begin()
    }))
    detect.observe(document.body, { childList: true, subtree: true })
    wakeTrack.attach()
    // A card mounted between this component's render and effect: the detector still sees it, but
    // opening directly keeps the first frame from waiting a mutation turn.
    begin()
    return () => {
      live = false
      stop()
      detect.disconnect()
      wakeTrack.detach()
      for (const layer of document.querySelectorAll('.nxe-confined-layer')) {
        layer.classList.remove('nxe-confined-layer')
        for (const key of ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'padding', 'box-sizing', 'display', 'align-items', 'justify-content', 'flex-direction', 'overflow']) {
          layer.style.removeProperty(key)
        }
      }
      for (const card of document.querySelectorAll('[data-nxe-fill]')) {
        if (!(card instanceof HTMLElement)) continue
        delete card.dataset.nxeFill
        for (const key of ['width', 'max-width', 'height', 'max-height', 'min-height', 'min-width', 'margin', 'position', 'top', 'left', 'right', 'transform', 'display', 'flex-direction', 'overflow']) {
          card.style.removeProperty(key)
        }
      }
    }
  }, [active])
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
