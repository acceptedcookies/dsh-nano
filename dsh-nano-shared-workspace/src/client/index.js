/** Browser half. The host serves this file at the package's ./client export. */

import React from 'react'
import { SidebarGraft } from './graft.js'
import { copyFor } from './i18n.js'
import { fetchSettings, fetchStatus } from './api.js'
import { STYLE } from './styles.js'

export const inject = ['slots', 'locale', 'layout']

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

  const refresh = () => {
    fetchSettings()
      .then(payload => store.set({ ...payload, loaded: true }))
      .catch(() => store.set({ loaded: true }))
    fetchStatus().catch(() => {})
  }

  const face = {
    copy: () => copyFor(languageOf()),
    settings: {
      get current() { return store.current },
      get open() { return store.current.open === true },
      subscribe: store.subscribe,
      close: () => store.set({ open: false }),
    },
    onOpenSettings: () => { refresh(); store.set({ open: true }) },
    onRefresh: refresh,
    onToggleRail: () => ctx.layout?.toggleSidebar?.(),
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

  refresh()
}
