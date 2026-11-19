import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import vm from 'node:vm'
import { registerRoutes } from '../lib/route-guard.js'
import { BINDING_TABLE } from '../lib/bindings.js'
import { routeSpecs } from '../src/host/routes.js'
import './support/kernel.mjs'

const stateDirFor = (deps) => join(deps.env.DNLS_STATE_ROOT, 'kitesurf', deps.session.containerName || 'kitesurf')

/** Minimal ctx that satisfies the route guard's DI contract. */
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
  const res = {
    statusCode: 0,
    setHeader() {},
    end(text) { raw = text ?? '' },
  }
  // `body` may be a stream (async-iterable raw bytes) — that is the path where
  // malformed JSON and oversize bodies used to die as silent 500s. Pass the
  // stream as the req itself: the handler reads req[Symbol.asyncIterator].
  const req = typeof body === 'object' && body && typeof body[Symbol.asyncIterator] === 'function'
    ? Object.assign(body, { method, url })
    : { method, url, body }
  await route.handler(req, res)
  return { status: res.statusCode, body: raw ? JSON.parse(raw) : null, raw }
}

/** A request with a raw body stream instead of a pre-parsed object. */
function streamReq(text) {
  const chunk = Buffer.from(text)
  return { async *[Symbol.asyncIterator]() { yield chunk } }
}

const PAGE_URL = 'https://example.com/p'
const PAGE_HTML = '<html><head><title>t</title></head><body><p>hi</p></body></html>'

/** CDP stand-in: records Runtime.evaluate expressions, answers the calls the
 * routes make, and lets each test override per-method replies. */
function fakeClient({ url = PAGE_URL, html = PAGE_HTML, evaluate = null, send = null } = {}) {
  const evaluations = []
  const listeners = []
  const client = {
    evaluations,
    pageSessionId: 's1',
    pageTargetId: 't1',
    alive: true,
    // Real clients register one dispatcher; tests drive it to exercise the
    // EVENT path (frameNavigated), not just the refsGen backstop.
    listen(fn) { listeners.push(fn) },
    emit(event) { for (const fn of listeners) fn(event) },
    async send(method, params = {}) {
      if (typeof send === 'function') {
        const custom = await send(method, params)
        if (custom !== undefined) return custom
      }
      if (method === 'Target.getTargets') return { targetInfos: [{ targetId: 't1', type: 'page', url }] }
      if (method === 'Target.attachToTarget') return { sessionId: 's1' }
      if (method === 'Runtime.evaluate') {
        evaluations.push(params.expression)
        if (typeof evaluate === 'function') return evaluate(params.expression)
        return { result: { value: { url, html } } }
      }
      if (method === 'Browser.getVersion') return { product: 'Kitesurf/0.0.1' }
      if (method === 'Page.captureScreenshot') return { data: 'AAAA' }
      if (method === 'Network.enable' || method === 'Runtime.enable' || method === 'Log.enable' || method === 'Page.enable') return {}
      return {}
    },
  }
  return client
}

const stateDirs = []
test.after(() => { for (const dir of stateDirs) rmSync(dir, { recursive: true, force: true }) })

function depsWith(overrides = {}) {
  const stateDir = mkdtempSync(join(tmpdir(), 'dnls-guard-state-'))
  stateDirs.push(stateDir)
  return {
    session: { phase: 'running', history: [], containerName: 'kitesurf-dev', httpBase: 'http://127.0.0.1:8800' },
    backend: {
      async inspect() {
        return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [
          { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: 8800 },
          { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: 8801 },
        ] } }]) }
      },
    },
    // DNLS_STATE_ROOT isolates the durable doc per test — without it the guard
    // writes into the real ~/.dsh state root (or a root-relative path).
    env: { DSH_HOME: '/tmp/.dsh-dev-guard', HOME: '/tmp/nonexistent-home', DNLS_STATE_ROOT: stateDir },
    connect: async () => fakeClient(),
    prepareTimeoutMs: 0,
    httpProbe: () => false, // never let tests dial the real engine port
    ...overrides,
  }
}

// ── G14 body contract: malformed JSON → 400, not the old 500 'failed' ──

