/** Main-window dialog: a thin wrapper over the host Modal (DESIGN.md §5, §7). Chrome, mask, Escape,
 * focus trap and focus return all come from the host. The Modal card width is fixed by the host,
 * so `width` maps onto preset classes; height limits apply to nano-ui's own body element. */
import React from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'

const h = React.createElement

/** Card width presets in px; the host default is the first. */
export const DIALOG_WIDTHS = Object.freeze([380, 480, 560, 720])
/** Fixed-height presets in px. */
export const DIALOG_HEIGHTS = Object.freeze([480, 560, 640])
/** Host Modal header + footer + paddings around the body (observed), subtracted from card heights. */
export const DIALOG_CHROME = 136

/** Smallest preset not below `value`, or the largest preset. */
export function preset(list, value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined
  return list.find(step => step >= value) ?? list[list.length - 1]
}

/** Inline size of nano-ui's own body element for the height props. */
export function bodyStyle({ maxHeight, fixedHeight }) {
  const style = {}
  const fixed = preset(DIALOG_HEIGHTS, fixedHeight)
  if (fixed !== undefined) style.height = `${fixed - DIALOG_CHROME}px`
  if (typeof maxHeight === 'number' && Number.isFinite(maxHeight)) style.maxHeight = `${Math.max(120, Math.round(maxHeight) - DIALOG_CHROME)}px`
  return style
}

/** The stock Cancel / Confirm pair shared by both dialog carriers. */
export function actionRow({ copy, confirmLabel, confirmDisabled, busy, danger, onConfirm, onCancel }) {
  return h(React.Fragment, null,
    h(Button, { variant: 'outline', className: 'nano-modal-action', onClick: onCancel }, copy.cancel),
    h(Button, {
      variant: danger ? 'outline' : 'primary',
      className: danger ? 'nano-modal-action nano-modal-danger' : 'nano-modal-action',
      disabled: confirmDisabled === true || busy === true,
      onClick: onConfirm,
    }, confirmLabel ?? copy.confirm))
}

/**
 * @param {object} props
 * @param {object} props.copy - `{ cancel, confirm, close? }`.
 * @param {string} props.title
 * @param {React.ReactNode} [props.description] - rendered in the host Modal's description slot.
 * @param {string} [props.confirmLabel]
 * @param {boolean} [props.confirmDisabled]
 * @param {boolean} [props.busy]
 * @param {string} [props.error] - inline error line under the body.
 * @param {boolean} [props.danger] - destructive confirm styling.
 * @param {React.ReactNode} [props.footer] - replaces the stock action pair.
 * @param {number} [props.width] - px; rounded up to a preset in `DIALOG_WIDTHS`.
 * @param {number} [props.maxHeight] - px cap of the card; the body scrolls past it.
 * @param {number} [props.fixedHeight] - px; rounded up to a preset in `DIALOG_HEIGHTS`.
 * @param {string} [props.className] - extra class on the card.
 * @param {() => void} props.onConfirm
 * @param {() => void} props.onCancel
 * @param {React.ReactNode} [props.children]
 */
export function NanoDialog({ copy, title, description, confirmLabel, confirmDisabled, busy, error, danger, footer, width, maxHeight, fixedHeight, className, onConfirm, onCancel, children }) {
  const w = preset(DIALOG_WIDTHS, width)
  return h(Modal, {
    open: true,
    onClose: onCancel,
    title,
    description,
    closeLabel: copy.close ?? copy.cancel,
    className: ['nano-dialog-card', w === undefined || w === DIALOG_WIDTHS[0] ? '' : `nano-dialog-w-${w}`, className ?? ''].filter(Boolean).join(' '),
    footer: footer ?? actionRow({ copy, confirmLabel, confirmDisabled, busy, danger, onConfirm, onCancel }),
  }, h('div', { className: 'nano-dialog-body', style: bodyStyle({ maxHeight, fixedHeight }) },
    children,
    error === undefined ? null : h('p', { className: 'nano-dialog-error', role: 'alert' }, error)))
}
