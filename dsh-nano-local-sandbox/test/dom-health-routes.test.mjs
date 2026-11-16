import assert from 'node:assert/strict'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { BINDING_TABLE } from '../lib/bindings.js'
import { routeSpecs } from '../src/host/routes.js'

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
  const res = { statusCode: 0, end(text) { raw = text } }
  await route.handler({ method, url, body }, res)
  return { status: res.statusCode, body: raw ? JSON.parse(raw) : null }
}

/** A CDP client stand-in: answers the three calls /dom makes. */
function fakeClient({ url = 'https://example.com/p', html = '<html><head><title>t</title></head><body><script>x()</script><p onclick="y()">hi</p></body></html>' } = {}) {
  return {
    async send(method) {
      if (method === 'Target.getTargets') return { targetInfos: [{ targetId: 't1', type: 'page', url }] }
      if (method === 'Target.attachToTarget') return { sessionId: 's1' }
      if (method === 'Runtime.evaluate') return { result: { value: { url, html } } }
      if (method === 'Browser.getVersion') return { product: 'Kitesurf/0.0.1' }
      if (method === 'Page.captureScreenshot') return { data: 'AAAA' }
      return {}
    },
  }
}

function depsWith(overrides = {}) {
  return {
    session: { phase: 'running', history: [{ url: 'https://example.com/p' }], containerName: 'kitesurf-dev', httpBase: 'http://127.0.0.1:8800' },
    backend: {
      async inspect() {
        return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [
          { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: 8800 },
          { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: 8801 },
        ] } }]) }
      },
    },
    env: { DSH_HOME: '/tmp/.dsh-dev' },
    connect: async () => fakeClient(),
    prepareTimeoutMs: 0,
    ...overrides,
  }
}

test('/dom returns a sanitized srcdoc, not just a url', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/dom'])
  assert.equal(result.status, 200)
  assert.equal(result.body.ok, true)
  assert.equal(result.body.url, 'https://example.com/p')
  assert.equal(typeof result.body.srcdoc, 'string')
  assert.equal(result.body.srcdoc.includes('<script'), false)
  assert.equal(result.body.srcdoc.includes('onclick'), false)
  assert.equal(result.body.srcdoc.includes('<base href="https://example.com/p">'), true)
  assert.equal(result.body.stripped.scripts, 1)
  assert.equal(result.body.stripped.handlers, 1)
  assert.equal(result.body.bytes > 0, true)
})

test('/dom reports dom.blank instead of pretending success on about:blank', async () => {
  const routes = routesFor(depsWith({ connect: async () => fakeClient({ url: 'about:blank', html: '<html><body></body></html>' }) }))
  const result = await call(routes['/nano-local-sandbox/dom'])
  assert.equal(result.status, 502)
  assert.equal(result.body.ok, false)
  assert.equal(result.body.errorId, 'kitesurf.dom.blank')
})

test('/dom reports dom.empty when the document has no html', async () => {
  const routes = routesFor(depsWith({ connect: async () => fakeClient({ html: '' }) }))
  const result = await call(routes['/nano-local-sandbox/dom'])
  assert.equal(result.status, 502)
  assert.equal(result.body.errorId, 'kitesurf.dom.empty')
})

test('/selftest runs the 11 declared checks and names every one', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/selftest'])
  assert.equal(result.status, 200)
  assert.equal(result.body.total, 11)
  assert.equal(result.body.checks.length, 11)
  assert.deepEqual(result.body.checks.map((row) => row.id), [
    'container-exists', 'container-running', 'engine-cdp-reachable', 'engine-version',
    'page-target', 'page-not-blank', 'dom-renderable', 'shot-capturable',
    'bridge-health', 'bridge-writer-free', 'history-consistent',
  ])
  assert.equal(result.body.ok, true)
  assert.equal(result.body.passed, result.body.failed === 0)
  // The fixture has no real engine face, so the CDP-backed checks must fail
  // rather than report a hard-coded pass.
  assert.equal(result.body.failed > 0, true)
  assert.equal(result.body.passed, false)
  assert.equal(result.body.v, 1)
  assert.equal(result.body.snapshot?.v, 1)
})

test('/diagnostics ships a human report and only includes the catalog on request', async () => {
  const routes = routesFor(depsWith())
  const plain = await call(routes['/nano-local-sandbox/diagnostics'])
  assert.equal(plain.status, 200)
  assert.equal(typeof plain.body.text, 'string')
  assert.equal(plain.body.text.includes('Kitesurf 环境诊断'), true)
  assert.equal(Array.isArray(plain.body.summary), true)
  assert.equal(plain.body.summary.length, 5)
  assert.equal(plain.body.errorCatalog, undefined)

  const withCatalog = await call(routes['/nano-local-sandbox/diagnostics'], { url: '/nano-local-sandbox/diagnostics?catalog=1' })
  assert.equal(Array.isArray(withCatalog.body.errorCatalog), true)
  assert.equal(withCatalog.body.errorCatalog.length > 10, true)
})

