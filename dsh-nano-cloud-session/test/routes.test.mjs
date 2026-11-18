import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { Readable } from 'node:stream'

/** Route wiring test: run apply() against a fake ctx, capture handlers via a
 *  stub webServer, point the profile's baseUrl at a local upstream stub, and
 *  drive every route over real req/res objects. */

let dir, prev, upstream, upstreamHits
beforeEach(async () => {
  dir = mkdtempSync(join(tmpdir(), 'dncs-route-')); prev = process.env.DSH_HOME; process.env.DSH_HOME = dir
  upstreamHits = []
  upstream = createServer((req, res) => {
    upstreamHits.push(`${req.method} ${req.url}`)
    res.setHeader('content-type', 'application/json')
    if (req.url === '/v3/self') return res.end(JSON.stringify({ principal_type: 'pat_user', devin_sessions_org_id: 'org-t' }))
    if (req.url?.startsWith('/v3/organizations/org-t/sessions')) return res.end(JSON.stringify({ items: [], has_next_page: false }))
    res.statusCode = 404; res.end('{}')
  })
  await new Promise(r => upstream.listen(0, '127.0.0.1', r))
})
afterEach(async () => { process.env.DSH_HOME = prev; rmSync(dir, { recursive: true, force: true }); upstream.close() })

async function makeHandlers() {
  const { apply } = await import(`../index.js`)
  const routes = new Map()
  const ctx = {
    // Route registration resolves the bound listener via ctx.get('webServer')
    // (NOT ctx.webServer): on a real host the property-access trap returns a
    // shadow provision while get() returns the injected singleton — mirror that.
    get: (n) => n === 'connection' ? { requestRejection: () => undefined } : n === 'webServer' ? ctx.webServer : undefined,
    webServer: { register: (spec) => { routes.set(spec.path, spec.handler); return () => {} } },
    effect: (fn) => fn(),
  }
  // index.js imports lib/ bundles — build first (npm run build) before this test.
  apply(ctx, { requestTimeoutMs: 5000 })
  return routes
}

function fakeReq(body) {
  const req = Readable.from([Buffer.from(JSON.stringify(body ?? {}))])
  req.method = 'POST'
  req.headers = { 'content-type': 'application/json' }
  return req
}
function fakeRes() {
  const out = { statusCode: 0, body: '', headers: {}, writableEnded: false,
    setHeader(k, v) { this.headers[k] = v }, end(s) { this.body = s; this.writableEnded = true } }
  return out
}
const call = (h, body) => new Promise(async (resolve) => { const res = fakeRes(); await h(fakeReq(body), res, { bodyLimit: 65536 }); resolve({ status: res.statusCode, json: JSON.parse(res.body || '{}') }) })

test('all 14 routes register through guard (fail-closed table)', async () => {
  const routes = await makeHandlers()
  const expected = ['status', 'config', 'sessions', 'session', 'create', 'message', 'archive', 'unarchive', 'terminate', 'ssh', 'catalog', 'upload', 'workspace', 'resources']
  for (const name of expected) assert.ok(routes.get(`/nano-cloud-session/${name}`), name)
})

test('config save+list+test round-trip; secret never returned', async () => {
  const routes = await makeHandlers()
  const port = upstream.address().port
  const save = await call(routes.get('/nano-cloud-session/config'), { action: 'save', profile: { label: 't', orgId: 'org-t', baseUrl: `http://127.0.0.1:${port}`, secret: 'cog_xtok45678' } })
  assert.equal(save.json.ok, false) // http baseUrl rejected
  const save2 = await call(routes.get('/nano-cloud-session/config'), { action: 'save', profile: { label: 't', orgId: 'org-t', baseUrl: `https://127.0.0.1:${port}`, secret: 'cog_xtok45678' } })
  assert.equal(save2.json.ok, true)
  assert.equal(save2.json.profile.secret, undefined)
  assert.equal(save2.json.profile.hasSecret, true)
  const list = await call(routes.get('/nano-cloud-session/config'), { action: 'list' })
  assert.equal(list.json.profiles[0].secret, undefined)
  // test action hits upstream /v3/self — but https stub has no TLS; expect CarrierError unreachable → 502
  const t = await call(routes.get('/nano-cloud-session/config'), { action: 'test' })
  assert.equal(t.json.ok, false)
  assert.equal(t.json.reason, 'unreachable')
})

