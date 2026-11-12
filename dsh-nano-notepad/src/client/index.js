/** Browser half. The host serves the built file at the package's ./client export. */

import React from 'react'
import { normalizeSettings } from './db.js'
import { mountNotepad } from './panel.js'
import { perf } from './perf.js'
import { chordAria, chordKeys, primaryDown } from './shortcut.js'

export const inject = ['slots', 'shortcuts', 'theme', 'locale', 'workspaces', 'sessions', 'sidebarRight']

/** @param {import('@deepseek-ai/cordis').Context} ctx */
function shortcutLabel(ctx) {
  const platform = ctx.shortcuts.platform
  const keys = chordKeys(platform)
  const title = ctx.locale.getSnapshot().active?.startsWith('zh') ? '显示便签' : 'Show notepad'
  return { text: `${title} (${keys})`, aria: chordAria(platform) }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx @param {Record<string, unknown>} [config] */
export function apply(ctx, config = {}) {
  const defaults = normalizeSettings(config)
  /** The session shown in the main view — the same signal the sidebar's own
      `mainSessionId` uses. `ctx.sessions` exposes `.list` only; there is no
      `getSnapshot().current`. */
  const currentSession = () => {
    const sessions = ctx.sessions?.list?.getSnapshot?.() ?? {}
    const rows = sessions.byId ? Object.values(sessions.byId) : []
    const retained = rows.find(row => (row?.retainedBy?.mainView ?? 0) > 0)
    return { id: retained?.id ?? null, row: retained ?? null }
  }
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
      subscribeShortcut: listener => ctx.on('locale/change', listener),
      ready: next => { api = next },
    }),
  }, function Notepad({ defaults: initial, label, shortcutKeys, subscribeShortcut, ready }) {
    const ref = React.useRef(null)
    React.useEffect(() => {
      const element = ref.current
      if (!element) return undefined
      const mounted = mountNotepad(element, initial, {
        scheme: () => ctx.theme.getTheme().colorScheme === 'light' ? 'light' : 'dark',
        subscribe: listener => ctx.on('theme/change', listener),
      }, {
        current: () => ctx.locale.getSnapshot().active,
        subscribe: listener => ctx.on('locale/change', listener),
      }, {
        current: () => {
          const list = ctx.workspaces?.list ?? ctx.workspaces
          const snapshot = list?.getSnapshot?.() ?? { items: [] }
          const { id: sessionId } = currentSession()
          const currentId = sessionId
            ? (snapshot.items ?? []).find(item => item.sessionIds?.includes(sessionId))?.workspaceId ?? null
            : null
          return { items: snapshot.items ?? [], currentId }
        },
        subscribe: listener => {
          const list = ctx.workspaces?.list ?? ctx.workspaces
          return list?.subscribe?.(listener) ?? (() => {})
        },
      }, (path) => {
        const { id: sessionId, row } = currentSession()
        if (!sessionId || typeof ctx.sidebarRight?.openResource !== 'function') return false
        const cwd = String(row?.cwd ?? '').replace(/\\/g, '/').replace(/\/+$/, '')
        let normalized = String(path).replace(/\\/g, '/').replace(/^(?:\.\/)+/, '')
        if (cwd && (normalized === cwd || normalized.startsWith(`${cwd}/`))) {
          normalized = normalized === cwd ? '' : normalized.slice(cwd.length + 1)
        }
        const encode = segment => encodeURIComponent(segment).replace(/%3A/gi, ':')
        const address = `dsh-resource://file/session/${encode(sessionId)}/${normalized.split('/').filter(Boolean).map(encode).join('/')}`
        try {
          ctx.sidebarRight.openResource(address)
        } catch (error) {
          if (typeof ctx.sidebarRight.openResourceIn === 'function') ctx.sidebarRight.openResourceIn(sessionId, address)
          else throw error
        }
        return true
      })
      mounted.setShortcut(label(), shortcutKeys())
      ready(mounted)
      const stop = subscribeShortcut(() => mounted.setShortcut(label(), shortcutKeys()))
      return () => {
        stop()
        mounted.stopTheme()
        ready(undefined)
        element.replaceChildren()
      }
    }, [])
    return React.createElement('div', { ref, 'data-nano-notepad': 'root' })
  }))
  ctx.effect(() => {
    // perf-review: one track for the two permanent document capture listeners
    // (⌘E / 1). wrap() the ORIGINAL callbacks; attach/detach keep the shared
    // per-name live counter honest — never resetLive() (§6.7 / §10.5-A4).
    const shortcutTrack = perf.track('listener', 'shortcut-key')
    const platform = ctx.shortcuts.platform
    let letterHeld = false
    const down = (event) => {
      if (event.isComposing) return
      if (event.code === 'KeyE') {
        letterHeld = primaryDown(event, platform) && !event.shiftKey
        /* Windows: Alt+E is also Chrome's "open the menu" accelerator. Ask the
           browser to stand down; when it refuses, Ctrl+E still completes the
           chord, so the notepad never becomes unreachable. */
        if (letterHeld && platform === 'windows' && event.altKey === true) event.preventDefault()
        return
      }
      if (!letterHeld || event.code !== 'Digit1' || event.repeat) return
      if (!primaryDown(event, platform) || event.shiftKey) return
      event.preventDefault()
      event.stopPropagation()
      api?.toggle()
    }
    const up = (event) => {
      if (event.code === 'KeyE' || event.key === 'Meta' || event.key === 'Control' || event.key === 'Alt') {
        letterHeld = false
      }
    }
    const wrappedDown = shortcutTrack.wrap(down)
    const wrappedUp = shortcutTrack.wrap(up)
    document.addEventListener('keydown', wrappedDown, true)
    document.addEventListener('keyup', wrappedUp, true)
    shortcutTrack.attach(2)
    return () => {
      document.removeEventListener('keydown', wrappedDown, true)
      document.removeEventListener('keyup', wrappedUp, true)
      shortcutTrack.detach(2)
    }
  })
}