test('/diagnostics collapses repeated polling rows instead of drowning the trace', async () => {
  const operations = []
  for (let i = 0; i < 9; i += 1) operations.push({ path: '/nano-local-sandbox/control', method: 'GET', at: `t${i}` })
  operations.push({ path: '/nano-local-sandbox/shot', method: 'POST', at: 't9', errorId: 'kitesurf.shot.empty' })
  const routes = routesFor(depsWith({ session: { phase: 'running', history: [], containerName: 'kitesurf-dev', httpBase: 'http://127.0.0.1:8800', operations } }))
  const result = await call(routes['/nano-local-sandbox/diagnostics'])
  const control = result.body.operations.filter((row) => row.path.endsWith('/control'))
  assert.equal(control.length, 1)
  assert.equal(control[0].repeat, 9)
  assert.equal(result.body.operations.some((row) => row.errorId === 'kitesurf.shot.empty'), true)
})

test('/ports probes every plane so the OK badge cannot mean "container up only"', async () => {
  const routes = routesFor(depsWith())
  const result = await call(routes['/nano-local-sandbox/ports'])
  assert.equal(result.status, 200)
  assert.equal(result.body.containerName, 'kitesurf-dev')
  assert.equal(typeof result.body.checks, 'object')
  assert.equal(typeof result.body.checks.container.ok, 'boolean')
  assert.equal(typeof result.body.checks.engine.ok, 'boolean')
  // Deep: the badge the panel renders must be computed from the same planes
  // the panel lists. Shallow health is what made OK sit next to red rows.
  assert.equal(typeof result.body.checks.page.ok, 'boolean')
  assert.equal(typeof result.body.checks.dom.ok, 'boolean')
  assert.equal(typeof result.body.checks.bridge.ok, 'boolean')
  assert.equal(result.body.healthy, Object.entries(result.body.checks).every(([key, row]) => row.ok === true || (key === 'dom' && row.skipped === true)))
})

test('/recover stop+starts a running http-only engine and does not call restart', async () => {
  const calls = { restart: [], start: [], stop: [] }
  const routes = routesFor(depsWith({
    httpProbe: () => true,
    connect: async () => ({
      async send() { throw new Error('Browser.getVersion timed out') },
    }),
    backend: {
      async inspect() {
        return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [
          { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: 8800 },
          { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: 8801 },
        ] } }]) }
      },
      async restart(name) { calls.restart.push(name) },
      async start(name) { calls.start.push(name) },
      async stop(name) { calls.stop.push(name) },
    },
    session: { phase: 'running', history: [], containerName: 'kitesurf-dev' },
    prepareTimeoutMs: 0,
  }))
  const result = await call(routes['/nano-local-sandbox/recover'], { method: 'POST', body: {} })
  assert.equal(result.status, 200)
  assert.deepEqual(calls.restart, [])
  assert.deepEqual(calls.stop, ['kitesurf-dev'])
  assert.deepEqual(calls.start, ['kitesurf-dev'])
  assert.equal(result.body.action, 'restarted')
  assert.equal(result.body.v, 1)
  assert.equal(result.body.ok, true)
  assert.equal(result.body.ready, false)
  assert.equal(result.body.planes.engine.state, 'http-only')
})

test('a blank page is not a reason to restart', async () => {
  const calls = { stop: [] }
  const routes = routesFor(depsWith({
    httpProbe: () => true,
    connect: async () => ({
      async send(method) {
        if (method === 'Target.getTargets') return { targetInfos: [{ targetId: 't1', type: 'page', url: 'about:blank' }] }
        if (method === 'Target.attachToTarget') return { sessionId: 's1' }
        if (method === 'Browser.getVersion') return { product: 'Kitesurf' }
        if (method === 'Runtime.evaluate') return { result: { value: { url: 'about:blank', root: true, bytes: 0 } } }
        return {}
      },
    }),
    backend: {
      async inspect() {
        return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [
          { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: 8800 },
          { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: 8801 },
        ] } }]) }
      },
      async stop(name) { calls.stop.push(name) },
      async start() {},
    },
    prepareTimeoutMs: 0,
  }))
  const result = await call(routes['/nano-local-sandbox/recover'], { method: 'POST', body: {} })
  assert.equal(result.body.action, 'noop')
  assert.deepEqual(calls.stop, [])
  assert.equal(result.body.planes.page.state, 'blank')
  assert.equal(result.body.planes.dom.state, 'skipped')
})
