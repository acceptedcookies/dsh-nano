/**
 * dnls.control/1 pane client. Discovery is the only request allowed before
 * an explicit sandbox selection; every object call carries the target's
 * sandboxId in the URL query (or MCP arguments.sandboxId) plus the
 * X-DNLS-Contract header, and a successful envelope must restate the
 * contract version and, for targeted calls, the same sandboxId.
 */

export const CONTRACT_VERSION = 'dnls.control/1'
export const CONTRACT_HEADER = 'x-dnls-contract'
export const CONTRACT_META = 'dnls/contract'
const PREFIX = '/nano-local-sandbox/'
const CONTRACT_PATH = `${PREFIX}contract`
const SANDBOX_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const INSPECT_WINDOWS = new Set(['24h', '7d', '30d'])

/* Capability ids owning the HTTP paths this pane uses. Support is decided
 * by the announced capability id, never by the URL alone. */
const PATH_CAPS = new Map([
  [`${PREFIX}sandboxes`, 'sandbox.list'],
  [`${PREFIX}inspect`, 'sandbox.inspect'],
  [`${PREFIX}processes`, 'sandbox.processes'],
  [`${PREFIX}lifecycle`, 'sandbox.lifecycle'],
  [`${PREFIX}operations`, 'sandbox.operations'],
  [`${PREFIX}status`, 'dnls.status'],
  [`${PREFIX}control`, 'dnls.control'],
  [`${PREFIX}logs`, 'dnls.logs'],
])

const CONTROL_ACTIONS = new Set(['takeover', 'release'])

function refuse(code, message) {
  const error = new Error(message)
  error.errorId = `dnls.client.${code}`
  error.restricted = true
  throw error
}

/**
 * Monotonic staleness ticket: each retarget bumps the sequence so a late
 * answer belonging to an older selection can never mutate the new one.
 * `take()` returns the guard for one generation; `guard()` is true only
 * while that generation is still current and the owner is alive.
 */
export function createTicket() {
  let seq = 0
  let alive = true
  return {
    take() {
      seq += 1
      const mine = seq
      return () => alive && seq === mine
    },
    kill() {
      alive = false
      seq += 1
    },
  }
}

const assertSandboxId = (sandboxId) => {
  if (typeof sandboxId !== 'string' || !SANDBOX_ID.test(sandboxId)) {
    refuse('target', 'a sandboxId uuid is required')
  }
}

/**
 * @param {{fetch?: typeof fetch, origin?: string}} options
 */
