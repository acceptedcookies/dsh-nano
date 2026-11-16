/** Tab strips are the host `SegmentedControl`; nano-ui only keeps panels mounted and toggles
 * `hidden` so form state survives switching. */
import React from 'react'
import { SegmentedControl } from '@deepseek-ai/dsh-client-ui-primitives'
import { mountNano } from './mount.js'

const h = React.createElement
let seq = 0

/**
 * DOM flavour for surfaces built from HTML: the caller owns the panel elements.
 * @param {object} options
 * @param {Array<{ value: string, label: string, panel: HTMLElement }>} options.items - each panel is
 *   adopted (id / role / aria-labelledby / hidden managed here).
 * @param {string} options.value - initially selected value.
 * @param {(value: string) => void} [options.onChange]
 * @param {string} [options.label] - accessible name of the strip.
 * @returns {{ el: HTMLElement, select: (value: string) => void, value: () => string | undefined }}
 */
export function nanoTabs({ items, value, onChange, label }) {
  const id = `nano-seg-${++seq}`
  const el = document.createElement('div')
  for (const item of items) {
    item.panel.id = `${id}-${item.value}-panel`
    item.panel.setAttribute('role', 'tabpanel')
    item.panel.setAttribute('aria-labelledby', `${id}-${item.value}`)
  }
  let current
  const strip = mountNano(el, SegmentedControl, {
    id,
    value,
    label,
    options: items.map(item => ({ value: item.value, label: item.label })),
    onChange: next => select(next),
  })
  function select(next) {
    if (!items.some(item => item.value === next)) return
    current = next
    for (const item of items) item.panel.hidden = item.value !== next
    strip.update({ value: next })
    onChange?.(next)
  }
  select(value)
  return { el, select, value: () => current }
}

/**
 * React flavour.
 * @param {object} props
 * @param {Array<{ value: string, label: string, content: React.ReactNode }>} props.items
 * @param {string} [props.value] - controlled value.
 * @param {(value: string) => void} [props.onChange]
 * @param {string} [props.label]
 * @param {string} [props.className]
 */
export function NanoTabs({ items, value, onChange, label, className }) {
  const [inner, setInner] = React.useState(() => value ?? items[0]?.value)
  const id = `nano-seg-${React.useId().replaceAll(':', '')}`
  const current = value ?? inner
  const select = next => {
    if (value === undefined) setInner(next)
    onChange?.(next)
  }
  return h('div', { className: ['nano-panes', className ?? ''].filter(Boolean).join(' ') },
    h(SegmentedControl, { id, value: current, label, options: items.map(item => ({ value: item.value, label: item.label })), onChange: select }),
    items.map(item => h('div', {
      key: item.value,
      id: `${id}-${item.value}-panel`,
      role: 'tabpanel',
      className: 'nano-pane',
      'aria-labelledby': `${id}-${item.value}`,
      hidden: item.value !== current,
    }, item.content)))
}
