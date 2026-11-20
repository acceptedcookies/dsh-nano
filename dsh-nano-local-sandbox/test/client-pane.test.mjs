import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { CONTRACT_VERSION, createDnlsClient, createTicket } from '../src/client/managed.js'
import { formatBytes, formatCores, serviceLine, serviceSummary } from '../src/client/format.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const UUID_A = '11111111-1111-4111-8111-111111111111'
const UUID_B = '22222222-2222-4222-8222-222222222222'

function stubReact() {
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    Fragment: Symbol('fragment'),
    createContext: (value) => ({ $$context: true, defaultValue: value }),
    useContext: (ctx) => ctx?.defaultValue,
    useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
    useEffect: () => {},
    useLayoutEffect: () => {},
    useRef: (value) => ({ current: value }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useId: () => 'id',
  }
  react.default = react
  return react
}

function loadClientModule(modules) {
  const source = readFileSync(join(root, 'lib/client.js'), 'utf8')
  const loaded = []
  const window = { __ModuleLoader__: { load: (spec) => loaded.push(spec) } }
  new Function('window', source)(window)
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0].id, 'dsh-nano-local-sandbox')
  const resolved = modules ?? {
    react: stubReact(),
    'react-dom': {},
    'react-dom/client': {},
    '@deepseek-ai/dsh-client-ui-primitives': {
      Button: 'Button', Input: 'Input', SegmentedControl: 'SegmentedControl',
      DisclosureRow: 'DisclosureRow', StateDot: 'StateDot', Tag: 'Tag',
      Modal: 'Modal', Switch: 'Switch', Tooltip: 'Tooltip',
      RiskConfirmation: 'RiskConfirmation', IconInfoOutlineRegular: 'IconInfoOutlineRegular',
    },
  }
  const client = loaded[0].factory((name) => {
    assert.ok(name in resolved, `unexpected external require ${name}`)
    return resolved[name]
  })
  return client
}

function fakeCtx() {
  const effects = []
  const tabSpecs = []
  const slotRegistrations = []
  const ctx = {
    locale: { getSnapshot: () => ({ active: 'en' }) },
    effect: (fn) => { const dispose = fn(); effects.push(dispose) },
    sidebarRightTabs: {
      register: (spec) => { tabSpecs.push(spec); return () => {} },
      get: () => undefined,
      candidates: () => [],
    },
    sidebarRight: {
      openTab: () => {},
      openResource: () => {},
    },
    slots: {
      inject: (name, register) => { const d = register(); slotRegistrations.push({ name, dispose: d }) },
      register: (spec, component) => { slotRegistrations.push({ spec, component }); return () => {} },
    },
  }
  return { ctx, effects, tabSpecs, slotRegistrations }
}

