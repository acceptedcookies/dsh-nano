/** The six HTTP routes: one request gate, one JSON envelope, and the session-scoped work behind them. */

import { watch } from 'node:fs'
import { ensurePerfReviewHost, LIB_VERSION } from 'dsh-performance-review/host'
import { registerRoutes as registerGuardedRoutes } from 'dsh-host-route-guard'
import { ROUTE_TABLE, PLUGIN } from './route-table.js'
import { checkoutBranch, commitAll, ignoredAmong, listBranches, listConflicts, listWorktrees, pullUpstream, pushUpstream, readStatus, writeRemote, writeAuthor, writeSshKey } from './git.js'
import { absoluteOf, isLexicallyInside, listDirectory } from './listing.js'
import { createFile, createFolder, moveEntry, removeEntry, rename } from './mutate.js'
import { statisticsOf } from './stats.js'

/** Route prefix owned by this plugin. */
export const PREFIX = '/nano-explorer-extra'

/** Request bodies are small JSON objects; anything larger is hostile. */
const MAX_BODY_BYTES = 64 * 1024

/**
 * Read a bounded JSON body.
 * @param req - inbound request.
 * @returns the parsed object, or an empty object when the body is absent.
 * @throws when the body exceeds the cap or is not a JSON object.
 */
async function jsonBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_BODY_BYTES) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  if (total === 0) return {}
  const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8'))
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('request body must be a JSON object')
  return parsed
}

/**
 * Write one JSON response with the same no-store policy the other Host routes use.
 * @param res - outbound response.
 * @param status - HTTP status.
 * @param payload - JSON-serializable body.
 */
function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

/** @param {unknown} error */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Resolve one session's workspace root and sandbox policy.
 * @param ctx - host context.
 * @param sessionId - Session identity from the request.
 * @returns the live Session, its root, and its policy.
 * @throws when the Session is unknown or has no working directory.
 */
async function scopeOf(ctx, sessionId) {
  if (typeof sessionId !== 'string' || sessionId === '') throw new Error('sessionId is required')
  const live = ctx.get('sessions')?.get(sessionId)
  // `sessionPersistence` is declared in `inject`, so this service is guaranteed
  // present by activation time — the persisted-header fallback now actually
  // resolves cold sessions instead of reading `undefined` (review-01 R5).
  const header = live?.header ?? (await ctx.get('sessionPersistence')?.stat(sessionId))?.header
  if (header === undefined || header === null) throw new Error(`unknown session "${sessionId}"`)
  const root = header.cwd ?? ctx.get('sandboxPolicy')?.workspaceRoot
  // A cold Session has no live header to resolve from, so the policy is rebuilt around the root the
  // stored header names; without it `resolve({})` would fall back to the launch directory and every
  // write would be fenced away from the workspace the user is actually browsing.
  const livePolicy = live === undefined ? undefined : ctx.get('sandboxPolicy')?.resolve({ session: live })
  const policy = livePolicy ?? (root === undefined ? undefined : { ...ctx.get('sandboxPolicy')?.resolve({}), workspaceRoot: root })
  if (typeof root !== 'string' || root === '') throw new Error('this session has no working directory')
  // P4-03: observability only — the explorer intentionally lets a page adopt
  // any session's workspace, but adopting a root that is not the host's own
  // workspace is a cross-session signal worth an audit line (never blocked).
  const ownRoot = ctx.get('sandboxPolicy')?.workspaceRoot
  if (typeof ownRoot === 'string' && ownRoot !== '' && root !== ownRoot) {
    console.warn(`[nxe] scopeOf cross-session: session "${sessionId}" adopted workspace "${root}" (own "${ownRoot}")`)
  } else if (ownRoot === undefined) {
    /* W5: no host own-root to compare against — adoption is invisible without
     * an audit line. Info (not warn): we can't call it cross-session, but a
     * session's workspace should never be adopted in silence. */
    console.info(`[nxe] scopeOf: session "${sessionId}" adopted workspace "${root}" (no host own-root baseline)`)
  }
  return { session: live, root, policy }
}

/**
 * Run one external command under the session's confinement, never through a shell.
 * @param ctx - host context.
 * @param config - executable and process limits.
 * @param request - argv, working directory, and the session it runs for.
 * @returns nothing; throws with the first stderr line on a non-zero exit.
 */
