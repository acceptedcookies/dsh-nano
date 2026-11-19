/** Browser half: a native "云端工作区" sidebar section plus native dialogs.
 *  No floating entry and no floating panel. */
import React from 'react'
import { NanoDialog, NANO_STYLES } from 'dsh-nano-ui'
import { Button, RiskConfirmation } from '@deepseek-ai/dsh-client-ui-primitives'
import { CloudSectionGraft } from './section.js'
import { CloudAttachmentsTab } from './attachments-tab.js'
import { SettingsDialog } from './providers/devin/settings.js'
import { NewSessionDialog } from './providers/devin/create.js'
import { CLOUD_CSS } from './styles.js'
import { makeI18n } from './i18n.js'
import { api, pluginRouteGone } from './api.js'
import { expandSidebar } from './sidebar.js'
import { readPrefs } from './prefs.js'
import { mayTerminate, runTerminate } from './confirm.js'

export const inject = ['slots', 'locale', 'sessions', 'uiWorkspace', 'sidebarRightTabs']

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
    refreshing: false,
    profiles: [],
    activeId: null,
    sessions: [],
    sessionsCursor: null,
    sessionsHasMore: false,
    sessionsFilter: 'active',
    sessionsProfileId: null,
    opening: false,
    expanded: true,
    activeSessionId: null,
    disabled: false,
    settingsOpen: false,
    newOpen: false,
    manageTarget: null,
    manageBusy: false,
    manageError: '',
    error: '',
  })

  let listSeq = 0
  /* Rows belong to the profile that produced them: every fetch captures the
   * profile id and a request sequence, so a late answer or a mid-flight
   * profile switch can never paint another profile's rows. */
  let listBrowsed = false

  const applyPage = (list, { append = false, profileId, archived = false } = {}) => {
    /* The list never mixes states: the active page drops archived rows and
     * the archived page drops live ones, whatever the upstream returned. */
    const fresh = (list.items ?? list.sessions ?? []).filter(item => (item?.is_archived === true) === archived)
    const cursor = list.end_cursor ?? list.cursor ?? list.next ?? null
    if (!append) {
      store.set({ sessions: fresh, sessionsCursor: cursor, sessionsHasMore: list.has_next_page === true && cursor != null, sessionsProfileId: profileId })
      return
    }
    const seen = new Set(store.current.sessions.map(item => item.session_id))
    store.set({
      sessions: [...store.current.sessions, ...fresh.filter(item => !seen.has(item.session_id))],
      sessionsCursor: cursor,
      sessionsHasMore: list.has_next_page === true && cursor != null,
    })
  }

  const refresh = async ({ animate = false, poll = false } = {}) => {
    store.set({ refreshing: true, ...(animate ? { loading: true } : {}), error: '' })
    try {
      const status = await api.status()
      const profileId = status.activeId ?? null
      if (profileId !== store.current.activeId) {
        listBrowsed = false
        store.set({ sessions: [], sessionsCursor: null, sessionsHasMore: false })
      }
      store.set({
        profiles: status.profiles ?? [],
        activeId: profileId,
        disabled: false,
      })
      if (!profileId) {
        store.set({ sessions: [] })
        return
      }
      /* A periodic poll refreshes statuses only; once the user has paged
       * further into the list, reloading page one would collapse their
       * position, so polls leave the rows alone until a manual refresh. */
      if (poll && listBrowsed) return
      const filter = store.current.sessionsFilter
      const archived = filter === 'archived'
      const seq = ++listSeq
      const list = await api.sessions({ first: 50, is_archived: archived, isArchived: archived, profileId })
      if (seq !== listSeq || store.current.activeId !== profileId || store.current.sessionsFilter !== filter) return
      applyPage(list, { profileId, archived })
      if (!poll) listBrowsed = false
    } catch (cause) {
      /* The plugin was switched off on the Plugins page: its host routes are
       * unregistered, so the same-origin POST answers 404/405. Show a quiet
       * disabled row instead of a bare HTTP status; the poll keeps running
       * and re-enabling recovers without a reload. */
      if (pluginRouteGone(cause)) {
        store.set({ disabled: true, sessions: [], error: '' })
      } else {
        store.set({ error: cause?.message ?? String(cause) })
      }
    } finally {
      store.set({ loading: false, refreshing: false })
    }
  }

  let openSeq = 0
  let openAbort = null
  let manageBusy = false

  const face = {
    t,
    get current() { return store.current },
    subscribe: listener => store.subscribe(listener),
    refresh,
    loadMore: async () => {
      const { sessionsCursor, activeId, sessionsFilter } = store.current
      if (!sessionsCursor || !activeId) return
      const profileId = activeId
      const filter = sessionsFilter
      const archived = filter === 'archived'
      const seq = ++listSeq
      listBrowsed = true
      store.set({ refreshing: true, error: '' })
      try {
        const list = await api.sessions({ first: 50, after: sessionsCursor, is_archived: archived, isArchived: archived, profileId })
        if (seq === listSeq && store.current.activeId === profileId && store.current.sessionsFilter === filter) {
          applyPage(list, { append: true, archived })
        }
        store.set({ refreshing: false })
      } catch (cause) {
        store.set({ refreshing: false, error: cause?.message ?? String(cause) })
      }
    },
    /** First-page + load-more both pin their filter; a late answer is dropped
     *  unless seq, profile and filter all still match. */
    setSessionsFilter: filter => {
      const next = filter === 'archived' ? 'archived' : 'active'
      if (next === store.current.sessionsFilter) return
      listSeq += 1
      listBrowsed = false
      store.set({ sessionsFilter: next, sessions: [], sessionsCursor: null, sessionsHasMore: false, error: '' })
      void refresh({ animate: true })
    },
    /** The row click freezes the whole target — profile, id, title and the
     *  archived flag — so a mid-dialog profile or list switch can never
     *  retarget the action. Lifecycle calls never fall back to the active
     *  profile. */
    askManage: session => store.set({
      /* No sessionsProfileId means the row's owning profile is unknown — the
       * dialog must not open rather than fall back to the active profile. */
      manageTarget: store.current.sessionsProfileId == null ? null : {
        profileId: store.current.sessionsProfileId,
        sessionId: session.session_id,
        title: session.title ?? session.session_id,
        isArchived: session.is_archived === true,
      },
      manageError: '',
    }),
    closeManage: () => store.set({ manageTarget: null, manageError: '' }),
    /** One attempt per confirmation: manageBusy refuses re-entry, the target
     *  is read once, and the list is re-fetched after the write — never
     *  marked optimistically. */
    runManage: async kind => {
      const target = store.current.manageTarget
      if (!target || manageBusy || !target.profileId || !target.sessionId) return
      manageBusy = true
      store.set({ manageBusy: true, manageError: '' })
      try {
        const pid = target.profileId
        if (kind === 'sleep') await api.session('sleep', { session_id: target.sessionId, profileId: pid })
        else if (kind === 'archive') await api.archive(target.sessionId, { profileId: pid })
        else if (kind === 'unarchive') await api.unarchive(target.sessionId, { profileId: pid })
        else if (kind === 'terminate') await api.terminate(target.sessionId, { profileId: pid })
        else return
        store.set({ manageTarget: null })
        await refresh()
      } catch (cause) {
        store.set({ manageError: cause?.message ?? String(cause) })
      } finally {
        manageBusy = false
        store.set({ manageBusy: false })
      }
    },

    copy: () => t,
    get locale() { return ctx.locale.getSnapshot().active },
    /** Rail entry: the host owns the sidebar toggle, so no document scan.
     *  `layout` is soft-read (`ctx.get`); see sidebar.js. */
    expandSidebar: () => expandSidebar(ctx),
    openSettings: () => store.set({ settingsOpen: true }),
    closeSettings: () => { store.set({ settingsOpen: false }); void refresh({ animate: true }) },
    openNew: () => store.set(store.current.activeId ? { newOpen: true } : { settingsOpen: true }),
    closeNew: () => store.set({ newOpen: false }),
    /* Each open gets its own AbortController + generation: starting a new
     * open cancels the previous one, `finally` only clears `opening` for the
     * generation that still owns it, and unload aborts the in-flight open. */
    /* The host either maps the cloud session to its own native Chat or it
     * cannot open at all — there is no local shell, hidden tab, or plugin-
     * drawn workbench to fall back to. */
    openSession: async (sessionId, bound) => {
      openSeq += 1
      const seq = openSeq
      openAbort?.abort()
      const ctl = new AbortController()
      openAbort = ctl
      const { signal } = ctl
      /* The listed row freezes its owning profile: no implicit active-profile
       * fallback, and a profile switch between click and response refuses the
       * open rather than binding the wrong org. */
      const profileId = bound?.profileId ?? null
      if (profileId == null) {
        store.set({ error: t('nativeUnavailable') })
        return
      }
      store.set({ opening: true, activeSessionId: sessionId, error: '' })
      try {
        const res = await api.nativeOpen(sessionId, { profileId })
        if (signal.aborted || seq !== openSeq) return
        if (store.current.activeId !== profileId) return
        const externalId = String(res?.external_session_id ?? '')
        /* Only an external-namespace id may be opened; anything else from
         * this route is a host contract violation, never a session to use. */
        if (!res?.ok || !externalId.startsWith('external:')) {
          store.set({ activeSessionId: null, error: t('nativeUnavailable') })
          return
        }
        await ctx.sessions.refresh()
        if (signal.aborted || seq !== openSeq) return
        /* The refresh is async too: a profile switch landing inside it must
         * still refuse the open rather than surface the wrong org's chat. */
        if (store.current.activeId !== profileId) return
        ctx.uiWorkspace.openSession(externalId)
      } catch (cause) {
        if (signal.aborted || seq !== openSeq) return
        /* NATIVE_UNAVAILABLE gets the localized honest label; any other
         * failure keeps its own message so it is not masked. */
        const error = cause?.reason === 'NATIVE_UNAVAILABLE' ? t('nativeUnavailable') : (cause?.message || t('nativeUnavailable'))
        store.set({ activeSessionId: null, error })
      } finally {
        if (seq === openSeq) store.set({ opening: false })
      }
    },
    toggleExpanded: () => store.set({ expanded: store.current.expanded !== true }),
  }

  /** One manage seat per row: a menu NanoDialog, consequence NanoDialogs for
   *  sleep/archive/unarchive, and the RiskConfirmation acknowledgement for
   *  terminate — session suspension is never bundled with archive. */
  function ManageDialog({ face, target, onClose }) {
    const [step, setStep] = React.useState('menu')
    const [acknowledged, setAcknowledged] = React.useState(false)
    const busy = face.current.manageBusy === true
    const confirmStep = (kind, { danger = false } = {}) => React.createElement(NanoDialog, {
      copy: { cancel: t('cancel'), confirm: t(kind) },
      title: t(kind),
      description: t(`${kind}Confirm`),
      confirmLabel: t(kind),
      confirmDisabled: busy,
      busy,
      danger,
      error: face.current.manageError || undefined,
      onConfirm: () => { void face.runManage(kind) },
      onCancel: () => setStep('menu'),
    }, React.createElement('div', { className: 'dncs-profile-meta' }, target.title || target.sessionId))
    if (step === 'sleep') return confirmStep('sleep')
    if (step === 'archive') return confirmStep('archive', { danger: true })
    if (step === 'unarchive') return confirmStep('unarchive')
    if (step === 'terminate') return React.createElement(RiskConfirmation, {
      open: true,
      title: t('terminate'),
      description: face.current.manageError
        ? `${t('terminateConfirm')}\n${t('manageFailed')} · ${face.current.manageError}`
        : t('terminateConfirm'),
      acknowledgeLabel: t('terminateAcknowledge'),
      cancelLabel: t('cancel'),
      closeLabel: t('close'),
      confirmLabel: t('terminate'),
      acknowledged,
      disabled: busy,
      onAcknowledgedChange: setAcknowledged,
      onCancel: () => { setStep('menu'); setAcknowledged(false) },
      onConfirm: () => {
        void runTerminate({ acknowledged, terminate: () => face.runManage('terminate') })
      },
    })
    const action = (kind, danger = false) => React.createElement(Button, {
      variant: 'outline',
      className: danger ? 'dncs-manage-danger' : undefined,
      disabled: busy,
      onClick: () => setStep(kind),
    }, t(kind))
    return React.createElement(NanoDialog, {
      copy: { cancel: t('cancel'), confirm: t('close'), close: t('close') },
      title: t('manage'),
      footer: React.createElement(Button, { variant: 'outline', onClick: onClose }, t('close')),
      onConfirm: onClose,
      onCancel: onClose,
    },
      React.createElement('div', { className: 'dncs-profile-meta' }, target.title || target.sessionId),
      React.createElement('div', { className: 'dncs-manage-actions' },
        target.isArchived === true
          ? action('unarchive')
          : [action('sleep'), action('archive', true), action('terminate', true)]),
      face.current.manageError ? React.createElement('div', { className: 'dncs-note', 'data-kind': 'error' }, face.current.manageError) : null)
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
        onCreated: (id, bound) => { face.closeNew(); face.openSession(id, bound) },
      }) : null,
      state.manageTarget == null ? null : React.createElement(ManageDialog, {
        face,
        target: state.manageTarget,
        onClose: face.closeManage,
      }))
  }

  ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'nano-cloud-session',
    order: 50,
    inject: () => ({ version: VERSION }),
  }, CloudSessionRoot)), 'nano-cloud-session: sidebar section')

  /* The independent attachments tab: admitted only on external Sessions whose
   * view summary names this provider id (`externalTabProviders`), refused on
   * every local Session by the externalOnly host rule — never the retired
   * composite tab. */
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: 'nano-cloud-session.attachments',
    kind: 'cloud-attachments',
    externalOnly: true,
    title: () => t('tabAttachments'),
    guide: [{
      id: 'attachments', order: 40,
      title: () => t('tabAttachments'),
      description: () => t('attachmentsGuide'),
    }],
  }), 'nano-cloud-session: attachments tab type')
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: 'nano-cloud-session.attachments',
    inject: () => ({
      fetchAttachments: (sessionId) => api.session('external_attachments', { session_id: sessionId }),
      t,
    }),
  }, CloudAttachmentsTab)), 'nano-cloud-session: attachments tab body')

  ctx.effect(() => {
    void refresh()
    /* The saved browser preference wins over the host default and is re-read
     * every round, so changing it in Settings takes effect on the next tick
     * without a reload. */
    const pollMs = () => Math.max(5000, Number(readPrefs().pollIntervalMs) || Number(config.pollIntervalMs) || 30000)
    let stopped = false
    let timer = null
    const loop = async () => {
      await refresh({ poll: true })
      if (!stopped) timer = window.setTimeout(loop, pollMs())
    }
    timer = window.setTimeout(loop, pollMs())
    const onUnload = () => openAbort?.abort()
    window.addEventListener('beforeunload', onUnload)
    return () => {
      stopped = true
      window.clearTimeout(timer)
      window.removeEventListener('beforeunload', onUnload)
      openAbort?.abort()
    }
  }, 'nano-cloud-session: refresh loop')
}