test('/pageBody with a non-object JSON payload answers 400 kitesurf.body.json', async () => {
  const routes = routesFor(depsWith())
  // A raw array is valid JSON but not an object — the route must reject it
  // instead of silently treating it as {} (the old wipe-the-settings bug).
  const result = await call(routes['/nano-local-sandbox/settings'], { method: 'POST', body: [1, 2, 3] })
  assert.equal(result.status, 400)
  assert.equal(result.body.errorId, 'kitesurf.body.json')
})

test('/evaluate expression over the 2000-char contract is 400, not dead code', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/evaluate'], { method: 'POST', body: { expression: 'x'.repeat(2001) } })
  assert.equal(result.status, 400)
  assert.equal(result.body.errorId, 'kitesurf.evaluate.toolong')
})

test('/evaluate without an expression is 400 kitesurf.evaluate.empty', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/evaluate'], { method: 'POST', body: {} })
  assert.equal(result.status, 400)
  assert.equal(result.body.errorId, 'kitesurf.evaluate.empty')
})

/** Page stand-in whose Runtime.evaluate really runs the expression, so the
 * token ring lives in a document global like it does in the engine. */
function pageClient() {
  let doc = vm.createContext({})
  const client = fakeClient({
    evaluate: (expression) => {
      const value = vm.runInContext(expression, doc)
      return { result: { type: typeof value, value } }
    },
  })
  client.navigate = () => { doc = vm.createContext({}) }
  return client
}

test('/evaluate keeps small results raw and adds no token', async () => {
  const client = pageClient()
  const routes = routesFor(depsWith({ connect: async () => client }))
  const result = await call(routes['/nano-local-sandbox/evaluate'], { method: 'POST', body: { expression: '({a:1,b:"x"})' } })
  assert.equal(result.status, 200)
  assert.deepEqual(result.body.value, { a: 1, b: 'x' })
  assert.equal(result.body.token, undefined)
  assert.equal(result.body.truncated, undefined)
})

test('/evaluate over 4000 chars returns the head and pages the rest by token', async () => {
  const client = pageClient()
  const routes = routesFor(depsWith({ connect: async () => client }))
  const route = routes['/nano-local-sandbox/evaluate']
  const big = await call(route, { method: 'POST', body: { expression: '"x".repeat(9000)+"END"' } })
  assert.equal(big.status, 200)
  assert.equal(big.body.value.length, 4000)
  assert.equal(big.body.total, 9003)
  assert.equal(big.body.truncated, true)
  assert.match(big.body.token, /^\d+$/)
  const p2 = await call(route, { method: 'POST', body: { token: big.body.token, offset: 4000 } })
  assert.equal(p2.status, 200)
  assert.equal(p2.body.value.length, 4000)
  assert.equal(p2.body.truncated, true)
  const p3 = await call(route, { method: 'POST', url: `/nano-local-sandbox/evaluate?token=${big.body.token}&page=2`, body: {} })
  assert.equal(p3.status, 200)
  assert.equal(p3.body.offset, 8000)
  assert.equal(p3.body.value, `${'x'.repeat(1000)}END`)
  assert.equal(p3.body.truncated, false)
  // Large objects page as their JSON text.
  const obj = await call(route, { method: 'POST', body: { expression: '({s:"y".repeat(5000)})' } })
  assert.equal(obj.body.value, JSON.stringify({ s: 'y'.repeat(5000) }).slice(0, 4000))
  assert.equal(obj.body.total, JSON.stringify({ s: 'y'.repeat(5000) }).length)
})

test('/evaluate token is dropped by navigation and unknown tokens are 404 kitesurf.evaluate.miss', async () => {
  const client = pageClient()
  const routes = routesFor(depsWith({ connect: async () => client }))
  const route = routes['/nano-local-sandbox/evaluate']
  const big = await call(route, { method: 'POST', body: { expression: '"z".repeat(4500)' } })
  client.navigate()
  const gone = await call(route, { method: 'POST', body: { token: big.body.token, offset: 4000 } })
  assert.equal(gone.status, 404)
  assert.equal(gone.body.errorId, 'kitesurf.evaluate.miss')
  const bogus = await call(route, { method: 'POST', body: { token: 'abc' } })
  assert.equal(bogus.status, 404)
  assert.equal(bogus.body.errorId, 'kitesurf.evaluate.miss')
})

