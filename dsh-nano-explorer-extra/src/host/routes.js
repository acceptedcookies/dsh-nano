/** The six HTTP routes: one request gate, one JSON envelope, and the session-scoped work behind them. */

import { checkoutBranch, commitAll, ignoredAmong, listBranches, listConflicts, listWorktrees, pullUpstream, readStatus } from './git.js'
import { absoluteOf, isLexicallyInside, listDirectory } from './listing.js'
import { createFile, createFolder, removeEntry, rename } from './mutate.js'
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
 * Answer from the memo, or run the reader and remember its answer briefly.
 * @param key - cache identity for the read.
 * @param read - performs the read when the memo misses.
 * @returns the memoized value.
 */
async function memoized(key, read) {
  const hit = memo.get(key)
  const now = Date.now()
  if (hit !== undefined && now - hit.at < MEMO_MS) return hit.value
  const value = await read()
  memo.set(key, { at: Date.now(), value })
  if (memo.size > 64) {
    for (const [entryKey, entry] of memo) if (now - entry.at >= MEMO_MS) memo.delete(entryKey)
  }
  return value
}

export function createRoutes(ctx, config) {
  const fs = () => ctx.fs
  const external = request => runExternal(ctx, config, request)

  return {
    '/status': {
      method: 'GET',
      async run(req) {
        const url = new URL(String(req.url), 'http://localhost')
        const { root, policy } = await scopeOf(ctx, url.searchParams.get('sessionId') ?? '')
        // Git state and workspace totals are asked for separately: a tree with tens of thousands
        // of files spends seconds walking directories, and the branch line must not wait for it.
        if (url.searchParams.get('only') === 'stats') {
          const stats = await statisticsOf(fs(), root, {
            maxDepth: config.statsMaxDepth,
            maxEntries: config.statsMaxEntries,
            excludeGit: config.statsExcludeGit,
          })
          return { root, stats }
        }
        let git = null
        let gitError
        try {
          // `path` scopes the query to one directory and asks Git for per-file untracked entries,
          // which is what a freshly expanded folder needs.
          const scopedPath = url.searchParams.get('path') ?? undefined
          git = await memoized(`status:${root}:${scopedPath ?? ''}`, () =>
            readStatus(ctx, config, { cwd: root, policy, signal: undefined, path: scopedPath ?? undefined })) ?? null
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
        return { summary }
      },
    },
    '/checkout': {
      method: 'POST',
      async run(req) {
        const body = await jsonBody(req)
        const { root, policy, session } = await scopeOf(ctx, body.sessionId)
        return checkoutBranch(ctx, config, {
          cwd: root, policy, session, branch: body.branch, signal: undefined,
        })
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
        return listDirectory(fs(), {
          workspaceRoot: root,
          path: typeof body.path === 'string' ? body.path : '',
          allowOutsideWorkspace: body.allowOutsideWorkspace === true,
        }, { maxEntries: config.listingMaxEntries })
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
 * Register every route on the web server, gated by the connection's request admission.
 * @param ctx - host context providing `webServer` and `connection`.
 * @param routes - the handlers built by {@link createRoutes}.
 * @returns one disposer per registered route.
 */
export function registerRoutes(ctx, routes) {
  const connection = () => ctx.get('connection')
  const disposers = []
  for (const [suffix, route] of Object.entries(routes)) {
    disposers.push(ctx.webServer.register({
      kind: 'exact',
      path: `${PREFIX}${suffix}`,
      handler: async (req, res) => {
        const rejection = connection()?.requestRejection(req)
        if (rejection !== undefined) {
          res.statusCode = rejection
          res.end()
          return
        }
        if (req.method !== route.method) {
          res.setHeader('allow', route.method)
          sendJson(res, 405, { error: `method ${req.method} is not allowed` })
          return
        }
        try {
          sendJson(res, 200, await route.run(req))
        } catch (error) {
          sendJson(res, 400, { error: messageOf(error) })
        }
      },
    }))
  }
  return disposers
}
