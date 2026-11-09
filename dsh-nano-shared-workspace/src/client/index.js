/** Browser half. The host serves this file at the package's ./client export. */

import React from 'react'
import { openNanoMenu } from 'dsh-nano-ui'
import { SidebarGraft } from './graft.js'
import { copyFor } from './i18n.js'
import { createDirectory as apiCreateDirectory, createWorkspace as apiCreateWorkspace, fetchRemoteSessions, fetchSettings, fetchSharedWorkspaces, fetchStatus, joinWorkspace as apiJoinWorkspace, listDirectory as apiListDirectory, materializeSession as apiMaterializeSession, triggerSync } from './api.js'
import { STYLE } from './styles.js'

export const inject = ['slots', 'locale', 'layout', 'uiWorkspace', 'workspaces', 'sessions']

const NS = 'nanoSharedWorkspace'

/** One observable wrapper around the settings snapshot the section header reads. */
function createSettingsStore() {
  let current = { open: false, loaded: false, configured: false, username: null }
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

  /** The composer menu only lists Host workspaces. Register the replica path (idempotent) so it can be selected. */
  const localWorkspaceFor = async localPath => {
    const wanted = localPath.replace(/\/+$/, '')
    const existing = ctx.workspaces.list.getSnapshot().items
      ?.find(item => item.path?.replace(/\/+$/, '') === wanted)
    if (existing) return existing
    return ctx.workspaces.create({ path: localPath })
  }

  const enterPath = localPath => localWorkspaceFor(localPath)
    .then(workspace => ctx.uiWorkspace.openWorkspace(workspace.workspaceId))

  const registerJoined = (workspaces, username) => {
    for (const row of workspaces) {
      const path = memberPath(row, username)
      if (path) localWorkspaceFor(path).catch(() => {})
    }
  }

  const refresh = () => {
    fetchSettings()
      .then(payload => {
        store.set({ ...payload, loaded: true })
        return fetchSharedWorkspaces().then(shared => {
          const workspaces = shared.workspaces ?? []
          store.set({ sharedWorkspaces: workspaces })
          registerJoined(workspaces, payload.username)
        })
      })
      .catch(() => store.set({ loaded: true }))
    fetchStatus().catch(() => {})
    fetchRemoteSessions()
      .then(payload => store.set({ sessions: payload.sessions ?? [] }))
      .catch(() => {})
  }

  const face = {
    copy: () => copyFor(languageOf()),
    settings: {
      get current() { return store.current },
      get open() { return store.current.open === true },
      subscribe: listener => store.subscribe(() => listener(store.current)),
      close: () => store.set({ open: false }),
    },
    onOpenSettings: () => { refresh(); store.set({ open: true }) },
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
      store.set({ expanded: { ...(store.current.expanded ?? {}), [workspaceId]: true } })
      const row = (store.current.sharedWorkspaces ?? []).find(item => item.workspaceId === workspaceId)
      const path = memberPath(row, store.current.username)
      if (path === '') return
      store.set({ notice: null })
      enterPath(path).catch(cause => store.set({
        notice: `${copyFor(languageOf()).enterFailed}: ${cause instanceof Error ? cause.message : String(cause)}`,
      }))
    },
    onOpenSession: session => {
      const known = () => ctx.sessions.list.getSnapshot().byId?.[session.sessionId] != null
      const open = () => {
        ctx.uiWorkspace.openSession(session.sessionId)
        store.set({ notice: null })
      }
      const fail = cause => store.set({
        notice: `${copyFor(languageOf()).pullFailed}: ${cause instanceof Error ? cause.message : String(cause)}`,
      })
      if (known()) {
        try { open() } catch (cause) { fail(cause) }
        return
      }
      // Another member's session lives in S3. Land it on this machine, then
      // ask the Host to rescan so it can be opened like a local session.
      store.set({ notice: null })
      apiMaterializeSession(session.workspaceId, session.sessionId)
        .then(() => ctx.sessions.refresh())
        .then(() => {
          if (!known()) throw new Error(copyFor(languageOf()).pullFailed)
          open()
        })
        .catch(fail)
    },
    dismissNotice: () => store.set({ notice: null }),
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
      if (store.current.creating === true) return
      store.set({ createDialog: { mode: 'create' } })
    },
    /**
     * An unjoined remote row opens the same browser to choose *this* client's
     * replica location, then merges this instance's member row into the marker.
     */
    onJoinWorkspace: workspaceId => store.set({ createDialog: { mode: 'join', workspaceId } }),
    onCloseCreateDialog: done => {
      store.set({ createDialog: null, creating: false })
      if (done) { store.set({ notice: copyFor(languageOf()).workspaceCreated }); refresh() }
    },
    createWorkspace: (name, localPath) => {
      store.set({ creating: true })
      return apiCreateWorkspace(name, localPath).then(result => enterPath(localPath).then(() => result))
    },
    joinWorkspace: (workspaceId, localPath) => {
      store.set({ creating: true })
      return apiJoinWorkspace(workspaceId, localPath).then(result => enterPath(localPath).then(() => result))
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
          { id: 'settings', label: copy.settingsTitle ?? copy.settings, run: () => store.set({ open: true }) },
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

  refresh()
}
