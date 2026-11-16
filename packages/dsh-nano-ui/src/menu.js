/** One anchored popup menu every plugin shares: same skin, same key handling, same click-outside. */
import React from 'react'

const { useEffect, useRef, useState } = React

/** Popup height used to flip a menu that would leave the viewport. A separator is the 1px rule plus its 4px margins. */
export function menuHeight(items) {
  let height = 8
  for (const item of items) height += item?.separator === true ? 9 : 28
  return height
}

/**
 * A menu anchored to a viewport point, drawn with the shared `nano-menu` skin.
 *
 * @param {object} props
 * @param {{ x: number, y: number, openedAt?: number } | null} props.menu - anchor + open state; null hides it.
 * @param {Array<{ id: string, label: string, icon?: React.ReactNode, tone?: string, run: () => void }>} props.actions
 * @param {() => void} props.onClose - called by Escape, outside press, or an item running.
 * @param {number} [props.maxHeight] - cap the popup in pixels; the list scrolls past it.
 * @param {'light' | 'dark'} [props.theme] - the owning surface's resolved scheme. The popup
 *   portals to `document.body`, so it inherits the shell's palette, not the owner's; declaring
 *   the scheme here lets the owner scope its light/dark tokens over this subtree.
 * @param {number} [props.z] - z-index override for the popup root; the stylesheet default is 30,
 *   an owner whose own layer must outrank shell modals raises it here (inline beats sheet).
 */
export function NanoMenu({ menu, actions, onClose, width = 208, maxHeight, theme, z }) {
  const ref = useRef(null)
  const [active, setActive] = useState(0)
  const items = menu === null ? [] : actions
  const count = items.length
  const latest = useRef(items)
  latest.current = items
  const openedAt = menu === null ? null : menu.openedAt
  const step = (from, dir) => {
    const list = latest.current
    const n = list.length
    if (n === 0) return 0
    let index = from
    for (let guard = 0; guard < n; guard++) {
      index = (index + dir + n) % n
      if (list[index]?.separator !== true) return index
    }
    return from
  }
  useEffect(() => {
    if (openedAt === null) return
    const first = items.findIndex(item => item?.separator !== true)
    setActive(first < 0 ? 0 : first)
  }, [openedAt])
  useEffect(() => {
    if (menu === null) return undefined
    const onPointer = event => { if (ref.current !== null && !ref.current.contains(event.target)) onClose() }
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => step(i, 1)); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => step(i, -1)); return }
      if (event.key === 'Enter') {
        event.preventDefault()
        const item = latest.current[active]
        if (!item || item.separator === true) return
        onClose()
        item.run()
      }
    }
    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('pointerdown', onPointer, true); document.removeEventListener('keydown', onKey, true) }
  }, [menu, active, count, onClose])
  if (menu === null || count === 0) return null
  const height = menuHeight(items)
  const left = Math.min(menu.x, (window.innerWidth || width) - width - 8)
  const top = Math.min(menu.y, (window.innerHeight || height) - height - 8)
  return React.createElement('div', {
    className: 'nano-menu', role: 'menu', ref,
    style: { position: 'fixed', left: `${Math.max(8, left)}px`, top: `${Math.max(8, top)}px`, minWidth: `${width}px`,
      ...(typeof z === 'number' ? { zIndex: String(Math.round(z)) } : {}),
      ...(typeof maxHeight === 'number' ? { maxHeight: `${Math.round(maxHeight)}px`, overflowY: 'auto', overscrollBehavior: 'contain' } : {}) },
    'data-nano-menu': 'true',
    /* Undefined is dropped by React, so an owner that follows the shell simply omits it. */
    'data-nano-theme': theme,
  }, items.map((item, index) => item?.separator === true
    ? React.createElement('div', { key: item.id, className: 'nano-menu-sep', role: 'separator' })
    : React.createElement(NanoMenuItem, {
      key: item.id, item, index, active: index === active, onHover: setActive, onRun: onClose,
    })))
}

/**
 * One menu row. Kept tiny so callers can also build listboxes that are not NanoMenu-anchored.
 * @param {object} props - item, active flag, hover setter, run-then-close.
 */
export function NanoMenuItem({ item, index, active, onHover, onRun }) {
  return React.createElement('button', {
    type: 'button', role: 'menuitem', className: 'nano-menu-item',
    'data-active': String(active), 'data-tone': item.tone ?? 'default',
    onMouseEnter: () => onHover(index), onClick: () => { onRun(); item.run() },
  },
  item.icon === undefined ? null : React.createElement('span', { className: 'nano-menu-icon', 'aria-hidden': 'true' }, item.icon),
  React.createElement('span', { className: 'nano-menu-label' }, item.label))
}