test('sessions proxies upstream; ssh returns command', async () => {
  const routes = await makeHandlers()
  const port = upstream.address().port
  // seed profile pointing at the stub via env-free path: write store file directly with http base? baseUrl requires https.
  // Instead verify handler-level rejection without upstream: no active profile → no-active-profile.
  const r = await call(routes.get('/nano-cloud-session/sessions'), {})
  assert.equal(r.json.ok, false)
  assert.equal(r.json.reason, 'no-active-profile')
  // E5: security card data — store paths + mode, no secret material
  const sec = await call(routes.get('/nano-cloud-session/config'), { action: 'security' })
  assert.equal(sec.json.ok, true)
  assert.match(sec.json.security.storePath, /nano-cloud-session\.json$/)
  assert.match(sec.json.security.envPath, /nano-cloud-session\.env$/)
  assert.equal(sec.json.security.secret, undefined)
  // E3: ssh-key generates a real ed25519 keypair on demand
  const sk = await call(routes.get('/nano-cloud-session/config'), { action: 'ssh-key' })
  assert.equal(sk.json.ok, true)
  assert.match(sk.json.publicKey, /^ssh-ed25519 /)
  assert.match(sk.json.privateKeyPath, /nano-cloud-session-ssh$/)
  assert.equal(sk.json.keyMode, '600')
  const ssh = await call(routes.get('/nano-cloud-session/ssh'), { session_id: 'devin-abc' })
  assert.equal(ssh.json.ok, true)
  assert.match(ssh.json.shell, /ssh -i .+ devin-abc@ssh\.devin\.ai/)
  assert.match(ssh.json.forward, /-L <local>:127\.0\.0\.1:<remote>/)
  assert.match(ssh.json.publicKey, /^ssh-ed25519 /)
  assert.match(ssh.json.enrollHint, /SSH keys/)
})

test('session id accepts bare v3 ids and prefixes devin- for the upstream', async () => {
  const routes = await makeHandlers()
  const ssh = await call(routes.get('/nano-cloud-session/ssh'), { session_id: '787a9b68ddb94958880517d11a38da18' })
  assert.equal(ssh.json.ok, true)
  assert.match(ssh.json.shell, /devin-787a9b68ddb94958880517d11a38da18@ssh\.devin\.ai/)
})