test('the built loader module registers one dnls-sandbox tab with dispose paths', () => {
  const client = loadClientModule()
  assert.deepEqual(client.inject, ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale'])
  assert.equal(typeof client.apply, 'function')
  const { ctx, effects, tabSpecs, slotRegistrations } = fakeCtx()
  client.apply(ctx)
  assert.equal(tabSpecs.length, 1)
  assert.equal(tabSpecs[0].kind, 'dnls-sandbox')
  assert.equal(tabSpecs[0].multiple, false)
  assert.ok(Array.isArray(tabSpecs[0].guide) && tabSpecs[0].guide.length === 1)
  const names = slotRegistrations.map((entry) => entry.spec?.name ?? entry.name)
  assert.ok(names.includes('sidebar.right.pane.tab'))
  assert.ok(names.includes('sidebar.right.pane.tab.title'))
  for (const dispose of effects) assert.doesNotThrow(() => dispose?.())
})

test('the pane body gates render on a real sessionId — never a synthetic session', () => {
  loadClientModule()
  const { ctx, slotRegistrations } = fakeCtx()
  const client = loadClientModule()
  client.apply(ctx)
  const body = slotRegistrations.find((entry) => entry.spec?.name === 'sidebar.right.pane.tab')?.component
  assert.equal(typeof body, 'function')
  assert.equal(body({ sessionId: null }).props.sessionId, null)
  // the session gate lives inside DnlsPane; the wrapper forwards verbatim
  assert.equal(body({ sessionId: 'session-42' }).props.sessionId, 'session-42')
})

/* ---- hermetic wire behaviour ---- */

function stubFetch(handler, { headerVersion = CONTRACT_VERSION } = {}) {
  const calls = []
  const impl = async (url, init = {}) => {
    calls.push({ url, init })
    const out = await handler(url, init, calls)
    return {
      ok: out.ok ?? true,
      status: out.status ?? 200,
      headers: { get: (name) => (name === 'x-dnls-contract' ? (out.headerVersion !== undefined ? out.headerVersion : headerVersion) : null) },
      json: async () => out.body,
    }
  }
  return { impl, calls }
}

const contractBody = {
  contractVersion: CONTRACT_VERSION,
  capabilities: [
    'sandbox.list', 'sandbox.inspect', 'sandbox.processes', 'sandbox.lifecycle',
    'sandbox.operations', 'sandbox.profile.list',
    'sandbox.instance.create', 'sandbox.instance.start', 'sandbox.instance.stop',
    'sandbox.instance.restart', 'sandbox.instance.recreate', 'sandbox.instance.remove',
    'sandbox.revision.save', 'sandbox.idle.configure',
    'dnls.status', 'dnls.control',
    'term.session.list', 'term.session.create', 'term.session.close',
  ],
}

test('no implicit target: object reads before discovery never reach the wire', async () => {
  const { impl, calls } = stubFetch(() => ({ body: {} }))
  const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
  await assert.rejects(client.listSandboxes(), /discovery has not run/)
  await assert.rejects(client.inspect(UUID_A), /discovery has not run/)
  await assert.rejects(client.lifecycle({ action: 'stop', sandboxId: UUID_A, requestId: 'r1' }), /discovery has not run/)
  assert.equal(calls.length, 0)
})

test('discovery then list is read-only; every request is same-origin same-credentials', async () => {
  const { impl, calls } = stubFetch((url) => {
    if (url.endsWith('/contract')) return { body: contractBody }
    if (url.includes('/sandboxes')) {
      return { body: { contractVersion: CONTRACT_VERSION, envs: [], rows: [{ sandboxId: UUID_A, name: 'one', envId: 'dev', observedState: 'running' }], total: 1, complete: true } }
    }
    return { ok: false, status: 500, body: {} }
  })
  const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
  await client.discover()
  const list = await client.listSandboxes()
  assert.equal(list.rows[0].sandboxId, UUID_A)
  assert.equal(calls.length, 2)
  for (const call of calls) {
    assert.ok(call.url.startsWith('https://pane.test/nano-local-sandbox/'), call.url)
    assert.equal(call.init.credentials, 'same-origin')
    assert.equal(call.init.redirect, 'error')
  }
  assert.equal(calls.some((call) => call.init.method === 'POST'), false)
})

test('unannounced capability is refused locally — zero wire requests', async () => {
  const { impl, calls } = stubFetch(() => ({ body: { contractVersion: CONTRACT_VERSION, capabilities: ['sandbox.list'] } }))
  const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
  await client.discover()
  await assert.rejects(client.inspect(UUID_A), /not announced/)
  await assert.rejects(client.readOperation(UUID_A, 'op-1'), /not announced/)
  assert.equal(calls.length, 1) // only discovery
})

test('contract mismatch on a successful response is a hard failure', async () => {
  const { impl: bad, calls: badCalls } = stubFetch((url) =>
    url.endsWith('/contract')
      ? { body: contractBody }
      : { body: { contractVersion: 'dnls.control/0', sandboxId: UUID_A } })
  const badClient = createDnlsClient({ fetch: bad, origin: 'https://pane.test' })
  await badClient.discover()
  await assert.rejects(badClient.inspect(UUID_A), /contract mismatch/)
  assert.equal(badCalls.length, 2, 'the request ran; the lying envelope is what fails')
})

test('targeted calls put sandboxId only in the query and echo-check the body', async () => {
  const { impl, calls } = stubFetch((url) => url.endsWith('/contract')
    ? { body: contractBody }
    : { body: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, observedState: 'running' } })
  const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
  await client.discover()
  await client.inspect(UUID_A, { window: '24h' })
  const call = calls[1]
  const url = new URL(call.url)
  assert.equal(url.searchParams.get('sandboxId'), UUID_A)
  assert.equal(url.searchParams.get('window'), '24h')
  assert.equal(call.init.body, undefined)
  assert.equal(call.init.headers['x-dnls-contract'], CONTRACT_VERSION)
  // a success envelope naming another sandbox is a hard failure
  const { impl: swap } = stubFetch((url) => url.endsWith('/contract')
    ? { body: contractBody }
    : { body: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_B } })
  const swapClient = createDnlsClient({ fetch: swap, origin: 'https://pane.test' })
  await swapClient.discover()
  await assert.rejects(swapClient.inspect(UUID_A), /different sandbox/)
})