test('/evaluate token ring keeps only the newest 20 results', async () => {
  const client = pageClient()
  const routes = routesFor(depsWith({ connect: async () => client }))
  const route = routes['/nano-local-sandbox/evaluate']
  const tokens = []
  for (let i = 0; i < 21; i += 1) tokens.push((await call(route, { method: 'POST', body: { expression: `"${i % 10}".repeat(4100)` } })).body.token)
  assert.equal((await call(route, { method: 'POST', body: { token: tokens[0] } })).status, 404)
  assert.equal((await call(route, { method: 'POST', body: { token: tokens[20] } })).status, 200)
})

test('/console rejects a non-numeric limit with 400 kitesurf.query.limit', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/console'], { url: '/nano-local-sandbox/console?limit=abc' })
  assert.equal(result.status, 400)
  assert.equal(result.body.errorId, 'kitesurf.query.limit')
})

test('/network rejects a non-numeric since with 400', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/network'], { url: '/nano-local-sandbox/network?since=abc' })
  assert.equal(result.status, 400)
  assert.equal(result.body.errorId, 'kitesurf.query.since')
})

// ── G11 JSON-RPC: five response shapes, not the old 200-always ──

test('/mcp initialize answers a real JSON-RPC result', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/mcp'], { method: 'POST', body: { jsonrpc: '2.0', id: 1, method: 'initialize' } })
  assert.equal(result.status, 200)
  assert.equal(result.body.result.serverInfo.name, 'dsh-nano-local-sandbox')
})

test('/mcp notification gets 204 with an EMPTY body', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/mcp'], { method: 'POST', body: { jsonrpc: '2.0', method: 'notifications/initialized' } })
  assert.equal(result.status, 204)
  assert.equal(result.raw, '')
})

test('/mcp unknown method is -32601 in-band at HTTP 200', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/mcp'], { method: 'POST', body: { jsonrpc: '2.0', id: 9, method: 'no/such' } })
  assert.equal(result.status, 200)
  assert.equal(result.body.error.code, -32601)
})

test('/mcp missing jsonrpc member is -32600', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/mcp'], { method: 'POST', body: { id: 1, method: 'initialize' } })
  assert.equal(result.status, 200)
  assert.equal(result.body.error.code, -32600)
})

// ── G23 /state: inline state object must not 404 ──

test('/state load accepts an inline state object per the binding contract', async () => {
  const client = fakeClient({ evaluate: () => ({ result: { value: { ok: true, url: PAGE_URL, cookieSet: 0 } } }) })
  const routes = routesFor(depsWith({ connect: async () => client }))
  const result = await call(routes['/nano-local-sandbox/state'], {
    method: 'POST',
    body: { action: 'load', state: { localStorage: { k: 'v' }, sessionStorage: {}, cookie: '', url: PAGE_URL } },
  })
  assert.equal(result.status, 200)
  assert.equal(result.body.ok, true)
  assert.equal(result.body.restored.ok, true)
  // The expression must actually carry the inline pairs — not silently load
  // a different record.
  const expr = client.evaluations.find((e) => e.includes('localStorage'))
  assert.ok(expr && expr.includes('"k":"v"'))
})

test('/state load of a missing name is 404 kitesurf.state.miss', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/state'], { method: 'POST', body: { action: 'load', name: 'ghost' } })
  assert.equal(result.status, 404)
  assert.equal(result.body.errorId, 'kitesurf.state.miss')
})

// ── G04 DOM version fields: stable signature + generation emission ──

test('/dom repeats one domSeq + capturedAt for unchanged content, and emits generation', async () => {
  const routes = routesFor(depsWith())
  const first = await call(routes['/nano-local-sandbox/dom'])
  const second = await call(routes['/nano-local-sandbox/dom'])
  assert.equal(first.status, 200)
  assert.equal(first.body.domSeq, 1, 'first capture starts the version cursor at 1')
  assert.equal(first.body.domSeq, second.body.domSeq, 'unchanged content must not bump the version cursor')
  assert.equal(first.body.capturedAt, second.body.capturedAt, 'capturedAt is the content stamp, not the read clock')
  assert.equal(typeof first.body.generation, 'number')
})

