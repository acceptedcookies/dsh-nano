/** The files page this plugin takes over: header controls over the shared tree, and a footer status bar. */

import React from 'react'
import { CommitDialog, RenameDialog } from './dialogs.js'
import { createAccessory } from './accessory.js'
import { StatusBar } from './statusbar.js'
import { RowMenu } from './menu.js'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { useTree } from './tree.js'
import { absoluteOf, basenameOf, parentOf, relativeTo, treeKeyOf } from './paths.js'
import { checkName, nextName } from './names.js'

const { useCallback, useEffect, useMemo, useRef, useState } = React

/** Two presses within this window count as one double click, matching the platform default. */
const DOUBLE_CLICK_MS = 400

/** Strongest to weakest Git status, used when a folder summarizes its subtree. */
const SEVERITY = ['U', 'D', 'M', 'A', 'R', '?']





/**
 * The page body.
 * @param props - the composed slot props plus this plugin's injected face.
 * @returns the header, tree, and optional footer.
 */
export function ExplorerBody(props) {
  const { useTabInfo, sessionId, useSessions, renderSlot, renderFactorySlot, useContextMenu, nxe } = props
  const { tab, panel } = useTabInfo()
  const cwd = useSessions(sessions => sessions.byId[sessionId]?.cwd)
  const copy = nxe.copy
  const prefs = nxe.prefs

  const [git, setGit] = useState(null)
  const [gitError, setGitError] = useState(undefined)
  const [stats, setStats] = useState(null)
  const [statsState, setStatsState] = useState('idle')
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState(undefined)
  const [outsideAllowed, setOutsideAllowed] = useState(() => new Set())
  const [linkNote, setLinkNote] = useState(undefined)

  // One gesture clock for the whole tree: the Factory hands the same `onOpen` both presses.
  const lastPress = useRef({ path: '', at: 0 })

  const prefsRef = useRef(prefs)
  prefsRef.current = prefs

  /** Ask the Host for one thing, surfacing failures as `{ ok: false }`. */
  const request = useCallback(async (path, body) => {
    try {
      const response = await fetch(`/nano-explorer-extra${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: body === undefined ? undefined : { 'content-type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
        cache: 'no-store',
      })
      const payload = await response.json().catch(() => ({ error: `HTTP ${response.status}` }))
      if (!response.ok) return { ok: false, message: payload?.error ?? `HTTP ${response.status}` }
      return { ok: true, ...payload }
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : String(error) }
    }
  }, [])

  /** Ask Git which of one directory's entries it ignores, and merge the answer in. */
  const markIgnored = useCallback(async (directory, names) => {
    if (!prefsRef.current.showGitStatus || !Array.isArray(names) || names.length === 0) return
    const result = await request('/ignored', { sessionId, paths: names })
    if (!result.ok || !Array.isArray(result.ignored) || result.ignored.length === 0) return
    setIgnoredSet(current => {
      const next = new Set(current)
      const base = relativeTo(cwd ?? '', directory)
      for (const name of result.ignored) next.add(base === '' ? name : `${base}/${name}`)
      return next
    })
  }, [request, sessionId, cwd])

  const tree = useTree({
    sessionId,
    root: cwd,
    request,
    prefs: { ...prefs, allowOutsideWorkspace: prefs.allowOutsideWorkspace || outsideAllowed.size > 0 },
    onListed: (path, names) => { void markIgnored(path, names) },
  })



  /** Re-read Git state alone: it answers in one command and the branch line waits on nothing. */
  const refreshGit = useCallback(async () => {
    if (cwd === undefined) return
    if (!prefsRef.current.showGitStatus) { setGit(null); setGitError(undefined); return }
    const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}`)
    if (!result.ok) { setGitError(result.message); return }
    setGit(result.git ?? null)
    setGitError(result.gitError)
  }, [cwd, sessionId, request])

  /** Re-count the workspace; a large tree takes seconds, so this is separate and cancellable. */
  const refreshStats = useCallback(async () => {
    if (cwd === undefined) return
    setStatsState('loading')
    const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}&only=stats`)
    if (!result.ok) { setStatsState('failed'); return }
    setStats(result.stats ?? null)
    setStatsState('ok')
  }, [cwd, sessionId, request])

  useEffect(() => { void refreshGit() }, [refreshGit])
  useEffect(() => { void refreshStats() }, [refreshStats])

  // Debounced re-count after directory changes, at least `statsDebounceMs` apart.
  const statsTimer = useRef(0)
  const queueStats = useCallback(() => {
    window.clearTimeout(statsTimer.current)
    statsTimer.current = window.setTimeout(() => { void refreshStats() }, 2000)
  }, [refreshStats])
  useEffect(() => () => window.clearTimeout(statsTimer.current), [])

  /** Files changed since the last commit, by path relative to the checkout root. */
  const changed = useMemo(() => Array.isArray(git?.files) ? git.files : [], [git])
  const changedByPath = useMemo(() => {
    const map = new Map()
    for (const file of changed) map.set(file.path, file.status)
    return map
  }, [changed])
  // Ignored paths are asked for by directory, bounded by what the tree draws: a repository-wide
  // `--ignored` listing is tens of megabytes on a tree with a large vendor directory.
  const [ignoredSet, setIgnoredSet] = useState(() => new Set())

  /** The status route reports paths relative to the checkout root; the tree keys absolute paths. */
  const checkoutRoot = git?.root
  const statusKeyOf = useCallback(key => {
    if (checkoutRoot === undefined || checkoutRoot === null) return undefined
    const absolute = absoluteOf(cwd ?? '', key)
    return relativeTo(checkoutRoot, absolute)
  }, [checkoutRoot, cwd])

  /** Whether a path or any ancestor is ignored. */
  const ignoredOf = useCallback(key => {
    const relative = statusKeyOf(key)
    if (relative === undefined) return false
    if (ignoredSet.has(relative)) return true
    const parts = relative.split('/')
    for (let index = parts.length - 1; index > 0; index -= 1) {
      if (ignoredSet.has(parts.slice(0, index).join('/'))) return true
    }
    return false
  }, [ignoredSet, statusKeyOf])

  const statusOf = useCallback(key => {
    const relative = statusKeyOf(key)
    return relative === undefined ? undefined : changedByPath.get(relative)
  }, [changedByPath, statusKeyOf])

  /** Open one entry in the resource viewer the same way the shipped tree does. */
  const openEntry = useCallback(entry => {
    const absolute = absoluteOf(cwd ?? '', entry.path)
    const address = `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${absolute.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')}`
    if (panel.isFloating) tab.actions.openResource(address)
    else tab.actions.openResource(address, { paneId: panel.id })
  }, [cwd, sessionId, tab.actions, panel.id, panel.isFloating])

  /** Whether a native directory opener is installed on this host. */
  const [revealState, setRevealState] = useState('unknown')
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const response = await fetch('/open-in-app/apps', { credentials: 'same-origin', cache: 'no-store' })
        if (!response.ok) { if (live) setRevealState('unavailable'); return }
        const body = await response.json()
        const apps = Array.isArray(body.apps) ? body.apps : []
        const manager = apps.find(id => ['finder', 'explorer', 'filemanager', 'dolphin', 'nautilus'].includes(id))
        if (live) setRevealState(manager === undefined ? 'unavailable' : manager)
      } catch {
        if (live) setRevealState('unavailable')
      }
    })()
    return () => { live = false }
  }, [])

  /** Show the workspace directory in the host's file manager. */
  const revealDirectory = useCallback(async () => {
    if (cwd === undefined || revealState === 'unknown' || revealState === 'unavailable') return
    try {
      const response = await fetch('/open-in-app/open', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ app: revealState, path: cwd }), credentials: 'same-origin',
      })
      if (!response.ok) setLinkNote(`open failed: HTTP ${String(response.status)}`)
    } catch (error) {
      setLinkNote(error instanceof Error ? error.message : String(error))
    }
  }, [cwd, revealState])

  /** Create one entry, then put it into inline rename. */
  const create = useCallback(async kind => {
    if (cwd === undefined) return
    const directory = directoryForCreate(tree, cwd)
    const siblings = siblingsAt(tree, cwd, directory)
    const name = nextName(kind, siblings)
    const result = await request(kind === 'file' ? '/create-file' : '/create-folder', { sessionId, directory, name })
    if (!result.ok) { setLinkNote(result.message); return }
    await tree.refreshLevel(directory)
    const created = absoluteOf(cwd, `${relativeTo(cwd, directory) === '' ? '' : `${relativeTo(cwd, directory)}/`}${name}`)
    tree.setSelected(created)
    tree.setPending({ path: treeKeyOf(cwd, created), name, kind, fresh: true })
    if (kind === 'folder') { tree.knownEmpty(created); tree.toggle(created, true) }
    queueStats()
  }, [cwd, sessionId, request, tree, queueStats])

  /** Rename one entry. */
  const doRename = useCallback(async (entry, name) => {
    if (cwd === undefined) return
    const absolute = absoluteOf(cwd, entry.path)
    const kind = entry.meta?.kind === 'directory' ? 'directory' : 'file'
    setBusy(true)
    setDialogError(undefined)
    const result = await request('/rename', { sessionId, path: absolute, name, kind })
    setBusy(false)
    if (!result.ok) { setDialogError(result.message); return }
    setDialog(null)
    const parent = parentOf(absolute)
    await tree.refreshLevel(parent)
    if (kind === 'directory') tree.collapseUnder(absolute)
    tree.setSelected(absoluteOf(cwd, `${relativeTo(cwd, parent) === '' ? '' : `${relativeTo(cwd, parent)}/`}${name.trim()}`))
    queueStats()
  }, [cwd, sessionId, request, tree, queueStats])

  /** Commit every change with one message. */
  const doCommit = useCallback(async message => {
    setBusy(true)
    setDialogError(undefined)
    const result = await request('/commit', { sessionId, message })
    setBusy(false)
    if (!result.ok) { setDialogError(result.message); return }
    setDialog(null)
    await tree.refresh()
    await refreshGit()
    await refreshStats()
  }, [sessionId, request, tree, refreshGit, refreshStats])

  /** Copy one path, confirming through a transient note. */
  const copyPath = useCallback(async (absolute, relative) => {
    try {
      await navigator.clipboard.writeText(relative ? relative : absolute)
      setLinkNote(copy.copied)
      window.setTimeout(() => setLinkNote(undefined), 1600)
    } catch (error) {
      setLinkNote(error instanceof Error ? error.message : String(error))
    }
  }, [copy.copied])

  // Right-click rows open this plugin's own menu, anchored where the gesture happened.
  const [menu, setMenu] = useState(null)
  const rowTriggerProps = useCallback((entry, kind) => ({
    onContextMenu: event => {
      event.preventDefault()
      event.stopPropagation()
      setMenu({ x: event.clientX, y: event.clientY, kind, target: { path: entry.path, name: entry.name } })
    },
  }), [])

  /**
   * The strongest Git status anywhere beneath one directory.
   *
   * The tree draws a folder's dot from this, so a collapsed folder still reports that something under
   * it changed. Severity order follows the palette: conflict, delete, modify, add, rename, untracked.
   * @param key - the folder's absolute tree key.
   * @returns the status letter, or undefined when nothing below it changed.
   */
  const folderStatusOf = useCallback(key => {
    const relative = statusKeyOf(key)
    if (relative === undefined) return undefined
    const prefix = relative === '' ? '' : `${relative}/`
    let best
    let bestRank = -1
    for (const [path, status] of changedByPath) {
      if (prefix !== '' && !path.startsWith(prefix)) continue
      const rank = SEVERITY.indexOf(status)
      if (rank > bestRank) { bestRank = rank; best = status }
    }
    return best
  }, [changedByPath, statusKeyOf])

  const accessory = useMemo(() => createAccessory({
    copy: () => copy,
    statusOf, ignoredOf, folderStatusOf,
    linkOf: key => tree.levels.get(treeKeyOf(cwd ?? '', key))?.outside === true ? true : undefined,
    showGit: () => prefs.showGitStatus,
    showIgnoredBadge: () => prefs.showIgnoredBadge,
    showOpenButton: () => prefs.showOpenButton,
    statusLabel: status => nxe.statusLabel(copy, status),
    open: entry => openEntry(entry),
  }), [copy, statusOf, ignoredOf, tree.levels, cwd, prefs.showGitStatus, prefs.showIgnoredBadge, prefs.showOpenButton, nxe, openEntry])

  const factoryOptions = useMemo(() => ({ slots: { accessory }, fallback: null }), [accessory])

  if (cwd === undefined) {
    return React.createElement('div', { className: 'nxe-row-note', 'data-nxe': 'true' }, copy.noWorkspace)
  }

  const entries = tree.entries.map(entry => ({
    path: entry.path,
    name: entry.name,
    meta: {
      kind: entry.type === 'directory' ? 'directory' : entry.type === 'file' ? 'file' : 'other',
      ...(entry.symlink === true ? { link: true } : {}),
      ...(entry.outside === true ? { outside: true } : {}),
      ...(ignoredOf(entry.path) ? { hidden: true } : {}),
    },
  }))

  const content = renderFactorySlot('sidebar.files.tree', {
    root: treeKeyOf(cwd, cwd),
    entries,
    expanded: tree.expanded,
    directories: tree.directories,
    current: tree.selected === null ? undefined : treeKeyOf(cwd, tree.selected),
    // `entry.path` is already the absolute tree key: the tree joins each level key with its child
    // name, so re-resolving it against the root would build `<root>/<root>/<name>` and the level
    // would never be found — which is what made every folder refuse to expand.
    onToggle: entry => tree.toggle(entry.path, !tree.expanded.includes(entry.path)),
    onOpen: entry => {
      tree.setSelected(entry.path)
      const now = Date.now()
      const previous = lastPress.current
      const second = previous.path === entry.path && now - previous.at <= DOUBLE_CLICK_MS
      lastPress.current = { path: entry.path, at: now }
      // `openPreviewOnClick` and `openPreviewOnDoubleClick` are independent switches. Enter and the
      // row's own open button always open, so a reader who turns both off is never stuck.
      const open = second ? prefsRef.current.openPreviewOnDoubleClick : prefsRef.current.openPreviewOnClick
      if (open) openEntry(entry)
    },
    rowTriggerProps,
    canOpen: () => true,
  }, factoryOptions)

  // Publish this page's rename dialog to the row menus; the latest mounted page owns it.
  useEffect(() => {
    const handler = target => { setDialogError(undefined); setDialog({ kind: 'rename', entry: { path: target.path, name: basenameOf(target.path), meta: { kind: target.kind } } }) }
    nxe.setRenameHandler(handler)
    return () => nxe.setRenameHandler(undefined)
  }, [nxe])

  /** Commit the inline rename of a freshly created entry, or fall back to its default name. */
  const commitPending = useCallback(async (nextNameValue) => {
    const pendingEntry = tree.pending
    if (pendingEntry === null) return
    const check = checkName(nextNameValue, copy)
    if (!check.ok) { setLinkNote(check.message); return }
    setLinkNote(undefined)
    tree.setPending(null)
    if (check.name === pendingEntry.name) return
    const absolute = absoluteOf(cwd ?? '', pendingEntry.path)
    const result = await request('/rename', { sessionId, path: absolute, name: check.name, kind: pendingEntry.kind === 'folder' ? 'directory' : 'file' })
    if (!result.ok) { setLinkNote(result.message); return }
    const parent = parentOf(absolute)
    await tree.refreshLevel(parent)
    const renamed = absoluteOf(cwd ?? '', `${relativeTo(cwd ?? '', parent) === '' ? '' : `${relativeTo(cwd ?? '', parent)}/`}${check.name}`)
    // A renamed folder stays a known level under its new key, so a following create targets it.
    if (pendingEntry.kind === 'folder') tree.knownEmpty(renamed)
    tree.setSelected(renamed)
    queueStats()
  }, [tree, copy, cwd, request, sessionId, queueStats])

  /** Arrow/Enter/Space over the tree, and Enter to open the selected file. */
  const onTreeKeyDown = useCallback(event => {
    if (tree.pending !== null) return
    // F2 renames the selected entry, the same key the reader already knows from an IDE.
    if (event.key === 'F2' && tree.selected !== null) {
      event.preventDefault()
      setDialogError(undefined)
      setDialog({ kind: 'rename', entry: { path: tree.selected, name: basenameOf(tree.selected), meta: { kind: tree.levels.has(tree.selected) ? 'directory' : 'file' } } })
      return
    }
    const selected = tree.selected
    if (selected === null) return
    const key = treeKeyOf(cwd ?? '', selected)
    const isDirectory = tree.levels.has(key) || (tree.expanded.includes(key))
    // Space toggles a directory; Enter opens a file, and on a directory it also toggles, matching
    // the keyboard path the shipped tree leaves to its caller.
    if (event.key === ' ') {
      if (!isDirectory) return
      event.preventDefault()
      tree.toggle(selected, !tree.expanded.includes(key))
      return
    }
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (isDirectory) { tree.toggle(selected, !tree.expanded.includes(key)); return }
    openEntry({ path: key, name: basenameOf(selected), meta: { kind: 'file' } })
  }, [tree, cwd, openEntry])

  const dialogNode = dialog === null ? null : dialog.kind === 'commit'
    ? React.createElement(CommitDialog, {
      copy, files: changed, busy, error: dialogError,
      onConfirm: doCommit, onCancel: () => { setDialog(null); setDialogError(undefined) },
    })
    : React.createElement(RenameDialog, {
      copy, currentName: dialog.entry.name, busy, error: dialogError,
      onConfirm: name => doRename(dialog.entry, name), onCancel: () => { setDialog(null); setDialogError(undefined) },
    })

  return React.createElement('div', { className: 'nxe-root', 'data-nxe': 'true', 'data-theme': nxe.scheme() },
    React.createElement('div', { className: 'nxe-header' },
      React.createElement('span', { className: 'nxe-path', title: cwd, 'data-nxe-path': 'true' }, cwd),
      React.createElement(ToolButton, { label: copy.newFile, onClick: () => { void create('file') } }, iconFilePlus()),
      React.createElement(ToolButton, { label: copy.newFolder, onClick: () => { void create('folder') } }, iconFolderPlus()),
      React.createElement(ToolButton, {
        label: copy.rename, disabled: tree.selected === null,
        onClick: () => {
          const target = tree.selected
          if (target === null) return
          setDialogError(undefined)
          setDialog({ kind: 'rename', entry: { path: target, name: basenameOf(target), meta: { kind: tree.levels.has(target) ? 'directory' : 'file' } } })
        },
      }, iconRename()),
      React.createElement(ToolButton, { label: copy.revealDirectory, disabled: revealState === 'unavailable', onClick: () => { void revealDirectory() } }, iconReveal()),
      React.createElement(ToolButton, { label: copy.reload, onClick: () => { void tree.refresh(); void refreshGit(); void refreshStats() } }, iconRefresh()),
    ),
    linkNote === undefined ? null : React.createElement('p', { className: 'nxe-row-note', role: 'status' }, linkNote),
    gitError === undefined ? null : React.createElement('p', { className: 'nxe-row-note nxe-note-error' }, gitError),
    tree.pending === null ? null : React.createElement('div', { className: 'nxe-inline', 'data-nxe-inline': 'true' },
      React.createElement('label', { className: 'nxe-inline-label', htmlFor: 'nxe-inline-name' }, copy.renameTitle),
      React.createElement('input', {
        id: 'nxe-inline-name', className: 'nxe-inline-input', type: 'text', defaultValue: tree.pending.name,
        autoFocus: true, spellCheck: false, autoComplete: 'off',
        onKeyDown: event => {
          if (event.key === 'Enter') { event.preventDefault(); void commitPending(event.currentTarget.value) }
          else if (event.key === 'Escape') { event.preventDefault(); tree.setPending(null); setLinkNote(undefined) }
        },
        onBlur: event => { void commitPending(event.currentTarget.value) },
      })),
    React.createElement('div', { className: 'nxe-tree', 'data-nxe-tree': 'true', onKeyDown: onTreeKeyDown }, content),
    React.createElement(StatusBar, {
      copy, git, stats, statsState, prefs,
      onCommit: () => { setDialogError(undefined); setDialog({ kind: 'commit' }) },
      onRetryStats: () => { void refreshStats() },
    }),
    dialogNode,
    React.createElement(RowMenu, {
      menu, copy,
      onClose: () => setMenu(null),
      onCopyRelative: target => { void copyPath(absoluteOf(cwd ?? '', target.path), relativeTo(cwd ?? '', absoluteOf(cwd ?? '', target.path))) },
      onRename: target => {
        setMenu(null)
        setDialogError(undefined)
        setDialog({ kind: 'rename', entry: { ...target, meta: { kind: menu?.kind === 'directory' ? 'directory' : 'file' } } })
      },
    }))
}

