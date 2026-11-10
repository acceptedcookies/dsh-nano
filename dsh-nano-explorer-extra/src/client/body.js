/** The files page this plugin takes over: header controls over the shared tree, and a footer status bar. */

import React from 'react'
import { CommitDialog, Dialog, RenameDialog } from './dialogs.js'
import { BranchDrawer, CommitDrawer } from './drawers.js'
import { SettingsDialog } from './settings.js'
import { createAccessory } from './accessory.js'
import { StatusBar } from './statusbar.js'
import { RowMenu } from './menu.js'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { NanoToast } from 'dsh-nano-ui'
import { useTree } from './tree.js'
import { absoluteOf, basenameOf, parentOf, relativeTo, treeKeyOf } from './paths.js'
import { replaceDirectoryStatus } from './format.js'
import { checkName, nextName } from './names.js'

const { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } = React

/** Two presses within this window count as one double click, matching the platform default. */
const DOUBLE_CLICK_MS = 400

/** Strongest to weakest Git status, used when a folder summarizes its subtree. */
const SEVERITY = ['U', 'D', 'M', 'A', 'R', '?']

/** Repository bookkeeping and OS metadata the explorer never draws. */
const INTERNAL_NAMES = new Set(['.git', '.DS_Store'])





/**
 * The page body.
 * @param props - the composed slot props plus this plugin's injected face.
 * @returns the header, tree, and optional footer.
 */
/**
 * Encode a resource path the way the address grammar expects.
 *
 * Each segment is component-encoded so a name carrying `#`, `?`, or a space survives the round trip;
 * `:` stays literal so a Windows drive letter reads as written.
 *
 * @param path - `/`-separated path, absolute or workspace-relative.
 * @returns the encoded path with its segments joined by `/`.
 */
function encodePath(path) {
  return path.split('/').map(segment => encodeURIComponent(segment).replace(/%3A/giu, ':')).join('/')
}

