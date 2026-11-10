/** One anchored popup menu every plugin shares: same skin, same key handling, same click-outside. */
import React from 'react'

const { useCallback, useEffect, useRef, useState } = React

/**
 * A menu anchored to a viewport point, drawn with the shared `nano-menu` skin.
 *
 * @param {object} props
 * @param {{ x: number, y: number, openedAt?: number } | null} props.menu - anchor + open state; null hides it.
 * @param {Array<{ id: string, label: string, icon?: React.ReactNode, tone?: string, run: () => void }>} props.actions
 * @param {() => void} props.onClose - called by Escape, outside press, or an item running.
 * @param {number} [props.maxHeight] - cap the popup in pixels; the list scrolls past it.
 */
export function NanoMenu({ menu, actions, onClose, width = 208, maxHeight }) {
  const ref = useRef(null)
  const [active, setActive] = useState(0)
  const items = menu === null ? [] : actions
  const count = items.length
  const latest = useRef(items)
  latest.current = items
  const openedAt = menu === null ? null : menu.openedAt
  useEffect(() => { if (openedAt !== null) setActive(0) }, [openedAt])
  useEffect(() => {
    if (menu === null) return undefined
    const onPointer = event => { if (ref.current !== null && !ref.current.contains(event.target)) onClose() }
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i + 1) % count); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i - 1 + count) % count); return }
      if (event.key === 'Enter') { event.preventDefault(); onClose(); latest.current[active]?.run() }
    }
    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey, true)
    return () => { document.removeEventListener('pointerdown', onPointer, true); document.removeEventListener('keydown', onKey, true) }
  }, [menu, active, count, onClose])
  if (menu === null || count === 0) return null
  const height = count * 28 + 8
  const left = Math.min(menu.x, (window.innerWidth || width) - width - 8)
  const top = Math.min(menu.y, (window.innerHeight || height) - height - 8)
  return React.createElement('div', {
    className: 'nano-menu', role: 'menu', ref,
    style: { position: 'fixed', left: `${Math.max(8, left)}px`, top: `${Math.max(8, top)}px`, minWidth: `${width}px`,
      ...(typeof maxHeight === 'number' ? { maxHeight: `${Math.round(maxHeight)}px`, overflowY: 'auto', overscrollBehavior: 'contain' } : {}) },
    'data-nano-menu': 'true',
  }, items.map((item, index) => React.createElement(NanoMenuItem, {
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
