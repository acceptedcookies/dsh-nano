/**
 * Managed dispatch owner for the dnls.control/1 object surface (T-O-38/41/50).
 *
 * Route order inside one handler: admission → contract version → single
 * object selector → execute. Discovery (`GET /contract`, `sandbox.contract`,
 * tools/list, JSON-RPC initialize/ping/notifications) is answered by the
 * router itself before any object resolution, grants nothing and never
 * touches an owner, registry, subject or backend.
 *
 * `capabilities` is the host-composed Map (or object) id →
 * `{http?:{path,methods},tool?:{name,description,inputSchema},target:'object'|'none',run?}`.
 * `execute({capability,sandboxId,peer,req,args})` is the single owner
 * callback; it is only ever invoked with admitted, versioned, single-target
 * input. Route specs come from the baked binding `table` — a capability
 * http path missing from the table is a build-time failure, never an
 * implicit route.
 *
 * Admission uses the pinned host envelope: `connection.admit(req)` resolves
 * to `{rejection: 401|403}` or `{peer: PeerScope}`. Anything else — thrown
 * error, unknown envelope, aborted/missing principal — fails closed.
 */

import { readFileSync } from 'node:fs'
import { CONTRACT_VERSION, discovery } from './control-contract.js'
import { createErrorCatalog } from './error-catalog.js'

const CONTRACT_PATH = '/nano-local-sandbox/contract'
const MCP_PATH = '/nano-local-sandbox/mcp'
const CONTRACT_TOOL = 'sandbox.contract'
const CONTRACT_HEADER = 'x-dnls-contract'
const CONTRACT_META = 'dnls/contract'
const SELECTOR_KEYS = ['sandboxId', 'sessionId', 'sandbox']
const SELECTOR_HEADERS = ['x-sandbox-id', 'x-dnls-sandbox', 'x-session-id']
const PACKAGE_VERSION = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version

// One object segment: printable-ish, no separators, escapes, controls or NUL.
const SAFE_SEGMENT = /^[^\x00-\x1f\x7f\s\\/?#&=%]{1,64}$/
const safeSegment = (value) => typeof value === 'string' && SAFE_SEGMENT.test(value) && value !== '.' && value !== '..'

const asMap = (value) => (value instanceof Map ? value : new Map(Object.entries(value ?? {})))
const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)

