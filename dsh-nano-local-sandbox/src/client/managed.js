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
])

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

  async function mcpCall(name, args, { signal } = {}) {
    announced('sandbox.profile.list')
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
    // The managed MCP envelope proves the contract inside structuredContent,
    // not a header; the echo id must match the request that produced it.
    if (parsed?.jsonrpc !== '2.0' || parsed.id !== 1) refuse('mcp', 'invalid jsonrpc envelope')
    const result = parsed?.result
    if (!result || typeof result !== 'object' || result.isError === true) {
      refuse('mcp', 'profile list refused')
    }
    if (result.structuredContent?.contractVersion !== CONTRACT_VERSION) {
      refuse('contract', 'response contract mismatch')
    }
    return result.structuredContent ?? {}
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
      if (!INSPECT_WINDOWS.has(usageWindow)) refuse('params', 'unknown usage window')
      return request(`${PREFIX}inspect`, {
        query: { sandboxId, window: usageWindow },
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
    async lifecycle({ action, sandboxId, name, profileId, requestId, signal } = {}) {
      announced(PATH_CAPS.get(`${PREFIX}lifecycle`))
      if (typeof requestId !== 'string' || requestId.length === 0) refuse('params', 'requestId required')
      const body = { action, requestId }
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
      const out = await mcpCall('sandbox.profile.list', {}, { signal })
      if (!Array.isArray(out.profiles)) refuse('shape', 'invalid profile list')
      return out.profiles
    },
  }
}