test('lifecycle submit is one shot: one POST, one requestId, receipt required', async () => {
  const seen = []
  const { impl, calls } = stubFetch((url, init) => {
    if (url.endsWith('/contract')) return { body: contractBody }
    if (init.method === 'POST') seen.push(init)
    return { body: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, operationId: 'op-9', state: 'accepted' } }
  })
  const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
  await client.discover()
  const body = await client.lifecycle({ action: 'restart', sandboxId: UUID_A, requestId: 'req-1' })
  assert.equal(body.operationId, 'op-9')
  assert.equal(seen.length, 1)
  const url = new URL(calls[calls.length - 1].url)
  assert.equal(url.searchParams.get('sandboxId'), UUID_A)
  const parsed = JSON.parse(seen[0].body)
  assert.equal(parsed.action, 'restart')
  assert.equal(parsed.requestId, 'req-1')
  assert.equal(parsed.sandboxId, undefined, 'the object id lives in the query, never the body')
  // missing receipt is not success — the client refuses the answer
  const { impl: bare } = stubFetch((url) => url.endsWith('/contract')
    ? { body: contractBody }
    : { body: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_A } })
  const bareClient = createDnlsClient({ fetch: bare, origin: 'https://pane.test' })
  await bareClient.discover()
  await assert.rejects(bareClient.lifecycle({ action: 'stop', sandboxId: UUID_A, requestId: 'r2' }), /missing operation receipt/)
})

test('create is target-none: no selector anywhere; operation read is exact', async () => {
  const { impl, calls } = stubFetch((url, init) => {
    if (init.method === 'POST' && !url.includes('/mcp')) {
      return { body: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, operationId: 'op-1', state: 'accepted' } }
    }
    if (url.includes('/operations')) return { body: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, operationId: 'op-1', state: 'succeeded' } }
    if (url.includes('/mcp')) {
      return { body: { jsonrpc: '2.0', id: 1, result: { isError: false, structuredContent: { contractVersion: CONTRACT_VERSION, profiles: [{ id: 'terminal' }] } } } }
    }
    return { body: contractBody }
  })
  const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
  await client.discover()
  await assert.rejects(client.lifecycle({ action: 'create', sandboxId: UUID_A, name: 'x', requestId: 'r' }), /never carries a selector/)
  const created = await client.lifecycle({ action: 'create', name: 'box', profileId: 'terminal', requestId: 'r1' })
  assert.equal(created.operationId, 'op-1')
  const post = calls.find((call) => call.init.method === 'POST' && !call.url.includes('/mcp'))
  assert.equal(new URL(post.url).searchParams.get('sandboxId'), null)
  const op = await client.readOperation(UUID_A, 'op-1')
  assert.equal(op.state, 'succeeded')
  const opCall = calls[calls.length - 1]
  assert.equal(new URL(opCall.url).searchParams.get('operationId'), 'op-1')
  // profile list goes through the MCP tool with the contract meta, no sandboxId
  const profiles = await client.listProfiles()
  assert.equal(profiles[0].id, 'terminal')
  const mcp = calls[calls.length - 1]
  const rpc = JSON.parse(mcp.init.body)
  assert.equal(rpc.params.name, 'sandbox.profile.list')
  assert.equal(rpc.params._meta['dnls/contract'], CONTRACT_VERSION)
  assert.equal('sandboxId' in (rpc.params.arguments ?? {}), false)
})

test('a stale ticket can never mutate the newer selection', () => {
  const tickets = createTicket()
  const staleA = tickets.take()
  const freshB = tickets.take()
  assert.equal(staleA(), false, 'an answer for A arriving after B is dropped')
  assert.equal(freshB(), true)
  tickets.kill()
  assert.equal(freshB(), false, 'unmount invalidates everything')
})

