/** Browser half. The host serves this file at the package's ./client export. */

import React from 'react'
import { openNanoMenu } from 'dsh-nano-ui'
import { SidebarGraft } from './graft.js'
import { copyFor } from './i18n.js'
import { bindSession as apiBindSession, claimSession as apiClaimSession, clearSettings as apiClearSettings, createDirectory as apiCreateDirectory, createWorkspace as apiCreateWorkspace, deleteWorkspace as apiDeleteWorkspace, fetchRemoteSessions, fetchSettings, fetchSharedWorkspaces, fetchStatus, heartbeatSession as apiHeartbeatSession, joinWorkspace as apiJoinWorkspace, listDirectory as apiListDirectory, materializeSession as apiMaterializeSession, pullWorkspace as apiPullWorkspace, triggerSync } from './api.js'
import { STYLE } from './styles.js'
import { perf } from './perf.js'

export const inject = ['slots', 'locale', 'layout', 'uiWorkspace', 'workspaces', 'sessions']

const NS = 'nanoSharedWorkspace'
const PREFS_KEY = 'nsw-section-prefs'
const EXPAND_LIMIT = 3

function readSectionPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(PREFS_KEY) || '')
    return { expandOnLoad: parsed?.expandOnLoad !== false, expandLimit: EXPAND_LIMIT }
  } catch {
    return { expandOnLoad: true, expandLimit: EXPAND_LIMIT }
  }
}

/** One observable wrapper around the settings snapshot the section header reads. */
function createSettingsStore() {
  let current = { open: false, loaded: false, configured: false, username: null, sessionsReady: false, pulling: {}, ...readSectionPrefs() }
  const listeners = new Set()
  const emit = () => { for (const listener of listeners) listener() }
  return {
    get current() { return current },
    set(next) { current = { ...current, ...next }; emit() },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
  }
}

