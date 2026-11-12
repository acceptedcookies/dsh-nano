/**
 * One workspace's explorer state, shared by every session mounted on the same root.
 *
 * Sessions pointing at the same working directory used to each hold a full copy of the tree, the
 * Git snapshot, and the statistics walk — and then ask the Host for all of it independently. This
 * module keeps one authoritative copy per workspace root; every `ExplorerBody` on that root
 * subscribes to it and renders from the same snapshot. Requests are deduplicated in flight, so ten
 * panes mounting at once still cost one listing, one status read, and one statistics walk.
 */

import { absoluteOf, basenameOf, parentOf, relativeTo, treeKeyOf } from './paths.js'
import { replaceDirectoryStatus } from './format.js'
import { perf } from './perf.js'

/** How long an orphaned store survives after its last pane unmounted. */
const ORPHAN_TTL_MS = 5 * 60 * 1000
/** A store older than this is re-read silently when a new pane mounts, rather than trusted blind. */
const STALE_AFTER_MS = 20 * 1000
/** Statistics debounce, matching the shipped footer's own pacing. */
const STATS_DEBOUNCE_MS = 2000

/** The live stores, keyed by workspace root. */
const stores = new Map()

/**
 * Fetch one plugin route and normalize the answer.
 * @param path - route suffix under `/nano-explorer-extra`.
 * @param body - optional JSON body; a GET is sent when absent.
 * @returns `{ ok, ...payload }`; failures surface as `{ ok: false, message }`.
 */
async function request(path, body) {
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
}

/**
 * The store behind one workspace root.
 */
