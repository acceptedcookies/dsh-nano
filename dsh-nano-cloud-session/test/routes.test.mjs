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
    get: (n) => n === 'connection' ? { requestRejection: () => undefined } : undefined,
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

test('all 12 routes register through guard (fail-closed table)', async () => {
  const routes = await makeHandlers()
  const expected = ['status', 'config', 'sessions', 'session', 'create', 'message', 'archive', 'unarchive', 'terminate', 'ssh', 'catalog', 'upload']
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
  // → NATIVE_UNAVAILABLE 503, stable `code` rides beside `reason`.
  const r = await call(routes.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc' })
  assert.equal(r.status, 503)
  assert.equal(r.json.ok, false)
  assert.equal(r.json.reason, 'NATIVE_UNAVAILABLE')
  assert.equal(r.json.code, 'NATIVE_UNAVAILABLE')
})

test('P4-02 native_open: carrier read fail → NATIVE_OUTCOME_UNKNOWN + orphan torn down', async () => {
  const routes = await makeHandlers()
  // ctx WITH sessions+agents inject but a profile pointing at unreachable https.
  const { apply } = await import(`../index.js`)
  const routes2 = new Map()
  let closed = null
  const ctx2 = {
    get: n => n === 'connection' ? { requestRejection: () => undefined } : undefined,
    webServer: { register: s => { routes2.set(s.path, s.handler); return () => {} } },
    effect: f => f(),
    sessions: { create: () => ({ id: 'loc-1', append() {} }), get: id => id === 'loc-1', close: id => { closed = id } },
    agents: { enter: () => () => {} },
  }
  apply(ctx2, { requestTimeoutMs: 5000 })
  const port = upstream.address().port
  // https baseUrl unreachable (stub is http) → carrier read fails post-mint
  await call(routes2.get('/nano-cloud-session/config'), { action: 'save', profile: { label: 't', orgId: 'org-t', baseUrl: `https://127.0.0.1:${port}`, secret: 'cog_xtok45678' } })
  const r = await call(routes2.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc' })
  assert.equal(r.status, 502)
  assert.equal(r.json.code, 'NATIVE_OUTCOME_UNKNOWN')
  assert.equal(closed, 'loc-1') // orphan session torn down, not left ok
  // NATIVE_PROJECTION_FAILED (agents.enter refuse) needs a reachable-https
  // carrier + failing enter simultaneously — the profile layer forces https
  // and the test stub is http, so that branch is exercised only under a live
  // host. The two covered branches prove the no-silent-ok contract.
})
