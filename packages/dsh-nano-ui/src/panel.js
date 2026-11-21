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

/** Bordered surface. The host has no card; this is only the layer, not a title strip. */
export function Card({ children }) {
  return h('div', { className: 'nano-card' }, children)
}

/** Left label, right control. FactGrid is label/value only and cannot hold a button. */
export function SplitRow({ label, children }) {
  return h('div', { className: 'nano-split' },
    h('span', { className: 'nano-split-label' }, label),
    h('span', { className: 'nano-split-control' }, children))
}

/** Thin measured/allocated track. The host has no meter. `value` is 0–100, or null for no fill. */
export function Meter({ label, text, value }) {
  const width = typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null
  return h('div', { className: 'nano-meter' },
    h('span', { className: 'nano-meter-label' }, `${label} ${text ?? ''}`),
    width === null ? null : h('span', { className: 'nano-meter-track' },
      h('span', { className: 'nano-meter-fill', style: { width: `${width}%` } })))
}

/** Column header plus body rows. The host has no data table. */
export function PlainTable({ columns, children }) {
  return h('table', { className: 'nano-table' },
    h('thead', null, h('tr', null, (columns ?? []).map((column) => h('th', { key: column }, column)))),
    h('tbody', null, children))
}