test('/dom bumps domSeq when the document actually changes', async () => {
  let html = PAGE_HTML
  const client = fakeClient({ evaluate: () => ({ result: { value: { url: PAGE_URL, html } } }) })
  const routes = routesFor(depsWith({ connect: async () => client }))
  const first = await call(routes['/nano-local-sandbox/dom'])
  html = '<html><body><p>changed</p></body></html>'
  const second = await call(routes['/nano-local-sandbox/dom'])
  assert.equal(second.body.domSeq, first.body.domSeq + 1)
  // The stamp may share the first read's millisecond — the contract is "not
  // earlier", not "strictly later".
  assert.ok(Date.parse(second.body.capturedAt) >= Date.parse(first.body.capturedAt))
})

// ── G03 @N refs are page-generation-scoped ──

test('/snapshot @N refs die when the page generation advances', async () => {
  const client = fakeClient({
    evaluate: (expr) => (expr.includes('querySelectorAll')
      ? { result: { value: { url: PAGE_URL, title: 't', count: 10, tree: 'x', refs: { '@1': { selector: '#a' } }, truncated: false, capturedAt: 'now' } } }
      : { result: { value: { url: PAGE_URL, html: PAGE_HTML } } }),
  })
  const deps = depsWith({ connect: async () => client })
  const routes = routesFor(deps)
  const snap = await call(routes['/nano-local-sandbox/snapshot'], { method: 'GET' })
  assert.equal(snap.status, 200)
  assert.ok(deps.session.refs['@1'])
  // A main-frame commit bumps pageGen (frameNavigated); an @1 minted before it
  // must resolve to a miss, not into the new document.
  deps.session.pageGen = (deps.session.pageGen || 0) + 1
  const hit = await call(routes['/nano-local-sandbox/interact'], { method: 'POST', body: { target: '@1', action: 'click' } })
  assert.equal(hit.status, 404)
  assert.equal(hit.body.errorId, 'kitesurf.ref.miss')
})

// ── G32 shot error propagation ──

test('/shot propagates an in-band engine capture error as 502', async () => {
  const client = fakeClient({
    send: (method) => (method === 'Page.captureScreenshot' ? { data: 'QUJD', error: 'engine says no' } : undefined),
  })
  const routes = routesFor(depsWith({ connect: async () => client }))
  const result = await call(routes['/nano-local-sandbox/shot'], { method: 'POST', body: { format: 'png' } })
  assert.equal(result.status, 502)
  assert.equal(result.body.errorId, 'kitesurf.shot.empty')
})

// ── error catalog covers every emitted id ──