export async function runExternal(ctx, config, request) {
  const { argv, cwd, session, sandboxPolicy: policy } = request
  // A relative or empty directory makes the spawn fail with an opaque ENOTDIR; refuse it with a
  // message that names the operation instead.
  if (typeof cwd !== 'string' || cwd === '' || !cwd.startsWith('/')) throw new Error(`${argv[0]} needs an absolute working directory, got ${JSON.stringify(cwd)}`)
  const subprocess = ctx.get('subprocess')
  const sandbox = ctx.get('sandbox')
  if (subprocess === undefined || subprocess === null) throw new Error('this deployment has no subprocess service')
  const stop = new AbortController()
  const timer = setTimeout(() => stop.abort(new Error('command timed out')), config.gitTimeoutMs)
  timer.unref?.()
  try {
    const program = await subprocess.resolveExecutable(argv[0], undefined, stop.signal)
    const command = [program, ...argv.slice(1)]
    const confined = sandbox !== undefined && sandbox !== null && policy !== undefined && policy.mode !== 'danger-full-access'
      ? (await sandbox.confine(command, policy, stop.signal)).argv
      : command
    const child = subprocess.spawn({
      argv: confined,
      cwd,
      signal: stop.signal,
      graceMs: 5000,
      stdio: { stdin: 'ignore', stdout: { maxBytes: 65536 }, stderr: { maxBytes: 65536 } },
    })
    try {
      const outcome = await child.done
      const stderr = child.collected.stderr.readFrom(0).text
      if (outcome.exitCode !== 0) {
        const line = stderr.split(/\r?\n/u).map(item => item.trim()).find(item => item.length > 0)
        throw new Error(line ?? `${argv[0]} failed (${outcome.signal ?? outcome.exitCode})`)
      }
    } finally {
      child.terminate()
      await child.waitForExit().catch(() => {})
    }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Build the six route handlers bound to one context and configuration.
 * @param ctx - host context.
 * @param config - validated plugin configuration.
 * @returns path → { method, run } for registration.
 */

/**
 * Short-lived memo for reads that spawn a process.
 *
 * Every expanded folder asked Git for its own status, and a menu that opens asks again. Each miss
 * spawns `git`; that contention is what pushes an unrelated provider past its one-second deadline.
 * One entry per key for a few seconds keeps the process count proportional to real changes.
 */
const memo = new Map()
const MEMO_MS = 3000
/**
 * Statistics live in their own long-lived cache rather than the Git memo: a full
 * walk on a large checkout takes tens of seconds, so asking per-request is out.
 * The last completed walk is served for up to half an hour; after that the next
 * request still gets the stale value instantly while one background refresh
 * refills the cache. Only a request ever starts the background pass — nothing
 * walks the tree on a timer.
 */
const STATS_FRESH_MS = 30 * 60 * 1000
/** At most one refresh start per minute, even when watchers keep invalidating. */
const STATS_REFRESH_MIN_MS = 60 * 1000
/** root → { value, at } for the last finished walk. The value is served forever; `at` only decides freshness. */
const statsCache = new Map()
/** root → the in-flight background walk's promise; cleared when it settles. */
const statsRefresh = new Map()
/** root → when the last background pass started; enforces the minimum interval between walks. */
const statsLastStart = new Map()

/**
 * Answer from the memo, or run the reader and remember its answer briefly.
 * @param key - cache identity for the read.
 * @param read - performs the read when the memo misses.
 * @param ttl - how long the answer stays valid; defaults to the Git pacing.
 * @returns a promise for the memoized value.
 */
function memoized(key, read, ttl = MEMO_MS) {
  const hit = memo.get(key)
  const now = Date.now()
  if (hit !== undefined && now - hit.at < ttl) return hit.value
  // The in-flight promise itself is what is stored: two requests that miss together share the one
  // Git run instead of each spawning a second copy of a command a large checkout is still running.
  // A rejection is evicted immediately so the next request retries rather than replaying the error.
  const value = Promise.resolve().then(read)
  memo.set(key, { at: now, value })
  value.catch(() => { memo.delete(key) })
  if (memo.size > 64) {
    for (const [entryKey, entry] of memo) if (now - entry.at >= MEMO_MS) memo.delete(entryKey)
  }
  return value
}

/** Drop cached reads for one checkout. A switch or a commit would otherwise be painted with the branch it just left. */
function forgetReads(root) {
  for (const key of memo.keys()) {
    if (key.startsWith(`status:${root}:`) || key.startsWith(`ignored:${root}:`)) memo.delete(key)
  }
  // The stats snapshot survives: serving last-known totals is always better than blocking the
  // status bar for tens of seconds. Age is what controls the next background refresh.
}

/** One fs.watch per watched path, keyed by the workspace root it invalidates. */
const watchers = new Map()
/** Debounce clocks per root: a burst of events collapses into one invalidation. */
const watchTimers = new Map()

/**
 * Observe one checkout and drop its memoized reads when the tree or its Git metadata moves.
 *
 * A recursive watch covers the working tree and `.git` together where the platform supports it;
 * where it does not (Linux without a recursive engine), the Git directory alone still catches
 * commits, checkouts, and index writes, and the working tree falls back to the poll pacing.
 * Events are only names — nothing reads file contents, so the watch does not widen the sandbox.
 * @param root - workspace root that already passed the sandbox scope check.
 */
function watchRoot(root) {
  if (watchers.has(root)) return
  const entries = []
  const invalidate = () => {
    clearTimeout(watchTimers.get(root))
    watchTimers.set(root, setTimeout(() => { watchTimers.delete(root); forgetReads(root) }, 1000))
  }
  try {
    entries.push(watch(root, { recursive: true }, invalidate))
  } catch {
    try {
      entries.push(watch(`${root}/.git`, invalidate))
    } catch { /* no .git yet: the next status read retries */ }
  }
  watchers.set(root, entries)
}

/**
 * Answer a stats request instantly and keep the background sampler at most one deep pass per root.
 *
 * The cache value never expires in the sense of being withheld: a stale answer is returned
 * together with `statsPending: true` so the status bar keeps last-known numbers instead of a
 * loading row, and `statsAgeMs` lets the client show how old the answer is. A background pass
 * starts when the cached answer is older than `STATS_FRESH_MS` — or there is none at all — and
 * at most once per `STATS_REFRESH_MIN_MS`, so a busy tree never queues walks back to back.
 *
 * @param ctx - host context providing `fs`.
 * @param config - validated plugin configuration.
 * @param review - perf-review host handle; the background pass is what the `stats` span records.
 * @param root - workspace root.
 * @returns `{ root, stats, statsPending }` — stats is the last finished walk or null.
 */
function scheduleStatsRefresh(ctx, config, review, root) {
  const cached = statsCache.get(root)
  const stale = cached === undefined || Date.now() - cached.at >= STATS_FRESH_MS
  const lastStart = statsLastStart.get(root) ?? 0
  const mayStart = stale && statsRefresh.get(root) === undefined && Date.now() - lastStart >= STATS_REFRESH_MIN_MS
  if (mayStart) startStatsPass(ctx, config, review, root)
  // `statsPending` reports the sampler's state, not staleness alone: the row means "a newer number
  // is being counted", and once a walk is running it stays true until that walk stores its result.
  const pending = stale && statsRefresh.get(root) !== undefined
  return {
    root,
    stats: cached?.value ?? null,
    statsPending: pending || (stale && cached === undefined),
    statsAgeMs: cached === undefined ? 0 : Math.max(0, Date.now() - cached.at),
  }
}

/**
 * Launch the one deep pass for a root and remember its start so the next request does not stack
 * a second walk on top of it. The span around the walk is what perf-review reports; failures are
 * swallowed — the next request simply retries, keeping a walk crash out of the status route.
 */
function startStatsPass(ctx, config, review, root) {
  statsLastStart.set(root, Date.now())
  statsRefresh.set(root, Promise.resolve()
    .then(() => review.hostSpan('stats', () => statisticsOf(ctx.fs, root, {
      maxDepth: config.statsMaxDepth,
      maxEntries: config.statsMaxEntries,
      excludeGit: config.statsExcludeGit,
    })))
    .then(value => {
      statsCache.set(root, { value, at: Date.now() })
    })
    .catch(() => {})
    .finally(() => { statsRefresh.delete(root) }))
}

/** Close every watcher the plugin opened; called with the routes' lifetime. */
export function disposeRootWatchers() {
  for (const entries of watchers.values()) for (const entry of entries) try { entry.close() } catch { /* already gone */ }
  watchers.clear()
  for (const timer of watchTimers.values()) clearTimeout(timer)
  watchTimers.clear()
}

export function createRoutes(ctx, config) {
  const fs = () => ctx.fs
  const external = request => runExternal(ctx, config, request)
  // perf-review: hostSpan names stay inside the spec's v1 set — git-status / list / stats.
  // The disabled path is an identity wrapper, so the spans cost nothing by default.
  const review = ensurePerfReviewHost().hostJoin('nano-explorer-extra', {
    version: typeof __NXE_VERSION__ === 'string' ? __NXE_VERSION__ : undefined,
    // This host bundle's own copy of the library version (A3 / §10.4.4).
    libVersion: LIB_VERSION,
  })

  return {
    '/status': {
      method: 'GET',
      async run(req) {
        const url = new URL(String(req.url), 'http://localhost')
        const { root, policy } = await scopeOf(ctx, url.searchParams.get('sessionId') ?? '')
        // The scope check already accepted this root, so watching it stays inside the sandbox; the
        // first status read arms the observer that keeps the memo honest between polls.
        watchRoot(root)
        // Git state and workspace totals are asked for separately: a tree with tens of thousands
        // of files spends seconds walking directories, and the branch line must not wait for it.
        if (url.searchParams.get('only') === 'stats') {
          // Never block on the walk: answer from the cache (or `statsPending` on a cold start)
          // and let the background sampler do the counting at its own pace.
          const stats = scheduleStatsRefresh(ctx, config, review, root)
          return stats
        }
        let git = null
        let gitError
        try {
          // `path` scopes the query to one directory and asks Git for per-file untracked entries,
          // which is what a freshly expanded folder needs.
          const scopedPath = url.searchParams.get('path') ?? undefined
          git = await review.hostSpan('git-status', () =>
            memoized(`status:${root}:${scopedPath ?? ''}`, () =>
              readStatus(ctx, config, { cwd: root, policy, signal: undefined, path: scopedPath ?? undefined }))) ?? null
        } catch (error) {
          gitError = messageOf(error)
        }
        return { root, git, ...(gitError === undefined ? {} : { gitError }) }
      },
    },
    '/commit': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { session, root, policy } = await scopeOf(ctx, body.sessionId)
        const message = typeof body.message === 'string' ? body.message.trim() : ''
        if (message === '') throw new Error('a commit message is required')
        const subject = await commitAll(ctx, config, { cwd: root, policy, message, signal: undefined })
        forgetReads(root)
        return { subject }
      },
    },
    '/pull': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy, session } = await scopeOf(ctx, body.sessionId)
        const summary = await pullUpstream(ctx, config, {
          cwd: root, policy, session, signal: undefined,
        })
        forgetReads(root)
        return { summary }
      },
    },
    '/push': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy, session } = await scopeOf(ctx, body.sessionId)
        const summary = await pushUpstream(ctx, config, {
          cwd: root, policy, session, signal: undefined,
          // `remote` is only named when the branch has no upstream yet — `git push` alone never
          // accepts a remote operand in this route.
          remote: body.remote,
        })
        forgetReads(root)
        return { summary }
      },
    },
    '/remote': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy, session } = await scopeOf(ctx, body.sessionId)
        const remotes = await writeRemote(ctx, config, {
          cwd: root, policy, session, signal: undefined,
          op: body.op, name: body.name, url: body.url,
        })
        forgetReads(root)
        return { remotes }
      },
    },
    '/author': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy, session } = await scopeOf(ctx, body.sessionId)
        const author = await writeAuthor(ctx, config, {
          cwd: root, policy, session, signal: undefined,
          name: body.name, email: body.email,
        })
        forgetReads(root)
        return { author }
      },
    },
    '/ssh-key': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy, session } = await scopeOf(ctx, body.sessionId)
        // `keyPath` writes `core.sshCommand`; an empty path clears it back to the default.
        const sshKey = await writeSshKey(ctx, config, {
          cwd: root, policy, session, signal: undefined,
          keyPath: body.keyPath,
        })
        forgetReads(root)
        return { sshKey }
      },
    },
    '/checkout': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy, session } = await scopeOf(ctx, body.sessionId)
        const switched = await checkoutBranch(ctx, config, {
          cwd: root, policy, session, branch: body.branch, signal: undefined,
        })
        forgetReads(root)
        return switched
      },
    },
    '/create-file': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy } = await scopeOf(ctx, body.sessionId)
        return createFile(fs(), {
          workspaceRoot: root,
          directory: typeof body.directory === 'string' ? body.directory : '',
          name: body.name,
          sandboxPolicy: policy,
        })
      },
    },
    '/create-folder': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { session, root, policy } = await scopeOf(ctx, body.sessionId)
        return createFolder(fs(), {
          workspaceRoot: root,
          directory: typeof body.directory === 'string' ? body.directory : '',
          name: body.name,
          sandboxPolicy: policy,
          session,
        }, external)
      },
    },
    '/rename': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { session, root, policy } = await scopeOf(ctx, body.sessionId)
        return rename(fs(), ctx, config, {
          workspaceRoot: root,
          path: body.path,
          name: body.name,
          kind: body.kind === 'directory' ? 'directory' : 'file',
          sandboxPolicy: policy,
          session,
          runExternal: external,
        })
      },
    },
    '/move': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { session, root, policy } = await scopeOf(ctx, body.sessionId)
        const moved = await moveEntry(fs(), ctx, config, {
          workspaceRoot: root,
          path: body.path,
          directory: body.directory,
          sandboxPolicy: policy,
          session,
          runExternal: external,
        })
        // A move rewrites Git's view of the tree the same way a rename does.
        forgetReads(root)
        return moved
      },
    },
    '/delete': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { session, root, policy } = await scopeOf(ctx, body.sessionId)
        return removeEntry(fs(), {
          workspaceRoot: root,
          path: body.path,
          kind: body.kind === 'directory' ? 'directory' : 'file',
          sandboxPolicy: policy,
          session,
          runExternal: external,
        }, undefined)
      },
    },
    '/ignored': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy } = await scopeOf(ctx, body.sessionId)
        const paths = Array.isArray(body.paths) ? body.paths.filter(item => typeof item === 'string') : []
        const ignored = await memoized(`ignored:${root}:${paths.join('|')}`, () =>
          ignoredAmong(ctx, config, { cwd: root, policy, paths, signal: undefined }))
        return { ignored }
      },
    },
    '/list': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root } = await scopeOf(ctx, body.sessionId)
        return review.hostSpan('list', () => listDirectory(fs(), {
          workspaceRoot: root,
          path: typeof body.path === 'string' ? body.path : '',
          allowOutsideWorkspace: body.allowOutsideWorkspace === true,
        }, { maxEntries: config.listingMaxEntries }))
      },
    },
    /* A1: the browser cannot read host.json from disk. This route is the
       bridge. `mode=window` drains the per-scenario window (lab calls it at
       scenario start and end); the default returns a non-destructive
       cumulative snapshot for the page's low-frequency poll. */
    '/perf-review/host': {
      method: 'GET',
      async run(req) {
        const url = new URL(String(req.url), 'http://localhost')
        return url.searchParams.get('mode') === 'window'
          ? review.takeWindow()
          : review.snapshot()
      },
    },
    /* Read one file as UTF-8, capped — enough to seed a notepad note.
       Same lexical + resolved boundary checks the lister uses, so a symlink
       out of the workspace cannot be smuggled through an allow flag. */
    '/read': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root } = await scopeOf(ctx, body.sessionId)
        const path = typeof body.path === 'string' ? body.path : ''
        const requested = absoluteOf(root, path)
        if (!isLexicallyInside(root, requested) && body.allowOutsideWorkspace !== true) {
          throw new Error(`"${path}" is outside the workspace`)
        }
        // `resolve` answers a target object `{targetKey, displayPath}`; `stat`/`readByteRange`
        // read `targetKey`/`displayPath` off it, so the object itself goes through — passing the
        // processPath string instead made `stat(undefined)` throw "path must be string/Buffer/URL".
        const target = await fs().resolve(requested)
        const resolved = fs().processPath(target)
        if (!isLexicallyInside(root, resolved) && body.allowOutsideWorkspace !== true) {
          throw new Error(`"${path}" resolves outside the workspace`)
        }
        const info = await fs().stat(target)
        if (info === undefined || info === null) throw new Error(`"${path}" does not exist`)
        if (info.type !== 'file') throw new Error(`"${path}" is not a file`)
        const limit = 1 * 1024 * 1024
        if (info.size > limit) throw new Error(`"${path}" is larger than ${limit} bytes`)
        const bytes = await fs().readByteRange(target, { offset: 0, length: limit })
        try { new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
        catch { throw new Error(`"${path}" is not UTF-8 text`) }
        return { ok: true, content: new TextDecoder('utf-8').decode(bytes) }
      },
    },
  }
}

/**
 * Register every route on the web server through dsh-host-route-guard
 * (P1-05 / T-O-7): the guard owns requestRejection (Host/Origin fence +
 * authenticated Peer) and the uniform 405; handlers keep `route.run` and the
 * 200/400 response shapes.
 * @param ctx - host context providing `webServer` and `connection`.
 * @param routes - the handlers built by {@link createRoutes}.
 * @returns one disposer per registered route.
 */
export function registerRoutes(ctx, routes) {
  const specs = Object.entries(routes).map(([suffix, route]) => ({
    path: `${PREFIX}${suffix}`,
    methods: [route.method],
    handler: async (req, res) => {
      try {
        sendJson(res, 200, await route.run(req))
      } catch (error) {
        sendJson(res, 400, { error: messageOf(error) })
      }
    },
  }))
  return registerGuardedRoutes(ctx, specs, { table: ROUTE_TABLE, plugin: PLUGIN })
}
