/** Window overlay (DESIGN.md §5): a dialog drawn inside its owner's container instead of the
 * document body, so it inherits the owner's scheme and stacking. It joins the host modal stack
 * through `useModalLayer`, which gives Escape-closes-topmost, focus trap and focus return. */
import React from 'react'
import { createPortal } from 'react-dom'
import { Button, IconCloseOutlineRegular, useModalLayer } from '@deepseek-ai/dsh-client-ui-primitives'
import { actionRow } from './dialog.js'

const h = React.createElement

/** Overlays never fall back to the document body: a missing or detached container is a bug. */
export function assertContainer(container, who) {
  if (!(container instanceof HTMLElement) || !container.isConnected) {
    throw new Error(`dsh-nano-ui: ${who} needs a container element attached to the document; overlays never fall back to document.body`)
  }
}

/**
 * @param {object} props - NanoDialog card props plus:
 * @param {HTMLElement} [props.container] - owner element (a containing block) to render into; omit
 *   when the caller already mounts this component inside the owner.
 * @param {number} [props.width] - card width in px, capped by the container.
 * @param {number} [props.maxHeight] - card max height in px; the body scrolls.
 * @param {number} [props.fixedHeight] - card height in px.
 */
export function NanoWindowDialog({ container, copy, title, description, confirmLabel, confirmDisabled, busy, error, danger, footer, width, maxHeight, fixedHeight, className, onConfirm, onCancel, children }) {
  const cardRef = React.useRef(null)
  useModalLayer(cardRef, true, onCancel)
  if (container !== undefined) assertContainer(container, 'NanoWindowDialog')
  const style = {}
  if (typeof width === 'number') style.width = `min(${Math.round(width)}px, 100%)`
  if (typeof maxHeight === 'number') style.maxHeight = `min(${Math.round(maxHeight)}px, 100%)`
  if (typeof fixedHeight === 'number') style.height = `min(${Math.round(fixedHeight)}px, 100%)`
  const overlay = h('div', { className: 'nano-overlay', role: 'presentation' },
    h('div', { className: 'nano-overlay-mask', 'aria-hidden': 'true', onClick: onCancel }),
    h('div', {
      ref: cardRef,
      tabIndex: -1,
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': title,
      className: ['nano-wdlg', className ?? ''].filter(Boolean).join(' '),
      style,
    },
    h('div', { className: 'nano-wdlg-head' },
      h('h2', { className: 'nano-wdlg-title' }, title),
      h(Button, { variant: 'ghost', size: 'sm', icon: h(IconCloseOutlineRegular, { size: 14 }), 'aria-label': copy.close ?? copy.cancel, onClick: onCancel })),
    description === undefined || description === '' ? null : h('p', { className: 'nano-wdlg-desc' }, description),
    h('div', { className: 'nano-wdlg-body' },
      children,
      error === undefined ? null : h('p', { className: 'nano-dialog-error', role: 'alert' }, error)),
    h('div', { className: 'nano-wdlg-foot' },
      footer ?? actionRow({ copy, confirmLabel, confirmDisabled, busy, danger, onConfirm, onCancel }))))
  return container === undefined ? overlay : createPortal(overlay, container)
}