function createStore(root) {
  const listeners = new Set()
  const mounts = new Set()
  // Promises already running, keyed by call identity. Every caller awaiting the same read shares
  // one result instead of starting a second round trip.
  const inFlight = new Map()
  let state = {
    levels: new Map(),
    expanded: new Set(),
    ignoredSet: new Set(),
    directoryStatus: new Map(),
    git: null,
    gitError: undefined,
    stats: null,
    statsState: 'idle',
  }
  // Bumped on every workspace-wide Git read; a per-directory answer that started against the
  // previous snapshot is discarded on landing, the same rule the per-mount epoch enforced before.
  let gitEpoch = 0
  /**
   * Serialized form of the last committed `git` snapshot. The Host builds the object in a fixed
   * field order, so a textual compare is a sound "did anything change" test — E2 skips the commit,
   * the subscriber notification, and the per-directory fan-out entirely when it does not.
   */
  let lastGitJson = undefined
  let lastGitErrorJson = undefined
  /** Expanded directories whose scoped read has landed; reset alongside `directoryStatus`. */
  const dirStatusLoaded = new Set()
  let statsTimer = 0
  let orphanTimer = 0
  let lastRefreshAt = 0
  /** Preference the reads honor; each mount feeds it so the latest subscriber's choice wins. */
  let showGitStatus = () => true

  /** Swap the whole snapshot so subscribers see one coherent version, and notify them. */
  const commit = patch => perf.span('apply-status', () => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  })

  /** Run `work` once per key; concurrent callers share the promise. */
  const once = (key, work) => {
    const running = inFlight.get(key)
    if (running !== undefined) return running
    const promise = work().finally(() => { if (inFlight.get(key) === promise) inFlight.delete(key) })
    inFlight.set(key, promise)
    return promise
  }

  /**
   * Read one directory and store its level.
   * @param sessionId - the Session issuing the request (any mounted one; listing is root-scoped).
   * @param path - absolute directory path.
   * @param silent - keep the rows already drawn instead of showing a loading line.
   */
  const loadLevel = (sessionId, path, silent = false, skipIgnored = false) => once(`level:${path}`, () => perf.span('list-level', async () => {
    const key = treeKeyOf(root, path)
    if (!silent) {
      const next = new Map(state.levels)
      if (next.get(key) === undefined) next.set(key, { loading: true, entries: [] })
      if (next !== state.levels) commit({ levels: next })
    }
    const result = await request('/list', { sessionId, path })
    lastRefreshAt = Date.now()
    const next = new Map(state.levels)
    const previous = next.get(key)
    if (result.ok) {
      next.set(key, {
        entries: result.entries,
        truncated: result.truncated === true,
        outside: result.outside === true,
        failed: previous?.failed === true && previous.entries?.length > 0 ? previous.failed : false,
      })
    } else {
      next.set(key, { entries: previous?.entries ?? [], failed: true, message: result.message, code: result.code })
    }
    commit({ levels: next })
    // The directory is gone (deleted outside the app, or replaced by a file): keeping its stale
    // entries drew a ghost row forever, and the level map kept listing children of nothing.
    // Prune the whole subtree and the row in the parent instead of showing a dead level.
    if ((result.code === 'not-found' || result.code === 'not-directory') && path !== root) pruneEntry(path)
    // The freshly listed names feed the ignored check; the answer lands in the shared set. A mass
    // refresh passes `skipIgnored` so one batched query covers every level instead of one per level.
    if (result.ok && result.entries.length > 0 && !skipIgnored) void markIgnored(sessionId, path, result.entries.map(entry => entry.name))
    return result
  }))

  /**
   * One `check-ignore` round trip for an arbitrary path list, merged into the shared set.
   * The `/ignored` route is itself memoized, so two panes asking for the same level cost one query;
   * the dedupe here keeps even that from being asked twice.
   */
  const checkIgnored = (sessionId, paths) => {
    if (!showGitStatus() || !Array.isArray(paths) || paths.length === 0) return Promise.resolve()
    return once(`ignored:${paths.join(',')}`, async () => {
      const result = await request('/ignored', { sessionId, paths })
      if (!result.ok || !Array.isArray(result.ignored) || result.ignored.length === 0) return
      // The set is keyed like the status map — relative to the checkout root — so a workspace that
      // is a subdirectory of its repository still compares equal in `ignoredOf`.
      const checkoutRoot = state.git?.root
      const prefix = checkoutRoot === undefined ? '' : relativeTo(checkoutRoot, root)
      const next = new Set(state.ignoredSet)
      for (const path of result.ignored) next.add(prefix === '' ? path : `${prefix}/${path}`)
      commit({ ignoredSet: next })
    })
  }

  /**
   * Ask Git which of one directory's entries it ignores, and merge the answer into the shared set.
   */
  const markIgnored = (sessionId, directory, names) => {
    if (!Array.isArray(names) || names.length === 0) return Promise.resolve()
    // Ask about each entry where it actually lives. Sending bare names made Git answer about
    // same-named entries at the workspace root: a nested `dist` stayed lit while an unrelated
    // root `node_modules` marked every nested `node_modules` ignored.
    const base = relativeTo(root, directory)
    const paths = names.map(name => base === '' ? name : `${base}/${name}`)
    return checkIgnored(sessionId, paths)
  }

  /**
   * Read one directory's Git state and merge it into the shared per-directory map.
   * @param sessionId - the issuing Session.
   * @param directory - absolute directory path that was just expanded.
   */
  const loadDirectoryStatus = (sessionId, directory) => {
    if (!showGitStatus()) return Promise.resolve()
    return once(`dirstatus:${directory}:${gitEpoch}`, () => perf.span('dir-status', async () => {
      const epoch = gitEpoch
      const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(directory)}`)
      if (epoch !== gitEpoch) return
      if (!result.ok || result.git === null || result.git === undefined) return
      dirStatusLoaded.add(directory)
      const checkoutRoot = result.git.root
      const base = checkoutRoot ?? root
      const directoryRelative = relativeTo(base, directory)
      if (directoryRelative === directory && directoryRelative !== '') return
      const files = []
      for (const file of result.git.files ?? []) {
        const absolute = checkoutRoot === undefined ? file.path : `${checkoutRoot.replace(/\/+$/u, '')}/${file.path}`
        const relative = relativeTo(base, absolute)
        if (relative !== absolute) files.push({ ...file, path: relative })
      }
      commit({ directoryStatus: replaceDirectoryStatus(state.directoryStatus, directoryRelative, files) })
    }))
  }

  /**
   * Re-read Git state alone. Deduped: the leader and a manual refresh share one flight.
   * @returns `true` when a new snapshot was committed; `false` when the read reported the exact
   *   same state (E2 — nothing to redraw, nothing to fan out) or the read failed to produce one.
   */
  /**
   * @param sessionId - the issuing Session.
   * @param detail - `'drawer'` asks the Host for the worktree list, branch rows, and history rail a
   *   footer drawer needs; anything else is the cheap status read the poll uses (E5). While a
   *   drawer is open every read must carry it, or a light poll would blank the drawer's fields.
   */
  const refreshGit = (sessionId, detail) => {
    if (!showGitStatus()) {
      if (state.git !== null || state.gitError !== undefined || state.directoryStatus.size !== 0) {
        dirStatusLoaded.clear()
        commit({ git: null, gitError: undefined, directoryStatus: new Map() })
      }
      return Promise.resolve(false)
    }
    const suffix = detail === 'drawer' ? '&detail=drawer' : ''
    return once(`git${suffix}`, () => perf.span('git-refresh', async () => {
      const epoch = gitEpoch + 1
      gitEpoch = epoch
      const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}${suffix}`)
      if (epoch !== gitEpoch) return false
      if (!result.ok) { commit({ gitError: result.message }); return false }
      // E2: the Host's field order is deterministic, so a serialized compare is a sound identity
      // check. An identical snapshot is not committed — subscribers, the accessory rebuild, and the
      // per-directory fan-out are all skipped, which is what makes an idle poll cost a fetch and
      // nothing else.
      const git = result.git ?? null
      const gitJson = JSON.stringify(git)
      const errorJson = JSON.stringify(result.gitError)
      // Expanded directories whose refinement is missing still get fetched: an identical whole-repo
      // answer may have landed while the per-directory map was empty (fresh store, memoized host
      // answer), and nothing else would ever repair it.
      const missing = [...state.expanded].filter(path => !dirStatusLoaded.has(path))
      if (gitJson === lastGitJson && errorJson === lastGitErrorJson) {
        for (const path of missing) void loadDirectoryStatus(sessionId, path)
        return missing.length > 0
      }
      lastGitJson = gitJson
      lastGitErrorJson = errorJson
      // The per-directory map is a refinement of this snapshot; leaving it in place kept letters
      // after the footer had already returned to zero.
      dirStatusLoaded.clear()
      commit({ git, gitError: result.gitError, directoryStatus: new Map() })
      for (const path of state.expanded) void loadDirectoryStatus(sessionId, path)
      return true
    }))
  }

  /** Re-count the workspace; a large tree takes seconds, so this is separate and cancellable. */
  const refreshStats = sessionId => once('stats', () => perf.span('stats-count', async () => {
    commit({ statsState: 'loading' })
    const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}&only=stats`)
    if (!result.ok) { commit({ statsState: 'failed' }); return }
    commit({ stats: result.stats ?? null, statsState: 'ok' })
  }))

  /** Debounced re-count after directory changes. */
  const queueStats = sessionId => {
    clearTimeout(statsTimer)
    statsTimer = setTimeout(() => { void refreshStats(sessionId) }, STATS_DEBOUNCE_MS)
  }

  /** Expand or collapse a directory, reading it the first time it opens. */
  const toggle = (sessionId, path, open) => {
    const key = treeKeyOf(root, path)
    // A4: count a state transition (collapsed → expanded), not every call.
    // `dialog-open` counts mounts, so usage semantics are now consistent.
    const wasExpanded = state.expanded.has(key)
    const next = new Set(state.expanded)
    if (open) next.add(key)
    else next.delete(key)
    if (next.size !== state.expanded.size || ![...next].every(k => state.expanded.has(k))) commit({ expanded: next })
    if (open && !wasExpanded) perf.count('files-expand')
    if (open && state.levels.get(key) === undefined) void loadLevel(sessionId, path)
  }

  /** Reload the root and every expanded directory in place. */
  const refresh = sessionId => {
    const paths = [root, ...state.expanded]
    // E10: the per-level ignored checks are suppressed and re-asked as ONE batched query once every
    // level has landed — a wide tree used to spend one `check-ignore` process per directory.
    void Promise.all(paths.map(path => loadLevel(sessionId, path, true, true))).then(() => {
      const all = []
      for (const [levelKey, level] of state.levels) {
        for (const entry of level.entries ?? []) {
          if (levelKey === '') all.push(entry.name)
          else all.push(`${levelKey}/${entry.name}`)
        }
      }
      void checkIgnored(sessionId, all)
    })
    lastRefreshAt = Date.now()
  }

  /** Reload exactly one directory's listing. */
  const refreshLevel = (sessionId, path) => loadLevel(sessionId, path, true)

  /** Record a directory as a known, empty level. */
  const knownEmpty = path => {
    const key = treeKeyOf(root, path)
    if (state.levels.has(key)) return
    const next = new Map(state.levels)
    next.set(key, { entries: [] })
    commit({ levels: next })
  }

  /** Forget one directory's cached listing, so a later expand reads it again. */
  const forget = path => {
    const key = treeKeyOf(root, path)
    if (!state.levels.has(key)) return
    const next = new Map(state.levels)
    next.delete(key)
    commit({ levels: next })
  }

  /**
   * Remove a vanished entry entirely: its level, every descendant level and expansion, and the row
   * its parent's listing still carries. The parent is left listed, so the next refresh simply
   * confirms what the prune already removed.
   */
  const pruneEntry = path => {
    const key = treeKeyOf(root, path)
    const nextLevels = new Map()
    for (const [itemKey, level] of state.levels) if (itemKey !== key && !itemKey.startsWith(`${key}/`)) nextLevels.set(itemKey, level)
    const nextExpanded = new Set()
    for (const item of state.expanded) if (item !== key && !item.startsWith(`${key}/`)) nextExpanded.add(item)
    const parentKey = treeKeyOf(root, parentOf(key))
    const parent = nextLevels.get(parentKey)
    if (parent?.entries !== undefined) {
      const name = basenameOf(key)
      const filtered = parent.entries.filter(entry => entry.name !== name)
      if (filtered.length !== parent.entries.length) nextLevels.set(parentKey, { ...parent, entries: filtered })
    }
    commit({ levels: nextLevels, expanded: nextExpanded })
  }

  /** Collapse a whole subtree after its paths changed. */
  const collapseUnder = path => {
    const key = treeKeyOf(root, path)
    const nextExpanded = new Set()
    for (const item of state.expanded) if (item !== key && !item.startsWith(`${key}/`)) nextExpanded.add(item)
    const nextLevels = new Map()
    for (const [itemKey, level] of state.levels) if (itemKey !== key && !itemKey.startsWith(`${key}/`)) nextLevels.set(itemKey, level)
    commit({ expanded: nextExpanded, levels: nextLevels })
  }

  return {
    root,
    get state() { return state },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener) },
    mountCount: () => mounts.size,
    /**
     * Register one mounted pane. The first mount loads the workspace; a store that has been sitting
     * while every pane was hidden re-reads silently instead of trusting what it kept.
     * @param hooks - `{ showGitStatus: () => boolean }`, the mounting pane's preference source.
     */
    mount: hooks => {
      clearTimeout(orphanTimer)
      if (typeof hooks?.showGitStatus === 'function') showGitStatus = hooks.showGitStatus
      const token = {}
      mounts.add(token)
      if (state.levels.size === 0) void loadLevel(hooks.sessionId, root)
      else if (Date.now() - lastRefreshAt > STALE_AFTER_MS) refresh(hooks.sessionId)
      return token
    },
    unmount: token => {
      mounts.delete(token)
      if (mounts.size === 0) orphanTimer = setTimeout(() => stores.delete(root), ORPHAN_TTL_MS)
    },
    loadLevel, markIgnored, loadDirectoryStatus, refreshGit, refreshStats, queueStats,
    toggle, refresh, refreshLevel, knownEmpty, forget, collapseUnder,
    /** Clear the floating Git warning; one dismissal clears it for every pane on this root. */
    dismissGitError: () => { if (state.gitError !== undefined) commit({ gitError: undefined }) },
  }
}

/**
 * The store for one workspace root, creating it on first use.
 * @param root - absolute workspace root path.
 * @returns the shared store.
 */
export function getWorkspaceStore(root) {
  const existing = stores.get(root)
  if (existing !== undefined) return existing
  const created = createStore(root)
  stores.set(root, created)
  return created
}
