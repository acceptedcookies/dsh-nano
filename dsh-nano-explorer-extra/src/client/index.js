/** Browser half: take over the `files` tab type, add row menus, and publish a settings page. */

import React from 'react'
import { ExplorerBody } from './body.js'
import { perf } from './perf.js'
import { COPY, copyFor, statusLabel } from './i18n.js'
import { relativeTo } from './paths.js'
import { DEFAULT_PREFS, readPrefs, writePrefs } from './prefs.js'
import { STYLE } from './styles.js'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'

const { createElement, useCallback, useEffect, useState } = React

/** Services this plugin needs before it can register anything. */
export const inject = ['slots', 'locale', 'sidebarRightTabs', 'sidebarRight', 'sessions', 'theme']

const NS = 'nanoExplorerExtra'
const FILES_KIND = 'files'
const OWN_ID = 'nano-explorer-extra'

/**
 * E11: the body's render path is what the beta audit could not see — every row repaint used to
 * happen inside an unmeasured React commit. React.Profiler records actualDuration per commit, and
 * the review report carries it as `nano-explorer-extra` render time. With the flag off the wrapper
 * returns the component unchanged, so this costs nothing on a normal page.
 */
const ObservedExplorerBody = perf.profiler(ExplorerBody)

/** One live page's rename handler; the menu actions forward into it. */
const renameRequest = { handler: undefined }


/** One observable wrapper around the browser-local preferences. */
function createPrefStore() {
  let current = readPrefs()
  const listeners = new Set()
  return {
    get: () => current,
    set: next => { current = next; writePrefs(current); for (const listener of listeners) listener() },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
  }
}

/**
 * Client plugin body.
 * @param ctx - client root context.
 */