test('every errorId emitted anywhere in the plugin resolves through the composed catalogue', async () => {
  const { errorCatalog, errorNamespace } = await import('../src/host/error-catalog.js')
  const { readFileSync, readdirSync } = await import('node:fs')
  const { join } = await import('node:path')
  const namespace = errorNamespace()
  const emitted = new Set()
  const scan = (text) => {
    // Kernel code names a code suffix; the namespace is composed at emit time.
    for (const m of text.matchAll(/errorCode\(\s*'([^']+)'/g)) emitted.add(`${namespace}.${m[1]}`)
    for (const m of text.matchAll(/errorId\s*[=:]\s*'([^']+)'/g)) emitted.add(m[1])
    for (const m of text.matchAll(/errorId\s*[=:]\s*"([^"]+)"/g)) emitted.add(m[1])
    // In-page snippets interpolate the namespace at build time.
    for (const m of text.matchAll(/errorId:'\$\{errorCode\('([^']+)'\)\}'/g)) emitted.add(`${namespace}.${m[1]}`)
  }
  const hostDir = new URL('../src/host/', import.meta.url).pathname
  for (const file of readdirSync(hostDir).filter((f) => f.endsWith('.js'))) {
    scan(readFileSync(join(hostDir, file), 'utf8'))
  }
  // The bridge emits its own ids (control.busy, *.stale) — it lives outside
  // src/host but answers the same contract, so it is scanned too.
  scan(readFileSync(new URL('../profiles/kitesurf/mcp-bridge.mjs', import.meta.url).pathname, 'utf8'))
  scan(readFileSync(new URL('../index.js', import.meta.url).pathname, 'utf8'))
  const catalog = errorCatalog()
  const missing = [...emitted]
    .filter((id) => /^[a-z]/.test(id)) // skip non-id captures
    .filter((id) => !catalog.some((row) => new RegExp(row.match).test(id)))
  assert.deepEqual(missing, [], `unregistered errorIds: ${missing.join(', ')}`)
})

// ── G03 frameNavigated EVENT path (the refsGen backstop alone is not enough) ──

test('frameNavigated through the real listener clears refs and bumps pageGen', async () => {
  const client = fakeClient({
    evaluate: (expr) => (expr.includes('querySelectorAll')
      ? { result: { value: { url: PAGE_URL, title: 't', count: 10, tree: 'x', refs: { '@1': { selector: '#a' } }, truncated: false, capturedAt: 'now' } } }
      : { result: { value: { url: PAGE_URL, html: PAGE_HTML } } }),
  })
  const deps = depsWith({ connect: async () => client })
  const routes = routesFor(deps)
  await call(routes['/nano-local-sandbox/snapshot'])
  assert.ok(deps.session.refs['@1'])
  const genBefore = deps.session.pageGen || 0
  // Drive the same dispatcher acquireClient installed on the socket.
  client.emit({ method: 'Page.frameNavigated', params: { frame: { url: 'https://example.org/next' } } })
  assert.equal(deps.session.pageGen, genBefore + 1)
  assert.deepEqual(deps.session.refs, {})
  assert.equal(deps.session.lastSnapshot, null)
  assert.equal(deps.session.pageUrl, 'https://example.org/next')
})

// ── G14 stream bodies: the path production actually runs ──

test('/settings with a malformed JSON STREAM body is 400, not a wiped {}', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/settings'], { method: 'POST', body: streamReq('{bad json') })
  assert.equal(result.status, 400)
  assert.equal(result.body.errorId, 'kitesurf.body.json')
})

test('/settings with an oversized stream body is 413', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/settings'], { method: 'POST', body: streamReq(`{"cookies":"${'a'.repeat(7000)}"}`) })
  assert.equal(result.status, 413)
  assert.equal(result.body.errorId, 'kitesurf.body.toolarge')
})

test('/mcp with a malformed JSON stream answers -32700 in-band at HTTP 200', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/mcp'], { method: 'POST', body: streamReq('{oops') })
  assert.equal(result.status, 200)
  assert.equal(result.body.error.code, -32700)
})

test('/state save with a JSON ARRAY stream body is 400 (no side-effect write)', async () => {
  const deps = depsWith()
  const routes = routesFor(deps)
  const result = await call(routes['/nano-local-sandbox/state'], { method: 'POST', body: streamReq('[1,2]') })
  assert.equal(result.status, 400)
  assert.equal(result.body.errorId, 'kitesurf.body.json')
})

// ── G22 durable doc really lands on the state volume ──

test('a settings patch persists browser-state.json with cookiesApplied', async () => {
  const deps = depsWith()
  deps.session.pageUrl = PAGE_URL // cookies scope needs a real http(s) origin
  const routes = routesFor(deps)
  const patch = await call(routes['/nano-local-sandbox/settings'], { method: 'POST', body: { userAgent: 'GuardUA/9.9', cookies: 'g=1' } })
  assert.equal(patch.status, 200)
  const path = join(stateDirFor(deps), 'browser-state.json')
  assert.ok(existsSync(path), 'browser-state.json must exist on the instance state volume')
  const doc = JSON.parse(readFileSync(path, 'utf8'))
  assert.equal(doc.settings.userAgent, 'GuardUA/9.9')
  assert.deepEqual(doc.settings.cookiesApplied, ['g'])
})

// ── G31 late-navigation settlement on the transport ──

test('a late Page.navigate reply carrying result.errorText settles failed, not committed', async () => {
  const { ensureClient } = await import('../src/host/cdp-elements.js')
  // The old test called client.onLateNavigation?.() — a hook acquireClient
  // never installed on this path, so asserting 'nothing settled' could not
  // fail. Seed a REAL in-flight ledger row, go through clientFor so the hook
  // exists, then settle it with an engine-level errorText.
  const session = { phase: 'running', history: [], console: [], network: [], navigation: { intent: 'https://x/', outcome: 'in-flight', startedAt: 't0' } }
  const client = fakeClient()
  await ensureClient(session, 'http://127.0.0.1:8800', async () => client)
  assert.equal(typeof client.onLateNavigation, 'function', 'acquireClient must install the settle hook')
  client.onLateNavigation({ id: 1, result: { errorText: 'net::ERR_ABORTED' } }, 'https://x/')
  assert.equal(session.navigation.outcome, 'failed')
  assert.equal(session.navigation.errorId, 'kitesurf.navigate.failed')
  // Clean-committed late replies settle as committed for the same intent.
  session.navigation = { intent: 'https://y/', outcome: 'in-flight', startedAt: 't0' }
  client.onLateNavigation({ id: 2, result: { frameId: 'F' } }, 'https://y/')
  assert.equal(session.navigation.outcome, 'committed')
  // A reply for a DIFFERENT intent must not stamp the ledger row (the old
  // prefix-contains check would let 'a.com/page2' settle 'a.com/').
  session.navigation = { intent: 'https://a.com/', outcome: 'in-flight', startedAt: 't0' }
  client.onLateNavigation({ id: 3, result: { frameId: 'F' } }, 'https://a.com/page2')
  assert.equal(session.navigation.outcome, 'in-flight', 'foreign-intent reply must not settle')
})

// ── /wait contract matrix: the whole lane was new code with zero coverage ──

test('/wait requires exactly one of selector|text|url|fn', async () => {
  const routes = routesFor(depsWith())
  const none = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: {} })
  assert.equal(none.status, 400)
  assert.equal(none.body.errorId, 'kitesurf.wait.query')
  const two = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: { selector: 'a', text: 'b' } })
  assert.equal(two.status, 400)
  assert.equal(two.body.errorId, 'kitesurf.wait.query')
})

