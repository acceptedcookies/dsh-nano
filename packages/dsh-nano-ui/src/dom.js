/** Mount shared components from non-React code (e.g. the notepad's DOM builder).
 *
 * React and ReactDOM come from the shell's module loader (they are esbuild externals), so the
 * caller gets real primitives without the plugin bundling React itself.
 */
import React from 'react'
import { createRoot } from 'react-dom/client'
import { NanoDialog } from './dialog.js'
import { NanoMenu } from './menu.js'

/**
 * Open a NanoDialog. Returns a `close()` that unmounts and removes the portal host.
 * @param {object} options - NanoDialog props (`copy/title/onConfirm/onCancel/…`).
 * @returns {{ close: () => void }}
 */
export function openNanoDialog(options) {
  const host = document.createElement('div')
  host.className = 'nano-dialog-host'
  document.body.appendChild(host)
  /* Modal portals straight into document.body, so the cap can't ride the host:
     it lives as a document-level custom property while a capped dialog is open,
     removed on close only if no later dialog has replaced it. */
  const maxKey = '--nano-dlg-max'
  const maxValue = typeof options.maxHeight === 'number' ? `${Math.round(options.maxHeight)}px` : null
  if (maxValue !== null) document.documentElement.style.setProperty(maxKey, maxValue)
  /* Modal portals into document.body and its .root is a fixed full-viewport
     layer with a hashed class. To size the card or fence the overlay inside the
     owning window's rect we flag the card (nano-dialog-sized/regioned), then
     one MutationObserver applies inline geometry + vars onto .root once React
     commits it — parentElement is the only reliable way back to .root. */
  const wantsRegion = options.region instanceof DOMRect
  const wantsWidth = typeof options.width === 'number'
  const observer = (wantsRegion || wantsWidth) ? new MutationObserver(() => {
    for (const card of document.querySelectorAll('.nano-dialog-card')) {
      if (card instanceof HTMLElement === false || card.dataset.nanoBound === '1') continue
      const layer = card.parentElement
      if (!(layer instanceof HTMLElement)) continue
      card.dataset.nanoBound = '1'
      if (wantsWidth) layer.style.setProperty('--nano-dlg-w', `${Math.round(options.width)}px`)
      if (wantsRegion) {
        const r = options.region
        layer.classList.add('nano-regioned')
        Object.assign(layer.style, {
          position: 'fixed',
          top: `${r.top}px`,
          left: `${r.left}px`,
          right: 'auto',
          bottom: 'auto',
          width: `${r.width}px`,
          height: `${r.height}px`,
          padding: '12px',
        })
      }
    }
  }) : null
  observer?.observe(document.body, { childList: true })
  const root = createRoot(host)
  const close = () => {
    observer?.disconnect()
    root.unmount()
    host.remove()
    if (maxValue !== null && document.documentElement.style.getPropertyValue(maxKey) === maxValue) {
      document.documentElement.style.removeProperty(maxKey)
    }
  }
  root.render(React.createElement(NanoDialog, { ...options, onCancel: () => { options.onCancel?.(); close() } }))
  return { close }
}

/**
 * Open a NanoMenu anchored to a DOM element's rectangle.
 * @param {object} options
 * @param {DOMRect | {left:number, top:number, right:number, bottom:number}} options.anchor - rectangle to anchor under.
 * @param {Array<{id:string,label:string,icon?:any,tone?:string,run:()=>void}>} options.items
 * @param {number} [options.width] - menu min-width.
 * @param {number} [options.maxHeight] - cap the popup; the list scrolls past it.
 * @param {number} [options.gap] - pixels between the anchor's bottom and the popup's top.
 * @returns {{ close: () => void }}
 */
export function openNanoMenu(options) {
  const host = document.createElement('div')
  host.className = 'nano-menu-host'
  document.body.appendChild(host)
  const root = createRoot(host)
  const close = () => { root.unmount(); host.remove() }
  const r = options.anchor
  const x = r.left !== undefined ? r.left : r.x
  const y = (r.bottom !== undefined ? r.bottom : (r.y ?? 0) + (r.height ?? 0)) + (options.gap ?? 0)
  root.render(React.createElement(NanoMenu, {
    menu: { x, y, openedAt: Date.now() },
    actions: options.items ?? [],
    width: options.width,
    maxHeight: options.maxHeight,
    onClose: close,
  }))
  return { close }
}
