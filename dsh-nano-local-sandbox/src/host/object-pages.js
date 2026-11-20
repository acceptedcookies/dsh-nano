import { AsyncLocalStorage } from 'node:async_hooks'
import { BINDING_TABLE } from '../../lib/bindings.js'
import { connectCdp, resetClient } from './cdp-elements.js'
import { serviceMappings } from './managed-profile.js'
import { authorize } from './object-authz.js'
import { routeSpecs } from './routes.js'
import { supportsAction } from './backend.js'

// dnls.res is not a page action: iframe subresource fetches carry neither the
// contract header nor a sandboxId, and its body is raw bytes, not JSON. Left out
// here, managed-routes registers its row fail-closed until it gets its own owner.
const otherOwners = new Set(['dnls.contract', 'dnls.mcp', 'dnls.lifecycle', 'dnls.operations', 'dnls.sandboxes',
  'dnls.fleet', 'dnls.inspect', 'dnls.processes', 'dnls.res'])
const fail = status => Object.assign(new Error('object page unavailable'), { status })
const deniedKeys = new Set(['cookies', 'cookiesApplied', 'extraHeaders', 'authorization', 'token', 'storePath',
  'containerName', 'mounts', 'stateVolume', 'argv', 'env', 'engineUrl', 'stateSource', 'runtimeSource'])
function redact(value) {
  if (Array.isArray(value)) return value.map(redact)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(Object.entries(value).filter(([k]) => !deniedKeys.has(k)).map(([k, v]) => [k, redact(v)]))
}

/** Each page context owns one verified generation's socket, history and pending page operations. */
export function createObjectPages({ registry, envId, resolvePrincipal, connection, profileFor, backend, deps, lifecycle }) {
  const contexts = new Map()
  const grants = new AsyncLocalStorage()
  let closed = false
  const rows = new Map(BINDING_TABLE.filter(r => !otherOwners.has(r.id)).map(r => [r.id, r]))
  const capabilities = new Map([...rows].map(([name, row]) => [name, { http: { path: row.path, methods: row.methods }, target: 'object' }]))
  function retire(sandboxId) {
    const session = contexts.get(sandboxId)
    contexts.delete(sandboxId)
    if (session?.cdp) resetClient(session)
  }
  async function execute({ capability, sandboxId, req, args, peer }) {
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
    // The cached socket belongs to the object, not to its first opener.
    // Each command uses the grant of the request issuing that command.
    const connect = async base => {
      const check = grants.getStore()
      if (!check || !session.bridgeBase) throw fail(503)
      await check()
      const client = await (deps.connect ?? connectCdp)(base, { relayUrl: `${session.bridgeBase.replace(/^http/, 'ws')}/cdp` })
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
    const pageReq = { method: req.method, url: req.url, headers: {}, body: args }
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
    if (res.statusCode >= 400) return { status: res.statusCode, body: { ok: false, ...(body.errorId && { errorId: body.errorId }) } }
    return { status: res.statusCode, body: redact(body) }
  }
  function close() { closed = true; grants.disable(); for (const id of contexts.keys()) retire(id) }
  return { capabilities, execute, close }
}
