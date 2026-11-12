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
 * @param {object} options - NanoDialog props (`copy/title/onConfirm/onCancel/…`), plus the
 *   adapter-only keys below.
 * @param {number} [options.fixedHeight] - freeze the card at this pixel height.
 * @param {DOMRect} [options.region] - confine the overlay to this rect.
 * @param {number} [options.width] - card width in pixels.
 * @param {'light' | 'dark'} [options.theme] - owning surface's resolved scheme. The shell Modal
 *   portals into `document.body`, so the card would otherwise inherit the shell's palette; the
 *   scheme is stamped on the portal layer (card and mask alike) for the owner to scope its tokens.
 * @param {number} [options.z] - z-index for the portal layer. The shell Modal bakes z-index:1000
 *   into its root; an owner that must sit above shell modals raises it here (inline beats sheet).
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
  /* Tabbed dialogs opt into a fixed height; the panels scroll inside it. */
  const heightKey = '--nano-dlg-h'
  const heightValue = typeof options.fixedHeight === 'number' ? `${Math.round(options.fixedHeight)}px` : null
  if (heightValue !== null) document.documentElement.style.setProperty(heightKey, heightValue)
  /* Modal portals into document.body and its .root is a fixed full-viewport
     layer with a hashed class. To size the card or fence the overlay inside the
     owning window's rect we flag the card (nano-dialog-sized/regioned), then
     one MutationObserver applies inline geometry + vars onto .root once React
     commits it — parentElement is the only reliable way back to .root. */
  const wantsRegion = options.region instanceof DOMRect
  const wantsWidth = typeof options.width === 'number'
  /* The shell Modal forwards only its own props to the card, so the scheme cannot
     ride React: stamp it on the portal layer, which owns both the card and the
     mask, and the owner's `[data-nano-theme]` rules reach the whole overlay. */
  let theme = options.theme
  const wantsTheme = theme === 'light' || theme === 'dark'
  /** The portal layer once React has committed the card; `setTheme` writes here. */
  let layerEl = /** @type {HTMLElement | null} */ (null)
  const wantsZ = typeof options.z === 'number'
  const observer = (wantsRegion || wantsWidth || wantsTheme || wantsZ) ? new MutationObserver(() => {
    for (const card of document.querySelectorAll('.nano-dialog-card')) {
      if (card instanceof HTMLElement === false || card.dataset.nanoBound === '1') continue
      const layer = card.parentElement
      if (!(layer instanceof HTMLElement)) continue
      card.dataset.nanoBound = '1'
      if (wantsZ) layer.style.zIndex = String(Math.round(options.z))
      if (wantsTheme) {
        layerEl = layer
        layer.setAttribute('data-nano-theme', theme)
      }
      /* Fixed-height (tabbed) dialogs move scrolling into their own panels. */
      if (heightValue !== null) card.classList.add('nano-dialog-fixed')
      if (wantsWidth) layer.style.setProperty('--nano-dlg-w', `${Math.round(options.width)}px`)
      if (wantsRegion) {
        const r = options.region
        layer.classList.add('nano-regioned')
        /* The shell's .root is content-box with its own 24px padding, and the
           mask is an absolutely positioned child: `inset: 0` resolves against
           the padding box. Without border-box the 12px padding below grows the
           layer to r + 24px, so the mask (and the dimmed area) hangs 24px past
           the owning window's right and bottom edges. Rounding the layer to the
           same radius keeps the mask inside the window's rounded corners too. */
        Object.assign(layer.style, {
          position: 'fixed',
          top: `${r.top}px`,
          left: `${r.left}px`,
          right: 'auto',
          bottom: 'auto',
          boxSizing: 'border-box',
          width: `${r.width}px`,
          height: `${r.height}px`,
          padding: '12px',
          borderRadius: 'var(--dsw-radius-panel, 28px)',
          overflow: 'hidden',
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
    if (heightValue !== null && document.documentElement.style.getPropertyValue(heightKey) === heightValue) {
      document.documentElement.style.removeProperty(heightKey)
    }
  }
  root.render(React.createElement(NanoDialog, { ...options, onCancel: () => { options.onCancel?.(); close() } }))
  /* Owners that can change scheme while the card is up (the notepad's own
     settings card is exactly that) re-stamp it instead of reopening the dialog. */
  const setTheme = next => {
    if (next !== 'light' && next !== 'dark') return
    theme = next
    if (layerEl !== null && layerEl.isConnected) layerEl.setAttribute('data-nano-theme', next)
  }
  return { close, setTheme }
}

/**
 * Open a NanoMenu anchored to a DOM element's rectangle.
 * @param {object} options
 * @param {DOMRect | {left:number, top:number, right:number, bottom:number}} options.anchor - rectangle to anchor under.
 * @param {Array<{id:string,label:string,icon?:any,tone?:string,run:()=>void}>} options.items
 * @param {number} [options.width] - menu min-width.
 * @param {number} [options.maxHeight] - cap the popup; the list scrolls past it.
 * @param {number} [options.gap] - pixels between the anchor's bottom and the popup's top.
 * @param {'light' | 'dark'} [options.theme] - owning surface's resolved scheme; see NanoMenu.
 * @param {number} [options.z] - z-index for the popup root (inline style); see NanoMenu.
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
    theme: options.theme,
    z: options.z,
    onClose: close,
  }))
  return { close }
}