test('missing echoes fail closed: sandboxId, header, operationId, create id', async () => {
  // targeted success without the sandboxId echo is invalid, not optional
  const { impl: silent } = stubFetch((url) => url.endsWith('/contract')
    ? { body: contractBody }
    : { body: { contractVersion: CONTRACT_VERSION, observedState: 'running' } })
  const silentClient = createDnlsClient({ fetch: silent, origin: 'https://pane.test' })
  await silentClient.discover()
  await assert.rejects(silentClient.inspect(UUID_A), /different sandbox/)
  // targeted success without the response contract header is invalid
  const { impl: noHeader } = stubFetch((url) => url.endsWith('/contract')
    ? { body: contractBody }
    : { body: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_A }, headerVersion: null })
  const noHeaderClient = createDnlsClient({ fetch: noHeader, origin: 'https://pane.test' })
  await noHeaderClient.discover()
  await assert.rejects(noHeaderClient.inspect(UUID_A), /contract header/)
  // an operation answer naming a different operationId is invalid
  const { impl: otherOp } = stubFetch((url) => url.endsWith('/contract')
    ? { body: contractBody }
    : { body: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, operationId: 'op-OTHER', state: 'succeeded' } })
  const otherClient = createDnlsClient({ fetch: otherOp, origin: 'https://pane.test' })
  await otherClient.discover()
  await assert.rejects(otherClient.readOperation(UUID_A, 'op-1'), /different operation/)
  // a create answer without a valid sandboxId is a failed create
  const { impl: noId } = stubFetch((url, init) => {
    if (url.endsWith('/contract')) return { body: contractBody }
    if (init.method === 'POST') return { body: { contractVersion: CONTRACT_VERSION, operationId: 'op-1', state: 'accepted' } }
    return { body: {} }
  })
  const noIdClient = createDnlsClient({ fetch: noId, origin: 'https://pane.test' })
  await noIdClient.discover()
  await assert.rejects(noIdClient.lifecycle({ action: 'create', name: 'box', requestId: 'r1' }), /valid sandboxId/)
})

test('the MCP envelope is validated: jsonrpc 2.0, echo id, structured contract', async () => {
  const mcpFor = (body) => stubFetch((url) => url.endsWith('/contract')
    ? { body: contractBody }
    : { body })
  // wrong echo id — never trust the result
  {
    const { impl } = mcpFor({ jsonrpc: '2.0', id: 99, result: { isError: false, structuredContent: { contractVersion: CONTRACT_VERSION, profiles: [] } } })
    const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
    await client.discover()
    await assert.rejects(client.listProfiles(), /jsonrpc envelope/)
  }
  // structuredContent carries the contract proof, not a header
  {
    const { impl } = mcpFor({ jsonrpc: '2.0', id: 1, result: { isError: false, structuredContent: { profiles: [] } } })
    const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
    await client.discover()
    await assert.rejects(client.listProfiles(), /contract mismatch/)
  }
})

test('provider-shaped projections render ids, ports and null-safe stats', () => {
  // row-level services carry only {serviceId, published, health}
  assert.equal(serviceSummary([{ serviceId: 'web', published: true, health: 'unknown' }, { serviceId: 'term', published: false }]), 'web, term')
  assert.equal(serviceSummary([{ name: 'ignored' }]), '')
  // detail services: published gets hostAddress:hostPort, unpublished never
  assert.equal(serviceLine({ serviceId: 'web', containerPort: 8787, protocol: 'http', published: true, hostAddress: '127.0.0.1', hostPort: 8080, health: 'unknown' }), 'web:8787 http → 127.0.0.1:8080 unknown')
  assert.equal(serviceLine({ serviceId: 'web', containerPort: 8787, protocol: 'http', published: false, hostPort: null, hostAddress: null }), 'web:8787 http')
  assert.equal(serviceLine(null), null)
  // usage stats keep null distinct from zero
  assert.equal(formatBytes(0), '0 KiB')
  assert.equal(formatBytes(null), null)
  assert.equal(formatBytes(734003200), '700.0 MiB')
  assert.equal(formatCores(0.5), '0.500 cores')
  assert.equal(formatCores(null), null)
})

/* ---- real component transitions through a stateful hook driver ---- */

/**
 * Minimal React stand-in: hook slots persist per mounted component, deps
 * are compared by identity, setters re-render synchronously. Enough to
 * drive the built DnlsPane's real transitions without a DOM.
 */
