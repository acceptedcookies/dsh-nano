/** Loop-3 review leftovers: the B-grade assertions that were still missing.
 * Each test is written so it can FAIL — no tautological green. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { registerRoutes } from '../lib/route-guard.js'
import { routeSpecs, bridgeControlBase } from '../src/host/routes.js'
import { withPage } from '../src/host/cdp-elements.js'
import { BINDING_TABLE } from '../lib/bindings.js'

function ctxFor(routes) {
  return {
    get(name) {
      if (name === 'webServer') return this.webServer
      return { requestRejection() { return undefined } }
    },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
}
function routesFor(deps) {
  const routes = []
  registerRoutes(ctxFor(routes), routeSpecs(deps), { table: BINDING_TABLE, plugin: 'dsh-nano-local-sandbox' })
  return Object.fromEntries(routes.map((route) => [route.path, route]))
}
async function call(route, { method = 'GET', url = route.path, body } = {}) {
  let raw = ''
  const res = { statusCode: 0, setHeader() {}, end(text) { raw = text ?? '' } }
  const req = typeof body === 'object' && body && typeof body[Symbol.asyncIterator] === 'function'
    ? Object.assign(body, { method, url })
    : { method, url, body }
  await route.handler(req, res)
  return { status: res.statusCode, body: raw ? JSON.parse(raw) : null, raw }
}
function depsWith(overrides = {}) {
  return {
    session: { phase: 'running', history: [], containerName: 'kitesurf-dev', httpBase: 'http://127.0.0.1:8800' },
    backend: {
      async inspect() {
        return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [
          { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: 8800 },
          { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: 8801 },
        ] } }]) }
      },
      async logs(name, { tail } = {}) { return { text: `tail=${tail}` } },
    },
    env: { DSH_HOME: '/tmp/.dsh-dev-guard', HOME: '/tmp/nonexistent-home', DNLS_STATE_ROOT: '/tmp/dnls-loop3-gaps' },
    connect: async () => ({ pageSessionId: 's1', pageTargetId: 't1', alive: true, listen() {}, async send() { return {} } }),
    prepareTimeoutMs: 0,
    httpProbe: () => false,
    ...overrides,
  }
}

// ── bridgeControlBase: only the actual published tuple makes a base ──

test('bridgeControlBase uses the published tuple, never engine port +1', () => {
  assert.equal(bridgeControlBase({ hostAddress: '::1', hostPort: 8801 }), 'http://[::1]:8801')
  assert.equal(bridgeControlBase({ hostAddress: '127.0.0.1', hostPort: 8801 }), 'http://127.0.0.1:8801')
  // The old +1 convention is gone: an adjacent guess must never materialize.
  assert.equal(bridgeControlBase({ hostAddress: '0.0.0.0', hostPort: 8801 }), null, 'wildcard address is not a loopback base')
  assert.equal(bridgeControlBase({ hostAddress: '10.0.0.5', hostPort: 8801 }), null, 'non-loopback is refused')
  assert.equal(bridgeControlBase({ hostAddress: '127.0.0.1', hostPort: 0 }), null)
  assert.equal(bridgeControlBase({ hostAddress: '127.0.0.1', hostPort: 65536 }), null)
  assert.equal(bridgeControlBase(null), null)
  assert.equal(bridgeControlBase({}), null, 'missing tuple → refuse, never guess')
})

// ── ops ring: 201st entry must evict, never grow unbounded ──

test('operations ring evicts at 200 entries', async () => {
  const deps = depsWith()
  const routes = routesFor(deps)
  deps.session.operations = Array.from({ length: 200 }, (_, i) => ({ path: `/old-${i}`, status: 200, ok: true }))
  await call(routes['/nano-local-sandbox/status'], { url: '/nano-local-sandbox/status' })
  assert.equal(deps.session.operations.length, 200, 'ring must cap, not grow')
  assert.equal(deps.session.operations[0].path, '/old-1', 'oldest entry evicted first')
  assert.equal(deps.session.operations.at(-1).path, '/nano-local-sandbox/status')
})

// ── /logs?tail: NaN → 400, negative clamps up to 20, huge clamps down to 2000 ──

test('/logs tail param: NaN refused, bounds clamped, number honoured', async () => {
  const seen = []
  const deps = depsWith({ backend: { async logs(name, { tail } = {}) { seen.push(tail); return { text: '' } } } })
  const routes = routesFor(deps)
  const nan = await call(routes['/nano-local-sandbox/logs'], { url: '/nano-local-sandbox/logs?tail=abc' })
  assert.equal(nan.status, 400)
  assert.equal(nan.body.errorId, 'kitesurf.query.tail')
  assert.equal(seen.length, 0, 'invalid tail must never reach backend.logs')
  await call(routes['/nano-local-sandbox/logs'], { url: '/nano-local-sandbox/logs?tail=-5' })
  assert.equal(seen.at(-1), 20, 'negative clamps up to the floor')
  await call(routes['/nano-local-sandbox/logs'], { url: '/nano-local-sandbox/logs?tail=99999' })
  assert.equal(seen.at(-1), 2000, 'over-max clamps down to the ceiling')
  await call(routes['/nano-local-sandbox/logs'], { url: '/nano-local-sandbox/logs?tail=77' })
  assert.equal(seen.at(-1), 77)
})

// ── send(): JSON-RPC body.error must map to status + errorId jsonrpc:<code> ──

test('a JSON-RPC error body lands on the ops row as jsonrpc:<code>', async () => {
  const deps = depsWith()
  const routes = routesFor(deps)
  // Any POST route whose handler returns a body.error — use a JSON-RPC path:
  // /mcp is the only JSON-RPC endpoint; an unknown method produces -32601.
  const reply = await call(routes['/nano-local-sandbox/mcp'], {
    method: 'POST',
    body: { jsonrpc: '2.0', id: 7, method: 'definitely/not.a.method' },
  })
  assert.equal(reply.body.error.code, -32601)
  const row = deps.session.operations.at(-1)
  assert.equal(row.errorId, 'jsonrpc:-32601', 'ops row must name the rpc code, not a generic 500')
  assert.equal(typeof row.status, 'number')
})

// ── withPage: attach must subscribe Page.enable once, on the page session ──

test('withPage attach sends Page.enable on the page sessionId before returning', async () => {
  const calls = []
  const client = {
    pageSessionId: null,
    pageTargetId: null,
    async send(method, params = {}, sessionId) {
      calls.push({ method, sessionId: sessionId || null })
      if (method === 'Target.getTargets') return { targetInfos: [{ targetId: 't1', type: 'page' }] }
      if (method === 'Target.attachToTarget') return { sessionId: 'sess-9' }
      return {}
    },
  }
  const sid = await withPage(client, (sessionId) => sessionId)
  assert.equal(sid, 'sess-9')
  const enable = calls.find((row) => row.method === 'Page.enable')
  assert.ok(enable, 'Page.enable must be sent at attach — navigation events depend on it')
  assert.equal(enable.sessionId, 'sess-9', 'Page.enable scoped to the page session, not the browser socket')
  // Second call reuses the session — no second attach, no second Page.enable.
  await withPage(client, (sessionId) => sessionId)
  assert.equal(calls.filter((row) => row.method === 'Target.attachToTarget').length, 1)
  assert.equal(calls.filter((row) => row.method === 'Page.enable').length, 1)
})

test('withPage single-flights concurrent attaches — no session leak', async () => {
  let attachCalls = 0
  const client = {
    pageSessionId: null,
    async send(method) {
      if (method === 'Target.getTargets') return { targetInfos: [{ targetId: 't1', type: 'page' }] }
      if (method === 'Target.attachToTarget') { attachCalls += 1; return { sessionId: 'sess-1' } }
      return {}
    },
  }
  const [a, b] = await Promise.all([
    withPage(client, (sid) => sid),
    withPage(client, (sid) => sid),
  ])
  assert.equal(a, b)
  assert.equal(attachCalls, 1, 'two concurrent first calls must not each create a session')
})

// ── /shot: png must NOT send quality; jpeg/webp must send the integer ──

test('/shot forwards format/quality to captureScreenshot with the right shape', async () => {
  const sent = []
  const client = {
    pageSessionId: 's1', pageTargetId: 't1', alive: true,
    listen() {},
    async send(method, params = {}) {
      sent.push({ method, params })
      if (method === 'Target.getTargets') return { targetInfos: [{ targetId: 't1', type: 'page' }] }
      if (method === 'Page.captureScreenshot') return { data: 'AAAA' }
      return {}
    },
  }
  const deps = depsWith({ connect: async () => client })
  const routes = routesFor(deps)
  await call(routes['/nano-local-sandbox/shot'], { method: 'POST', body: { format: 'png' } })
  const png = sent.find((row) => row.method === 'Page.captureScreenshot')
  assert.ok(png && !('quality' in png.params), 'png has no quality channel — sending one is a protocol lie')
  sent.length = 0
  await call(routes['/nano-local-sandbox/shot'], { method: 'POST', body: { format: 'jpeg', quality: 40 } })
  const jpg = sent.find((row) => row.method === 'Page.captureScreenshot')
  assert.equal(jpg.params.quality, 40, 'quality must reach the engine, not be dropped')
  sent.length = 0
  await call(routes['/nano-local-sandbox/shot'], { method: 'POST', body: {} })
  const dft = sent.find((row) => row.method === 'Page.captureScreenshot')
  assert.equal(dft.params.format, 'webp')
  assert.equal(dft.params.quality, 82, 'default quality is 82, documented and honored')
})

// ── /control: bridge URL is the actual publication, never engine port +1 ──

test('/control fetches the verified bridge tuple; the +1 honeypot sees zero', async (t) => {
  const { createServer } = await import('node:http')
  const listen = (handler) => new Promise((resolve) => {
    const server = createServer(handler)
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }))
  })
  // The +1 honeypot sits exactly where the retired convention would have
  // looked (engine hostPort +1); the REAL bridge publishes a non-adjacent
  // tuple. Only the bridge may ever receive a request.
  const honeypotHits = []
  const honeypot = await listen((req, res) => { honeypotHits.push(req.url); res.end('{"ok":true,"control":{"writer":"honeypot"}}') })
  t.after(() => honeypot.server.close())
  const bridgeHits = []
  const bridge = await listen((req, res) => { bridgeHits.push(req.url); res.end('{"ok":true,"control":{"writer":null,"humanHold":false,"lastAction":null}}') })
  t.after(() => bridge.server.close())
  const enginePort = honeypot.port - 1 // +1 convention would hit the honeypot
  let publications = [
    { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: enginePort },
    { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: bridge.port },
  ]
  const deps = depsWith({
    backend: {
      async inspect() {
        return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [...publications] } }]) }
      },
      async logs() { return { text: '' } },
    },
  })
  const routes = routesFor(deps)
  const got = await call(routes['/nano-local-sandbox/control'], { method: 'GET' })
  assert.equal(got.status, 200)
  assert.deepEqual(got.body.control, { writer: null, humanHold: false, lastAction: null })
  assert.deepEqual(bridgeHits, ['/control'], 'bridge /control must be fetched on its real published tuple')
  assert.equal(honeypotHits.length, 0, 'engine port +1 honeypot received zero requests — the convention is dead')

  // Mapping withdrawn: the next dispatch must fail closed with no traffic.
  publications = [{ containerPort: 8787, hostAddress: '127.0.0.1', hostPort: enginePort }]
  const lost = await call(routes['/nano-local-sandbox/control'], { method: 'GET' })
  assert.equal(lost.status, 502)
  assert.equal(lost.body.ok, false)
  assert.equal(bridgeHits.length, 1, 'no stale fetch after the mapping disappeared')
  assert.equal(honeypotHits.length, 0)
})

// ── /control: +2 (any real tuple) proves the mapping; engine+1 stays untouched ──

test('/control hits bridge at engine+2 exactly; the engine+1 address is never requested', async (t) => {
  // Deterministic adapter: every fetch URL is recorded and answered only by
  // its registered listener — no OS ports, no +1 possibility.
  const requests = []
  const listeners = new Map()
  const realFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    requests.push(String(url))
    const listener = listeners.get(String(url))
    if (!listener) throw new Error(`unmapped fetch: ${url}`)
    return new Response(listener(), { status: 200 })
  }
  t.after(() => { globalThis.fetch = realFetch })
  const enginePort = 40000
  const bridgeBase = `http://127.0.0.1:${enginePort + 2}`
  const honeypotBase = `http://127.0.0.1:${enginePort + 1}`
  const bridgeControl = { writer: null, humanHold: false, lastAction: { action: 'takeover', at: 't' } }
  listeners.set(`${bridgeBase}/control`, () => JSON.stringify({ ok: true, control: bridgeControl }))
  listeners.set(`${honeypotBase}/control`, () => JSON.stringify({ ok: true, control: { writer: 'honeypot' } }))
  const deps = depsWith({
    backend: {
      async inspect() {
        return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [
          { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: enginePort },
          { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: enginePort + 2 },
        ] } }]) }
      },
      async logs() { return { text: '' } },
    },
  })
  const routes = routesFor(deps)
  const got = await call(routes['/nano-local-sandbox/control'], { method: 'GET' })
  assert.equal(got.status, 200)
  assert.deepEqual(got.body.control, bridgeControl)
  assert.deepEqual(requests.filter((u) => u.endsWith('/control')), [`${bridgeBase}/control`])
  assert.equal(requests.some((u) => u.startsWith(honeypotBase)), false, 'engine+1 address was never requested')
})