export function ExplorerBody(props) {
  const { useTabInfo, sessionId, useSessions, renderSlot, renderFactorySlot, useContextMenu, nxe } = props
  const { tab, panel } = useTabInfo()
  const cwd = useSessions(sessions => sessions.byId[sessionId]?.cwd)
  const copy = nxe.copy
  // The slot hands over a snapshot. The store is what a settings switch actually writes, so the tree
  // subscribes to it; otherwise the switch changes storage and the rows stay as they were.
  const prefs = useSyncExternalStore(nxe.subscribePrefs, nxe.getPrefs, nxe.getPrefs)

  const [git, setGit] = useState(null)
  const [gitError, setGitError] = useState(undefined)
  const [stats, setStats] = useState(null)
  const [statsState, setStatsState] = useState('idle')
  const [dialog, setDialog] = useState(null)
  const [busy, setBusy] = useState(false)
  const [dialogError, setDialogError] = useState(undefined)
  const [linkNote, setLinkNote] = useState(undefined)
  // A transient confirmation that must never reflow the tree: it is drawn as an overlay, not as a
  // row in the panel's flow.
  const [toast, setToast] = useState(undefined)
  // Which openers this host reports, so the reveal button can name and icon the real application.
  const [openApps, setOpenApps] = useState([])
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const response = await fetch('/open-in-app/apps', { credentials: 'same-origin', cache: 'no-store' })
        if (!response.ok) return
        const body = await response.json()
        const ids = Array.isArray(body.apps) ? body.apps : []
        if (live) setOpenApps(ids.filter(id => typeof id === 'string'))
      } catch { /* no opener: the button stays hidden */ }
    })()
    return () => { live = false }
  }, [])

  // A create the reader has not confirmed yet: nothing touches disk until they do.
  const [createRequest, setCreateRequest] = useState(null)
  // The row menu, anchored at the gesture: which entry, and where the popup should appear.
  const [menu, setMenu] = useState(null)
  // A delete the reader has not confirmed; the entry is untouched until they do.
  const [deleteRequest, setDeleteRequest] = useState(null)
  // Which footer drawer is open, if any: `branch` shows worktrees and remote state, `commit` shows the
  // pending work. One at a time, so a reader never faces two stacked panels.
  const [drawer, setDrawer] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [drawerBusy, setDrawerBusy] = useState(false)
  const [drawerError, setDrawerError] = useState(undefined)
  // True while the status read that opening a drawer asked for is still in flight; the title shows it.
  const [drawerRefresh, setDrawerRefresh] = useState(false)
  const toastTimer = useRef(0)
  // Per-directory answers from loadDirectoryStatus, keyed like the workspace map.
  const [directoryStatus, setDirectoryStatus] = useState(() => new Map())
  // The files tab stays mounted across sessions, and its dialog is portaled to the page, not the
  // pane. Without this, a card opened on one workspace stays on screen after the reader moves to
  // another, still showing the previous repository.
  useEffect(() => {
    setDrawer(null)
    setDrawerError(undefined)
    setDrawerRefresh(false)
    setSettingsOpen(false)
    setDialog(null)
    setDialogError(undefined)
    setCreateRequest(null)
    setDeleteRequest(null)
    setMenu(null)
    setDirectoryStatus(new Map())
    setGitError(undefined)
  }, [sessionId, cwd, tab.visible])

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
    prefs,
    onListed: (path, names) => { void markIgnored(path, names) },
  })



  // Bumped on every workspace-wide read. A directory query that started against the previous
  // snapshot is discarded, so a late answer cannot paint a letter the new footer no longer counts.
  const gitEpoch = useRef(0)
  const treeRef = useRef(null)
  treeRef.current = tree
  const loadDirectoryStatusRef = useRef(async () => {})

  /** Re-read Git state alone: it answers in one command and the branch line waits on nothing. */
  const refreshGit = useCallback(async () => {
    if (cwd === undefined) return
    if (!prefsRef.current.showGitStatus) { setGit(null); setGitError(undefined); setDirectoryStatus(new Map()); return }
    const epoch = gitEpoch.current + 1
    gitEpoch.current = epoch
    const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}`)
    if (epoch !== gitEpoch.current) return
    if (!result.ok) { setGitError(result.message); return }
    setGit(result.git ?? null)
    setGitError(result.gitError)
    // The per-directory map is a refinement of this snapshot, not a second source of truth. Leaving
    // it in place is how a row kept "M" after the footer had already returned to 0.
    setDirectoryStatus(new Map())
    for (const path of treeRef.current?.expanded ?? []) void loadDirectoryStatusRef.current(path)
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

  /**
   * Open a footer drawer and re-read the repository in the same gesture.
   *
   * The panel opens on the snapshot already loaded, then swaps in whatever Git reports now — a badge
   * that was lying when the reader pressed the button never survives the card being open.
   */
  const openDrawer = useCallback(which => {
    setDrawer(which)
    setDrawerError(undefined)
    setDrawerRefresh(true)
    void refreshGit().finally(() => setDrawerRefresh(false))
  }, [refreshGit])

  useEffect(() => { void refreshGit() }, [refreshGit])
  // Count once per workspace. Keying on the callback identity would re-walk the whole tree after any
  // re-render, which on a large checkout costs seconds of CPU; later counts come from queueStats.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { void refreshStats() }, [cwd])

  // Debounced re-count after directory changes, at least `statsDebounceMs` apart.
  const statsTimer = useRef(0)
  const queueStats = useCallback(() => {
    window.clearTimeout(statsTimer.current)
    statsTimer.current = window.setTimeout(() => { void refreshStats() }, 2000)
  }, [refreshStats])
  useEffect(() => () => { window.clearTimeout(statsTimer.current); window.clearTimeout(toastTimer.current) }, [])

  /** Which tree entries are symbolic links, and whether each leads outside the workspace. */
  const linkByPath = useMemo(() => {
    const map = new Map()
    for (const entry of tree.entries) {
      if (entry.symlink === true) map.set(entry.path, { outside: entry.outside === true })
    }
    return map
  }, [tree.entries])

  /** Files changed since the last commit, by path relative to the checkout root. */
  const changed = useMemo(() => Array.isArray(git?.files) ? git.files : [], [git])
  const changedByPath = useMemo(() => {
    const map = new Map()
    // The entry keeps both porcelain sides, so the row can show staged work differently from unstaged.
    for (const file of changed) map.set(file.path, file)
    return map
  }, [changed])
  // Ignored paths are asked for by directory, bounded by what the tree draws: a repository-wide
  // `--ignored` listing is tens of megabytes on a tree with a large vendor directory.
  const [ignoredSet, setIgnoredSet] = useState(() => new Set())

  /** The status route reports paths relative to the checkout root; the tree keys absolute paths. */
  const checkoutRoot = git?.root
  // `loadDirectoryStatus` keys against the checkout root but must not be rebuilt whenever it arrives,
  // so the latest value travels through a ref rather than its dependency list.
  const checkoutRootRef = useRef(checkoutRoot)
  checkoutRootRef.current = checkoutRoot
  /**
   * Every status the tree may draw, from both sources: the workspace-wide query and each expanded
   * directory's own query. Later per-directory answers win, since they carry more detail.
   */
  const statusMap = useMemo(() => {
    if (directoryStatus.size === 0) return changedByPath
    const merged = new Map(changedByPath)
    for (const [path, status] of directoryStatus) merged.set(path, status)
    return merged
  }, [changedByPath, directoryStatus])

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
    if (relative === undefined) return undefined
    return statusMap.get(relative)?.status
  }, [statusMap, statusKeyOf])

  /** The index-side letter for one path, when the entry carries it. */
  const stagedOf = useCallback(key => {
    const relative = statusKeyOf(key)
    if (relative === undefined) return undefined
    return statusMap.get(relative)?.staged
  }, [statusMap, statusKeyOf])

  /** The working-tree-side letter for one path, when the entry carries it. */
  const unstagedOf = useCallback(key => {
    const relative = statusKeyOf(key)
    if (relative === undefined) return undefined
    return statusMap.get(relative)?.unstaged
  }, [statusMap, statusKeyOf])

  /**
   * Which side of the upstream holds this path, and how it changed there.
   *
   * The two lists come from range diffs measured at the merge base, so a path appears on exactly one
   * side unless both branches touched it. A local edit that is also unpublished shows both facts.
   */
  const remoteByPath = useMemo(() => {
    const map = new Map()
    for (const entry of git?.remote?.pushed ?? []) map.set(entry.path, { status: entry.status, direction: 'pushed' })
    for (const entry of git?.remote?.pulled ?? []) map.set(entry.path, { status: entry.status, direction: 'pulled' })
    return map
  }, [git])

  const remoteOf = useCallback(key => {
    const relative = statusKeyOf(key)
    if (relative === undefined) return undefined
    return remoteByPath.get(relative)
  }, [remoteByPath, statusKeyOf])

  /** Open one entry in the resource viewer the same way the shipped tree does. */
  const openEntry = useCallback(entry => {
    const absolute = absoluteOf(cwd ?? '', entry.path)
    // A `session` address resolves its path against that session's workspace root, so it must carry a
    // workspace-relative path. Sending the absolute path with its leading slash stripped made the
    // Host join it onto the root, and every file read as missing. A path outside the workspace has no
    // relative form, so it keeps the absolute scope instead.
    const root = cwd ?? ''
    const relative = relativeTo(root, absolute)
    const inside = root !== '' && relative !== absolute
    const address = inside
      ? `dsh-resource://file/session/${encodeURIComponent(sessionId)}/${encodePath(relative)}`
      : `dsh-resource://file/absolute/${encodePath(absolute.replace(/^\/+/, ''))}`
    if (panel.isFloating) tab.actions.openResource(address)
    else tab.actions.openResource(address, { paneId: panel.id })
  }, [cwd, sessionId, tab.actions, panel.id, panel.isFloating])

  /**
   * Read one directory's Git state and merge it into the map the tree draws from.
   *
   * The workspace-wide query summarizes an untracked directory as a single entry, which is why a
   * folder could look changed while nothing inside it did. Asking again for just the opened directory
   * with per-file entries fills that level in without ever walking the whole repository that way.
   * Declared before `openDirectory`, which names it in a dependency array that evaluates during the
   * render: a later `const` would be read while still in its temporal dead zone.
   * @param directory - absolute directory path that was just expanded.
   */
  const loadDirectoryStatus = useCallback(async directory => {
    if (cwd === undefined || !prefsRef.current.showGitStatus) return
    const epoch = gitEpoch.current
    const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(directory)}`)
    // A workspace-wide refresh started while this was in flight. Its answer describes the old tree.
    if (epoch !== gitEpoch.current) return
    if (!result.ok || result.git === null || result.git === undefined) return
    const root = result.git.root
    const base = checkoutRootRef.current ?? cwd
    const directoryRelative = relativeTo(base, directory)
    // Outside the checkout there is nothing to key, and wiping the map from a bad prefix would hide
    // letters that still belong to this workspace.
    if (directoryRelative === directory && directoryRelative !== '') return
    const files = []
    for (const file of result.git.files ?? []) {
      const absolute = root === undefined ? file.path : `${root.replace(/\/+$/u, '')}/${file.path}`
      // Keys must match `statusKeyOf`, which relativizes against the checkout root, not the
      // workspace root: a repository opened from a subdirectory would otherwise never line up.
      const relative = relativeTo(base, absolute)
      // Store the whole entry, not just its letter: `statusMap` holds entries from both sources and
      // every reader takes `.status` off one. A bare string here made them read `undefined`.
      if (relative !== absolute) files.push({ ...file, path: relative })
    }
    setDirectoryStatus(current => replaceDirectoryStatus(current, directoryRelative, files))
  }, [cwd, sessionId, request])
  loadDirectoryStatusRef.current = loadDirectoryStatus

  /**
   * Expand one directory, or ask once whether to cross the workspace boundary.
   *
   * A link into the workspace lists on the first press. One that resolves outside is refused by the
   * Host, so this asks the reader rather than showing a dead row; an accepted path is remembered for
   * this page life only, exactly like the spec requires.
   * @param entry - the row that was pressed.
   */
  const openDirectory = useCallback(async entry => {
    const result = await tree.loadLevel(entry.path)
    // A folder opens whether or not its target lives under the workspace: the entry is the reader's
    // own, and a link behaves like the directory it points at. Only a failure to read is reported,
    // and the tree draws that in place of the level.
    tree.toggle(entry.path, true)
    if (result?.ok) void loadDirectoryStatus(entry.path)
  }, [tree, loadDirectoryStatus])

  /**
   * Delete one entry after the confirmation card is accepted.
   *
   * Nothing here runs from the menu directly: the menu only opens the card. That keeps a destructive
   * action behind one deliberate confirmation, and the card is the shipped modal like every other.
   * @param target - the entry the card was opened for.
   */
  const doDelete = useCallback(async (target) => {
    setBusy(true)
    const result = await request('/delete', {
      sessionId,
      path: target.path,
      kind: target.kind === 'directory' ? 'directory' : 'file',
    })
    setBusy(false)
    if (!result.ok) { setLinkNote(result.message); return }
    setDeleteRequest(null)
    setLinkNote(undefined)
    // The row is gone, so its level and any cached expansion under it are gone with it.
    tree.forget(target.path)
    tree.collapseUnder(target.path)
    const parent = parentOf(target.path)
    if (parent !== target.path) await tree.refreshLevel(parent)
    if (tree.selected === target.path) tree.setSelected(null)
    queueStats()
  }, [sessionId, request, tree, queueStats])

  /**
   * Ask for a name first, and only write once the reader confirms.
   *
   * Writing at press time left a file on disk that the reader never accepted, so cancelling the card
   * still added a row. The card now owns the whole decision: it is the only step that touches disk.
   * @param kind - `file` or `folder`.
   */
  const create = useCallback(kind => {
    if (cwd === undefined) return
    const directory = directoryForCreate(tree, cwd)
    const siblings = siblingsAt(tree, cwd, directory)
    setLinkNote(undefined)
    setCreateRequest({ kind, directory, proposed: nextName(kind, siblings) })
  }, [cwd, tree])

  /**
   * Write the entry the reader accepted in the card, then reveal it.
   * @param name - the confirmed name.
   */
  const doCreate = useCallback(async (name) => {
    if (createRequest === null) return
    const { kind, directory } = createRequest
    const check = checkName(name, copy)
    if (!check.ok) { setLinkNote(check.message); return }
    setBusy(true)
    const result = await request(kind === 'file' ? '/create-file' : '/create-folder', { sessionId, directory, name: check.name })
    setBusy(false)
    if (!result.ok) { setLinkNote(result.message); return }
    setCreateRequest(null)
    setLinkNote(undefined)
    await tree.refreshLevel(directory)
    const prefix = relativeTo(cwd ?? '', directory)
    const created = absoluteOf(cwd ?? '', `${prefix === '' ? '' : `${prefix}/`}${check.name}`)
    tree.setSelected(created)
    if (kind === 'folder') { tree.knownEmpty(created); tree.toggle(created, true) }
    queueStats()
  }, [createRequest, copy, cwd, sessionId, request, tree, queueStats])


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

  /**
   * Move one entry into another folder, the way a drag-and-drop ends.
   *
   * The directory to refresh on the source side is the parent the entry just left; on the
   * destination side it is only worth reloading when the reader can already see inside it.
   */
  const doMove = useCallback(async (entry, targetDir) => {
    if (cwd === undefined) return
    const absolute = absoluteOf(cwd, entry.path)
    const result = await request('/move', { sessionId, path: absolute, directory: targetDir })
    if (!result.ok) {
      setToast(result.message)
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setToast(undefined), 4000)
      return
    }
    const sourceParent = parentOf(absolute)
    // Both sides reload silently: the source level loses a row, and the destination gains one the
    // reader expects to see right where it landed — the workspace root counts as its own level and
    // is never inside `expanded`, which is why a root drop once needed a manual refresh.
    await tree.refreshLevel(sourceParent)
    await tree.refreshLevel(targetDir)
    if (entry.meta?.kind === 'directory') tree.collapseUnder(absolute)
    if (tree.selected === absolute) tree.setSelected(result.path)
    queueStats()
    void refreshGit()
  }, [cwd, sessionId, request, tree, queueStats, refreshGit])

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

  /**
   * Fast-forward the current branch from its upstream.
   *
   * A refusal is reported inside the panel rather than as a toast: the reason (no upstream, or a
   * branch that would need a real merge) is what the reader needs to act on.
   */
  const doPull = useCallback(async () => {
    setDrawerBusy(true)
    setDrawerError(undefined)
    const result = await request('/pull', { sessionId })
    setDrawerBusy(false)
    if (!result.ok) { setDrawerError(result.message); return }
    await tree.refresh()
    await refreshGit()
    await refreshStats()
  }, [sessionId, request, tree, refreshGit, refreshStats])

  /**
   * Switch this worktree to another branch.
   *
   * Git refuses when local changes would be overwritten or the branch is held by another worktree; its
   * message names which, and it is shown inside the panel so the reader can act on it.
   */
  const doCheckout = useCallback(async branch => {
    setDrawerBusy(true)
    setDrawerError(undefined)
    const result = await request('/checkout', { sessionId, branch })
    setDrawerBusy(false)
    if (!result.ok) { setDrawerError(result.message); return }
    setToast(copy.branchSwitched(branch))
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(undefined), 2000)
    await tree.refresh()
    await refreshGit()
    await refreshStats()
  }, [sessionId, request, tree, refreshGit, refreshStats, copy])

  /** Commit from inside the panel, keeping the panel open so its list refreshes in place.
   *  Resolves `true` only after the commit landed, so the panel can clear its message. */
  const doDrawerCommit = useCallback(async message => {
    setDrawerBusy(true)
    setDrawerError(undefined)
    const result = await request('/commit', { sessionId, message })
    setDrawerBusy(false)
    if (!result.ok) { setDrawerError(result.message); return false }
    await tree.refresh()
    await refreshGit()
    await refreshStats()
    return true
  }, [sessionId, request, tree, refreshGit, refreshStats])

  /** Copy one path. Success is a floating toast; a failure stays as an inline note. */
  const copyPath = useCallback(async (absolute, relative) => {
    try {
      await navigator.clipboard.writeText(relative ? relative : absolute)
      setToast(copy.copied)
      window.clearTimeout(toastTimer.current)
      toastTimer.current = window.setTimeout(() => setToast(undefined), 1600)
    } catch (error) {
      setLinkNote(error instanceof Error ? error.message : String(error))
    }
  }, [copy.copied])

  // Drag-and-drop state lives in refs, not render state: a hover mark is a DOM attribute on the row
  // itself, and the auto-open clock is the only thing a leave or drop must cancel.
  const hoverTimer = useRef(0)
  const hovering = useRef(null)
  const dragKind = useRef('file')
  const clearHover = useCallback(() => {
    window.clearTimeout(hoverTimer.current)
    hoverTimer.current = 0
    if (hovering.current !== null) hovering.current.removeAttribute('data-nxe-drop')
    hovering.current = null
  }, [])
  const markHover = useCallback((entry, node) => {
    clearHover()
    hovering.current = node
    node.setAttribute('data-nxe-drop', 'true')
    // Hovering a folded folder long enough opens it, so a move can reach a level the reader is
    // pointing at without a separate click. A null entry is the container itself (the workspace
    // root), which is already the open top level.
    if (entry !== null && !tree.expanded.includes(entry.path)) {
      hoverTimer.current = window.setTimeout(() => { void openDirectory(entry) }, 650)
    }
  }, [clearHover, openDirectory, tree.expanded])
  const dropOn = useCallback(event => {
    event.preventDefault()
    event.stopPropagation()
    clearHover()
    const source = event.dataTransfer?.getData('application/x-nxe-move')
    return source ?? ''
  }, [clearHover])

  // This page owns its row menu instead of going through `contextMenus`: that service gives each
  // contribution a one-second deadline, and the shipped opener provider needs a host round trip plus
  // an application probe, so the menu opened late and reported a failure for rows that had resolved.
  const rowTriggerProps = useCallback((entry, kind) => ({
    draggable: true,
    onDragStart: event => {
      dragKind.current = kind
      event.dataTransfer?.setData('application/x-nxe-move', entry.path)
      if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: clearHover,
    onContextMenu: event => {
      event.preventDefault()
      event.stopPropagation()
      tree.setSelected(entry.path)
      setMenu({ x: event.clientX, y: event.clientY, path: entry.path, name: entry.name, kind, openedAt: Date.now() })
    },
    // Only a folder row can catch a drop; a file row leaves the gesture to the container's root drop.
    onDragOver: kind === 'directory' ? event => {
      if (event.dataTransfer?.types?.includes('application/x-nxe-move') !== true) return
      event.preventDefault()
      event.stopPropagation()
      event.dataTransfer.dropEffect = 'move'
      // The mark follows the pointer: a real drag may never deliver a reliable relatedTarget, so the
      // hover highlight is refreshed here, where the browser is obliged to report every move.
      if (hovering.current !== event.currentTarget) markHover(entry, event.currentTarget)
    } : undefined,
    onDragEnter: kind === 'directory' ? event => {
      if (event.dataTransfer?.types?.includes('application/x-nxe-move') !== true) return
      if (event.currentTarget.contains(event.relatedTarget)) return
      markHover(entry, event.currentTarget)
    } : undefined,
    onDragLeave: kind === 'directory' ? event => {
      // relatedTarget is the element the drag moved onto; null means it left the row entirely in
      // every engine that reports it. Inside-descendant moves stay marked.
      if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
      if (hovering.current === event.currentTarget) clearHover()
    } : undefined,
    onDrop: kind === 'directory' ? event => {
      const source = dropOn(event)
      if (source === '') return
      void doMove({ path: source, meta: { kind: dragKind.current } }, entry.path)
    } : undefined,
  }), [tree, clearHover, markHover, dropOn, doMove])

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
    for (const [path, entry] of statusMap) {
      if (prefix !== '' && !path.startsWith(prefix)) continue
      const rank = SEVERITY.indexOf(entry.status)
      if (rank > bestRank) { bestRank = rank; best = entry.status }
    }
    return best
  }, [statusMap, statusKeyOf])

  const accessory = useMemo(() => createAccessory({
    copy: () => copy,
    statusOf, stagedOf, unstagedOf, remoteOf, ignoredOf, folderStatusOf,
    // A link is marked from the listing itself, so the row shows it while still collapsed. `outside`
    // says where the link leads, not whether it may be opened.
    // A level that failed with `broken-link` is how a dead link announces itself: the row keeps its
    // folder glyph and gains a struck link, rather than the row vanishing or reading as a file.
    linkBrokenOf: key => tree.levels.get(treeKeyOf(cwd ?? '', key))?.code === 'broken-link',
    linkOf: key => {
      const info = linkByPath.get(key)
      if (info === undefined) return undefined
      return info.outside === true
    },
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

  // Repository bookkeeping and desktop metadata stay out of the tree until the settings switch
  // asks for them. Matched by name at any depth; the listing itself is unchanged.
  const entries = tree.entries
    .filter(entry => prefs.showSystemFiles || !INTERNAL_NAMES.has(entry.name))
    .map(entry => ({
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
    onToggle: entry => {
      // A press on an open folder always collapses it. Only opening needs the boundary check, so a
      // folder that was expanded can always be folded back whatever its link target is.
      if (tree.expanded.includes(entry.path)) { tree.toggle(entry.path, false); return }
      void openDirectory(entry)
    },
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

  /** The rows the menu offers for the entry that was right-clicked. */
  const rowActions = useMemo(() => {
    if (menu === null) return []
    const target = { path: menu.path, name: menu.name, kind: menu.kind }
    const revealId = openApps[0]
    const open = app => {
      void fetch('/open-in-app/open', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ app, path: menu.path }), credentials: 'same-origin',
      })
    }
    return [
      // Double-click already opens a file, so the menu spends its first row on the opener instead.
      revealId === undefined ? null : { id: 'reveal', label: copy.revealIn(APP_LABELS[revealId] ?? revealId),
        icon: React.createElement('img', { src: `/open-in-app/icon/${encodeURIComponent(revealId)}`, alt: '', width: 14, height: 14 }),
        run: () => { open(revealId) } },
      { id: 'copy-path', label: copy.copyAbsolute, icon: React.createElement(primitives.IconCopyOutlineRegular, { width: 14, height: 14 }),
        run: () => { void copyPath(menu.path, menu.path) } },
      { id: 'copy-relative', label: copy.copyRelative, icon: React.createElement(primitives.IconLinkOutlineRegular, { width: 14, height: 14 }),
        run: () => { void copyPath(menu.path, relativeTo(cwd ?? '', menu.path)) } },
      /* Seed a notepad note from this file's content; the note is a draft, so the
         source on disk stays untouched until the user saves elsewhere. */
      menu.kind !== 'file' || window.__nanoNotepad === undefined ? null : {
        id: 'open-in-notepad', label: copy.openInNotepad,
        icon: React.createElement(primitives.IconEditOutlineRegular, { width: 14, height: 14 }),
        run: async () => {
          const read = await request('/read', { sessionId, path: menu.path })
          if (!read.ok) { setLinkNote(read.message ?? copy.openInNotepadFail); return }
          setLinkNote(undefined)
          const absolute = menu.path.startsWith('/') ? menu.path : `${cwd ?? ''}/${menu.path}`
          await window.__nanoNotepad.import(menu.name, read.content, { sourcePath: absolute })
        } },
      { id: 'rename', label: copy.rename, icon: React.createElement(primitives.IconEditOutlineRegular, { width: 14, height: 14 }),
        run: () => { setDialogError(undefined); setDialog({ kind: 'rename', entry: { ...target, meta: { kind: menu.kind } } }) } },
      { id: 'delete', label: copy.delete, tone: 'danger', icon: React.createElement(primitives.IconTrashOutlineRegular, { width: 14, height: 14 }),
        run: () => { setLinkNote(undefined); setDeleteRequest(target) } },
    ].filter(Boolean)
  }, [menu, copy, openApps, cwd, copyPath])

  return React.createElement('div', { className: 'nxe-root', 'data-nxe': 'true', 'data-theme': nxe.scheme() },
    React.createElement('div', { className: 'nxe-header' },
      React.createElement('span', { className: 'nxe-path', title: cwd, 'data-nxe-path': 'true' }, cwd),
      React.createElement(ToolButton, { label: copy.newFile, onClick: () => { create('file') } }, iconFilePlus()),
      React.createElement(ToolButton, { label: copy.newFolder, onClick: () => { create('folder') } }, iconFolderPlus()),
      React.createElement(ToolButton, {
        label: copy.rename, disabled: tree.selected === null,
        onClick: () => {
          const target = tree.selected
          if (target === null) return
          setDialogError(undefined)
          setDialog({ kind: 'rename', entry: { path: target, name: basenameOf(target), meta: { kind: tree.levels.has(target) ? 'directory' : 'file' } } })
        },
      }, iconRename()),
      // The shipped open-in-app package owns the reveal control: its own icon, its own tooltip, its
      // own split button with the application list. Rendering its seat keeps that exact UI instead of
      // a look-alike this page would have to maintain. `renderSlot` reads the entries other packages
      // registered, so declaring the child slot here is neither needed nor allowed.
      React.createElement(RevealButton, { copy, cwd: cwd ?? '', apps: openApps }),
      React.createElement(ToolButton, { label: copy.reload, onClick: () => { void tree.refresh(); void refreshGit() } }, iconRefresh()),
    ),
    linkNote === undefined ? null : React.createElement('p', { className: 'nxe-row-note', role: 'status' }, linkNote),
    deleteRequest === null ? null : React.createElement(Dialog, {
      copy, title: copy.deleteTitle, busy, confirmLabel: copy.delete,
      onConfirm: () => { void doDelete(deleteRequest) },
      onCancel: () => { setDeleteRequest(null); setLinkNote(undefined) },
      // The confirmation line is the title's explanation, so it goes into the Modal's own
      // description slot; the destructive warning stays a muted note under it.
      description: React.createElement(React.Fragment, null,
        copy.deleteBody(deleteRequest.name),
        deleteRequest.kind === 'directory'
          ? React.createElement('span', { className: 'nxe-dialog-note-inline' }, ` ${copy.deleteFolderNote}`)
          : null),
    }),
    createRequest === null ? null : React.createElement(RenameDialog, {
      copy, mode: 'create', busy,
      currentName: createRequest.proposed,
      onConfirm: name => { void doCreate(name) },
      onCancel: () => { setCreateRequest(null); setLinkNote(undefined) },
    }),
    React.createElement('div', {
      className: 'nxe-tree', 'data-nxe-tree': 'true', onKeyDown: onTreeKeyDown,
      // Empty space below the rows is the workspace root: a drop landing there moves the entry to
      // the top level, the same destination a root-level folder row offers.
      onDragOver: event => {
        if (event.dataTransfer?.types?.includes('application/x-nxe-move') !== true) return
        event.preventDefault()
        event.dataTransfer.dropEffect = 'move'
        if (hovering.current !== event.currentTarget) markHover(null, event.currentTarget)
      },
      onDragLeave: event => {
        if (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)) return
        if (hovering.current === event.currentTarget) clearHover()
      },
      onDrop: event => {
        // A folder row already claimed this drop — its handler stopped propagation.
        const source = dropOn(event)
        if (source === '') return
        void doMove({ path: source, meta: { kind: dragKind.current } }, cwd)
      },
    }, content),
    React.createElement(NanoToast, { text: toast }),
    // A Git read failure is a persistent floating warning over the pane's lower edge, not a row in
    // the flow: an inline line pushed the whole tree down, and it stayed as long as the error did.
    gitError === undefined ? null : React.createElement('div', {
      className: 'nano-toast nxe-git-alert', role: 'alert', 'data-nxe-git-alert': 'true',
    },
    React.createElement(primitives.IconWarningOutlineRegular, {
      width: 14, height: 14, className: 'nxe-git-alert-icon', 'aria-hidden': 'true',
    }),
    React.createElement('span', { className: 'nxe-git-alert-text' }, gitError),
    React.createElement('button', {
      type: 'button', className: 'nxe-git-alert-x', title: copy.dismiss,
      'aria-label': copy.dismiss, onClick: () => setGitError(undefined),
    }, React.createElement(primitives.IconCloseOutlineRegular, { width: 12, height: 12, 'aria-hidden': 'true' }))),
    React.createElement(StatusBar, {
      copy, git, stats, statsState, prefs,
      onOpenBranch: () => openDrawer('branch'),
      onOpenCommit: () => openDrawer('commit'),
      onRetryStats: () => { void refreshStats() },
      onOpenSettings: () => setSettingsOpen(true),
    }),
    dialogNode,
    React.createElement(SettingsDialog, {
      copy, open: settingsOpen, prefs, onClose: () => setSettingsOpen(false),
      setPref: (key, value) => nxe.setPref(key, value),
    }),
    React.createElement(BranchDrawer, {
      copy, open: drawer === 'branch', git, busy: drawerBusy, error: drawerError,
      onClose: () => { setDrawer(null); setDrawerError(undefined) },
      onPull: doPull,
      onCheckout: doCheckout,
      onRefresh: async () => { await refreshGit() },
      onOpenConflict: path => { openEntry({ path: absoluteOf(cwd ?? '', path) }); setDrawer(null) },
    }),
    React.createElement(CommitDrawer, {
      copy, open: drawer === 'commit', git, busy: drawerBusy, error: drawerError, refreshing: drawerRefresh,
      onClose: () => { setDrawer(null); setDrawerError(undefined) },
      onCommit: doDrawerCommit,
      onPull: doPull,
      onOpenConflict: path => { openEntry({ path: absoluteOf(cwd ?? '', path) }); setDrawer(null) },
    }),
    React.createElement(RowMenu, { menu, copy, actions: rowActions, onClose: () => setMenu(null) }))
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



/**
 * The reveal control, drawn as the shipped split button: application icon, divider, chevron.
 *
 * The shipped files body renders this from `sidebar.right.tab.files.actions`, a child slot it declares
 * as its own. A page that takes over that body cannot declare the same child (one declaring owner),
 * and reading another owner's seat yields nothing, so the control is rebuilt here with the same
 * geometry and the same host routes.
 *
 * @param props - copy, the workspace directory, and the installed opener ids.
 * @returns the split button, or null when no opener is installed.
 */
function RevealButton({ copy, cwd, apps }) {
  const list = Array.isArray(apps) ? apps : []
  if (cwd === '' || list.length === 0) return null
  const [choice, setChoice] = React.useState(list[0])
  const [menuOpen, setMenuOpen] = React.useState(false)
  const wrap = React.useRef(null)
  const active = list.includes(choice) ? choice : list[0]

  React.useEffect(() => {
    if (!menuOpen) return undefined
    const close = event => { if (wrap.current !== null && !wrap.current.contains(event.target)) setMenuOpen(false) }
    const escape = event => { if (event.key === 'Escape') setMenuOpen(false) }
    document.addEventListener('pointerdown', close, true)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', close, true)
      document.removeEventListener('keydown', escape, true)
    }
  }, [menuOpen])

  const open = app => {
    void fetch('/open-in-app/open', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ app, path: cwd }), credentials: 'same-origin',
    })
  }

  return React.createElement('span', { className: 'nxe-reveal', ref: wrap, 'data-nxe-reveal': active },
    React.createElement('button', {
      type: 'button', className: 'nxe-reveal-main',
      title: copy.revealIn(APP_LABELS[active] ?? active),
      'aria-label': copy.revealIn(APP_LABELS[active] ?? active),
      onClick: () => { open(active) },
    },
    React.createElement('img', { src: `/open-in-app/icon/${encodeURIComponent(active)}`, alt: '', width: 14, height: 14 })),
    React.createElement('span', { className: 'nxe-reveal-divider', 'aria-hidden': 'true' }),
    React.createElement('button', {
      type: 'button', className: 'nxe-reveal-more',
      title: copy.revealChoose,
      'aria-label': copy.revealChoose,
      'aria-expanded': String(menuOpen),
      onClick: () => setMenuOpen(v => !v),
    }, React.createElement(primitives.IconChevronDownOutlineRegular, { width: 10, height: 10, 'aria-hidden': 'true' })),
    menuOpen ? React.createElement('div', { className: 'nano-menu', role: 'menu', style: { position: 'absolute', right: 0, top: '26px' } },
      list.map(app => React.createElement('button', {
        key: app, type: 'button', role: 'menuitem', className: 'nano-menu-item',
        onClick: () => { setChoice(app); setMenuOpen(false); open(app) },
      },
      React.createElement('span', { className: 'nano-menu-icon', 'aria-hidden': 'true' },
        React.createElement('img', { src: `/open-in-app/icon/${encodeURIComponent(app)}`, alt: '', width: 14, height: 14 })),
      React.createElement('span', { className: 'nano-menu-label' }, APP_LABELS[app] ?? app)))) : null)
}

/**
 * Display names for every opener id the host can report.
 *
 * Copied from the shipped open-in-app dictionary so the rows read as product names ("VS Code",
 * "GitHub Desktop") instead of the raw ids the host uses ("vscode", "github").
 */
const APP_LABELS = {
  finder: 'Finder', explorer: 'File Explorer', filemanager: 'File Manager', dolphin: 'Dolphin', nautilus: 'Files',
  cursor: 'Cursor', vscode: 'VS Code', vscodeinsiders: 'VS Code Insiders', windsurf: 'Windsurf', zed: 'Zed',
  sublimetext: 'Sublime Text', xcode: 'Xcode', androidstudio: 'Android Studio', intellij: 'IntelliJ IDEA',
  pycharm: 'PyCharm', webstorm: 'WebStorm', phpstorm: 'PhpStorm', goland: 'GoLand', rider: 'Rider',
  rustrover: 'RustRover', fork: 'Fork', sourcetree: 'Sourcetree', github: 'GitHub Desktop', tower: 'Tower',
  gitkraken: 'GitKraken', smartgit: 'SmartGit', sublimemerge: 'Sublime Merge', ghostty: 'Ghostty',
  warp: 'Warp', iterm: 'iTerm2', kitty: 'kitty', terminal: 'Terminal', windowsterminal: 'Windows Terminal',
  gitbash: 'Git Bash', gnometerminal: 'GNOME Terminal', konsole: 'Konsole',
}