function hookReact() {
  const hooks = []
  let cursor = 0
  const pending = []
  const react = {
    createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }),
    Fragment: Symbol('fragment'),
    useState: (init) => {
      const i = cursor++
      if (!(i in hooks)) hooks[i] = typeof init === 'function' ? init() : init
      return [hooks[i], (value) => {
        hooks[i] = typeof value === 'function' ? value(hooks[i]) : value
        drive.render()
      }]
    },
    useRef: (value) => {
      const i = cursor++
      if (!(i in hooks)) hooks[i] = { current: value }
      return hooks[i]
    },
    useEffect: (fn, deps) => {
      const i = cursor++
      const prev = hooks[i]
      const changed = !prev?.deps || !deps || deps.length !== prev.deps.length || deps.some((d, j) => d !== prev.deps[j])
      if (changed) {
        hooks[i] = { deps, fn, cleanup: prev?.cleanup }
        if (!pending.includes(i)) pending.push(i)
      }
    },
    useCallback: (fn, deps) => {
      const i = cursor++
      const prev = hooks[i]
      if (prev && deps && prev.deps?.length === deps.length && deps.every((d, j) => d === prev.deps[j])) return prev.fn
      hooks[i] = { deps, fn }
      return fn
    },
    useMemo: (fn) => fn(),
    useId: () => `id-${cursor++}`,
    useLayoutEffect: (fn, deps) => react.useEffect(fn, deps),
    createContext: (value) => ({ $$context: true, defaultValue: value }),
    useContext: (ctx) => ctx?.defaultValue,
  }
  react.default = react
  const expand = (node) => {
    if (node === null || node === undefined || typeof node === 'string' || typeof node === 'number') return node
    if (Array.isArray(node)) return node.map(expand)
    if (typeof node === 'object' && node.type !== undefined) {
      if (typeof node.type === 'function') return expand(node.type({ ...node.props, children: node.children }))
      return { type: node.type, props: node.props, children: node.children.map(expand) }
    }
    return node
  }
  const drive = {
    react,
    mount(component, props) {
      drive.component = component
      drive.props = props
      drive.render()
      drive.flush()
      return drive.tree
    },
    render() {
      cursor = 0
      drive.tree = expand(drive.component(drive.props))
      return drive.tree
    },
    flush() {
      while (pending.length) {
        const i = pending.shift()
        const slot = hooks[i]
        if (typeof slot.cleanup === 'function') slot.cleanup()
        slot.cleanup = slot.fn()
      }
    },
    async tick(rounds = 4) {
      for (let n = 0; n < rounds; n++) {
        await new Promise((resolve) => setImmediate(resolve))
        drive.flush()
      }
      return drive.tree
    },
  }
  return drive
}

const textOf = (node) => {
  if (node === null || node === undefined || node === false) return ''
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(textOf).join('')
  return node.children ? textOf(node.children) : ''
}
const walk = (node, out = []) => {
  if (Array.isArray(node)) { node.forEach((n) => walk(n, out)); return out }
  if (node && typeof node === 'object' && node.type !== undefined) {
    out.push(node)
    walk(node.children ?? [], out)
  }
  return out
}
const findButton = (tree, label) =>
  walk(tree).find((n) => n.type === 'Button' && textOf(n).trim() === label && typeof n.props?.onClick === 'function')
const findByData = (tree, key) => walk(tree).find((n) => n.props?.[key] !== undefined)

function wirePane({ inspectBodies, operationBodies }) {
  const calls = []
  let inspectSeq = 0
  let opSeq = 0
  const impl = async (url, init = {}) => {
    calls.push({ url, init })
    const path = new URL(url).pathname
    const respond = (body) => ({
      ok: true, status: 200,
      headers: { get: (name) => (name === 'x-dnls-contract' ? CONTRACT_VERSION : null) },
      json: async () => body,
    })
    if (path.endsWith('/contract')) return respond(contractBody)
    if (path.endsWith('/sandboxes')) {
      return respond({ contractVersion: CONTRACT_VERSION, envs: [], rows: [{ sandboxId: UUID_A, name: 'one', envId: 'dev', observedState: 'running', services: [{ serviceId: 'web', published: true, health: 'unknown' }] }], total: 1, complete: true })
    }
    if (path.endsWith('/inspect')) {
      inspectSeq += 1
      return respond(inspectBodies[Math.min(inspectSeq - 1, inspectBodies.length - 1)])
    }
    if (path.endsWith('/processes')) return respond({ contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, processes: [{ pid: 7, name: 'sh', state: 'R', rssBytes: 1024 }] })
    if (path.endsWith('/lifecycle')) {
      return respond({ contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, operationId: 'op-1', state: 'accepted' })
    }
    if (path.endsWith('/operations')) {
      opSeq += 1
      return respond(operationBodies[Math.min(opSeq - 1, operationBodies.length - 1)])
    }
    return { ok: false, status: 404, headers: { get: () => null }, json: async () => ({ ok: false }) }
  }
  return { impl, calls }
}