export function createDnlsClient({ fetch: impl, origin } = {}) {
  const doFetch = impl ?? globalThis.fetch?.bind(globalThis)
  if (typeof doFetch !== 'function') throw new Error('dnls client requires fetch')
  const base = new URL(origin ?? globalThis.location?.origin)
  if (!base.origin || base.origin === 'null') throw new Error('dnls client requires an origin')
  let contract = null

  const announced = (capabilityId) => {
    if (!contract) refuse('discovery', 'contract discovery has not run')
    if (!contract.capabilities.includes(capabilityId)) {
      refuse('capability', `${capabilityId} is not announced`)
    }
  }

  async function request(path, { method = 'GET', query, body, signal, sandboxId, envelope = 'dnls' } = {}) {
    if (!path.startsWith(PREFIX) || path.includes('..')) refuse('path', `unexpected path ${path}`)
    const url = new URL(path, base)
    if (url.origin !== base.origin) refuse('origin', 'requests stay on the pane origin')
    for (const [key, value] of Object.entries(query ?? {})) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value))
    }
    const res = await doFetch(url.href, {
      method,
      credentials: 'same-origin',
      redirect: 'error',
      headers: {
        [CONTRACT_HEADER]: CONTRACT_VERSION,
        accept: 'application/json',
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
    const parsed = await res.json().catch(() => null)
    if (!res.ok) {
      const error = new Error(parsed?.error ?? `request failed (${res.status})`)
      error.errorId = parsed?.errorId ?? 'dnls.client.http'
      error.status = res.status
      throw error
    }
    if (parsed === null || typeof parsed !== 'object') refuse('shape', 'malformed response body')
    if (envelope === 'jsonrpc') return parsed
    if (res.headers.get(CONTRACT_HEADER) !== CONTRACT_VERSION) refuse('contract', 'response contract header mismatch')
    if (parsed.contractVersion !== CONTRACT_VERSION) refuse('contract', 'response contract mismatch')
    if (sandboxId && parsed.sandboxId !== sandboxId) {
      refuse('target', 'response names a different sandbox')
    }
    if (parsed.ok === false) {
      const error = new Error(parsed.error ?? 'request failed')
      error.errorId = parsed.errorId ?? 'dnls.client.refused'
      throw error
    }
    return parsed
  }

  /**
   * Managed MCP `tools/call`: the tool must be announced, the envelope must
   * echo jsonrpc 2.0 + request id, and structuredContent proves the
   * contract. Targeted calls additionally require the exact sandboxId echo.
   * A refused call (isError) surfaces its business status — 403 stays 403.
   */
  async function mcp(name, args, { signal, sandboxId } = {}) {
    announced(name)
    const parsed = await request(`${PREFIX}mcp`, {
      method: 'POST',
      body: {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/call',
        params: {
          name,
          arguments: args,
          _meta: { [CONTRACT_META]: CONTRACT_VERSION },
        },
      },
      signal,
      envelope: 'jsonrpc',
    })
    if (parsed?.jsonrpc !== '2.0' || parsed.id !== 1) refuse('mcp', 'invalid jsonrpc envelope')
    const result = parsed?.result
    if (!result || typeof result !== 'object') refuse('mcp', 'missing mcp result')
    const out = result.structuredContent
    if (result.isError === true) {
      const error = new Error(out?.error ?? out?.errorId ?? `${name} refused`)
      error.errorId = out?.errorId ?? 'dnls.client.mcp'
      error.status = Number.isInteger(out?.status) ? out.status : null
      throw error
    }
    if (out?.contractVersion !== CONTRACT_VERSION) {
      refuse('contract', 'response contract mismatch')
    }
    if (sandboxId && out.sandboxId !== sandboxId) {
      refuse('target', 'response names a different sandbox')
    }
    return out ?? {}
  }

  return {
    /** The only request that runs before discovery; resets announced caps. */
    async discover({ signal } = {}) {
      contract = null
      const res = await doFetch(new URL(CONTRACT_PATH, base).href, {
        method: 'GET',
        credentials: 'same-origin',
        redirect: 'error',
        headers: { accept: 'application/json' },
        signal,
      })
      const body = await res.json().catch(() => null)
      if (!res.ok || res.headers.get(CONTRACT_HEADER) !== CONTRACT_VERSION ||
          body?.contractVersion !== CONTRACT_VERSION || !Array.isArray(body.capabilities)) {
        refuse('contract', 'unknown control contract')
      }
      contract = { capabilities: body.capabilities }
      return contract
    },

    capabilities: () => (contract ? [...contract.capabilities] : null),

    /** Per-capability gate: `sandbox.instance.stop` is advertised
     * independently of `sandbox.instance.create` — the pane enables only
     * the actions the provider actually announced. */
    supports: (capabilityId) => contract?.capabilities.includes(capabilityId) === true,

    /** Flat `sandbox.list` payload: `{envs, rows, total, complete}`. */
    async listSandboxes({ signal } = {}) {
      const cap = PATH_CAPS.get(`${PREFIX}sandboxes`)
      announced(cap)
      const body = await request(`${PREFIX}sandboxes`, { signal })
      if (!Array.isArray(body.rows)) refuse('shape', 'invalid sandbox list')
      return { envs: body.envs, rows: body.rows, total: body.total, complete: body.complete }
    },

    async inspect(sandboxId, { window: usageWindow = '24h', signal } = {}) {
      assertSandboxId(sandboxId)
      announced(PATH_CAPS.get(`${PREFIX}inspect`))
      // `window: null` opts out of the usage read entirely — a scoped
      // caller keeps the object detail instead of losing it to a
      // usage-only 403.
      if (usageWindow !== null && !INSPECT_WINDOWS.has(usageWindow)) refuse('params', 'unknown usage window')
      return request(`${PREFIX}inspect`, {
        query: usageWindow === null ? { sandboxId } : { sandboxId, window: usageWindow },
        signal,
        sandboxId,
      })
    },

    async processes(sandboxId, { limit, signal } = {}) {
      assertSandboxId(sandboxId)
      announced(PATH_CAPS.get(`${PREFIX}processes`))
      return request(`${PREFIX}processes`, {
        query: { sandboxId, ...(Number.isInteger(limit) ? { limit } : {}) },
        signal,
        sandboxId,
      })
    },

    /** Object lifecycle POST. `create` is target-none: it must not carry a selector. */
    async lifecycle({ action, sandboxId, name, profileId, requestId, args: extra, signal } = {}) {
      announced(PATH_CAPS.get(`${PREFIX}lifecycle`))
      // The write route gates transport; the action itself must also be
      // announced — a partially capable provider advertises per action.
      announced(`sandbox.instance.${action}`)
      if (typeof requestId !== 'string' || requestId.length === 0) refuse('params', 'requestId required')
      const body = { ...(extra ?? {}), action, requestId }
      const query = {}
      if (action === 'create') {
        if (sandboxId !== undefined) refuse('target', 'create never carries a selector')
        if (typeof name !== 'string' || name.length === 0) refuse('params', 'name required')
        body.name = name
        if (profileId !== undefined) body.profileId = profileId
      } else {
        assertSandboxId(sandboxId)
        query.sandboxId = sandboxId
      }
      const answer = await request(`${PREFIX}lifecycle`, { method: 'POST', query, body, signal, sandboxId })
      // An accepted mutation always carries a durable operation receipt.
      if (typeof answer.operationId !== 'string' || answer.operationId.length === 0) {
        refuse('receipt', 'missing operation receipt')
      }
      if (action === 'create' && !SANDBOX_ID.test(answer.sandboxId ?? '')) {
        refuse('receipt', 'create answered without a valid sandboxId')
      }
      return answer
    },

    /** Exact operation read by sandboxId + operationId on the paired route. */
    async readOperation(sandboxId, operationId, { signal } = {}) {
      assertSandboxId(sandboxId)
      if (typeof operationId !== 'string' || operationId.length === 0) {
        refuse('params', 'operationId required')
      }
      announced(PATH_CAPS.get(`${PREFIX}operations`))
      const answer = await request(`${PREFIX}operations`, {
        query: { sandboxId, operationId },
        signal,
        sandboxId,
      })
      if (answer.operationId !== operationId) refuse('target', 'response names a different operation')
      return answer
    },

    /** Authorized profiles via the `sandbox.profile.list` MCP tool. */
    async listProfiles({ signal } = {}) {
      const out = await mcp('sandbox.profile.list', {}, { signal })
      if (!Array.isArray(out.profiles)) refuse('shape', 'invalid profile list')
      return out.profiles
    },

    /** Targeted engine status page (kitesurf profile): the pane reads only
     * whitelisted fields, never page/url/credential material. */
    async logs(sandboxId, { tail = 20, signal } = {}) {
      assertSandboxId(sandboxId)
      announced(PATH_CAPS.get(`${PREFIX}logs`))
      const bounded = Number.isInteger(tail) && tail >= 1 && tail <= 200 ? tail : 20
      return request(`${PREFIX}logs`, { query: { sandboxId, tail: bounded }, signal, sandboxId })
    },

    async status(sandboxId, { signal } = {}) {
      assertSandboxId(sandboxId)
      announced(PATH_CAPS.get(`${PREFIX}status`))
      return request(`${PREFIX}status`, { query: { sandboxId }, signal, sandboxId })
    },

    /** Shared-engine HITL control: GET reads writer/humanHold; POST is
     * limited to takeover|release — there is no arbitrary action. */
    async control(sandboxId, action, { signal } = {}) {
      assertSandboxId(sandboxId)
      announced(PATH_CAPS.get(`${PREFIX}control`))
      if (action === undefined) {
        return request(`${PREFIX}control`, { query: { sandboxId }, signal, sandboxId })
      }
      if (!CONTROL_ACTIONS.has(action)) refuse('params', `unknown control action ${action}`)
      return request(`${PREFIX}control`, {
        method: 'POST', query: { sandboxId }, body: { action }, signal, sandboxId,
      })
    },

    /** This principal's terminals on one sandbox — `{sandboxId, terminals}`. */
    async terminalList(sandboxId, { signal } = {}) {
      assertSandboxId(sandboxId)
      const out = await mcp('term.session.list', { sandboxId }, { signal, sandboxId })
      if (!Array.isArray(out.terminals)) refuse('shape', 'invalid terminal list')
      return out
    },

    /** Create-only terminal spawn: `{sandboxId, terminalId}` — never an
     * attach, and the caller supplies the pane/open correlation ids. */
    async terminalCreate(sandboxId, { service, paneId, openId } = {}, { signal } = {}) {
      assertSandboxId(sandboxId)
      if (typeof paneId !== 'string' || !paneId || typeof openId !== 'string' || !openId) {
        refuse('params', 'paneId and openId are required')
      }
      const args = { sandboxId, paneId, openId }
      if (service !== undefined) args.service = service
      const out = await mcp('term.session.create', args, { signal, sandboxId })
      if (typeof out.terminalId !== 'string' || !SANDBOX_ID.test(out.terminalId)) {
        refuse('receipt', 'terminal create answered without a valid terminalId')
      }
      return out
    },

    /** Resize an owned terminal worker. Does not create or attach. */
    async terminalResize(sandboxId, terminalId, cols, rows, { signal } = {}) {
      assertSandboxId(sandboxId)
      if (!SANDBOX_ID.test(terminalId ?? '')) refuse('params', 'terminalId required')
      if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < 2 || rows < 2 || cols > 512 || rows > 512) {
        refuse('params', 'cols and rows out of range')
      }
      return mcp('term.session.resize', { sandboxId, terminalId, cols, rows }, { signal, sandboxId })
    },

    /** Confirmed close of an owned terminal worker. */
    async terminalClose(sandboxId, terminalId, { signal } = {}) {
      assertSandboxId(sandboxId)
      if (!SANDBOX_ID.test(terminalId ?? '')) refuse('params', 'terminalId required')
      return mcp('term.session.close', { sandboxId, terminalId }, { signal, sandboxId })
    },

    /** Desired resources: `{expectedRevision, overrides:{cpus?,memoryBytes?}}`. */
    async saveRevision(sandboxId, { expectedRevision, overrides } = {}, { signal } = {}) {
      assertSandboxId(sandboxId)
      if (!Number.isInteger(expectedRevision) || expectedRevision < 0) refuse('params', 'expectedRevision required')
      if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) refuse('params', 'overrides required')
      return mcp('sandbox.revision.save', { sandboxId, expectedRevision, overrides }, { signal, sandboxId })
    },

    /** Idle timeout in whole minutes on the wire as milliseconds. */
    async configureIdle(sandboxId, idleTimeoutMs, { signal } = {}) {
      assertSandboxId(sandboxId)
      if (!Number.isSafeInteger(idleTimeoutMs) || idleTimeoutMs < 0) refuse('params', 'idleTimeoutMs out of range')
      return mcp('sandbox.idle.configure', { sandboxId, idleTimeoutMs }, { signal, sandboxId })
    },
  }
}
