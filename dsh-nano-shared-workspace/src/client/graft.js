/**
 * The mirrored section sits above `sidebar.workspaces`, which is a single-seat
 * slot the shipped workspace browser owns — so a slot registration cannot add
 * a sibling. Instead this graft finds the browser's container in the DOM and
 * prepends a host element, then React-portals the section into it.
 *
 * Anchors (all present in the production bundle, verified 2026-11-09):
 *   - the session tree is `[role="tree"]`, nested inside the browser root;
 *   - the sidebar's scroll area is the ancestor that also holds the global
 *     panel `<nav>` (Chats/Search/…), so climbing the tree's ancestors until
 *     a parent has a direct `nav` child lands on the region area;
 *   - `data-sidebar-scrollport` marks the scroll area only while the sidebar
 *     is wide — rail mode shows the icon column instead.
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { NanoDialog } from 'dsh-nano-ui'
import { Input } from '@deepseek-ai/dsh-client-ui-primitives'
import { SharedSection } from './section.js'
import { SettingsDialog } from './settings-dialog.js'
import { TranscriptDialog } from './transcript-dialog.js'
import { CreateWorkspaceDialog } from './create-dialog.js'

const HOST_ATTR = 'data-nano-shared-workspace'

/** The workspace browser's session tree, or null while the sidebar is unmounted. */
function sessionTree() {
  return document.querySelector('[role="tree"]')
}

/**
 * The region element: the tree's ancestor whose parent contains the panels nav.
 * In rail mode the tree is absent, so the fallback climbs from the panels
 * `<nav>` itself: its sibling div inside the same scroller is the region area.
 * Returns null when the sidebar is absent (e.g. a login screen).
 */
function regionArea() {
  let node = sessionTree()
  while (node !== null && node !== document.body) {
    const parent = node.parentElement
    if (parent !== null && parent.querySelector(':scope > nav') !== null) return node
    node = parent
  }
  // Rail fallback: the panels `<nav>` sits inside the scroll area; its next
  // element sibling is the region area even with no session tree inside it.
  // The global-panel nav contains labelled buttons (Chats, Search, …), which
  // distinguishes it from row menus that also render as <nav>.
  for (const nav of document.querySelectorAll('nav')) {
    const parent = nav.parentElement
    if (parent === null) continue
    const sibling = nav.nextElementSibling
    if (sibling !== null && sibling.tagName === 'DIV' && sibling.querySelector('nav') === null) {
      return sibling
    }
  }
  return null
}

/**
 * Whether the sidebar renders wide (false = 56px rail). Neither the DOM nor
 * `ctx.layout` exposes the collapsed flag, and `data-sidebar-scrollport` is
 * wide-only but unreliable across builds — measure the region instead.
 */
function sidebarIsWide() {
  const region = regionArea()
  return region === null ? true : region.getBoundingClientRect().width > 80
}

/** Ensure the graft host is the first child of the region area; returns it or null. */
function graftHost() {
  const region = regionArea()
  if (region === null) return null
  let host = region.querySelector(`[${HOST_ATTR}]`)
  if (host === null) {
    host = document.createElement('div')
    host.setAttribute(HOST_ATTR, '')
    host.className = 'nsw-graft'
    region.prepend(host)
  } else if (host !== region.firstElementChild) {
    region.prepend(host)
  }
  return host
}

/**
 * Props: `{ face, renderSlot }` — `face` supplies copy(), the settings store,
 * and the header actions; `renderSlot` comes with the entry registration (the
 * entry declares `sidebar.workspaces.directoryFlow` as a child so this
 * component can raise the same picker the local "添加工作区" button renders).
 */
function RenameDialog({ face, rename }) {
  const copy = face.copy()
  const [title, setTitle] = React.useState(rename?.title ?? '')
  const [error, setError] = React.useState(undefined)
  const [busy, setBusy] = React.useState(false)
  const submit = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await face.confirmRename(title)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      setBusy(false)
    }
  }
  return React.createElement(NanoDialog, {
    copy,
    title: copy.renameSessionTitle,
    confirmLabel: copy.renameSession,
    confirmDisabled: title.trim() === '' || busy,
    busy,
    error,
    onConfirm: submit,
    onCancel: face.cancelRename,
  }, React.createElement(Input, {
    value: title,
    'data-modal-autofocus': true,
    onChange: event => setTitle(event.currentTarget.value),
  }))
}

export function SidebarGraft({ face, renderSlot }) {
  const [host, setHost] = React.useState(() => graftHost())
  const [wide, setWide] = React.useState(() => sidebarIsWide())
  // The settings flag lives on the store, not React state: without this
  // subscription the dialog flag toggles without a render and never opens.
  const [settings, setSettings] = React.useState(face.settings.current)

  React.useEffect(() => face.settings.subscribe(setSettings), [])

  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      setHost(graftHost())
      setWide(sidebarIsWide())
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      // Width changes arrive as style/class mutations on ancestors, so watch
      // attributes broadly; the callbacks only re-measure, never re-render DOM.
      attributes: true,
    })
    setHost(graftHost())
    setWide(sidebarIsWide())
    return () => {
      observer.disconnect()
      // Remove the graft host so a plugin reload leaves no empty shell behind.
      host?.remove()
    }
  }, [])

  if (host === null) return null
  return React.createElement(React.Fragment, null,
    createPortal(React.createElement(SharedSection, { face, wide }), host),
    settings?.open === true
      ? createPortal(React.createElement(SettingsDialog, {
        face,
        settings,
        stage: settings.setupStage === 'workspace' ? 'workspace' : 'bind',
        onBound: () => { face.finishBind?.() },
        onOpenCreate: () => { face.onCreateWorkspace?.() },
      }), document.body)
      : null,
    settings?.transcript != null ? createPortal(React.createElement(TranscriptDialog, { face, transcript: settings.transcript }), document.body) : null,
    typeof settings?.notice === 'string' && settings.notice !== ''
      ? createPortal(React.createElement(NanoDialog, {
        copy: face.copy(),
        title: face.copy().noticeTitle,
        confirmLabel: face.copy().closeLabel,
        onConfirm: face.dismissNotice,
        onCancel: face.dismissNotice,
      }, settings.notice), document.body)
      : null,
    settings?.rename != null ? createPortal(React.createElement(RenameDialog, { face, rename: settings.rename }), document.body) : null,
    settings?.createDialog != null ? createPortal(React.createElement(CreateWorkspaceDialog, {
      face,
      mode: settings.createDialog.mode,
      workspaceId: settings.createDialog.workspaceId,
    }), document.body) : null)
}
