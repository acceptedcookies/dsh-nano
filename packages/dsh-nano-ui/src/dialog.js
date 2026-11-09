/** One modal card every plugin shares. Chrome, mask, Escape, and focus return come from the
 * shell's Modal; the action row pairs outline-cancel with primary-confirm, matching the shipped
 * dialogs verbatim. Pass `copy` so the card reads in the active language. */
import React from 'react'
import { Button, Modal } from '@deepseek-ai/dsh-client-ui-primitives'

/**
 * @param {object} props
 * @param {object} props.copy - `{ cancel, confirm, close }` plus plugin-specific labels.
 * @param {string} props.title - card heading.
 * @param {React.ReactNode} [props.description] - secondary line under the title, rendered in the
 *   shell Modal's own description slot (correct hierarchy + spacing). Prefer it over a trailing
 *   `<p>` child for the gray hint line.
 * @param {string} [props.confirmLabel] - primary action text; defaults to `copy.confirm`.
 * @param {boolean} [props.confirmDisabled] - disable the primary action.
 * @param {boolean} [props.busy] - in-flight guard shared by every card.
 * @param {string} [props.error] - inline error line under the body.
 * @param {boolean} [props.danger] - tint the confirm action for destructive cards.
 * @param {React.ReactNode} [props.footer] - replace the stock Cancel/Confirm row (e.g. an action set
 *   whose primary verb differs per body row); leave undefined for the default pair.
 * @param {number} [props.maxHeight] - cap the card in pixels; the body scrolls when content exceeds
 *   it (notepad caps at 80% of the floating window so a tall settings card never swallows it).
 * @param {number} [props.width] - card width in pixels; .nano-dialog-sized clamps it to a usable
 *   minimum so the dialog still reads when the owning overlay is narrow.
 * @param {DOMRect} [props.region] - contain the whole overlay (mask included) inside this rect,
 *   e.g. the floating window's own bounds so the dialog never paints over the workspace.
 * @param {() => void} props.onConfirm - primary action.
 * @param {() => void} props.onCancel - cancel action.
 * @param {React.ReactNode} [props.children] - the body.
 */
export function NanoDialog({ copy, title, description, confirmLabel, confirmDisabled, busy, error, danger, footer, maxHeight, width, region, onConfirm, onCancel, children }) {
  return React.createElement(Modal, {
    open: true,
    onClose: onCancel,
    title,
    description,
    closeLabel: copy.cancel,
    className: [
      'nano-dialog-card',
      maxHeight === undefined ? '' : 'nano-dialog-capped',
      width === undefined ? '' : 'nano-dialog-sized',
      region === undefined ? '' : 'nano-dialog-regioned',
    ].filter(Boolean).join(' '),
    contentClassName: 'nano-dialog-content',
    footer: footer ?? React.createElement(React.Fragment, null,
      React.createElement(Button, { variant: 'outline', className: 'nano-modal-action', onClick: onCancel }, copy.cancel),
      React.createElement(Button, {
        variant: danger ? 'outline' : 'primary',
        className: danger ? 'nano-modal-action nano-modal-danger' : 'nano-modal-action',
        disabled: confirmDisabled === true || busy === true,
        onClick: onConfirm,
      }, confirmLabel ?? copy.confirm)),
  }, children, error === undefined ? null : React.createElement('p', { className: 'nano-dialog-error', role: 'alert' }, error))
}
