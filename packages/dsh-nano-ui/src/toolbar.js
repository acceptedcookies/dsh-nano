/** Toolbar row; the host TrajectoryToolbar is not exported (DESIGN.md §8). */
import React from 'react'

/**
 * @param {object} props
 * @param {string} [props.label] - accessible name.
 * @param {string} [props.className]
 * @param {React.ReactNode} [props.children]
 */
export function Toolbar({ label, className, children }) {
  return React.createElement('div', { role: 'toolbar', 'aria-label': label, className: ['nano-toolbar', className ?? ''].filter(Boolean).join(' ') }, children)
}