function mountPane(ctx = null) {
  const driver = hookReact()
  const client = loadClientModule({
    react: driver.react,
    'react-dom': {},
    'react-dom/client': {},
    '@deepseek-ai/dsh-client-ui-primitives': {
      Button: 'Button', Input: 'Input', SegmentedControl: 'SegmentedControl',
      DisclosureRow: 'DisclosureRow', StateDot: 'StateDot', Tag: 'Tag',
      Modal: 'Modal', Switch: 'Switch', Tooltip: 'Tooltip',
      RiskConfirmation: 'RiskConfirmation', IconInfoOutlineRegular: 'IconInfoOutlineRegular',
    },
  })
  const own = ctx ?? fakeCtx()
  client.apply(own.ctx)
  const body = own.slotRegistrations.find((entry) => entry.spec?.name === 'sidebar.right.pane.tab')?.component
  driver.mount(body, { sessionId: 'session-live' })
  return driver
}

const DETAIL = {
  contractVersion: CONTRACT_VERSION,
  sandboxId: UUID_A,
  envId: 'dev', name: 'one', observedState: 'stopped', health: 'unknown',
  generation: 'gen-1', observedAt: '2026-11-20T00:00:00Z',
  desiredRevision: 1, appliedRevision: 1,
  configuration: { overrides: { cpus: 2, memoryBytes: 1024 ** 3 }, idleTimeoutMs: 60000 },
  services: [{ serviceId: 'web', containerPort: 8787, protocol: 'http', published: true, hostAddress: '127.0.0.1', hostPort: 8080, health: 'unknown' }],
  usage: { states: { running: 0, stopped: 5, failed: 0, missing: 0 }, memory: { expected: 5, valid: 0, mean: null, peak: null }, cpu: { expected: 5, valid: 0, mean: null, peak: null } },
}

const countCalls = (calls, suffix) => calls.filter((c) => new URL(c.url).pathname.endsWith(suffix)).length

function installPaneGlobals(t, impl) {
  const saved = ['fetch', 'location'].map((k) => [k, Object.getOwnPropertyDescriptor(globalThis, k)])
  t.after(() => {
    for (const [k, d] of saved) {
      if (d) Object.defineProperty(globalThis, k, d)
      else delete globalThis[k]
    }
  })
  globalThis.fetch = impl
  globalThis.location = { origin: 'https://pane.test' }
}

/** Value rendered next to a Field label — the exact text, not a substring. */
const fieldValue = (tree, label) => {
  const node = walk(tree).find((n) =>
    Array.isArray(n.children) && n.children.length === 2 && textOf(n.children[0]) === label)
  return node ? textOf(node.children[1]) : null
}

