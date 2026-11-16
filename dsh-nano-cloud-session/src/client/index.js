/** Browser half: a native "云端工作区" sidebar section plus native dialogs.
 *  No floating entry and no floating panel. */
import React from 'react'
import { NANO_STYLES } from 'dsh-nano-ui'
import { CloudSectionGraft } from './section.js'
import { SettingsDialog } from './settings-dialog.js'
import { NewSessionDialog } from './new-session-dialog.js'
import { registerNativeWorkbench, rememberWorkbenchSession } from './native-workbench.js'
import { CLOUD_CSS } from './styles.js'
import { makeI18n } from './i18n.js'
import { api } from './api.js'

export const inject = ['slots', 'locale', 'uiWorkspace', 'sessions', 'sidebarRight', 'sidebarRightTabs']

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

/** Cloud sessions talk to Devin. Hide the local permission chip, model
 *  picker and skill/attachment menu, and show a static Devin chip instead. */
function installCloudComposer() {
  let frame = 0
  const mark = () => {
    const cloud = document.documentElement.dataset.dncsCloud === '1'
    const seat = document.querySelector('[class*="composerSeat"]')
    if (!seat) return
    let chip = seat.querySelector('.dncs-devin-chip')
    if (!cloud) { chip?.remove(); return }
    if (chip) return
    chip = document.createElement('span')
    chip.className = 'dncs-devin-chip'
    chip.textContent = 'Devin'
    const anchor = seat.querySelector('.nms-root, [data-nano-model-selector="root"], button[aria-label*="工作区内修改"], button[aria-label*="Workspace Write"]')
    if (anchor?.parentElement) anchor.parentElement.insertBefore(chip, anchor)
    else seat.append(chip)
  }
  const schedule = () => {
    if (frame) return
    frame = window.requestAnimationFrame(() => { frame = 0; mark() })
  }
  const onClick = event => {
    const row = event.target?.closest?.('[data-slot="sidebar.workspaces"] [role="treeitem"]')
    if (!row) return
    document.documentElement.dataset.dncsCloud = '0'
    delete document.documentElement.dataset.dncsLocal
    schedule()
  }
  document.addEventListener('click', onClick, true)
  const observer = new MutationObserver(schedule)
  observer.observe(document.body, { childList: true, subtree: true })
  schedule()
  return () => {
    observer.disconnect()
    document.removeEventListener('click', onClick, true)
    if (frame) window.cancelAnimationFrame(frame)
    document.querySelector('.dncs-devin-chip')?.remove()
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx, config = {}) {
  const t = makeI18n(() => ctx.locale.getSnapshot().active)
  const workbenchKind = registerNativeWorkbench(ctx, t)

  const style = document.createElement('style')
  style.dataset.dncsStyle = 'true'
  style.textContent = NANO_STYLES + CLOUD_CSS
  document.head.append(style)
  ctx.effect(() => () => style.remove(), 'nano-cloud-session: styles')
  ctx.effect(() => installCloudComposer(), 'nano-cloud-session: devin composer')

  const store = createStore({
    loading: true,
    refreshing: false,
    profiles: [],
    activeId: null,
    sessions: [],
    expanded: true,
    activeSessionId: null,
    settingsOpen: false,
    newOpen: false,
    error: '',
  })

  const refresh = async ({ animate = false } = {}) => {
    store.set({ refreshing: true, ...(animate ? { loading: true } : {}), error: '' })
    try {
      const status = await api.status()
      store.set({
        profiles: status.profiles ?? [],
        activeId: status.activeId ?? null,
      })
      if (!status.activeId) {
        store.set({ sessions: [] })
        return
      }
      const list = await api.sessions({ first: 50, isArchived: false })
      const sessions = (list.items ?? list.sessions ?? []).filter(item => item?.is_archived !== true)
      store.set({ sessions })
    } catch (cause) {
      store.set({ error: cause?.message ?? String(cause) })
    } finally {
      store.set({ loading: false, refreshing: false })
    }
  }

  const face = {
    t,
    get current() { return store.current },
    subscribe: listener => store.subscribe(listener),
    refresh,
    archiveSession: async sessionId => {
      if (!window.confirm(t('archiveConfirm'))) return
      store.set({ refreshing: true, error: '' })
      try {
        await api.archive(sessionId)
        await refresh()
      } catch (cause) {
        store.set({ refreshing: false, error: cause?.message ?? String(cause) })
      }
    },
    copy: () => t,
    get locale() { return ctx.locale.getSnapshot().active },
    openSettings: () => store.set({ settingsOpen: true }),
    closeSettings: () => { store.set({ settingsOpen: false }); void refresh({ animate: true }) },
    openNew: () => store.set(store.current.activeId ? { newOpen: true } : { settingsOpen: true }),
    closeNew: () => store.set({ newOpen: false }),
    openSession: async sessionId => {
      store.set({ opening: true, activeSessionId: sessionId, error: '' })
      try {
        const bridge = await api.nativeOpen(sessionId)
        void ctx.sessions?.refresh?.()
        rememberWorkbenchSession(bridge.local_session_id, sessionId)
        document.documentElement.dataset.dncsLocal = bridge.local_session_id
        document.documentElement.dataset.dncsCloud = '1'
        ctx.uiWorkspace.openSession(bridge.local_session_id)
        window.setTimeout(() => {
          try { ctx.sidebarRight.openTabIn(bridge.local_session_id, workbenchKind) }
          catch (cause) { console.warn('[nano-cloud-session] workbench open failed', cause) }
        }, 500)
      } catch (cause) {
        /* Opening failed (carrier 401/403/5xx, or a host that cannot project).
         * The section renders `error`, so the row never fails silently. */
        store.set({ activeSessionId: null, opening: false, error: cause?.message ?? String(cause) })
      }
    },
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
      }) : null)
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
