/** A small row menu this plugin owns: copy relative path, rename, and reveal.
 *
 * The shared `contextMenus` service renders its overlay through the layout seat, which this
 * deployment does not present over a taken-over files page. Owning the popup keeps the row actions
 * reachable without depending on that seat, and keeps the menu inside the tree that produced it.
 */

import React from 'react'

const { useCallback, useEffect, useRef, useState } = React

/**
 * One menu occurrence anchored to a viewport point.
 * @param props - open state, anchor, copy, and the actions to run.
 * @returns the popup, or null while closed.
 */
export function RowMenu({ menu, copy, onCopyRelative, onRename, onClose }) {
  const ref = useRef(null)
  const [active, setActive] = useState(0)

  const items = menu === null ? [] : [
    { id: 'copy-relative', label: copy.copyRelative, run: onCopyRelative },
    ...(menu.kind === 'file' ? [{ id: 'rename', label: copy.rename, run: onRename }] : [{ id: 'rename', label: copy.rename, run: onRename }]),
  ]

  useEffect(() => {
    if (menu === null) return undefined
    setActive(0)
    const onPointer = event => {
      if (ref.current !== null && !ref.current.contains(event.target)) onClose()
    }
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); return }
      if (event.key === 'ArrowDown') { event.preventDefault(); setActive(i => (i + 1) % items.length); return }
      if (event.key === 'ArrowUp') { event.preventDefault(); setActive(i => (i - 1 + items.length) % items.length); return }
      if (event.key === 'Enter') {
        event.preventDefault()
        const item = items[active]
        onClose()
        item?.run(menu.target)
      }
    }
    document.addEventListener('pointerdown', onPointer, true)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointer, true)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [menu, active, items, onClose])

  if (menu === null) return null
  return React.createElement('div', {
    className: 'nxe-menu',
    role: 'menu',
    ref,
    style: { left: `${menu.x}px`, top: `${menu.y}px` },
    'data-nxe-menu': 'true',
  }, items.map((item, index) => React.createElement('button', {
    key: item.id,
    type: 'button',
    role: 'menuitem',
    className: 'nxe-menu-item',
    'data-active': String(index === active),
    onMouseEnter: () => setActive(index),
    onClick: () => { onClose(); item.run(menu.target) },
  }, item.label)))
}