test('a confirmed succeeded recheck re-reads detail, clears processes, no extra write', async (t) => {
  const { impl, calls } = wirePane({ inspectBodies: [{ ...DETAIL, observedState: 'running' }, DETAIL], operationBodies: [{ contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, operationId: 'op-1', state: 'succeeded' }] })
  installPaneGlobals(t, impl)
  const driver = mountPane()
  await driver.tick()
  // pick the sandbox explicitly, then open the control view
  findByData(driver.tree, 'data-dnls-row').props.onClick()
  await driver.tick()
  assert.equal(countCalls(calls, '/inspect'), 1, 'control entry reads the target once')
  assert.equal(fieldValue(driver.tree, 'Observed state'), 'running')
  // explicit process read, then a confirmed stop → one lifecycle POST
  findButton(driver.tree, 'Show processes').props.onClick()
  await driver.tick()
  assert.ok(findByData(driver.tree, 'data-dnls-processes'), 'process table rendered')
  findButton(driver.tree, 'Stop').props.onClick()
  const risk = walk(driver.tree).find((n) => n.type === 'RiskConfirmation')
  assert.ok(risk, 'stop is gated behind a named risk confirmation')
  risk.props.onAcknowledgedChange(true)
  risk.props.onConfirm()
  await driver.tick()
  assert.equal(countCalls(calls, '/lifecycle'), 1, 'one click is one write')
  assert.ok(findByData(driver.tree, 'data-dnls-receipt'), 'receipt shown')
  // manual recheck: succeeded re-reads the list + detail and drops the
  // stale process table — without any additional write
  findButton(driver.tree, 'Recheck operation').props.onClick()
  await driver.tick()
  assert.equal(countCalls(calls, '/operations'), 1)
  assert.equal(countCalls(calls, '/inspect'), 2, 'success re-reads targeted detail')
  assert.ok(countCalls(calls, '/sandboxes') >= 2, 'success re-reads the list')
  assert.equal(countCalls(calls, '/lifecycle'), 1, 'no resubmission')
  assert.equal(findByData(driver.tree, 'data-dnls-processes'), undefined, 'stale process table cleared')
  assert.equal(fieldValue(driver.tree, 'Observed state'), 'stopped', 'detail shows the new observed state, not the cached one')
})

test('manual refresh after a failed inspect issues a new targeted read', async (t) => {
  const calls = []
  // first inspect fails (res.ok false), later ones succeed
  const impl = async (url, init = {}) => {
    calls.push({ url, init })
    const path = new URL(url).pathname
    const respond = (body, status = 200) => ({
      ok: status < 400, status,
      headers: { get: (n) => (n === 'x-dnls-contract' ? CONTRACT_VERSION : null) },
      json: async () => body,
    })
    if (path.endsWith('/contract')) return respond(contractBody)
    if (path.endsWith('/sandboxes')) return respond({ contractVersion: CONTRACT_VERSION, envs: [], rows: [{ sandboxId: UUID_A, name: 'one', envId: 'dev', observedState: 'running' }], total: 1, complete: true })
    if (path.endsWith('/inspect')) {
      const inspectCalls = calls.filter((c) => new URL(c.url).pathname.endsWith('/inspect')).length
      return inspectCalls === 1
        ? respond({ ok: false, errorId: 'sandbox.denied', error: 'denied', contractVersion: CONTRACT_VERSION }, 500)
        : respond(DETAIL)
    }
    return respond({ contractVersion: CONTRACT_VERSION, sandboxId: UUID_A })
  }
  installPaneGlobals(t, impl)
  const driver = mountPane()
  await driver.tick()
  findByData(driver.tree, 'data-dnls-row').props.onClick()
  await driver.tick()
  assert.equal(countCalls(calls, '/inspect'), 1)
  assert.ok(findByData(driver.tree, 'data-dnls-detail-error'), 'read failure is reported, not a spinner')
  // refresh on the control view retries the exact same targeted read
  findButton(driver.tree, 'Refresh').props.onClick()
  await driver.tick()
  assert.equal(countCalls(calls, '/inspect'), 2, 'refresh re-issues the targeted inspect')
  assert.equal(findByData(driver.tree, 'data-dnls-detail-error'), undefined)
  assert.equal(fieldValue(driver.tree, 'Observed state'), 'stopped', 'recovered detail rendered')
})

test('targeted MCP read rejects a different sandboxId echo', async () => {
  const { impl } = stubFetch((url) => {
    const path = new URL(url).pathname
    if (path.endsWith('/contract')) return { body: contractBody }
    if (path.endsWith('/mcp')) {
      return {
        body: {
          jsonrpc: '2.0', id: 1,
          result: { isError: false, structuredContent: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_B, terminals: [] } },
        },
      }
    }
    return { body: {} }
  })
  const client = createDnlsClient({ fetch: impl, origin: 'https://pane.test' })
  await client.discover()
  await assert.rejects(() => client.terminalList(UUID_A), /different sandbox/)
})

