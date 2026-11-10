/**
 * One workspace's explorer state, shared by every session mounted on the same root.
 *
 * Sessions pointing at the same working directory used to each hold a full copy of the tree, the
 * Git snapshot, and the statistics walk — and then ask the Host for all of it independently. This
 * module keeps one authoritative copy per workspace root; every `ExplorerBody` on that root
 * subscribes to it and renders from the same snapshot. Requests are deduplicated in flight, so ten
 * panes mounting at once still cost one listing, one status read, and one statistics walk.
 */

import { absoluteOf, relativeTo, treeKeyOf } from './paths.js'
import { replaceDirectoryStatus } from './format.js'

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
  let statsTimer = 0
  let orphanTimer = 0
  let lastRefreshAt = 0
  /** Preference the reads honor; each mount feeds it so the latest subscriber's choice wins. */
  let showGitStatus = () => true

  /** Swap the whole snapshot so subscribers see one coherent version, and notify them. */
  const commit = patch => {
    state = { ...state, ...patch }
    for (const listener of listeners) listener()
  }

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
  const loadLevel = (sessionId, path, silent = false) => once(`level:${path}`, async () => {
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
    // The freshly listed names feed the ignored check; the answer lands in the shared set.
    if (result.ok && result.entries.length > 0) void markIgnored(sessionId, path, result.entries.map(entry => entry.name))
    return result
  })

  /**
   * Ask Git which of one directory's entries it ignores, and merge the answer into the shared set.
   * The `/ignored` route is itself memoized, so two panes asking for the same level cost one query;
   * the dedupe here keeps even that from being asked twice.
   */
  const markIgnored = (sessionId, directory, names) => {
    if (!showGitStatus() || !Array.isArray(names) || names.length === 0) return Promise.resolve()
    return once(`ignored:${directory}:${names.join(',')}`, async () => {
      const result = await request('/ignored', { sessionId, paths: names })
      if (!result.ok || !Array.isArray(result.ignored) || result.ignored.length === 0) return
      const next = new Set(state.ignoredSet)
      const base = relativeTo(root, directory)
      for (const name of result.ignored) next.add(base === '' ? name : `${base}/${name}`)
      commit({ ignoredSet: next })
    })
  }

  /**
   * Read one directory's Git state and merge it into the shared per-directory map.
   * @param sessionId - the issuing Session.
   * @param directory - absolute directory path that was just expanded.
   */
  const loadDirectoryStatus = (sessionId, directory) => {
    if (!showGitStatus()) return Promise.resolve()
    return once(`dirstatus:${directory}:${gitEpoch}`, async () => {
      const epoch = gitEpoch
      const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}&path=${encodeURIComponent(directory)}`)
      if (epoch !== gitEpoch) return
      if (!result.ok || result.git === null || result.git === undefined) return
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
    })
  }

  /** Re-read Git state alone. Deduped: the leader and a manual refresh share one flight. */
  const refreshGit = sessionId => {
    if (!showGitStatus()) {
      if (state.git !== null || state.gitError !== undefined || state.directoryStatus.size !== 0) {
        commit({ git: null, gitError: undefined, directoryStatus: new Map() })
      }
      return Promise.resolve()
    }
    return once('git', async () => {
      const epoch = gitEpoch + 1
      gitEpoch = epoch
      const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}`)
      if (epoch !== gitEpoch) return
      if (!result.ok) { commit({ gitError: result.message }); return }
      // The per-directory map is a refinement of this snapshot; leaving it in place kept letters
      // after the footer had already returned to zero.
      commit({ git: result.git ?? null, gitError: result.gitError, directoryStatus: new Map() })
      for (const path of state.expanded) void loadDirectoryStatus(sessionId, path)
    })
  }

  /** Re-count the workspace; a large tree takes seconds, so this is separate and cancellable. */
  const refreshStats = sessionId => once('stats', async () => {
    commit({ statsState: 'loading' })
    const result = await request(`/status?sessionId=${encodeURIComponent(sessionId)}&only=stats`)
    if (!result.ok) { commit({ statsState: 'failed' }); return }
    commit({ stats: result.stats ?? null, statsState: 'ok' })
  })

  /** Debounced re-count after directory changes. */
  const queueStats = sessionId => {
    clearTimeout(statsTimer)
    statsTimer = setTimeout(() => { void refreshStats(sessionId) }, STATS_DEBOUNCE_MS)
  }

  /** Expand or collapse a directory, reading it the first time it opens. */
  const toggle = (sessionId, path, open) => {
    const key = treeKeyOf(root, path)
    const next = new Set(state.expanded)
    if (open) next.add(key)
    else next.delete(key)
    if (next.size !== state.expanded.size || ![...next].every(k => state.expanded.has(k))) commit({ expanded: next })
    if (open && state.levels.get(key) === undefined) void loadLevel(sessionId, path)
  }

  /** Reload the root and every expanded directory in place. */
  const refresh = sessionId => {
    const paths = [...state.expanded]
    void loadLevel(sessionId, root, true)
    for (const path of paths) void loadLevel(sessionId, path, true)
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