export function apply(ctx) {
  const style = document.createElement('style')
  // A distinct attribute keeps the style tag from matching the body root's [data-nxe] selectors.
  style.dataset.nxeStyle = 'true'
  style.textContent = STYLE
  document.head.append(style)
  ctx.effect(() => () => style.remove())

  const store = createPrefStore()


  /**
   * Read one Session's workspace root.
   * @param sessionId - the Session whose root relativizes the menu path.
   * @returns the root, or undefined when the Session is unknown or has no directory.
   */
  const cwdOf = sessionId => ctx.sessions.list.getSnapshot().byId[sessionId]?.cwd

  /**
   * Ask the open files page to start a rename for one entry.
   *
   * The page owns the dialog, the tree, and the refresh, so a menu action only names the target.
   * @param target - entry path and kind.
   */
  const requestRename = target => { renameRequest.handler?.(target) }

  const languageOf = () => ctx.locale.getSnapshot().active
  const schemeOf = () => (ctx.theme.getTheme().colorScheme === 'light' ? 'light' : 'dark')

  /** The live copy and preference snapshot the body reads on every render. */
  const face = () => ({
    copy: copyFor(languageOf()),
    prefs: store.get(),
    /** Live read and subscription, so a settings switch redraws the tree without waiting for another update. */
    getPrefs: () => store.get(),
    subscribePrefs: listener => store.subscribe(listener),
    scheme: schemeOf,
    statusLabel,
    onListed: () => {},
    /** The open page lends its rename dialog to the row menus. */
    setRenameHandler: handler => { renameRequest.handler = handler },
    /** The settings card writes one viewing switch through the same store the page reads. */
    setPref: (key, value) => store.set({ ...store.get(), [key]: value }),
  })

  // The `files` kind is registered by ui-sidebar-files as a `builtin`; this extension takes it over
  // until the plugin unloads, at which point the builtin resumes.
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: OWN_ID,
    kind: FILES_KIND,
    priority: 'extension',
    // The tree's open folders and loaded levels live in this body's own state. Without this the body
    // unmounts whenever a preview tab is focused, and returning to the files tab rebuilds the tree
    // collapsed. Keeping it mounted is what makes the tab behave like a workspace view rather than a
    // page that restarts on every visit.
    keepMounted: true,
    title: () => copyFor(languageOf()).typeLabel,
    guide: [{
      id: 'explorer',
      order: 10,
      title: () => copyFor(languageOf()).typeLabel,
      description: () => copyFor(languageOf()).typeDescription,
    }],
  }), 'nano-explorer-extra: files type')

  // No `children` declaration: a child slot has exactly one declaring owner, and the shipped body
  // still holds `sidebar.right.tab.files.actions`. Declaring it here fails the whole entry, so this
  // page cannot host that seat. The directory opener is therefore missing while this extension is
  // mounted; see the spec's Known Limitations.
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab',
    key: OWN_ID,
    inject: () => ({ nxe: face() }),
  }, ObservedExplorerBody)), 'nano-explorer-extra: files body')

  // The chip's title is its own seat. Taking over the body does not carry the shipped title with it,
  // and without this the tab label lost the folder sheet that the builtin draws before it.
  ctx.effect(() => ctx.slots.inject('sidebar.right.pane.tab.title', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab.title',
    key: OWN_ID,
  }, function ExplorerTitle({ useTabInfo }) {
    const { tab } = useTabInfo()
    return createElement(React.Fragment, null,
      createElement(primitives.FileTypeIcon, { kind: 'folder', size: 16, className: 'nxe-title-icon' }),
      tab.title)
  })), 'nano-explorer-extra: files tab title')

  // Row menus. The shipped menu already offers the absolute path, so this adds only what it lacks:
  // a workspace-relative path with the `/` separators a model or a markdown link wants, and rename.
  // The service is read through `ctx.get` so a deployment without it still mounts everything else.
  const menus = ctx.get('contextMenus')
  if (menus !== undefined && menus !== null) {
    for (const target of ['file', 'directory']) {
      ctx.effect(() => menus.register({
      id: `nano-explorer-extra.${target}`,
      target,
      order: 900,
      resolve: async value => {
        const copy = copyFor(languageOf())
        const root = value.sessionId === undefined ? undefined : cwdOf(value.sessionId)
        const relative = root === undefined ? value.path : relativeTo(root, value.path)
        return [
          {
            id: 'copy-relative',
            icon: { key: 'nano-explorer-extra.copy-relative' },
            label: copy.copyRelative,
            failureLabel: copy.copyFailed,
            run: () => copyText(relative),
          },
          {
            id: 'rename',
            icon: { key: 'nano-explorer-extra.rename' },
            label: copy.rename,
            failureLabel: copy.renameFailed,
            run: () => requestRename?.({ path: value.path, kind: target === 'directory' ? 'directory' : 'file' }),
          },
        ]
      },
    }), `nano-explorer-extra: ${target} menu`)
    }
  }

  // The menu icons this plugin contributes, keyed by the actions above.
  ctx.slots.inject('contextMenu.icon', () => {
    const disposers = [
      ctx.slots.register({ name: 'contextMenu.icon', key: 'nano-explorer-extra.copy-relative' }, CopyRelativeIcon),
      ctx.slots.register({ name: 'contextMenu.icon', key: 'nano-explorer-extra.rename' }, RenameIcon),
    ]
    return () => { for (const dispose of disposers) dispose() }
  })

  // The settings page lives in the Plugins section: these are this plugin's own viewing switches.
  // Register the copy dictionary the settings page labels itself from.

}

/** Copy a path with a short, non-blocking failure path. */
async function copyText(value) {
  try {
    await navigator.clipboard.writeText(String(value ?? ''))
  } catch {
    // A refused clipboard is reported by the browser; nothing else to do here.
  }
}

export { DEFAULT_PREFS }

/** Glyph for "copy relative path": official link mark, distinct from the shipped copy glyph. */
function CopyRelativeIcon() {
  return createElement(primitives.IconLinkOutlineRegular, { width: 16, height: 16, 'aria-hidden': 'true' })
}

/** Glyph for "rename": official pencil. */
function RenameIcon() {
  return createElement(primitives.IconEditOutlineRegular, { width: 16, height: 16, 'aria-hidden': 'true' })
}
