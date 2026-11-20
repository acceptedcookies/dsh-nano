import { AsyncLocalStorage } from 'node:async_hooks'
import { BINDING_TABLE } from '../../lib/bindings.js'
import { connectCdp, resetClient } from './cdp-elements.js'
import { ensureBridgeCredential, bridgeFetch } from './routes.js'
import { errorCode, statusOf } from './error-catalog.js'
import { serviceMappings } from './managed-profile.js'
import { authorize } from './object-authz.js'
import { routeSpecs } from './routes.js'
import { supportsAction } from './backend.js'

// Non-page rows (discovery, mcp, lifecycle, ops and the P7 projections) are
// owned elsewhere; object pages serve only the per-object route set.
const otherOwners = new Set(['dnls.contract', 'dnls.mcp', 'dnls.lifecycle', 'dnls.operations', 'dnls.sandboxes',
  'dnls.fleet', 'dnls.inspect', 'dnls.processes'])
const fail = status => Object.assign(new Error('object page unavailable'), { status })
const deniedKeys = new Set(['cookies', 'cookiesApplied', 'extraHeaders', 'authorization', 'token', 'storePath', 'relayToken',
  'containerName', 'mounts', 'stateVolume', 'argv', 'env', 'engineUrl', 'stateSource', 'runtimeSource'])
export function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).filter(([k]) => !deniedKeys.has(k)).map(([k, v]) => [k, redact(v)]))
}

/**
 * T-O-64: the three object capabilities the agent surfaces share — one def,
 * advertised on /mcp tools/list AND carried into the session agent tools
 * (agent-tools.js projects the four model tools off this same capability
 * set). The 列表 entry is fleet's own `sandbox.list`; 状态 rides
 * `dnls.diagnostics` because the agent contract needs `hints`, which only
 * the diagnostics document carries.
 */
const OBJECT_TOOL_DEFS = new Map([
  ['dnls.diagnostics', {
    name: 'sandbox.status',
    description: 'Managed status of one sandbox object: lifecycle phase, the relay CDP endpoint (cdp), navigation state and recovery hints.',
    inputSchema: { type: 'object', properties: { sandboxId: { type: 'string' } }, required: ['sandboxId'], additionalProperties: false },
  }],
  ['dnls.open', {
    name: 'sandbox.open',
    description: 'Open (navigate) the shared page of one sandbox object to an http(s) URL inside the container. Counts as a write; refused while a human holds control.',
    inputSchema: { type: 'object', properties: { sandboxId: { type: 'string' }, url: { type: 'string' } }, required: ['sandboxId', 'url'], additionalProperties: false },
  }],
  ['dnls.control', {
    name: 'sandbox.control.status',
    description: 'Read-only control state of one sandbox object: humanHold (takeover) and relay stats. No action argument — writes stay with the human.',
    inputSchema: { type: 'object', properties: { sandboxId: { type: 'string' } }, required: ['sandboxId'], additionalProperties: false },
  }],
])

/** A pre-dispatch refusal body: status + errorId and nothing else (R-11). */
function refusal(errorId, status) {
  return { status: status ?? statusOf(errorId), body: { ok: false, errorId } }
}