test('a shared-identity terminal list 403 denies the panel without side effects', async (t) => {
  const calls = []
  const impl = async (url, init = {}) => {
    calls.push({ url, init })
    const path = new URL(url).pathname
    const respond = (body, status = 200) => ({
      ok: status < 400, status,
      headers: { get: (n) => (n === 'x-dnls-contract' ? CONTRACT_VERSION : null) },
      json: async () => body,
    })
    if (path.endsWith('/contract')) return respond(contractBody)
    if (path.endsWith('/sandboxes')) return respond({ contractVersion: CONTRACT_VERSION, envs: [], rows: [{ sandboxId: UUID_A, name: 'one', envId: 'dev', observedState: 'running' }], total: 1, complete: true })
    if (path.endsWith('/inspect')) return respond(DETAIL)
    if (path.endsWith('/mcp')) {
      const parsed = JSON.parse(init.body)
      if (parsed.params?.name === 'term.session.list') {
        return respond({
          jsonrpc: '2.0', id: 1,
          result: {
            isError: true,
            content: [{ type: 'text', text: 'shared identity may not list terminals' }],
            structuredContent: { status: 403, errorId: 'term.denied', contractVersion: CONTRACT_VERSION, sandboxId: UUID_A },
          },
        })
      }
    }
    return respond({ contractVersion: CONTRACT_VERSION, sandboxId: UUID_A })
  }
  installPaneGlobals(t, impl)
  const driver = mountPane()
  await driver.tick()
  findByData(driver.tree, 'data-dnls-row').props.onClick()
  await driver.tick()
  findButton(driver.tree, 'List terminals').props.onClick()
  await driver.tick()
  assert.ok(findByData(driver.tree, 'data-dnls-terms-denied'), 'localized shared-identity denial shown')
  const creates = calls.filter((c) => {
    try { return JSON.parse(c.init.body)?.params?.name === 'term.session.create' } catch { return false }
  })
  assert.equal(creates.length, 0, 'a denied list never leads to a create attempt')
})

test('open existing terminal goes through the registry with the canonical address', async (t) => {
  const TERM_ID = '33333333-3333-4333-8333-333333333333'
  const opened = []
  const own = fakeCtx()
  own.ctx.sidebarRightTabs.candidates = (address) =>
    address.startsWith('dsh-resource://sandbox-terminal/') ? [{ id: 'dnt-sandbox-terminal', kind: 'dnt-sandbox-terminal' }] : []
  own.ctx.sidebarRight.openResource = (address) => opened.push(address)
  const calls = []
  const impl = async (url, init = {}) => {
    calls.push({ url, init })
    const path = new URL(url).pathname
    const respond = (body, status = 200) => ({
      ok: status < 400, status,
      headers: { get: (n) => (n === 'x-dnls-contract' ? CONTRACT_VERSION : null) },
      json: async () => body,
    })
    if (path.endsWith('/contract')) return respond(contractBody)
    if (path.endsWith('/sandboxes')) return respond({ contractVersion: CONTRACT_VERSION, envs: ['dev'], rows: [{ sandboxId: UUID_A, name: 'one', envId: 'dev', observedState: 'running' }], total: 1, complete: true })
    if (path.endsWith('/inspect')) return respond(DETAIL)
    if (path.endsWith('/mcp')) {
      const parsed = JSON.parse(init.body)
      if (parsed.params?.name === 'term.session.list') {
        return respond({
          jsonrpc: '2.0', id: 1,
          result: { isError: false, structuredContent: { contractVersion: CONTRACT_VERSION, sandboxId: UUID_A, terminals: [{
            terminalId: TERM_ID, state: 'active', address: `dsh-resource://sandbox-terminal/dev/${UUID_A}/${TERM_ID}`,
          }] } },
        })
      }
    }
    return respond({ contractVersion: CONTRACT_VERSION, sandboxId: UUID_A })
  }
  installPaneGlobals(t, impl)
  const driver = mountPane(own)
  await driver.tick()
  findByData(driver.tree, 'data-dnls-row').props.onClick()
  await driver.tick()
  findButton(driver.tree, 'List terminals').props.onClick()
  await driver.tick()
  findButton(driver.tree, 'Open').props.onClick()
  await driver.tick()
  assert.deepEqual(opened, [`dsh-resource://sandbox-terminal/dev/${UUID_A}/${TERM_ID}`], 'exact canonical address via openResource')
  const creates = calls.filter((c) => {
    try { return JSON.parse(c.init.body)?.params?.name === 'term.session.create' } catch { return false }
  })
  assert.equal(creates.length, 0, 'open never creates a session')
})