export function createManagedRoutes({ table, connection, capabilities, execute } = {}) {
  const catalog = createErrorCatalog()
  const byPath = new Map((table ?? []).map((row) => [row.path, row]))
  const caps = asMap(capabilities)
  if (typeof execute !== 'function') throw new Error('managed-routes: execute owner callback is required')
  const capabilityIds = [...caps.keys()]

  const catalogRow = (errorId) => catalog.errorCatalog().find((row) => new RegExp(row.match).test(errorId))

  /** Fixed business envelope: errorId + status + catalog cause/next + contractVersion. */
  function fail(errorId) {
    const row = catalogRow(errorId)
    const status = row?.status ?? catalog.statusOf(errorId)
    return { status, body: { ok: false, errorId, status, cause: row?.cause, next: row?.next, contractVersion: CONTRACT_VERSION } }
  }

  const paramsFail = (what) => fail(`sandbox.params.${what}`)
  const contractFail = () => fail('sandbox.contract_mismatch')

  /** Sanitized non-business answer: never carries thrown detail or ids. */
  const genericFail = (status, error) => ({ status, body: { ok: false, error, contractVersion: CONTRACT_VERSION } })

  function exceptionFail(error) {
    const errorId = typeof error?.errorId === 'string' && catalogRow(error.errorId) ? error.errorId : null
    if (errorId) {
      const row = catalogRow(errorId)
      const status = Number.isInteger(error?.status) ? error.status : row.status
      const body = { ok: false, errorId, status, cause: row.cause, next: row.next, contractVersion: CONTRACT_VERSION }
      // An operation reference is audit data: only an authorized, catalog-known
      // business error may carry one through.
      if (typeof error?.operation === 'string' && error.operation.length <= 64) body.operation = error.operation
      return { status, body }
    }
    // A typed refusal keeps its status; only detail-free text crosses.
    const status = Number.isInteger(error?.status) ? error.status : null
    if (status === 400 || status === 401 || status === 403 || status === 404 || status === 409 || status === 413 || status === 503) {
      const text = { 400: 'bad request', 401: 'unauthenticated', 403: 'denied', 404: 'not found', 409: 'conflict', 413: 'too large', 503: 'unavailable' }[status]
      return genericFail(status, text)
    }
    return genericFail(502, 'internal error')
  }

  async function readBodyText(req, limit) {
    if (req?.body !== undefined && req.body !== null) {
      const text = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
      if (Buffer.byteLength(text) > limit) return { tooLarge: true }
      return { text, pre: isPlainObject(req.body) ? req.body : undefined }
    }
    if (req && typeof req[Symbol.asyncIterator] === 'function') {
      const chunks = []
      let size = 0
      for await (const chunk of req) {
        size += chunk.length
        if (size > limit) return { tooLarge: true } // stop before retaining the over-limit chunk
        chunks.push(Buffer.from(chunk))
      }
      return { text: Buffer.concat(chunks).toString('utf8') }
    }
    return { text: '' }
  }

  function parseObject(read, errorId) {
    if (read.pre !== undefined) {
      if (isPlainObject(read.pre)) return read.pre
      throw Object.assign(new Error('request body must be a JSON object'), { errorId })
    }
    if (!read.text || !read.text.trim()) return {}
    try {
      const parsed = JSON.parse(read.text)
      if (!isPlainObject(parsed)) throw new Error('not a JSON object')
      return parsed
    } catch {
      throw Object.assign(new Error('request body must be a JSON object'), { errorId })
    }
  }

  /**
   * Bounded single-pass key walker over already-valid JSON text: decodes each
   * object member key (JSON.parse on the quoted token, only when followed by
   * optional whitespace and a colon) and reports any member repeated within
   * the same object, at any depth. Runs on the raw boundary so escapes cannot
   * smuggle a second spelling of a selector.
   */
  function hasDuplicateMember(text) {
    const stack = []
    let i = 0
    while (i < text.length) {
      const c = text[i]
      if (c === '"') {
        const start = i
        i += 1
        while (i < text.length) {
          if (text[i] === '\\') i += 2
          else if (text[i] === '"') break
          else i += 1
        }
        const token = text.slice(start, i + 1)
        i += 1
        let j = i
        while (j < text.length && (text[j] === ' ' || text[j] === '\t' || text[j] === '\r' || text[j] === '\n')) j += 1
        if (text[j] === ':') {
          const top = stack[stack.length - 1]
          if (top && top.object) {
            let key
            try {
              key = JSON.parse(token)
            } catch {
              return true
            }
            if (top.keys.has(key)) return true
            top.keys.add(key)
          }
          i = j + 1
        }
        continue
      }
      if (c === '{') stack.push({ object: true, keys: new Set() })
      else if (c === '[') stack.push({ object: false })
      else if (c === '}' || c === ']') stack.pop()
      i += 1
    }
    return false
  }

  /* ---- admission (pinned envelope: {rejection} | {peer}) ---- */

  async function admitPeer(req) {
    if (typeof connection?.admit !== 'function') return { failure: genericFail(503, 'host admission unavailable') }
    let admission
    try {
      admission = await connection.admit(req)
    } catch {
      return { failure: genericFail(503, 'host admission unavailable') }
    }
    if (!isPlainObject(admission)) return { failure: genericFail(503, 'host admission unavailable') }
    if ('rejection' in admission) {
      const status = admission.rejection === 401 || admission.rejection === 403 ? admission.rejection : 403
      return { failure: genericFail(status, 'admission denied') }
    }
    if ('peer' in admission) {
      const peer = admission.peer
      if (!isPlainObject(peer) || peer.principal === undefined || peer.principal === null || peer.signal?.aborted === true) {
        return { failure: genericFail(403, 'admission denied') }
      }
      return { peer }
    }
    return { failure: genericFail(503, 'host admission unavailable') }
  }

  function headerValue(req, name) {
    const value = req?.headers?.[name]
    return typeof value === 'string' ? value : null
  }

  function alternateSelectors(req, query, body) {
    for (const name of SELECTOR_HEADERS) {
      if (req?.headers?.[name] !== undefined) return true
    }
    for (const key of SELECTOR_KEYS.slice(1)) {
      if (query.has(key)) return true
    }
    if (isPlainObject(body)) {
      for (const key of SELECTOR_KEYS) if (key in body) return true
    }
    return false
  }

  /** A capability may declare a function target — e.g. /lifecycle selects
   * `none` only for action:'create' — resolved on the normalized args. */
  const targetOf = (def, args) => (typeof def.target === 'function' ? def.target(args) : def.target)

  /** Resolve the one declared object target for `def`, or a params failure. */
  function selectHttpTarget(def, req, query, body) {
    const alternate = alternateSelectors(req, query, body)
    const target = targetOf(def, body)
    if (target === 'object') {
      const ids = query.getAll('sandboxId')
      if (ids.length !== 1 || !safeSegment(ids[0])) return { failure: paramsFail('sandboxId') }
      if (alternate) return { failure: paramsFail('sandboxId') }
      return { sandboxId: ids[0] }
    }
    if (query.has('sandboxId') || alternate) return { failure: paramsFail('sandboxId') }
    return { sandboxId: null }
  }

  function selectMcpTarget(def, req, args, urlQuery) {
    const target = targetOf(def, args)
    for (const name of SELECTOR_HEADERS) {
      if (req?.headers?.[name] !== undefined) return { failure: paramsFail('sandboxId') }
    }
    for (const key of SELECTOR_KEYS) {
      if (urlQuery.has(key)) return { failure: paramsFail('sandboxId') }
    }
    for (const key of SELECTOR_KEYS.slice(1)) {
      if (key in args) return { failure: paramsFail('sandboxId') }
    }
    if (target === 'object') {
      if (!Object.hasOwn(args, 'sandboxId') || !safeSegment(args.sandboxId)) return { failure: paramsFail('sandboxId') }
    } else if ('sandboxId' in args) {
      return { failure: paramsFail('sandboxId') }
    }
    const schema = def.tool?.inputSchema
    if (isPlainObject(schema)) {
      const allowed = new Set(Object.keys(isPlainObject(schema.properties) ? schema.properties : {}))
      if (target === 'object') allowed.add('sandboxId')
      if (allowed.size > 0) {
        for (const key of Object.keys(args)) {
          if (!allowed.has(key)) return { failure: paramsFail(key) }
        }
      }
      if (Array.isArray(schema.required)) {
        for (const key of schema.required) {
          if (!(key in args)) return { failure: paramsFail(key) }
        }
      }
    }
    return { sandboxId: target === 'object' ? args.sandboxId : null }
  }

  /** Only an object-shaped result is a positive answer; anything else fails. */
  function outcomeOf(result) {
    if (!isPlainObject(result)) return null
    if ('status' in result || 'body' in result) {
      if (!isPlainObject(result.body)) return null
      return { status: Number.isInteger(result.status) ? result.status : 200, payload: result.body }
    }
    return { status: 200, payload: result }
  }

  function shaped(payload, status, sandboxId) {
    const body = { ...payload, contractVersion: CONTRACT_VERSION }
    if (sandboxId && status < 400 && body.sandboxId === undefined) body.sandboxId = sandboxId
    return body
  }

  function respond(res, status, body, { head = false, contractHeader = false } = {}) {
    if (contractHeader) {
      try {
        res.setHeader?.(CONTRACT_HEADER, CONTRACT_VERSION)
      } catch (headerError) {
        void headerError
      }
    }
    res.statusCode = status
    res.end(head || body === undefined ? undefined : JSON.stringify(body))
    return { status, body }
  }

  /* ---- restricted dispatch: admit → version → target → execute ---- */

  async function restricted(capabilityId, def, req, args, { versionOk, select }) {
    const admitted = await admitPeer(req)
    if (admitted.failure) return admitted.failure
    if (!versionOk()) return contractFail()
    const selected = select()
    if (selected.failure) return selected.failure
    let result
    try {
      result = await execute({
        capability: capabilityId,
        sandboxId: selected.sandboxId,
        peer: admitted.peer,
        req,
        args,
      })
    } catch (error) {
      return exceptionFail(error)
    }
    const out = outcomeOf(result)
    if (out === null) return genericFail(502, 'internal error')
    // A success envelope naming another object must never cross objects.
    if (selected.sandboxId && out.payload.sandboxId !== undefined && out.payload.sandboxId !== selected.sandboxId) {
      return genericFail(502, 'internal error')
    }
    return { status: out.status, body: shaped(out.payload, out.status, selected.sandboxId) }
  }

  /* ---- HTTP capability route ---- */

  function httpHandler(capabilityId, def, row) {
    const declared = Array.isArray(def.http?.methods) ? def.http.methods : null
    return async function handler(req, res) {
      const head = req.method === 'HEAD'
      if (declared && !declared.includes(req.method)) {
        try {
          res.setHeader?.('allow', declared.join(', '))
        } catch (headerError) {
          void headerError
        }
        return respond(res, 405, { ok: false, error: 'method-not-allowed' }, { contractHeader: true })
      }
      const read = await readBodyText(req, row.bodyLimit)
      if (read.tooLarge) {
        const failure = fail('sandbox.body.toolarge')
        return respond(res, failure.status, failure.body, { head, contractHeader: true })
      }
      if (read.pre === undefined && read.text?.trim() && hasDuplicateMember(read.text)) {
        const failure = paramsFail('shape')
        return respond(res, failure.status, failure.body, { head, contractHeader: true })
      }
      let body
      try {
        body = parseObject(read, 'sandbox.body.json')
      } catch (error) {
        const failure = exceptionFail(error)
        return respond(res, failure.status, failure.body, { head, contractHeader: true })
      }
      const url = new URL(req.url ?? row.path, 'http://managed.local')
      const answer = await restricted(capabilityId, def, req, body, {
        versionOk: () => headerValue(req, CONTRACT_HEADER) === CONTRACT_VERSION,
        select: () => selectHttpTarget(def, req, url.searchParams, body),
      })
      return respond(res, answer.status, answer.body, { head, contractHeader: true })
    }
  }

  /* ---- discovery route ---- */

  async function contractHandler(req, res) {
    const head = req.method === 'HEAD'
    if (head) return respond(res, 200, undefined, { head: true, contractHeader: true })
    return respond(res, 200, discovery(capabilityIds), { contractHeader: true })
  }

  /* ---- /mcp JSON-RPC ---- */

  function mcpTools() {
    const tools = [
      { name: CONTRACT_TOOL, description: 'Managed control contract discovery (dnls.control/1).', inputSchema: { type: 'object', additionalProperties: false, properties: {}, required: [] } },
    ]
    for (const [id, def] of caps) {
      if (!def?.tool) continue
      tools.push({ name: def.tool.name ?? id, description: def.tool.description ?? id, inputSchema: def.tool.inputSchema })
    }
    return tools
  }

  function toolByName(name) {
    for (const [id, def] of caps) {
      if (def?.tool && (def.tool.name ?? id) === name) return { capabilityId: id, def }
    }
    return null
  }

  async function mcpHandler(req, res) {
    const row = byPath.get(MCP_PATH)
    const read = await readBodyText(req, row?.bodyLimit ?? 0)
    if (read.tooLarge) {
      const failure = fail('sandbox.body.toolarge')
      return respond(res, failure.status, failure.body)
    }
    let rpc
    try {
      rpc = read.pre !== undefined ? read.pre : JSON.parse(read.text)
    } catch {
      return respond(res, 200, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })
    }
    const isNotification = isPlainObject(rpc) && !('id' in rpc) && typeof rpc.method === 'string'
    if (!isPlainObject(rpc) || rpc.jsonrpc !== '2.0' || typeof rpc.method !== 'string') {
      return respond(res, 200, { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'invalid request' } })
    }
    const rpcError = (code, message) => respond(res, 200, { jsonrpc: '2.0', id: rpc.id ?? null, error: { code, message } })
    const rpcResult = (result) => respond(res, 200, { jsonrpc: '2.0', id: rpc.id, result })
    if (rpc.method === 'initialize') {
      if (isNotification) return respond(res, 204, undefined)
      return rpcResult({
        protocolVersion: typeof rpc.params?.protocolVersion === 'string' ? rpc.params.protocolVersion : '2025-03-26',
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'dsh-nano-local-sandbox', version: PACKAGE_VERSION },
      })
    }
    if (rpc.method.startsWith('notifications/')) return respond(res, 204, undefined)
    if (rpc.method === 'ping') {
      if (isNotification) return respond(res, 204, undefined)
      return rpcResult({})
    }
    if (isNotification) return respond(res, 204, undefined)
    if (rpc.method === 'tools/list') return rpcResult({ tools: mcpTools() })
    if (rpc.method === 'tools/call') {
      const url = new URL(req.url ?? MCP_PATH, 'http://managed.local')
      const name = rpc.params?.name
      const mcpResult = (status, payload) =>
        respond(res, status, {
          jsonrpc: '2.0',
          id: rpc.id,
          result: {
            isError: status >= 400 || payload?.ok === false,
            structuredContent: payload,
            content: [{ type: 'text', text: JSON.stringify(payload) }],
          },
        })
      if (name === CONTRACT_TOOL) return mcpResult(200, discovery(capabilityIds))
      const found = typeof name === 'string' ? toolByName(name) : null
      if (!found) {
        const failure = fail('sandbox.tool.unknown')
        return mcpResult(failure.status, failure.body)
      }
      if (read.pre === undefined && hasDuplicateMember(read.text)) {
        const failure = paramsFail('shape')
        return mcpResult(failure.status, failure.body)
      }
      const args = rpc.params?.arguments === undefined ? {} : rpc.params?.arguments
      const answer = await restricted(found.capabilityId, found.def, req, args, {
        versionOk: () => rpc.params?._meta?.[CONTRACT_META] === CONTRACT_VERSION,
        select: () => {
          if (!isPlainObject(args)) return { failure: paramsFail('shape') }
          return selectMcpTarget(found.def, req, args, url.searchParams)
        },
      })
      return mcpResult(answer.status, answer.body)
    }
    return rpcError(-32601, `method not found: ${rpc.method}`)
  }

  /* ---- spec assembly ---- */

  const specs = []
  const contractRow = byPath.get(CONTRACT_PATH)
  if (contractRow) specs.push({ path: CONTRACT_PATH, methods: [...contractRow.methods], bodyLimit: contractRow.bodyLimit, handler: contractHandler })
  const mcpRow = byPath.get(MCP_PATH)
  if (mcpRow) specs.push({ path: MCP_PATH, methods: [...mcpRow.methods], bodyLimit: mcpRow.bodyLimit, handler: mcpHandler })
  for (const [capabilityId, def] of caps) {
    if (!def?.http) continue
    const row = byPath.get(def.http.path)
    if (!row) throw new Error(`managed-routes: capability ${capabilityId} declares ${def.http.path} with no binding-table row`)
    specs.push({ path: row.path, methods: [...row.methods], bodyLimit: row.bodyLimit, handler: httpHandler(capabilityId, def, row) })
  }
  // Every binding-table row must own a registered spec (route-guard). A
  // row whose capability the provider filtered out gets a fail-closed
  // handler — registered but never advertised or dispatched.
  const covered = new Set(specs.map((spec) => spec.path))
  const closed = async (req, res) => {
    const failure = fail('sandbox.provider_unsupported')
    return respond(res, failure.status, failure.body, { head: req.method === 'HEAD', contractHeader: true })
  }
  for (const row of table ?? []) {
    if (covered.has(row.path)) continue
    specs.push({ path: row.path, methods: [...row.methods], bodyLimit: row.bodyLimit, handler: closed })
  }
  return specs
}