test('/wait load enum rejects anything outside the four modes', async () => {
  const routes = routesFor(depsWith())
  const bad = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: { selector: 'a', load: 'bogus' } })
  assert.equal(bad.status, 400)
  assert.equal(bad.body.errorId, 'kitesurf.wait.query')
})

test('/wait timeoutMs non-finite is 400 kitesurf.query.timeoutMs', async () => {
  const routes = routesFor(depsWith())
  const bad = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: { selector: 'a', timeoutMs: 'abc' } })
  assert.equal(bad.status, 400)
  assert.equal(bad.body.errorId, 'kitesurf.query.timeoutMs')
})

test('/wait selector hit resolves 200 with the matched packet', async () => {
  const client = fakeClient({ evaluate: () => ({ result: { value: { ok: true, tag: 'p', text: 'hi' } } }) })
  const routes = routesFor(depsWith({ connect: async () => client }))
  const hit = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: { selector: 'p', timeoutMs: 300 } })
  assert.equal(hit.status, 200)
  assert.equal(hit.body.ok, true)
  assert.equal(hit.body.matched?.tag, 'p')
})

test('/wait unmet condition inside timeoutMs is 504, not a hang', async () => {
  const client = fakeClient({ evaluate: () => ({ result: { value: { ok: false } } }) })
  const routes = routesFor(depsWith({ connect: async () => client }))
  const t0 = Date.now()
  const miss = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: { text: 'never-rendered', timeoutMs: 400 } })
  assert.equal(miss.status, 504)
  assert.equal(miss.body.errorId, 'kitesurf.wait.timeout')
  assert.ok(Date.now() - t0 >= 350 && Date.now() - t0 < 5000, 'must honor the requested budget, not the old fixed retry')
})

