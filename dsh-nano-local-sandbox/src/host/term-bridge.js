/**
 * Managed terminal owner (P4): one guest-resident worker per original
 * execution, control only through the baked pty-entry CLI over the private
 * 0600 Unix socket. The durable reservation lives in the registry row
 * BEFORE any spawn; `(principal, openId)` dedupes forever — a replayed open
 * gets its original ref back, never a new worker.
 *
 * Wired as `execute` on createManagedRoutes. The v1 URL/token bridge is
 * gone: create returns exactly {sandboxId, terminalId}, list returns states,
 * attach returns an opaque locator issued only after a live status proof.
 *
 * `observe(row)` is the normalized trusted observation; every privileged
 * rpc runs only after a live observed(row) proof (running + exact
 * locator/generation/stateVolume) and a fresh authorize() recheck.
 * `resolveCwd(row, {cwd, service})` is the trusted driver — it validates a
 * guest path and an optional startup context; host paths are never cwd.
 * `terminalRpc(locator, 'create'|'rpc', request)` is the backend seam; the
 * request JSON crosses on stdin, never argv. `issueLocator(ref, row)` mints
 * the attach handle; when absent attach is unavailable, no fallback.
 */
import { createHash } from 'node:crypto'
import { authorize } from './object-authz.js'
import { TERM_TOOLS } from './terminal-driver.js'

const boundedText = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max && !value.includes('\0')
const paramsError = (what) => Object.assign(new Error(`${what} is required`), { errorId: `sandbox.params.${what}` })
const fail = (status, error) => Object.assign(new Error(error), { status })

/** Fingerprint of the approved open params — stable across transports. */
function openFingerprint({ paneId, cols, rows, cwd, service }) {
  const canonical = { paneId, cols, rows, cwd, service }
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 32)
}

/** verified() for terminals: running, exact locator+generation+volume. */
function live(row, obs) {
  return Boolean(
    obs &&
    obs.state === 'running' &&
    obs.locator === row.binding.locator &&
    obs.generation &&
    obs.generation === row.binding.generation &&
    obs.stateVolume === row.stateVolume,
  )
}