/** Each page context owns one verified generation's socket, history and pending page operations. */
export function createObjectPages({ registry, envId, resolvePrincipal, connection, profileFor, backend, deps, lifecycle }) {
  const contexts = new Map()
  const grants = new AsyncLocalStorage()
  let closed = false
  const rows = new Map(BINDING_TABLE.filter(r => !otherOwners.has(r.id)).map(r => [r.id, r]))
  const capabilities = new Map([...rows].map(([name, row]) => [name, {
    http: { path: row.path, methods: row.methods },
    target: 'object',
    ...(OBJECT_TOOL_DEFS.has(name) ? { tool: OBJECT_TOOL_DEFS.get(name) } : {}),
  }]))
  function retire(sandboxId) {
    const session = contexts.get(sandboxId)
    contexts.delete(sandboxId)
    if (session?.cdp) resetClient(session)
  }
  async function execute({ capability, sandboxId, req, args, peer, via }) {
    if (closed) throw fail(503)
    const route = rows.get(capability)
    if (!route) throw fail(404)
    const initial = registry.get(sandboxId)
    const action = capability
    const auth = p => {
      const row = registry.get(sandboxId)
      const verdict = authorize({ peer: p, row, envId, action, resolvePrincipal })
      if (verdict.status) throw fail(verdict.status)
      if (!initial || !row.binding.generation || initial.binding.generation !== row.binding.generation ||
          row.stateVolume !== initial.stateVolume || row.binding.locator !== initial.binding.locator) throw fail(409)
      return verdict.principal
    }
    const principal = auth(peer)
    const recheck = async () => {
      // Session agent tools carry no host request: the composition-supplied
      // peer (T-O-59) IS the admission proof — re-verify it instead of asking
      // connection.admit to re-admit a synthetic request. HTTP and /mcp
      // callers keep the original re-admission path.
      if (via === 'tool') {
        if (closed || auth(peer).key !== principal.key) throw fail(403)
        return
      }
      const admitted = await connection.admit(req)
      if (closed || !admitted?.peer || auth(admitted.peer).key !== principal.key) throw fail(403)
    }
    const profile = await profileFor({ profileId: initial.profileId, envId })
    if (!profile.context?.driver?.history) throw fail(503)
    const inspect = async locator => {
      if (locator !== initial.binding.locator) throw fail(409)
      await recheck()
      const obs = await backend.observe(locator, { stateTarget: profile.stateTarget })
      await recheck()
      if (obs?.locator !== locator || obs?.generation !== initial.binding.generation ||
          obs?.stateVolume !== initial.stateVolume || obs.state !== 'running') throw fail(409)
      // Do not pass an unexpected current host mapping to the CDP/bridge transport.
      const mappings = serviceMappings(initial, obs, profile.services)
      if (mappings.some(s => !s.published)) throw fail(503)
      // Neutral info for the managed route readers — only the joined
      // verified mappings, never raw provider JSON.
      return {
        state: obs.state,
        ports: mappings.map(({ containerPort, hostPort, protocol, hostAddress }) =>
          ({ containerPort, hostPort, protocol, hostAddress, count: 1 })),
        resources: obs.resources ?? null,
        networking: obs.networking ?? null,
        stateSource: obs.stateVolume,
        runtimeSource: profile.runtimeTarget
          ? obs.mounts?.find(m => m.type === 'bind' && m.target === profile.runtimeTarget)?.source ?? null
          : null,
      }
    }
    if (route.id === 'dnls.recover') {
      // Composite provider gate before any ledger row — restart requires
      // honest stop+start flags and callables, not a generic flag alone.
      if (!supportsAction(backend, 'restart')) throw fail(503)
      if (!args.requestId || args.action !== 'restart') throw Object.assign(fail(400), { errorId: 'sandbox.params.action' })
      return lifecycle.submit({ peer, sandboxId, action: 'restart', args })
    }
    if (route.id === 'dnls.logs') {
      // Operator-only diagnostic read; a provider without logs() gets
      // fail-closed denial, never an advertised handler.
      if (principal.operator !== true) throw fail(403)
      if (typeof backend.logs !== 'function' || !supportsAction(backend, 'logs')) throw fail(503)
    }
    await inspect(initial.binding.locator)
    let session = contexts.get(sandboxId)
    if (!session || session.generation !== initial.binding.generation) {
      retire(sandboxId)
      session = { generation: initial.binding.generation, stateDir: initial.stateVolume, containerName: initial.binding.locator,
        __profile: profile.context, phase: 'running', history: [] }
      session.browserHistory = profile.context.driver.history.create(session)
      contexts.set(sandboxId, session)
    }
    // Narrow adapter: a page action cannot create, replace, remove or implicitly adopt a container.
    const pageBackend = { inspect, async logs(locator, options) { await inspect(locator); return backend.logs(locator, options) } }
    // R-11 / T-O-64: every non-HTTP entry (model tool, /mcp) opens through the
    // same kernel — but only AFTER the dispatcher reads humanHold from this
    // object's own bridge. Active → the profile's own control.held id (the
    // driver-declared namespace) as a
    // pre-dispatch refusal: status + errorId only, kernel never called; a
    // failed read → the existing control.bridge refusal. The pane's own
    // HTTP /open is exempt, and the gate lives here, never on the bridge.
    if (route.id === 'dnls.open' && via !== 'http') {
      const ns = typeof profile.context?.driver?.errors?.namespace === 'string' && profile.context.driver.errors.namespace
        ? profile.context.driver.errors.namespace : null
      const code = (suffix) => (ns ? `${ns}.${suffix}` : errorCode(suffix))
      let data = null
      try {
        // `managed: true` — pageBackend.inspect already returns the decoded
        // neutral projection (mappings joined above), not raw provider JSON.
        data = (await bridgeFetch(session, { ...deps, managed: true, backend: pageBackend }, '/control')).data
      } catch (error) {
        return refusal(typeof error?.errorId === 'string' ? error.errorId : code('control.bridge'),
          Number.isInteger(error?.status) ? error.status : 502)
      }
      if (data?.control?.humanHold?.active === true) {
        return refusal(code('control.held'), 409)
      }
    }
    // The cached socket belongs to the object, not to its first opener.
    // Each command uses the grant of the request issuing that command.
    const connect = async base => {
      const check = grants.getStore()
      if (!check || !session.bridgeBase) throw fail(503)
      await check()
      // T-O-63: the host's own relay handshake must prove itself with the
      // current generation credential. Delivery happens here — the first
      // verified page/control use of the generation — so a failed delivery
      // fails closed (503) and the object page never connects the relay.
      if (deps.connect === undefined) await ensureBridgeCredential(session, deps)
      const client = await (deps.connect ?? connectCdp)(base, { relayUrl: `${session.bridgeBase.replace(/^http/, 'ws')}/cdp`, relayToken: session.relayToken || undefined })
      try { await check() } catch (error) { client.close(); throw error }
      const send = client.send.bind(client)
      client.send = async (...command) => {
        const verify = grants.getStore()
        if (!verify) throw fail(403)
        await verify()
        const result = await send(...command)
        await verify()
        return result
      }
      return client
    }
    const page = routeSpecs({ ...deps, session, managed: true, backend: pageBackend, connect }).find(r => r.path === route.path)
    let text
    const res = { statusCode: 500, setHeader() {}, end(v) { text = v } }
    // HTTP keeps the caller's own method/url verbatim. /mcp and tool calls
    // carry a POST transport that the per-route kernel must never see, so
    // the dispatcher derives the declared kernel method: GET when the route
    // declares it, else the first declared method. (If a POST-only tool is
    // ever declared, this falls back to POST.)
    const kernelMethod = req?.method && route.methods.includes(req.method)
      ? req.method
      : route.methods.includes('GET') ? 'GET' : route.methods[0]
    const pageReq = {
      method: kernelMethod,
      url: req?.url ?? `${route.path}?sandboxId=${encodeURIComponent(sandboxId)}`,
      headers: {},
      body: kernelMethod === 'GET' ? {} : args,
    }
    let active = true
    try {
      await grants.run(async () => {
        if (!active) throw fail(403)
        await inspect(initial.binding.locator)
        if (!active) throw fail(403)
      }, () => page.handler(pageReq, res))
    } finally { active = false }
    await inspect(initial.binding.locator)
    const body = text ? JSON.parse(text) : {}
    // T-O-68: kernel failures (authorization + generation passed, handler ran,
    // status ≥ 400) project a fixed whitelist — always ok/errorId; the kernel's
    // own reason text in `error` capped at the same 240 chars the /operations
    // row uses; `hint` verbatim when the handler issued one. incidentId and any
    // other keys never cross this line; the projection is still redacted.
    // Pre-dispatch fail() throws (authz, visibility, generation, admission)
    // never reach this branch.
    if (res.statusCode >= 400) {
      const failure = { ok: false, errorId: body.errorId }
      if (body.error != null) failure.error = String(body.error).slice(0, 240)
      if (body.hint != null) failure.hint = body.hint
      return { status: res.statusCode, body: redact(failure) }
    }
    return { status: res.statusCode, body: redact(body) }
  }
  function close() { closed = true; grants.disable(); for (const id of contexts.keys()) retire(id) }
  return { capabilities, execute, close }
}