/**
 * One header tool button.
 * @param props - accessible label, click handler, and glyph.
 * @returns the button.
 */
function ToolButton({ label, onClick, children, disabled }) {
  return React.createElement('button', {
    type: 'button', className: 'nxe-tool', title: label, 'aria-label': label, onClick, disabled: disabled === true,
  }, children)
}

/**
 * The directory a new entry lands in.
 *
 * A listed directory is the destination itself; a selected file means its parent. A path the tree has
 * no level for is a file, so the parent is the answer there too.
 * @param tree - the pane's tree state.
 * @param cwd - workspace root, used when nothing is selected.
 * @returns the absolute destination directory.
 */
function directoryForCreate(tree, cwd) {
  const selected = tree.selected
  if (selected === null) return cwd
  const key = treeKeyOf(cwd, selected)
  // A level exists for every directory that has been listed; a directory that is listed is a target,
  // any other selection is a file whose parent receives the new entry.
  if (tree.levels.has(key)) return key
  return parentOf(key)
}

/** Names already used in one directory, as the tree currently knows them. */
function siblingsAt(tree, cwd, directory) {
  const level = tree.levels.get(treeKeyOf(cwd, directory))
  return level?.entries ?? []
}

/** Official glyphs from the shared primitive table: the same set the shell's own controls draw. */
const IconPlus = primitives.IconPlusOutlineRegular
const IconFolder = primitives.IconFolderCloseRegular
const IconEdit = primitives.IconEditOutlineRegular
const IconRefresh = primitives.IconRefreshOutlineRegular
const IconBranch = primitives.IconBranchOutlineRegular

function iconFilePlus() {
  return React.createElement(IconPlus, { width: 16, height: 16 })
}

function iconFolderPlus() {
  return React.createElement(IconFolder, { width: 16, height: 16 })
}

function iconRefresh() {
  return React.createElement(IconRefresh, { width: 16, height: 16 })
}

function iconRename() {
  return React.createElement(IconEdit, { width: 16, height: 16 })
}


function iconReveal() {
  return React.createElement('svg', { viewBox: '0 0 24 24', width: 16, height: 16, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': 'true' },
    React.createElement('path', { d: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }),
    React.createElement('path', { d: 'M12 11v6M9 14l3-3 3 3' }))
}
