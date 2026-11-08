/** The row menu this plugin owns.
 *
 * The shared `contextMenus` service gives each contribution a one-second deadline before it gives up
 * and reports a failure. The shipped opener provider needs a host round trip plus an application
 * probe, which on a large workspace regularly lands past that budget: the menu opened late and
 * announced an error for actions that had in fact resolved. Owning the popup keeps every row action
 * immediate and lets this page offer delete, which the shared menu has no concept of.
 */

import React from 'react'

const { useCallback, useEffect, useRef, useState } = React

/**
 * One menu occurrence anchored to the viewport point that opened it.
 * @param props - open state, anchor, copy, the action set, and a close callback.
 * @returns the popup, or null while closed.
 */
export function RowMenu({ menu, copy, actions, onClose }) {
  const ref = useRef(null)
  const [active, setActive] = useState(0)

  const items = menu === null ? [] : actions
  const count = items.length
  const latest = useRef(items)
  latest.current = items

  // One reset per opening. The action array is rebuilt whenever the page renders, so depending on it
  // here would snap the highlight back to the first row on every hover-driven re-render, which read
  // as "the highlight never follows the pointer".
  const openedAt = menu === null ? null : menu.openedAt
  useEffect(() => {
    if (openedAt === null) return
    setActive(0)
  }, [openedAt])

  useEffect(() => {
    if (menu === null) return undefined
    const onPointer = event => {
      if (ref.current !== null && !ref.current.contains(event.target)) onClose()
    }
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i + 1) % count); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i - 1 + count) % count); return }
      if (event.key === 'Enter') {
        event.preventDefault()
        const item = latest.current[active]
        onClose()
        item?.run()
      }
    }
    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [menu, active, count, onClose])

  if (menu === null || count === 0) return null

  // Keep the popup inside the viewport: a row near the bottom edge would otherwise open off-screen.
  const width = 208
  const height = count * 28 + 8
  const left = Math.min(menu.x, (window.innerWidth || width) - width - 8)
  const top = Math.min(menu.y, (window.innerHeight || height) - height - 8)

  return React.createElement('div', {
    className: 'nxe-menu',
    role: 'menu',
    ref,
    style: { position: 'fixed', left: `${Math.max(8, left)}px`, top: `${Math.max(8, top)}px`, minWidth: `${width}px` },
    'data-nxe-menu': 'true',
  }, items.map((item, index) => React.createElement('button', {
    key: item.id,
    type: 'button',
    role: 'menuitem',
    className: 'nxe-menu-item',
    'data-active': String(index === active),
    'data-tone': item.tone ?? 'default',
    onMouseEnter: () => setActive(index),
    onClick: () => { onClose(); item.run() },
  },
  item.icon === undefined ? null : React.createElement('span', { className: 'nxe-menu-icon', 'aria-hidden': 'true' }, item.icon),
  React.createElement('span', { className: 'nxe-menu-label' }, item.label))))
}
