/** Menu wrapper over the host `Menu` (DESIGN.md §6.2, §7). Keyboard, outside press and Escape all
 * belong to the host; nano-ui only maps its action rows and anchors the list. */
import React from 'react'
import { Menu } from '@deepseek-ai/dsh-client-ui-primitives'
import { capClass, menuHeight, MENU_CAPS, toHostItems } from './menu-model.js'

const h = React.createElement

export { menuHeight, MENU_CAPS, capClass, toHostItems }

/**
 * @param {object} props
 * @param {{ x: number, y: number, width?: number, height?: number } | null} props.menu - anchor;
 *   null renders nothing. With `portal` (default) it is a viewport rectangle the list opens from;
 *   with `portal:false` it is an offset inside the nearest positioned ancestor.
 * @param {Array<{ id: string, label?: string, icon?: React.ReactNode, tone?: 'danger', disabled?: boolean, separator?: boolean, run?: () => void }>} props.actions
 * @param {() => void} props.onClose - Escape, outside press, or a row being chosen.
 * @param {number} [props.width] - minimum list width in px.
 * @param {number} [props.maxHeight] - list height cap in px (preset, see MENU_CAPS).
 * @param {boolean} [props.portal] - true: host portal layer (main window); false: render in place.
 * @param {'down' | 'up'} [props.direction] - `up` maps to the host `side: 'top'`.
 */
export function NanoMenu({ menu, actions, onClose, width = 208, maxHeight, portal = true, direction }) {
  if (menu === null || menu === undefined || actions.length === 0) return null
  const onSelect = id => {
    const action = actions.find(candidate => candidate?.separator !== true && candidate?.id === id)
    onClose()
    action?.run?.()
  }
  const list = h(Menu, {
    open: true,
    items: toHostItems(actions),
    onSelect,
    onClose,
    side: direction === 'up' ? 'top' : 'bottom',
    portal,
    /* The running host places a portaled list with CSS anchor positioning on
     * `anchorPoint` ({x,y} viewport pixels) and does not read `getAnchorRect`.
     * Without the point, the list anchors to this wrapper's own child, which
     * sits wherever the caller rendered <NanoMenu> — for the files row menu
     * that is the bottom of the pane, not the pointer. `getAnchorRect` stays
     * for a host that positions from a DOMRect instead. */
    anchorPoint: portal ? { x: menu.x, y: menu.y } : undefined,
    getAnchorRect: portal ? () => new DOMRect(menu.x, menu.y, menu.width ?? 0, menu.height ?? 0) : undefined,
    listClassName: capClass(maxHeight),
  }, h('div', { 'aria-hidden': 'true', style: { width: `${width}px`, height: 0 } }))
  if (portal) return list
  return h('span', { className: 'nano-anchor', style: { left: `${menu.x}px`, top: `${menu.y}px` } }, list)
}
