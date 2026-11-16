/** Open shared dialogs and menus from non-React code (e.g. the notepad's DOM builder). */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { NanoDialog } from './dialog.js'
import { NanoMenu } from './menu.js'
import { NanoWindowDialog, assertContainer } from './overlay.js'

/** The host Menu already keeps this many px between anchor and list. */
const HOST_MENU_GAP = 4

function mount(parent) {
  const host = document.createElement('div')
  parent.appendChild(host)
  const root = createRoot(host)
  let closed = false
  const close = () => {
    if (closed) return
    closed = true
    root.unmount()
    host.remove()
  }
  return { host, root, close }
}

/**
 * Open a dialog. Two carriers only (DESIGN.md §5):
 * - with `container`: a window overlay inside that element (it must be a containing block);
 * - without: a main-window NanoDialog over the host Modal.
 * @param {object} options - NanoDialog props (`copy/title/onConfirm/onCancel/width/maxHeight/fixedHeight/…`)
 *   plus `container`.
 * @param {HTMLElement} [options.container]
 * @returns {{ close: () => void }}
 */
export function openNanoDialog(options) {
  const { container, ...props } = options
  if (container !== undefined) assertContainer(container, 'openNanoDialog')
  const { root, close } = mount(container ?? document.body)
  const onCancel = () => {
    options.onCancel?.()
    close()
  }
  root.render(React.createElement(container === undefined ? NanoDialog : NanoWindowDialog, { ...props, onCancel }))
  return { close }
}

/**
 * Open a menu anchored to a rectangle.
 * @param {object} options
 * @param {DOMRect | { left?: number, top?: number, right?: number, bottom?: number, x?: number, y?: number, width?: number, height?: number }} options.anchor - viewport rectangle.
 * @param {Array<{ id: string, label?: string, icon?: any, tone?: 'danger', separator?: boolean, run?: () => void }>} options.items
 * @param {number} [options.width] - list min-width.
 * @param {number} [options.maxHeight] - list cap (preset).
 * @param {number} [options.gap] - px between anchor and list.
 * @param {'down' | 'up'} [options.direction] - `up` opens above the anchor.
 * @param {HTMLElement} [options.container] - render inside this element (`portal:false`) so the list
 *   inherits the owner's scheme and stacking; without it the list uses the host portal layer.
 * @returns {{ close: () => void }}
 */
export function openNanoMenu(options) {
  const { container } = options
  if (container !== undefined) assertContainer(container, 'openNanoMenu')
  const { host, root, close } = mount(container ?? document.body)
  const r = options.anchor
  const left = r.left ?? r.x ?? 0
  const top = r.top ?? r.y ?? 0
  const right = r.right ?? left + (r.width ?? 0)
  const bottom = r.bottom ?? top + (r.height ?? 0)
  const gap = options.gap ?? 0
  const up = options.direction === 'up'
  let menu
  if (container === undefined) {
    const extra = Math.max(0, gap - HOST_MENU_GAP)
    menu = { x: left, y: up ? top - extra : top, width: right - left, height: bottom - top + extra }
  } else {
    const box = (host.offsetParent ?? container).getBoundingClientRect()
    const scroller = host.offsetParent ?? container
    menu = {
      x: left - box.left - scroller.clientLeft + scroller.scrollLeft,
      y: (up ? top - gap : bottom + gap) - box.top - scroller.clientTop + scroller.scrollTop,
    }
  }
  root.render(React.createElement(NanoMenu, {
    menu,
    actions: options.items ?? [],
    width: options.width,
    maxHeight: options.maxHeight,
    direction: options.direction,
    portal: container === undefined,
    onClose: close,
  }))
  return { close }
}
