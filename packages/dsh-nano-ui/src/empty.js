/** Empty state: icon, title, optional hint and one action. */
import React from 'react'

const h = React.createElement

/**
 * @param {object} props
 * @param {React.ReactNode} [props.icon]
 * @param {React.ReactNode} props.title
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.action] - usually a host Button.
 * @param {string} [props.className]
 */
export function EmptyState({ icon, title, description, action, className }) {
  return h('div', { className: ['nano-empty', className ?? ''].filter(Boolean).join(' ') },
    icon === undefined ? null : h('span', { className: 'nano-empty-icon', 'aria-hidden': 'true' }, icon),
    h('p', { className: 'nano-empty-title' }, title),
    description === undefined ? null : h('p', { className: 'nano-empty-desc' }, description),
    action ?? null)
}