/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
  const style = document.createElement('style')
  style.dataset.nswStyle = 'true'
  style.textContent = STYLE
  document.head.append(style)
  ctx.effect(() => () => style.remove())

  const languageOf = () => ctx.locale.getSnapshot().active
  const store = createSettingsStore()

  const memberPath = (row, username) =>
    Object.values(row?.members ?? {}).find(member => member?.username === username)?.localPath ?? ''

  /**
   * Shared workspaces are not Host workspaces. A replica path may already be
   * registered locally; those rows and their sessions stay out of 「工作区」.
   */
  const separateFromLocal = () => perf.span('apply-separate', () => {
    const graft = document.querySelector('[data-nano-shared-workspace]')
    const username = store.current.username
    const paths = new Set()
    for (const row of store.current.sharedWorkspaces ?? []) {
      const path = memberPath(row, username)
      if (path) paths.add(path.replace(/\/+$/, ''))
    }
    const sessionIds = new Set([
      ...(store.current.sessions ?? []).map(session => session.sessionId),
      ...(store.current.ownedSessionIds ?? []),
    ])
    const mirrorIds = new Set(
      (ctx.workspaces.list.getSnapshot().items ?? [])
        .filter(item => paths.has(item.path?.replace(/\/+$/, '')))
        .map(item => item.workspaceId),
    )
    for (const row of document.querySelectorAll('[data-row-key^="workspace:"]')) {
      if (graft?.contains(row)) continue
      const id = row.getAttribute('data-row-key').slice('workspace:'.length)
      const group = row.closest('[class*="groupSection"]') ?? row
      const hide = mirrorIds.has(id)
      if (group.hidden !== hide) group.hidden = hide
    }
    for (const row of document.querySelectorAll('[data-row-key^="session:"]')) {
      if (graft?.contains(row)) continue
      const id = row.getAttribute('data-row-key').slice('session:'.length)
      const hide = sessionIds.has(id)
      if (row.hidden !== hide) row.hidden = hide
    }
    // An ungrouped bucket whose sessions are all shared has nothing local left to show.
    for (const row of document.querySelectorAll('[data-row-key="workspace:"]')) {
      if (graft?.contains(row)) continue
      const group = row.closest('[class*="groupSection"]') ?? row.parentElement
      if (group == null) continue
      const sessions = [...group.querySelectorAll('[data-row-key^="session:"]')]
      const hide = sessions.length > 0 && sessions.every(item => item.hidden)
      if (group.hidden !== hide) group.hidden = hide
    }
  })

  const refresh = () => {
    fetchSettings()
      .then(payload => {
        store.set({ ...payload, loaded: true })
        return fetchSharedWorkspaces().then(shared => {
          const workspaces = shared.workspaces ?? []
          const first = store.current.listReady !== true
          store.set({
            sharedWorkspaces: workspaces,
            listReady: true,
            ...(first ? { sectionOpen: readSectionPrefs().expandOnLoad } : {}),
          })
          separateFromLocal()
        }).catch(() => store.set({ listReady: true, ...(store.current.listReady !== true ? { sectionOpen: false } : {}) }))
      })
      .catch(() => store.set({ loaded: true, listReady: true }))
    fetchStatus().catch(() => {})
    fetchRemoteSessions()
      .then(payload => { store.set({ sessions: payload.sessions ?? [], sessionsReady: true }); separateFromLocal() })
      .catch(() => store.set({ sessionsReady: true }))
  }

  /** Settings opens at the stage matching the stored identity; every entry
   * point (menu, empty state, face API) goes through here (F-04). */
  const openSettings = () => {
    refresh()
    store.set({ open: true, setupStage: store.current.configured === true ? 'workspace' : 'bind' })
  }
  /** One idempotency key per create-dialog session; a retried submit reuses it. */
  let createRequestId = null

  const publishSessionFlags = () => {    const snap = ctx.workspaces.list.getSnapshot()
    store.set({
      pinnedSessionIds: [...(snap.pinnedSessionIds ?? [])],
      archivedSessionIds: [...(snap.archivedSessionIds ?? [])],
    })
  }
  if (typeof ctx.workspaces.list.subscribe === 'function') ctx.workspaces.list.subscribe(publishSessionFlags)
  publishSessionFlags()

  const setPulling = (workspaceId, on) => {
    const pulling = { ...(store.current.pulling ?? {}) }
    if (on) pulling[workspaceId] = true
    else delete pulling[workspaceId]
    store.set({ pulling })
  }

  let holdTimer = 0
  let holdAttached = false
  const holdTrack = perf.track('interval', 'hold')
  const holdSession = (workspaceId, sessionId) => {
    window.clearInterval(holdTimer)
    if (holdAttached) { holdTrack.detach(); holdAttached = false }
    holdTimer = window.setInterval(holdTrack.wrap(() => {
      apiHeartbeatSession(workspaceId, sessionId).catch(() => {
        window.clearInterval(holdTimer)
        if (holdAttached) { holdTrack.detach(); holdAttached = false }
      })
    }), 25_000)
    holdTrack.attach()
    holdAttached = true
  }

  /** The composer stays disabled until a Host workspace accounts the session. The row is hidden from 「工作区」. */
  const bindReplica = async localPath => {
    const wanted = localPath.replace(/\/+$/, '')
    const existing = ctx.workspaces.list.getSnapshot().items
      ?.find(item => item.path?.replace(/\/+$/, '') === wanted)
    if (existing) return existing
    return ctx.workspaces.create({ path: localPath })
  }

  /** Pull a remote log onto the replica when this machine doesn't have it yet. */
  const prepareChat = async (sharedId, sessionId) => {
    const known = sessionId != null && ctx.sessions.list.getSnapshot().byId?.[sessionId] != null
    if (sessionId != null && !known) {
      await apiMaterializeSession(sharedId, sessionId)
      await ctx.sessions.refresh()
    }
  }

  const face = {
    copy: () => copyFor(languageOf()),
    currentSessionId: () => {
      const byId = ctx.sessions.list.getSnapshot().byId ?? {}
      return Object.values(byId).find(session => (session.retainedBy?.mainView ?? 0) > 0)?.id ?? null
    },
    subscribeSession: listener => ctx.sessions.list.subscribe(() => listener(
      Object.values(ctx.sessions.list.getSnapshot().byId ?? {}).find(session => (session.retainedBy?.mainView ?? 0) > 0)?.id ?? null,
    )),
    settings: {
      get current() { return store.current },
      get open() { return store.current.open === true },
      subscribe: listener => store.subscribe(() => listener(store.current)),
      close: () => store.set({ open: false }),
    },
    onOpenSettings: openSettings,
    // Probe + save succeeded: advance to stage 2. Publish the just-saved
    // identity immediately so a fast click on "新建共享工作区" is not bounced
    // back to stage 1 while refresh() is still in flight (F-18).
    finishBind: bound => {
      store.set({
        setupStage: 'workspace', listReady: false, sessionsReady: false,
        ...(typeof bound?.username === 'string' && bound.username !== ''
          ? { configured: true, username: bound.username } : {}),
      })
      refresh()
    },
    onToggleSection: () => {
      if (store.current.listReady !== true) return
      const open = store.current.sectionOpen !== true
      store.set({ sectionOpen: open })
      if (open) perf.count('section-open')
    },
    setExpandOnLoad: expandOnLoad => {
      const next = { expandOnLoad: expandOnLoad === true, expandLimit: EXPAND_LIMIT }
      localStorage.setItem(PREFS_KEY, JSON.stringify(next))
      store.set({
        ...next,
        ...(store.current.listReady === true ? { sectionOpen: next.expandOnLoad } : {}),
      })
    },
    /** Refresh = push local sessions first, then re-read the remote lists. */
    onRefresh: () => {
      store.set({ syncing: true })
      triggerSync()
        .then(result => {
          if (result.pushed > 0) store.set({ notice: `${copyFor(languageOf()).syncPushed} ${result.pushed}` })
        })
        .catch(() => {})
        .finally(() => { store.set({ syncing: false }); refresh() })
    },
    onToggleWorkspace: workspaceId => {
      const open = store.current.expanded?.[workspaceId] === true
      store.set({ expanded: { ...(store.current.expanded ?? {}), [workspaceId]: !open } })
    },
    onCreateSession: sharedId => {
      const row = (store.current.sharedWorkspaces ?? []).find(item => item.workspaceId === sharedId)
      const path = memberPath(row, store.current.username)
      if (path === '') {
        store.set({ notice: copyFor(languageOf()).joinHintPick })
        return
      }
      store.set({
        notice: null,
        sectionOpen: true,
        expanded: { ...(store.current.expanded ?? {}), [sharedId]: true },
      })
      setPulling(sharedId, true)
      apiPullWorkspace(sharedId)
        .finally(() => setPulling(sharedId, false))
        .then(() => bindReplica(path))
        .then(host => ctx.sessions.create({ workspaceId: host.workspaceId }))
        .then(sessionId => apiClaimSession(sharedId, sessionId).then(claim => {
          if (claim?.busy === true) throw new Error(copyFor(languageOf()).readOnlyBusy.replace('{holder}', claim.holder ?? ''))
          holdSession(sharedId, sessionId)
          return sessionId
        }))
        .then(sessionId => {
          const provisional = {
            workspaceId: sharedId,
            sessionId,
            title: '',
            writerName: store.current.username ?? '',
            cwd: path,
          }
          store.set({
            ownedSessionIds: [...(store.current.ownedSessionIds ?? []), sessionId],
            sessions: [provisional, ...(store.current.sessions ?? []).filter(item => item.sessionId !== sessionId)],
          })
          separateFromLocal()
          ctx.uiWorkspace.openSession(sessionId)
          triggerSync().finally(() => refresh())
        })
        .catch(cause => store.set({
          notice: `${copyFor(languageOf()).enterFailed}: ${cause instanceof Error ? cause.message : String(cause)}`,
        }))
    },
    onOpenSession: session => {
      store.set({ notice: null, noticeKind: null, sectionOpen: true, expanded: { ...(store.current.expanded ?? {}), [session.workspaceId]: true } })
      const known = () => ctx.sessions.list.getSnapshot().byId?.[session.sessionId] != null
      const pathOf = () => memberPath(
        (store.current.sharedWorkspaces ?? []).find(item => item.workspaceId === session.workspaceId),
        store.current.username,
      )
      const reveal = async () => {
        const path = pathOf()
        if (path !== '') {
          const host = await bindReplica(path)
          const accounted = ctx.workspaces.list.getSnapshot().items
            ?.find(item => item.workspaceId === host.workspaceId)?.sessionIds?.includes(session.sessionId) === true
          if (!accounted) await apiBindSession(path, session.sessionId)
        }
        store.set({ ownedSessionIds: [...(store.current.ownedSessionIds ?? []), session.sessionId] })
        separateFromLocal()
        ctx.uiWorkspace.openSession(session.sessionId)
      }
      const finishLease = claim => {
        if (claim?.busy === true) {
          store.set({
            notice: copyFor(languageOf()).readOnlyBusy.replace('{holder}', claim.holder ?? ''),
            noticeKind: 'busy',
          })
          return
        }
        holdSession(session.workspaceId, session.sessionId)
      }
      // Open a local log immediately. Pulling the replica and taking the lease
      // are S3 round-trips; waiting for them makes the click look dead.
      setPulling(session.workspaceId, true)
      const openNow = known() ? reveal() : prepareChat(session.workspaceId, session.sessionId).then(reveal)
      openNow
        .then(() => Promise.all([
          apiPullWorkspace(session.workspaceId).finally(() => setPulling(session.workspaceId, false)).catch(() => {}),
          apiClaimSession(session.workspaceId, session.sessionId).then(finishLease),
        ]))
        .catch(cause => store.set({
          notice: `${copyFor(languageOf()).pullFailed}: ${cause instanceof Error ? cause.message : String(cause)}`,
        }))
    },
    onTogglePin: session => {
      const pinned = (store.current.pinnedSessionIds ?? []).includes(session.sessionId)
      const run = pinned ? ctx.uiWorkspace.unpinSession(session.sessionId) : ctx.uiWorkspace.pinSession(session.sessionId)
      Promise.resolve(run).catch(cause => store.set({
        notice: `${copyFor(languageOf()).pinSession}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }))
    },
    onToggleArchive: session => {
      const archived = (store.current.archivedSessionIds ?? []).includes(session.sessionId)
      const run = archived ? ctx.uiWorkspace.unarchiveSession(session.sessionId) : ctx.uiWorkspace.archiveSession(session.sessionId)
      Promise.resolve(run).catch(cause => store.set({
        notice: `${copyFor(languageOf()).archiveSession}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }))
    },
    onRenameSession: session => store.set({
      rename: { workspaceId: session.workspaceId, sessionId: session.sessionId, title: session.title || '' },
    }),
    confirmRename: title => {
      const target = store.current.rename
      if (target == null) return Promise.resolve()
      const next = title.trim()
      if (next === '') return Promise.resolve()
      return ctx.sessions.using(target.sessionId, { source: 'workspaceOperation' }, reference => reference.binding.session.rename(next))
        .then(result => {
          if (result?.ok === false) throw new Error(result.error?.message ?? 'rename failed')
          store.set({
            rename: null,
            sessions: (store.current.sessions ?? []).map(item => item.sessionId === target.sessionId ? { ...item, title: next } : item),
          })
          triggerSync().catch(() => {})
        })
    },
    cancelRename: () => store.set({ rename: null }),
    dismissNotice: () => store.set({ notice: null, noticeKind: null }),
    /** Delete is destructive: the row action opens a confirmation dialog first. */
    onDeleteWorkspace: workspaceId => store.set({ deleteTarget: workspaceId }),
    cancelDeleteWorkspace: () => store.set({ deleteTarget: null }),
    confirmDeleteWorkspace: () => {
      const id = store.current.deleteTarget
      if (typeof id !== 'string') return Promise.resolve()
      return apiDeleteWorkspace(id)
        .then(() => {
          store.set({ deleteTarget: null, notice: null, sectionOpen: true, expanded: { ...(store.current.expanded ?? {}) } })
          refresh()
        })
        .catch(cause => store.set({
          deleteTarget: null,
          notice: `${copyFor(languageOf()).deleteFailed}: ${cause instanceof Error ? cause.message : String(cause)}`,
        }))
    },
    /** Stage 2 has no key inputs; clearing the identity returns to stage 1. */
    onRequestRebind: () => store.set({ open: false, rebindConfirm: true }),
    cancelRebind: () => store.set({ rebindConfirm: false, open: true, setupStage: 'workspace' }),
    confirmRebind: () => apiClearSettings()
      .then(() => {
        store.set({
          rebindConfirm: false, open: true, setupStage: 'bind',
          configured: false, username: null, listReady: false, sessionsReady: false,
          sharedWorkspaces: [], sessions: [],
        })
        refresh()
      })
      .catch(cause => store.set({
        rebindConfirm: false,
        notice: `${copyFor(languageOf()).errorSave}: ${cause instanceof Error ? cause.message : String(cause)}`,
      })),
    onCloseTranscript: () => store.set({ transcript: null }),
    onToggleRail: () => ctx.layout?.toggleSidebar?.(),
    /**
     * A shared workspace is born on the remote: open the in-app directory
     * browser for the local replica location, then POST /workspaces/create —
     * the S3 marker is the canonical object. The replica path is also
     * registered with the Host so the composer menu can select it and a
     * session can actually open.
     */
    onCreateWorkspace: () => {
      if (store.current.configured !== true) {
        openSettings()
        return
      }
      if (store.current.creating === true) return
      createRequestId = globalThis.crypto?.randomUUID?.() ?? `r${Date.now()}${Math.random().toString(36).slice(2)}`
      store.set({ createDialog: { mode: 'create' } })
    },
    /**
     * An unjoined remote row opens the same browser to choose *this* client's
     * replica location, then merges this instance's member row into the marker.
     */
    onJoinWorkspace: workspaceId => store.set({ createDialog: { mode: 'join', workspaceId } }),
    onCloseCreateDialog: done => {
      // Success is the new row in the section. The notice dialog is only for
      // failures, and its title is "无法打开" — a created workspace must not land there.
      store.set({
        createDialog: null,
        creating: false,
        ...(done ? { sectionOpen: true } : {}),
      })
      if (done) refresh()
    },
    createWorkspace: (name, localPath) => {
      store.set({ creating: true })
      const requestId = createRequestId ?? globalThis.crypto?.randomUUID?.() ?? `r${Date.now()}`
      return apiCreateWorkspace(name, localPath, requestId)
    },
    joinWorkspace: (workspaceId, localPath) => {
      store.set({ creating: true })
      perf.count('workspace-join')
      return apiJoinWorkspace(workspaceId, localPath)
    },
    createDirectory: apiCreateDirectory,
    listDirectory: apiListDirectory,
    uiWorkspace: ctx.uiWorkspace,
    /** View-options menu anchored to the header button, mirroring the local section's sliders affordance. */
    onViewOptions: event => {
      const anchor = event?.currentTarget?.getBoundingClientRect?.()
      if (anchor === undefined) return
      const copy = copyFor(languageOf())
      openNanoMenu({
        anchor,
        items: [
          { id: 'all', label: copy.filterAll, run: () => store.set({ viewFilter: 'all' }) },
          { id: 'mine', label: copy.filterMine, run: () => store.set({ viewFilter: 'mine' }) },
          { id: 'settings', label: copy.settingsTitle ?? copy.settings, run: openSettings },
        ],
      })
    },
  }

  ctx.effect(() => ctx.locale.register(NS, {
    zh: { title: '共享工作区' },
    en: { title: 'Shared Workspace' },
  }), 'nano-shared-workspace: dictionaries')

  // The `shell.overlay` list renders independent of the sidebar lifecycle, so
  // the graft component watches the DOM for the workspace region to appear.
  ctx.effect(() => ctx.slots.inject('shell.overlay', () => ctx.slots.register({
    name: 'shell.overlay',
    id: 'nano-shared-workspace.section',
    inject: () => ({ face }),
  }, SidebarGraft)), 'nano-shared-workspace: sidebar graft')

  // Dev seam: lets an automated driver inspect the claim pipeline.
  window.__nsw = { store, ctx, face }

  const dedupeTrack = perf.track('mutation', 'sidebar-dedupe')
  const localList = new MutationObserver(dedupeTrack.wrap(() => separateFromLocal()))
  localList.observe(document.body, { childList: true, subtree: true })
  dedupeTrack.attach()
  ctx.effect(() => () => { localList.disconnect(); dedupeTrack.detach() })

  refresh()
}
