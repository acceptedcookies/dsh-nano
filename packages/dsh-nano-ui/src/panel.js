/** Generic scrollable panel skeleton, section and fact grid.
 *
 *  No host primitive offers a semantic dashboard layout; these are
 *  presentation-only and carry no domain vocabulary. Styling lives in
 *  `styles.js` on the owned `.nano-panel*` / `.nano-facts` classes only.
 */
import React from 'react'

const h = React.createElement

/**
 * @param {object} props
 * @param {string} props.title
 * @param {React.ReactNode} [props.kicker] - compact context line above the title copy.
 * @param {React.ReactNode} [props.description]
 * @param {React.ReactNode} [props.actions] - header controls, right of the title block.
 * @param {React.ReactNode} [props.children]
 */
export function PanelLayout({ title, kicker, description, actions, children, className, ...rest }) {
  return h('section', { className: className ? `nano-panel ${className}` : 'nano-panel', ...rest },
    h('header', { className: 'nano-panel-header' },
      kicker ? h('p', { className: 'nano-panel-kicker' }, kicker) : null,
      h('h2', null, title),
      description ? h('p', null, description) : null,
      actions ? h('div', null, actions) : null),
    children)
}

/**
 * @param {object} props
 * @param {string} [props.title]
 * @param {React.ReactNode} [props.children]
 */
export function PanelSection({ title, children }) {
  return h('section', { className: 'nano-panel-section' },
    title ? h('h3', null, title) : null,
    children)
}

/**
 * @param {object} props
 * @param {{ label: React.ReactNode, value: React.ReactNode }[]} props.items
 */
export function FactGrid({ items }) {
  return h('dl', { className: 'nano-facts' },
    (items ?? []).map((item, index) => h('div', { key: index },
      h('dt', null, item.label),
      h('dd', null, item.value ?? '—'))))
}
