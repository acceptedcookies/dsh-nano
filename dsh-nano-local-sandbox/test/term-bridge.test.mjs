import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import test from 'node:test'
import { decodeMcpReply } from '../../packages/dsh-interface/src/host/decodeMcpReply.js'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { spawnContainerPty, spawnPtyProcess } from '../src/host/backend-apple.js'
import { routeSpecs } from '../src/host/routes.js'
import { resetClient } from '../src/host/cdp-elements.js'
import { shutdownTerms } from '../src/host/term-bridge.js'

test.after(() => {
  shutdownTerms()
})

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
  registerRoutes(ctxFor(routes), routeSpecs(deps), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  return Object.fromEntries(routes.map((route) => [route.path, route]))
}

async function call(route, body) {
  let raw = ''
  const res = { statusCode: 0, setHeader() {}, end(text) { raw = text } }
  await route.handler({ method: 'POST', url: route.path, body }, res)
  return { status: res.statusCode, body: raw ? JSON.parse(raw) : null }
}

const running = {
  async inspect() {
    return { raw: JSON.stringify([{ status: { state: 'running' }, configuration: { publishedPorts: [
      { containerPort: 8787, hostAddress: '127.0.0.1', hostPort: 1 },
      { containerPort: 8791, hostAddress: '127.0.0.1', hostPort: 2 },
    ] } }]) }
  },
}

function deps(extra = {}) {
  return {
    session: { phase: 'running', history: [], containerName: 'kitesurf-dev' },
    backend: running,
    env: { DSH_HOME: '/tmp/.dsh-dev' },
    prepareTimeoutMs: 0,
    spawnPty() {
      return spawn('/bin/cat', { stdio: ['pipe', 'pipe', 'pipe'] })
    },
    ...extra,
  }
}

test('term.session.create without sessionId does not listen and is not term-1', async () => {
  const routes = routesFor(deps())
  const result = await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 1, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { cols: 80, rows: 24 } },
  })
  const decoded = decodeMcpReply(result.body)
  assert.equal(decoded.ok, false)
  assert.equal(JSON.stringify(result.body).includes('term-1'), false)
  assert.equal(JSON.stringify(result.body).includes('ws://'), false)
})

test('term.session.create round-trips bytes on the returned socket', async () => {
  const routes = routesFor(deps())
  const result = await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 2, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { sessionId: 'sess-live', cols: 80, rows: 24 } },
  })
  const decoded = decodeMcpReply(result.body)
  assert.equal(decoded.ok, true)
  assert.equal(decoded.data.attach.protocol, 'dnt-ws-v1')
  assert.equal(Object.hasOwn(decoded.data.attach, 'path'), false)
  assert.match(decoded.data.attach.url, /^ws:\/\/127\.0\.0\.1:\d+\/term\?session=sess-live&token=[0-9a-f]{32}$/)
  const forged = new URL(decoded.data.attach.url)
  forged.searchParams.delete('token')
  const refusedOpen = await new Promise((resolve) => {
    const probe = new WebSocket(forged.toString())
    probe.addEventListener('open', () => { probe.close(); resolve(true) })
    probe.addEventListener('error', () => resolve(false))
  })
  assert.equal(refusedOpen, false, 'an attach without the token must not upgrade')
  const ws = new WebSocket(decoded.data.attach.url)
  const echoed = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('no echo')), 3000)
    ws.addEventListener('open', () => ws.send(new Uint8Array([104, 105, 10])))
    ws.addEventListener('message', async (event) => {
      clearTimeout(timer)
      const data = event.data
      const buf = typeof data === 'string' ? Buffer.from(data) : Buffer.from(await data.arrayBuffer())
      resolve(buf.toString('utf8'))
    })
  })
  assert.equal(echoed, 'hi\n')
  await new Promise((resolve) => {
    ws.addEventListener('close', () => resolve())
    ws.close()
  })
  await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 3, method: 'tools/call',
    params: { name: 'term.session.close', arguments: { id: 'sess-live' } },
  })
})

test('the same session reuses one pty and a stopped container returns no url', async () => {
  const routes = routesFor(deps())
  const first = decodeMcpReply((await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 4, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { sessionId: 'sess-once', cols: 40, rows: 12 } },
  })).body)
  const second = decodeMcpReply((await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 5, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { sessionId: 'sess-once', cols: 40, rows: 12 } },
  })).body)
  assert.equal(first.data.id, second.data.id)
  assert.equal(first.data.attach.url, second.data.attach.url)
  await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 6, method: 'tools/call',
    params: { name: 'term.session.close', arguments: { id: 'sess-once' } },
  })
  const down = routesFor(deps({
    backend: { async inspect() { return { raw: JSON.stringify([{ status: { state: 'stopped' }, configuration: { publishedPorts: [] } }]) } } },
  }))
  const refused = decodeMcpReply((await call(down['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 7, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { sessionId: 'sess-down', cols: 80, rows: 24 } },
  })).body)
  assert.equal(refused.ok, false)
  assert.equal(JSON.stringify(refused).includes('ws://'), false)
})

test('container pty is asked to exec inside the named container', () => {
  let seen = null
  const child = spawnContainerPty('kitesurf-dev', { cols: 80, rows: 24 }, {
    spawnPty(argv) {
      seen = argv
      return spawn('/bin/cat', { stdio: ['pipe', 'pipe', 'pipe'] })
    },
  })
  child.kill('SIGKILL')
  assert.deepEqual(seen, ['container', 'exec', '-it', 'kitesurf-dev', '/bin/sh'])
})

