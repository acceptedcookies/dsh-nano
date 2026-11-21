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

test('the client registers one sandbox tab and pane', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.equal(manifest.dsh.client.platform, 'web')
  const client = loadClientModule()
  assert.deepEqual(client.inject, ['slots', 'sidebarRightTabs', 'sidebarRight', 'locale'])
  const { ctx, effects, tabSpecs, slotRegistrations } = fakeCtx()
  client.apply(ctx)
  assert.equal(tabSpecs.length, 1)
  assert.equal(tabSpecs[0].kind, 'dnls-sandbox')
  assert.equal(tabSpecs[0].guide[0].id, 'dnls-sandbox')
  const panes = slotRegistrations.filter((entry) => entry.spec?.key === 'dnls-sandbox')
  assert.equal(panes.length, 2)
  for (const dispose of effects) assert.doesNotThrow(() => dispose?.())
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

test('views are host primitives plus nano-ui; only the registered shell draws its own controls', () => {
  const read = (name) => readFileSync(join(root, 'src/client', name), 'utf8')
  const views = ['index.jsx', 'fleet.jsx', 'sandbox.jsx', 'dock.jsx', 'dialogs.jsx', 'parts.jsx'].map(read).join('\n')
  for (const required of ['NANO_STYLES', 'NanoDialog', 'FactGrid', 'SplitRow', 'StateDot', 'RiskConfirmation', 'SegmentedControl', 'WorkbenchShell', 'TabDrawer', 'StatusBar']) {
    assert.equal(views.includes(required), true, required)
  }
  for (const forbidden of ['PanelLayout', 'style=', '<select', "h('button'", '<button', '<input', 'font-weight']) {
    assert.equal(views.includes(forbidden), false, forbidden)
  }
  const shell = read('shell.jsx')
  assert.equal((shell.match(/h\('button'/g) ?? []).length, (shell.match(/nano-ui-exempt/g) ?? []).length, 'every shell button carries its exemption')
  for (const name of ['styles.js', 'shell.jsx']) {
    assert.equal(/#[0-9a-f]{3,8}\b/i.test(read(name)), false, `${name}: colours come from host tokens`)
  }
})

test('guest processes are a sortable nano-ui data table', () => {
  const client = readFileSync(join(root, 'src/client/sandbox.jsx'), 'utf8')
  for (const required of [
    "className: 'nano-table'", 'function ProcessTable(', 'const PROC_COLS =',
    "'aria-sort': active", 'tabIndex: 0,', 'onKeyDown: (event) =>',
    "className: 'dnls-sort-icon'", 'useState({ key:',
    "className: 'dnls-col-name'", "className: 'dnls-col-state'",
  ]) assert.equal(client.includes(required), true, required)
  const styles = readFileSync(join(root, 'src/client/styles.js'), 'utf8')
  for (const rule of ['.dnls-procs tbody tr:hover', '.dnls-procs td.dnls-col-name', '.dnls-procs .dnls-sort-icon']) {
    assert.equal(styles.includes(rule), true, rule)
  }
})

test('no plugin names or private entry points in the workbench', () => {
  const read = (name) => readFileSync(join(root, 'src/client', name), 'utf8')
  const all = ['index.jsx', 'fleet.jsx', 'sandbox.jsx', 'dock.jsx', 'parts.jsx', 'i18n.js'].map(read).join('\n')
  for (const banned of ['openWorkspace', 'design workspace', '设计工作区', 'Kitesurf', 'kitesurf', 'DNK', 'DNT']) {
    assert.equal(all.includes(banned), false, banned)
  }
})
