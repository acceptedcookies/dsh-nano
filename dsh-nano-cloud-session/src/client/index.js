/** Browser half: a native "云端工作区" sidebar section plus native dialogs.
 *  No floating entry and no floating panel. */
import React from 'react'
import { NANO_STYLES } from 'dsh-nano-ui'
import { CloudSectionGraft } from './section.js'
import { SettingsDialog } from './settings-dialog.js'
import { SessionDialog } from './session-dialog.js'
import { NewSessionDialog } from './new-session-dialog.js'
import { CLOUD_CSS } from './styles.js'
import { makeI18n } from './i18n.js'
import { api } from './api.js'

export const inject = ['slots', 'locale']

const VERSION = typeof __DNCS_VERSION__ !== 'undefined' ? __DNCS_VERSION__ : '0.0.0'

function createStore(initial) {
  let current = initial
  const listeners = new Set()
  return {
    get current() { return current },
    set(next) { current = { ...current, ...next }; for (const listener of listeners) listener(current) },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener) },
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx, config = {}) {
  const t = makeI18n(() => ctx.locale.getSnapshot().active)

  const style = document.createElement('style')
  style.dataset.dncsStyle = 'true'
  style.textContent = NANO_STYLES + CLOUD_CSS
  document.head.append(style)
  ctx.effect(() => () => style.remove(), 'nano-cloud-session: styles')

  const store = createStore({
    loading: true,
    profiles: [],
    activeId: null,
    sessions: [],
    expanded: true,
    settingsOpen: false,
    newOpen: false,
    sessionId: null,
    error: '',
  })

  const refresh = async () => {
    try {
      const status = await api.status()
      const list = status.activeId ? await api.sessions({ first: 50 }) : { items: [] }
      store.set({
        loading: false,
        profiles: status.profiles ?? [],
        activeId: status.activeId ?? null,
        sessions: list.items ?? list.sessions ?? [],
        error: '',
      })
    } catch (cause) {
      store.set({ loading: false, error: cause?.message ?? String(cause) })
    }
  }

  const face = {
    t,
    get current() { return store.current },
    subscribe: listener => store.subscribe(listener),
    refresh,
    copy: () => t,
    openSettings: () => store.set({ settingsOpen: true }),
    closeSettings: () => store.set({ settingsOpen: false }),
    openNew: () => store.set({ newOpen: true }),
    closeNew: () => store.set({ newOpen: false }),
    openSession: sessionId => store.set({ sessionId }),
    closeSession: () => store.set({ sessionId: null }),
    toggleExpanded: () => store.set({ expanded: store.current.expanded !== true }),
  }

  function CloudSessionRoot() {
    const [state, setState] = React.useState(face.current)
    React.useEffect(() => face.subscribe(setState), [])
    return React.createElement(React.Fragment, null,
      React.createElement(CloudSectionGraft, { face, state }),
      state.settingsOpen ? React.createElement(SettingsDialog, { face, onClose: face.closeSettings }) : null,
      state.newOpen ? React.createElement(NewSessionDialog, {
        face,
        onClose: face.closeNew,
        onCreated: id => { face.closeNew(); face.openSession(id) },
      }) : null,
      state.sessionId ? React.createElement(SessionDialog, { face, sessionId: state.sessionId, onClose: face.closeSession }) : null)
  }

  ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'nano-cloud-session',
    order: 50,
    inject: () => ({ version: VERSION }),
  }, CloudSessionRoot)), 'nano-cloud-session: sidebar section')

  ctx.effect(() => {
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, Math.max(5000, Number(config.pollIntervalMs) || 30000))
    return () => window.clearInterval(timer)
  }, 'nano-cloud-session: refresh loop')
}