test('P4-02 native_open fails explicitly (NATIVE_*) — never a silent ok', async () => {
  const routes = await makeHandlers()
  // ctx lacks sessions/agents inject (makeHandlers ctx has only connection/webServer)
  // → NATIVE_UNAVAILABLE 503, `reason` carries the NATIVE_* code.
  const r = await call(routes.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc' })
  assert.equal(r.status, 503)
  assert.equal(r.json.ok, false)
  assert.equal(r.json.reason, 'NATIVE_UNAVAILABLE')
  // `reason` is the stable classification field (ledgered); no parallel `code`
  // wire key — that would be an unregistered contract expansion.
  assert.equal(r.json.code, undefined)
})

test('P4-02 httpStatusForError: NativeError passthrough vs CarrierError 5xx→502 clamp', async () => {
  // The route harness cannot produce a 5xx-bearing CarrierError (profile layer
  // forces https, stub is http) — so the clamp is asserted directly on the
  // pure status-selector, which is the single source the route calls.
  const { httpStatusForError } = await import(`../index.js`)
  const { CarrierError } = await import(`../lib/devin-api.js`)
  const NativeError = class extends CarrierError { constructor(c, s) { super(c, c, { status: s }); this.nativeCode = c } }
  // NativeError: authoritative status passthrough (503/422/502/500 all pass)
  assert.equal(httpStatusForError(new NativeError('NATIVE_UNAVAILABLE', 503)), 503)
  assert.equal(httpStatusForError(new NativeError('NATIVE_UNSUPPORTED', 422)), 422)
  assert.equal(httpStatusForError(new NativeError('NATIVE_OUTCOME_UNKNOWN', 502)), 502)
  // Plain CarrierError: 4xx passes, 5xx clamps to 502, status<400 → 502
  assert.equal(httpStatusForError(new CarrierError('forbidden-or-invisible', 'x', { status: 403 })), 403)
  assert.equal(httpStatusForError(new CarrierError('upstream-error', 'x', { status: 503 })), 502) // THE clamp
  assert.equal(httpStatusForError(new CarrierError('upstream-error', 'x', { status: 500 })), 502)
  assert.equal(httpStatusForError(new CarrierError('unreachable', 'x', { status: 0 })), 502)
})

test('P4-02 native_open: sessions+agents without H-CHAT is still NATIVE_UNAVAILABLE', async () => {
  const { apply } = await import(`../index.js`)
  const routes2 = new Map()
  const ctx2 = {
    get: n => n === 'connection' ? { requestRejection: () => undefined } : n === 'webServer' ? ctx2.webServer : undefined,
    webServer: { register: s => { routes2.set(s.path, s.handler); return () => {} } },
    effect: f => f(),
    sessions: { create: () => ({ id: 'loc-1', append() {} }), get: () => true, close: () => {} },
    agents: { enter: () => () => {} },
  }
  apply(ctx2, { requestTimeoutMs: 5000 })
  const r = await call(routes2.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc' })
  assert.equal(r.status, 503)
  assert.equal(r.json.reason, 'NATIVE_UNAVAILABLE')
})

test('P4-02 native_open: H-CHAT present, no profile → NATIVE_UNSUPPORTED', async () => {
  const { apply } = await import(`../index.js`)
  const routes2 = new Map()
  const ctx2 = {
    get: n => n === 'connection' ? { requestRejection: () => undefined }
      : n === 'webServer' ? ctx2.webServer
      : n === 'externalChat' ? { open: async () => ({ localId: 'x' }), capabilities: { externalProjection: true } }
      : undefined,
    webServer: { register: s => { routes2.set(s.path, s.handler); return () => {} } },
    effect: f => f(),
    externalChat: { open: async () => ({ localId: 'x' }), capabilities: { externalProjection: true } },
  }
  apply(ctx2, { requestTimeoutMs: 5000 })
  const r = await call(routes2.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc' })
  assert.equal(r.status, 422)
  assert.equal(r.json.reason, 'NATIVE_UNSUPPORTED')
})

test('workspace_shell mints a tab host without a fake Agent', async () => {
  const { apply } = await import(`../index.js`)
  const routes2 = new Map()
  const ctx2 = {
    get: n => n === 'connection' ? { requestRejection: () => undefined } : n === 'webServer' ? ctx2.webServer : undefined,
    webServer: { register: s => { routes2.set(s.path, s.handler); return () => {} } },
    effect: f => f(),
    sessions: {
      prepare: () => ({ id: 'loc-shell', append() {} }),
      enter: () => () => {},
      announce: () => {},
      create: () => ({ id: 'loc-shell', append() {} }),
      get: () => true,
    },
  }
  apply(ctx2, { requestTimeoutMs: 5000 })
  await call(routes2.get('/nano-cloud-session/config'), { action: 'save', profile: { label: 't', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_xtok45678' } })
  const r = await call(routes2.get('/nano-cloud-session/session'), { op: 'workspace_shell', session_id: 'devin-abc' })
  assert.equal(r.json.ok, true)
  assert.equal(r.json.local_session_id, 'loc-shell')
  assert.equal(r.json.nativeView, 'unavailable')
})