test('term.create goes through backend.openPty with the env container name', async () => {
  let opened = null
  const routes = routesFor(deps({
    spawnPty: undefined,
    backend: {
      ...running,
      openPty(name, spec) {
        opened = { name, spec }
        return spawn('/bin/cat', { stdio: ['pipe', 'pipe', 'pipe'] })
      },
    },
  }))
  const result = await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 31, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { sessionId: 'sess-route', cols: 90, rows: 33 } },
  })
  const decoded = decodeMcpReply(result.body)
  assert.equal(decoded.ok, true)
  assert.equal(opened?.name, 'kitesurf-dev')
  assert.equal(opened?.spec?.cols, 90)
  assert.equal(opened?.spec?.rows, 33)
  await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 32, method: 'tools/call',
    params: { name: 'term.session.close', arguments: { id: 'sess-route' } },
  })
})

test('a stale policy does not listen', async () => {
  const routes = routesFor(deps({ termPolicyStale: true }))
  const result = await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 11, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { sessionId: 'sess-stale', cols: 80, rows: 24 } },
  })
  const decoded = decodeMcpReply(result.body)
  assert.equal(decoded.ok, false)
  assert.equal(decoded.error?.errorId, 'sandbox.instance.policy-stale')
  assert.equal(JSON.stringify(result.body).includes('ws://'), false)
})

test('a changed live policy fingerprint blocks create from the registry row', async () => {
  const { policyFingerprint } = await import('../src/host/policy-adapter.js')
  let spawned = 0
  const staleFingerprint = policyFingerprint({ sessionId: 'sess-policy', mode: 'read-only', workspaceRoot: '/work', extraRoots: [] })
  const routes = routesFor(deps({
    policy: () => ({ mode: 'danger-full-access', workspaceRoot: '/work', extraRoots: [] }),
    registry: { instances: new Map([['i1', { sessionId: 'sess-policy', policyFingerprint: staleFingerprint }]]) },
    spawnPty() { spawned += 1; return spawn('/bin/cat', { stdio: ['pipe', 'pipe', 'pipe'] }) },
  }))
  const result = await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 21, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { sessionId: 'sess-policy', cols: 80, rows: 24 } },
  })
  const decoded = decodeMcpReply(result.body)
  assert.equal(decoded.ok, false)
  assert.equal(decoded.error?.errorId, 'sandbox.instance.policy-stale')
  assert.equal(spawned, 0)
  assert.equal(JSON.stringify(result.body).includes('ws://'), false)
})

test('overlapping status reads share one probe pass', async () => {
  let inspects = 0
  const routes = routesFor(deps({
    session: { phase: 'running', history: [], containerName: 'kitesurf-dev', httpBase: 'http://127.0.0.1:1' },
    backend: { async inspect() { inspects += 1; await new Promise((r) => setTimeout(r, 30)); return running.inspect() } },
  }))
  const get = async () => {
    let raw = ''
    const res = { statusCode: 0, setHeader() {}, end(text) { raw = text } }
    await routes['/nano-local-sandbox/status'].handler({ method: 'GET', url: '/nano-local-sandbox/status' }, res)
    return JSON.parse(raw)
  }
  const [a, b, c] = await Promise.all([get(), get(), get()])
  assert.equal(inspects, 1)
  assert.equal(a.epoch, b.epoch)
  assert.equal(b.epoch, c.epoch)
  await get()
  assert.equal(inspects, 2, 'a later read probes again; nothing is cached past the pass')
})

test('resetClient bumps generation and records one network gap', () => {
  const session = { cdp: { close() {} }, network: [{ url: 'https://example.com' }] }
  resetClient(session)
  assert.equal(session.cdp, null)
  assert.equal(session.cdpGeneration, 1)
  assert.equal(session.network.filter((row) => row.gap === true).length, 1)
  resetClient(session)
  assert.equal(session.cdpGeneration, 2)
  assert.equal(session.network.filter((row) => row.gap === true).length, 2)
})

test('resize reaches the pty: stty sees the new size', { skip: process.platform === 'win32' }, async () => {
  const child = spawnPtyProcess(['/bin/sh', '-c', 'stty size; read x; stty size'], { cols: 80, rows: 24 })
  let seen = ''
  child.stdout.on('data', (chunk) => { seen += chunk.toString('utf8') })
  const waitFor = (re) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no ${re} in ${JSON.stringify(seen)}`)), 5000)
    const tick = setInterval(() => { if (re.test(seen)) { clearTimeout(timer); clearInterval(tick); resolve() } }, 20)
  })
  try {
    await waitFor(/24 80/)
    child.resize(100, 30)
    await new Promise((resolve) => setTimeout(resolve, 100))
    child.stdin.write('\n')
    await waitFor(/30 100/)
  } finally {
    child.kill('SIGKILL')
  }
})

test('term.session.* failures use frozen dnt kinds and HTTP status, not new errorIds', async () => {
  const routes = routesFor(deps())
  const noSession = await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 41, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { cols: 80, rows: 24 } },
  })
  assert.equal(noSession.status, 400)
  assert.equal(noSession.body.result.kind, 'needs_target')
  assert.equal(noSession.body.result.errorId, undefined)
  const gone = await call(routes['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 42, method: 'tools/call',
    params: { name: 'term.session.read', arguments: { id: 'never-opened' } },
  })
  assert.equal(gone.status, 404)
  assert.equal(gone.body.result.kind, 'not_found')
  const down = routesFor(deps({
    backend: { async inspect() { return { raw: JSON.stringify([{ status: { state: 'stopped' }, configuration: { publishedPorts: [] } }]) } } },
  }))
  const unavailable = await call(down['/nano-local-sandbox/mcp'], {
    jsonrpc: '2.0', id: 43, method: 'tools/call',
    params: { name: 'term.session.create', arguments: { sessionId: 'sess-k', cols: 80, rows: 24 } },
  })
  assert.equal(unavailable.status, 409)
  assert.equal(unavailable.body.result.kind, 'unavailable')
})