export function createTerminalOwner({ registry, envId, observe, resolvePrincipal, resolveCwd, terminalRpc, issueLocator } = {}) {
  if (typeof observe !== 'function' || typeof resolvePrincipal !== 'function' || typeof terminalRpc !== 'function') {
    throw new Error('createTerminalOwner requires observe, resolvePrincipal and terminalRpc')
  }

  const capabilities = new Map(TERM_TOOLS.map((tool) => [
    tool.name,
    { tool: { name: tool.name, description: tool.description, inputSchema: tool.inputSchema }, target: 'object' },
  ]))

  /**
   * A registry row whose binding still matches the snapshot the caller was
   * authorized against — anything else invalidates the ref it carried.
   */
  function freshRow(sandboxId, snapshot) {
    const row = registry.get(sandboxId)
    if (!row || row.binding.locator !== snapshot.binding.locator ||
        row.binding.generation !== snapshot.binding.generation ||
        row.stateVolume !== snapshot.stateVolume) return null
    return row
  }

  /**
   * Authorize + live-observe in the required order: static authorize,
   * awaited observe, fresh-row + authorize recheck immediately before any
   * rpc. The terminal ref — when the action owns one — must name this row,
   * this principal and the CURRENT bound generation.
   */
  async function guarded(peer, action, row, terminalId) {
    const ref = terminalId ? row.terminals.find((entry) => entry.terminalId === terminalId) ?? null : null
    if (terminalId && !ref) throw fail(404, 'not found')
    const authTerminal = ref && { sandboxId: row.sandboxId, principalKey: ref.principal, generation: ref.generation }
    const first = authorize({ peer, envId, row, action, terminal: authTerminal, resolvePrincipal })
    if (first.status) throw fail(first.status, first.error)
    const obs = await observe(row)
    if (!live(row, obs)) throw fail(503, 'unavailable')
    // The world moved while we observed: re-read the ledger and refuse if
    // the binding or the ref changed underneath the awaited call.
    const fresh = freshRow(row.sandboxId, row)
    if (!fresh || (ref && fresh.terminals.find((entry) => entry.terminalId === ref.terminalId)?.generation !== ref.generation)) {
      throw fail(503, 'unavailable')
    }
    const recheck = authorize({ peer, envId, row: fresh, action, terminal: authTerminal, resolvePrincipal })
    if (recheck.status || recheck.principal?.key !== first.principal.key) throw fail(403, 'denied')
    return { principal: first.principal, ref }
  }

  /** Report a terminal state change; never changes the stored generation. */
  function mark(sandboxId, ref, state) {
    registry.transitionTerminal(sandboxId, ref.terminalId, { state, generation: ref.generation })
  }

  const rpc = (row, request) => terminalRpc(row.binding.locator, 'rpc', request)

  async function create({ peer, row, args }) {
    for (const key of ['openId', 'paneId']) {
      if (!boundedText(args?.[key], 128)) throw paramsError(key)
    }
    if (args?.sessionId !== undefined) throw paramsError('sessionId')
    for (const key of ['cols', 'rows']) {
      if (args?.[key] !== undefined && (!Number.isInteger(args[key]) || args[key] < 2 || args[key] > 512)) throw paramsError(key)
    }
    if (args?.cwd !== undefined && !boundedText(args.cwd, 1024)) throw paramsError('cwd')
    if (args?.service !== undefined && !boundedText(args.service, 128)) throw paramsError('service')

    const { principal } = await guarded(peer, 'terminal.create', row)
    const cols = args.cols ?? 80
    const rows = args.rows ?? 24
    // Trusted driver resolves/validates the guest cwd; host paths are never cwd.
    const cwd = resolveCwd ? await resolveCwd(row, { cwd: args.cwd, service: args.service }) : '/'
    if (typeof cwd !== 'string' || !cwd.startsWith('/')) throw fail(400, 'cwd rejected')
    // resolveCwd awaited: the binding may have moved — recheck before spawn.
    if (!freshRow(row.sandboxId, row)) throw fail(503, 'unavailable')
    const fingerprint = openFingerprint({ paneId: args.paneId, cols, rows, cwd, service: args.service ?? null })
    const { isNew, ref } = registry.reserveTerminal(row.sandboxId, {
      principal: principal.key,
      openId: args.openId,
      fingerprint,
      generation: row.binding.generation,
    })
    // Same key + same args returns the original stable ref — even if that
    // terminal has since ended. Never respawn on a duplicate request.
    if (!isNew) return { sandboxId: row.sandboxId, terminalId: ref.terminalId }
    let reply
    try {
      reply = await terminalRpc(row.binding.locator, 'create', { terminalId: ref.terminalId, cols, rows, cwd })
    } catch {
      // Lost create response stays pending/unknown; it is never re-sent.
      mark(row.sandboxId, ref, 'unknown')
      throw fail(503, 'unavailable')
    }
    // A malformed or refused reply is a lost create: pending evidence only.
    if (reply?.ok !== true || reply.terminalId !== ref.terminalId) {
      mark(row.sandboxId, ref, 'unknown')
      throw fail(503, 'unavailable')
    }
    mark(row.sandboxId, ref, 'active')
    return { sandboxId: row.sandboxId, terminalId: ref.terminalId }
  }

  async function list({ peer, row }) {
    const { principal } = await guarded(peer, 'terminal.list', row)
    return {
      sandboxId: row.sandboxId,
      terminals: row.terminals
        .filter((entry) => entry.principal === principal.key)
        .map((entry) => ({ terminalId: entry.terminalId, state: entry.state })),
    }
  }

  async function attach({ peer, row, args, req }) {
    const { ref } = await guarded(peer, 'terminal.attach', row, args.terminalId)
    let status
    try {
      status = await rpc(row, { terminalId: ref.terminalId, verb: 'status' })
    } catch {
      mark(row.sandboxId, ref, 'unknown')
      throw fail(503, 'unavailable')
    }
    if (status?.state !== 'active') {
      mark(row.sandboxId, ref, status?.state === 'ended' ? 'ended' : 'unknown')
      throw fail(status?.state === 'ended' ? 404 : 503, 'unavailable')
    }
    if (typeof issueLocator !== 'function') throw fail(503, 'unavailable')
    // The status proof awaited: the ledger may have moved — recheck the ref
    // before minting an attach handle on it.
    const fresh = freshRow(row.sandboxId, row)
    if (!fresh || fresh.terminals.find((entry) => entry.terminalId === ref.terminalId)?.generation !== ref.generation) {
      throw fail(503, 'unavailable')
    }
    const url = await issueLocator(ref, fresh, { req, peer })
    // Only an opaque ws attach URL is a valid issue: no socket paths, no
    // embedded credentials or tokens returned by a faulty issuer.
    let parsed
    try { parsed = new URL(String(url)) } catch { parsed = null }
    if (!parsed || (parsed.protocol !== 'ws:' && parsed.protocol !== 'wss:') || parsed.username || parsed.password || /token=/i.test(parsed.search)) {
      throw fail(503, 'unavailable')
    }
    return Object.freeze({ sandboxId: row.sandboxId, terminalId: ref.terminalId, attach: { protocol: 'dnt-ws-v2', url: String(url) } })
  }

  async function control({ peer, row, args, verb, request }) {
    const { ref } = await guarded(peer, `terminal.${verb}`, row, args.terminalId)
    try {
      const reply = await rpc(row, { terminalId: ref.terminalId, verb, ...request })
      // The wire is binary-safe; the tool surface decodes to visible UTF-8.
      if (verb === 'read' && typeof reply?.bytes_b64 === 'string') {
        return { seq: reply.seq, from: reply.from, bytes: Buffer.from(reply.bytes_b64, 'base64').toString('utf8'), ended: reply.ended }
      }
      return reply
    } catch {
      mark(row.sandboxId, ref, 'unknown')
      throw fail(503, 'unavailable')
    }
  }

  async function execute({ capability, sandboxId, peer, req, args }) {
    const row = registry.get(sandboxId)
    if (capability === 'term.session.create') {
      if (!row) throw fail(404, 'not found')
      return create({ peer, row, args })
    }
    if (capability === 'term.session.list') {
      if (!row) throw fail(404, 'not found')
      return list({ peer, row })
    }
    if (!boundedText(args?.terminalId, 64)) throw paramsError('terminalId')
    if (!row) throw fail(404, 'not found')
    if (capability === 'term.session.attach') return attach({ peer, row, args, req })
    if (capability === 'term.session.input') {
      if (!boundedText(args?.data, 65536)) throw paramsError('data')
      return control({ peer, row, args, verb: 'input', request: { data: args.data } })
    }
    if (capability === 'term.session.read') {
      if (args.from !== undefined && (!Number.isInteger(args.from) || args.from < 0)) throw paramsError('from')
      return control({ peer, row, args, verb: 'read', request: { from: args.from } })
    }
    if (capability === 'term.session.resize') {
      for (const key of ['cols', 'rows']) {
        if (!Number.isInteger(args?.[key]) || args[key] < 2 || args[key] > 512) throw paramsError(key)
      }
      return control({ peer, row, args, verb: 'resize', request: { cols: args.cols, rows: args.rows } })
    }
    if (capability === 'term.session.close') {
      const reply = await control({ peer, row, args, verb: 'close', request: {} })
      // ended is recorded only on the worker's confirmed reap receipt.
      if (reply?.ended === true) {
        mark(row.sandboxId, row.terminals.find((entry) => entry.terminalId === args.terminalId), 'ended')
      }
      return reply
    }
    throw paramsError('capability')
  }

  return { capabilities, execute }
}
