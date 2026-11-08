/** One transient, non-repainting notice every plugin shares. Drawn as an overlay, never a row. */
import React from 'react'

/**
 * A floating status toast. The caller owns the timeout so the toast can outlive re-renders.
 * @param {object} props - `text` to show, or undefined to render nothing.
 */
export function NanoToast({ text }) {
  if (text === undefined || text === null) return null
  return React.createElement('div', { className: 'nano-toast', role: 'status', 'aria-live': 'polite', 'data-nano-toast': 'true' }, text)
}
