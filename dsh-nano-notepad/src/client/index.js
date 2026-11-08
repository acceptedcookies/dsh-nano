/** Browser half. The host serves the built file at the package's ./client export. */

import React from 'react'
import { normalizeSettings } from './db.js'
import { mountNotepad } from './panel.js'

export const inject = ['slots', 'shortcuts']

const SHORTCUT = {
  id: 'notepad.toggle',
  defaults: {
    'web:macos': { code: 'KeyA', modifiers: ['primary', 'alt', 'shift'] },
    'web:windows': { code: 'KeyA', modifiers: ['primary', 'alt'] },
  },
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
function shortcutLabel(ctx) {
  const entry = ctx.shortcuts.catalog.getSnapshot().find(item => item.id === SHORTCUT.id)
  const keys = entry?.keys?.join(ctx.shortcuts.platform === 'windows' ? ' + ' : '') ?? ''
  return {
    text: keys ? `Show 便签 (${keys})` : 'Show 便签',
    aria: entry?.aria,
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx @param {Record<string, unknown>} [config] */
export function apply(ctx, config = {}) {
  const defaults = normalizeSettings(config)
  /** @type {{ toggle: () => void } | undefined} */
  let api
  ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'nano-notepad',
    order: 40,
    inject: () => ({
      defaults,
      label: () => shortcutLabel(ctx).text,
      shortcutKeys: () => shortcutLabel(ctx).aria,
      subscribeShortcut: listener => ctx.shortcuts.catalog.subscribe(listener),
      ready: next => { api = next },
    }),
  }, function Notepad({ defaults: initial, label, shortcutKeys, subscribeShortcut, ready }) {
    const ref = React.useRef(null)
    React.useEffect(() => {
      const element = ref.current
      if (!element) return undefined
      const mounted = mountNotepad(element, initial)
      mounted.setShortcut(label(), shortcutKeys())
      ready(mounted)
      const stop = subscribeShortcut(() => mounted.setShortcut(label(), shortcutKeys()))
      return () => {
        stop()
        ready(undefined)
        element.replaceChildren()
      }
    }, [])
    return React.createElement('div', { ref, 'data-nano-notepad': 'root' })
  }))
  ctx.effect(() => ctx.shortcuts.register({
    id: SHORTCUT.id,
    label: () => 'Show 便签',
    aliases: ['notepad', 'nano notepad'],
    defaults: SHORTCUT.defaults,
    regions: ['page', 'editable'],
    modals: [],
    resolve: ({ modal }) => modal !== null
      ? { status: 'pass' }
      : { status: 'handled', run: () => api?.toggle() },
  }))
}
