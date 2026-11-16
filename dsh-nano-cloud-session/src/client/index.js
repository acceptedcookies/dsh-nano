/** Browser half: a native "云端工作区" sidebar section plus native dialogs.
 *  No floating entry and no floating panel. */
import React from 'react'
import { NanoDialog, NANO_STYLES } from 'dsh-nano-ui'
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

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx, config = {}) {
  const t = makeI18n(() => ctx.locale.getSnapshot().active)
  const workbenchKind = registerNativeWorkbench(ctx, t)

  const style = document.createElement('style')
  style.dataset.dncsStyle = 'true'
  style.textContent = NANO_STYLES + CLOUD_CSS
  document.head.append(style)
  ctx.effect(() => () => style.remove(), 'nano-cloud-session: styles')

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
    archiveTarget: null,
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
    /** The archive dialog is reversible upstream (unarchive), so it is a
     *  `NanoDialog danger` and not a RiskConfirmation acknowledgment gate. */
    askArchive: sessionId => store.set({ archiveTarget: sessionId }),
    closeArchive: () => store.set({ archiveTarget: null }),
    archiveSession: async sessionId => {
      store.set({ archiveTarget: null, refreshing: true, error: '' })
      try {
        await api.archive(sessionId)
        await refresh()
      } catch (cause) {
        store.set({ refreshing: false, error: cause?.message ?? String(cause) })
      }
    },
    copy: () => t,
    get locale() { return ctx.locale.getSnapshot().active },
    /** Rail entry: the host owns the sidebar toggle, so no document scan. */
    expandSidebar: () => {
      try {
        if (typeof ctx.layout?.toggleSidebar !== 'function') return false
        ctx.layout.toggleSidebar()
        return true
      } catch {
        return false
      }
    },
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

  function ArchiveDialog({ face, sessionId, onClose }) {
    const session = (face.current.sessions ?? []).find(item => item.session_id === sessionId) ?? null
    return React.createElement(NanoDialog, {
      copy: { cancel: t('cancel'), confirm: t('archive') },
      title: t('archive'),
      description: t('archiveConfirm'),
      confirmLabel: t('archive'),
      danger: true,
      onConfirm: () => { void face.archiveSession(sessionId) },
      onCancel: onClose,
    }, React.createElement('div', { className: 'dncs-profile-meta' }, session?.title || sessionId))
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
      state.archiveTarget == null ? null : React.createElement(ArchiveDialog, {
        face,
        sessionId: state.archiveTarget,
        onClose: face.closeArchive,
      }))
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