test('/wait fn mode evaluates the expression and honors truthiness', async () => {
  const client = fakeClient({ evaluate: () => ({ result: { value: { ok: true, result: true } } }) })
  const routes = routesFor(depsWith({ connect: async () => client }))
  const ok = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: { fn: 'document.title.includes("x")', timeoutMs: 300 } })
  assert.equal(ok.status, 200)
  const oversized = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: { fn: `x='${'a'.repeat(2100)}'`, timeoutMs: 100 } })
  assert.equal(oversized.status, 400)
  assert.equal(oversized.body.errorId, 'kitesurf.wait.query')
})

// ── ops incidentId: a failed call must be greppable back to its ops row ──

test('a 4xx route call stamps incidentId on the response AND the ops row', async () => {
  const routes = routesFor(depsWith())
  const bad = await call(routes['/nano-local-sandbox/wait'], { method: 'POST', body: { selector: 'a', timeoutMs: 'abc' } })
  assert.equal(bad.status, 400)
  assert.match(bad.body.incidentId || '', /^op-/, 'response must carry the incident echo')
  const ops = await call(routes['/nano-local-sandbox/operations'], { url: '/nano-local-sandbox/operations' })
  const row = (ops.body.entries || []).find((entry) => entry.incidentId === bad.body.incidentId)
  assert.ok(row, 'ops ring must hold the same incidentId')
  assert.equal(row.status, 400)
  assert.equal(row.errorId, 'kitesurf.query.timeoutMs')
  assert.equal(typeof row.durationMs, 'number')
  assert.match(row.argSummary || '', /timeoutMs/, 'input summary must name the failing field')
})

test('/operations?limit honours the bound and errorsOnly keeps cancelled rows', async () => {
  const deps = depsWith()
  const routes = routesFor(deps)
  deps.session.operations = [
    { path: '/a', status: 200, ok: true },
    { path: '/b', status: 400, ok: false, errorId: 'kitesurf.wait.query' },
    { path: '/c', status: 'cancelled', ok: false },
  ]
  const limited = await call(routes['/nano-local-sandbox/operations'], { url: '/nano-local-sandbox/operations?limit=1' })
  assert.equal(limited.body.entries.length, 1)
  const badLimit = await call(routes['/nano-local-sandbox/operations'], { url: '/nano-local-sandbox/operations?limit=abc' })
  assert.equal(badLimit.status, 400)
  assert.equal(badLimit.body.errorId, 'kitesurf.query.limit')
  const errors = await call(routes['/nano-local-sandbox/operations'], { url: '/nano-local-sandbox/operations?errorsOnly=true' })
  const paths = errors.body.entries.map((entry) => entry.path)
  assert.ok(paths.includes('/b') && paths.includes('/c') && !paths.includes('/a'))
})

// ── state snapshots: prototype keys must never reach the storage wipe ──

test('/state load with a prototype-key name is 404, never a localStorage wipe', async () => {
  const deps = depsWith()
  const routes = routesFor(deps)
  for (const key of ['constructor', 'toString', 'hasOwnProperty', '__proto__']) {
    const miss = await call(routes['/nano-local-sandbox/state'], { method: 'POST', body: { action: 'load', name: key } })
    assert.equal(miss.status, 404, `prototype key ${key} must not resolve a record`)
    assert.equal(miss.body.errorId, 'kitesurf.state.miss')
  }
  const squat = await call(routes['/nano-local-sandbox/state'], { method: 'POST', body: { action: 'save', name: '__last__' } })
  assert.equal(squat.status, 400)
  assert.equal(squat.body.errorId, 'kitesurf.state.name')
})

test('/storage rejects a typo\'d op instead of falling through to clear()', async () => {
  const client = fakeClient()
  const routes = routesFor(depsWith({ connect: async () => client }))
  const bad = await call(routes['/nano-local-sandbox/storage'], { method: 'POST', body: { scope: 'local', op: 'reed' } })
  assert.equal(bad.status, 400)
  assert.equal(bad.body.errorId, 'kitesurf.storage.op')
  // The clear() expression must never be issued for an unknown op.
  assert.ok(!client.evaluations.some((expr) => expr.includes('.clear()')))
})
