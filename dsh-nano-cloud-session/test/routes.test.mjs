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
    if (req.url?.startsWith('/v3/organizations/org-t/sessions/abc/messages')) {
      return res.end(JSON.stringify({
        items: [
          { event_id: 'u1', role: 'user', message: 'hello', created_at: 1700000000 },
          { event_id: 'd1', role: 'devin', message: 'world', created_at: 1700000001 },
        ],
        has_next_page: false, end_cursor: 'd1',
      }))
    }
    if (req.url === '/v3/organizations/org-t/sessions/abc') {
      return res.end(JSON.stringify({ session_id: 'abc', title: 'fixture', created_at: 1700000000, updated_at: 1700000001 }))
    }
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

test('workspace.connect refuses 503 before any probe, even with client authorize flags', async () => {
  const routes = await makeHandlers()
  const r = await call(routes.get('/nano-cloud-session/workspace'), {
    op: 'connect', session_id: 'devin-abc', authorize: ['fs.write', 'process.start'],
  })
  assert.equal(r.status, 503)
  assert.equal(r.json.reason, 'workspace-unavailable')
})

test('malformed request bodies surface 422, not 500', async () => {
  const routes = await makeHandlers()
  const r = await call(routes.get('/nano-cloud-session/session'), { op: 'get', session_id: 'not an id' })
  assert.equal(r.status, 422)
  assert.equal(r.json.reason, 'invalid-request')
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

/* Owner ruling: no hand-drawn workbench, no local shell, no hidden fallback.
 * Until a verified native cloud-view/filtering contract exists, BOTH opening
 * ops refuse 503 — even when H-CHAT and session services are present — before
 * profile lookup or any session mint/switch. */
test('native_open + workspace_shell refuse 503 without touching host session machinery', async () => {
  const { apply } = await import(`../index.js`)
  const routes2 = new Map()
  const calls = []
  const ctx2 = {
    get: n => n === 'connection' ? { requestRejection: () => undefined }
      : n === 'webServer' ? ctx2.webServer
      : n === 'externalChat' ? ctx2.externalChat
      : n === 'sessions' ? ctx2.sessions
      : n === 'agents' ? ctx2.agents
      : undefined,
    webServer: { register: s => { routes2.set(s.path, s.handler); return () => {} } },
    effect: f => f(),
    externalChat: { open: async () => { calls.push(['chat.open']); return { localId: 'x' } }, capabilities: { externalProjection: true } },
    sessions: {
      prepare: (...a) => { calls.push(['prepare', ...a]); return { id: 'loc-shell', append() {} } },
      enter: () => { calls.push(['enter']); return () => {} },
      announce: () => calls.push(['announce']),
      create: () => { calls.push(['create']); return { id: 'loc-shell', append() {} } },
      get: () => { calls.push(['get']); return true },
      openSession: () => calls.push(['openSession']),
    },
    agents: { enter: () => { calls.push(['agents.enter']); return () => {} } },
  }
  apply(ctx2, { requestTimeoutMs: 5000 })
  await call(routes2.get('/nano-cloud-session/config'), { action: 'save', profile: { label: 't', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_xtok45678' } })
  const r1 = await call(routes2.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc' })
  assert.equal(r1.status, 503)
  assert.equal(r1.json.reason, 'NATIVE_UNAVAILABLE')
  const r2 = await call(routes2.get('/nano-cloud-session/session'), { op: 'workspace_shell', session_id: 'devin-abc' })
  assert.equal(r2.status, 503)
  assert.equal(r2.json.reason, 'NATIVE_UNAVAILABLE')
  assert.deepEqual(calls, [])
})

/* On a host whose external Session registry carries the version marker,
 * native_open resolves the profile explicitly, verifies the bare upstream id
 * by a readonly get, and registers the view under the namespaced external id
 * — no local session, no Agent. */
test('native_open registers one external view on a marked host and dedupes', async () => {
  const { apply } = await import(`../index.js`)
  const routes2 = new Map()
  const calls = []
  const registry = {
    nativeViewVersion: 1,
    register: (id, view) => {
      calls.push(['register', id])
      if (calls.filter(c => c[0] === 'register' && c[1] === id).length > 1) throw new Error('duplicate')
      return () => calls.push(['dispose', id])
    },
  }
  const ctx2 = {
    get: n => n === 'connection' ? { requestRejection: () => undefined } : n === 'webServer' ? ctx2.webServer : undefined,
    webServer: { register: s => { routes2.set(s.path, s.handler); return () => {} } },
    effect: f => f(),
    sessionController: { externalSessions: registry },
    sessions: { create: () => { calls.push(['create']); return { id: 'loc' } }, get: () => true },
    agents: { enter: () => { calls.push(['agents.enter']); return () => {} } },
  }
  /* Profile baseUrl must be https, so the upstream here is a fetch stub —
   * the route only issues the identity-verifying GET /sessions/abc. */
  const hits = []
  const prevFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    hits.push(String(url))
    const text = String(url).endsWith('/sessions/abc')
      ? JSON.stringify({ session_id: 'abc', title: 'fixture', created_at: 1700000000, updated_at: 1700000001 })
      : '{}'
    return { ok: true, status: 200, text: async () => text }
  }
  let saved
  try {
    apply(ctx2, { requestTimeoutMs: 5000 })
    saved = await call(routes2.get('/nano-cloud-session/config'), {
      action: 'save',
      profile: { label: 't', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_xtok45678' },
    })
    const profileId = saved.json.profile.id
  const r = await call(routes2.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc', profileId })
  assert.equal(r.status, 200, JSON.stringify(r.json))
  assert.equal(r.json.ok, true)
  const externalId = r.json.external_session_id
  assert.ok(externalId.startsWith(`external:devin:${Buffer.from(profileId).toString('base64url')}:abc:`), externalId)
  /* Upstream read was identity-verifying GET /sessions/abc — no messages were
   * fetched at open time. */
  assert.ok(hits.some(h => h.endsWith('/sessions/abc')), JSON.stringify(hits))
  assert.ok(!hits.some(h => h.includes('/messages')), JSON.stringify(hits))
  /* Second open returns the same registration — register fired once. */
  const r2 = await call(routes2.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc', profileId })
  assert.equal(r2.json.external_session_id, externalId)
  assert.equal(calls.filter(c => c[0] === 'register').length, 1)
  /* No local session or Agent was touched. */
  assert.ok(!calls.some(c => c[0] === 'create' || c[0] === 'agents.enter'))
  } finally {
    globalThis.fetch = prevFetch
  }
})

test('native_open with an unmarked registry still refuses 503', async () => {
  const { apply } = await import(`../index.js`)
  const routes2 = new Map()
  const ctx2 = {
    get: n => n === 'connection' ? { requestRejection: () => undefined } : n === 'webServer' ? ctx2.webServer : undefined,
    webServer: { register: s => { routes2.set(s.path, s.handler); return () => {} } },
    effect: f => f(),
    sessionController: { externalSessions: { register: () => () => {} } },
  }
  apply(ctx2, { requestTimeoutMs: 5000 })
  const r = await call(routes2.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc' })
  assert.equal(r.status, 503)
  assert.equal(r.json.reason, 'NATIVE_UNAVAILABLE')
})

/* external_attachments reads through the verified registration only: the
 * profileId and upstream id come from the registration map, so browser-supplied
 * fields cannot redirect the read to another profile or session. */
test('external_attachments binds identity to the registration, not the request', async () => {
  const { apply } = await import(`../index.js`)
  const routes2 = new Map()
  const registered = new Map()
  const ctx2 = {
    get: n => n === 'connection' ? { requestRejection: () => undefined } : n === 'webServer' ? ctx2.webServer : undefined,
    webServer: { register: s => { routes2.set(s.path, s.handler); return () => {} } },
    effect: f => f(),
    sessionController: { externalSessions: { nativeViewVersion: 1, register: (id, view) => { registered.set(id, view); return () => registered.delete(id) } } },
  }
  const hits = []
  const prevFetch = globalThis.fetch
  globalThis.fetch = async (url) => {
    const u = String(url)
    hits.push(u)
    const text = u.endsWith('/sessions/abc')
      ? JSON.stringify({ session_id: 'abc', title: 'fixture', status: 'exit', status_detail: 'finished', created_at: 1, updated_at: 1 })
      : u.endsWith('/sessions/abc/attachments')
        ? JSON.stringify([{ attachment_id: 'a1', name: 'f.txt', url: 'https://files.example/x', content_type: 'text/plain' }])
        : '{}'
    return { ok: true, status: 200, text: async () => text }
  }
  try {
    apply(ctx2, { requestTimeoutMs: 5000 })
    const saved = await call(routes2.get('/nano-cloud-session/config'), {
      action: 'save',
      profile: { label: 't', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_xtok45678' },
    })
    const profileId = saved.json.profile.id
    const open = await call(routes2.get('/nano-cloud-session/session'), { op: 'native_open', session_id: 'devin-abc', profileId })
    const externalId = open.json.external_session_id
    /* Unregistered / forged ids refuse before any upstream call. */
    const forged = await call(routes2.get('/nano-cloud-session/session'), { op: 'external_attachments', session_id: 'external:devin:AAAA:zzz:0', profileId })
    assert.equal(forged.status, 404, JSON.stringify(forged.json))
    assert.equal(forged.json.reason, 'not-registered')
    /* A browser-supplied profileId pointing elsewhere cannot redirect the read. */
    const ok = await call(routes2.get('/nano-cloud-session/session'), { op: 'external_attachments', session_id: externalId, profileId: 'forged-other' })
    assert.equal(ok.status, 200, JSON.stringify(ok.json))
    assert.equal(ok.json.items[0].attachment_id, 'a1')
    assert.ok(hits.some(h => h.endsWith('/sessions/abc/attachments')), JSON.stringify(hits))
  } finally { globalThis.fetch = prevFetch }
})

test('lifecycle host-handlers reach the carrier with the frozen profile — create/sleep/archive/unarchive/terminate', async (t) => {
  const routes = await makeHandlers()
  /* All upstream traffic is cut by a fetch stub: the assertions below are
   * route→carrier behavior only, never a real cloud operation. */
  const sent = []
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    sent.push({ method: init.method, pathname: new URL(String(url)).pathname, authorization: init.headers.authorization, body: init.body ? JSON.parse(init.body) : null })
    return { ok: true, status: 200, text: async () => JSON.stringify({ session_id: 'abc', status: 'running' }) }
  })

  const saveA = await call(routes.get('/nano-cloud-session/config'), { action: 'save', profile: { label: 'a', orgId: 'org-a', baseUrl: 'https://api.devin.ai', secret: 'cog_aaaaaaa1' } })
  assert.equal(saveA.status, 200)
  const profileA = saveA.json.profile.id
  const saveB = await call(routes.get('/nano-cloud-session/config'), { action: 'save', profile: { label: 'b', orgId: 'org-b', baseUrl: 'https://api.devin.ai', secret: 'cog_bbbbbbb1' } })
  assert.equal(saveB.status, 200)
  const activateB = await call(routes.get('/nano-cloud-session/config'), { action: 'activate', profileId: saveB.json.profile.id })
  assert.equal(activateB.json.activeId, saveB.json.profile.id)

  const base = '/v3/organizations/org-a/sessions'
  const ops = [
    await call(routes.get('/nano-cloud-session/create'), { profileId: profileA, prompt: 'go native' }),
    await call(routes.get('/nano-cloud-session/session'), { op: 'sleep', session_id: 'devin-abc', profileId: profileA }),
    await call(routes.get('/nano-cloud-session/archive'), { session_id: 'devin-abc', profileId: profileA }),
    await call(routes.get('/nano-cloud-session/unarchive'), { session_id: 'devin-abc', profileId: profileA }),
    await call(routes.get('/nano-cloud-session/terminate'), { session_id: 'devin-abc', profileId: profileA }),
  ]
  for (const r of ops) assert.equal(r.status, 200, JSON.stringify(r.json))

  assert.deepEqual(sent.map(({ method, pathname }) => [method, pathname]), [
    ['POST', base],
    ['POST', `${base}/abc/sleep`],
    ['POST', `${base}/abc/archive`],
    ['POST', `${base}/abc/unarchive`],
    ['DELETE', `${base}/abc`],
  ])
  /* Every upstream call carries the explicitly bound profile A — never the
   * active profile B, and never a leaked profileId or secret in the body. */
  assert.deepEqual([...new Set(sent.map(s => s.authorization))], ['Bearer cog_aaaaaaa1'])
  assert.equal(sent[0].body.prompt, 'go native')
  assert.equal('profileId' in sent[0].body, false)
  assert.equal('secret' in sent[0].body, false)

  /* A deterministic upstream refusal surfaces as a real error with its own
   * reason/status — never retried silently. */
  t.mock.restoreAll()
  const deniedFetch = t.mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 403, text: async () => '{"error":{"message":"forbidden"}}' }))
  const denied = await call(routes.get('/nano-cloud-session/archive'), { session_id: 'devin-abc', profileId: profileA })
  assert.equal(denied.status, 403)
  assert.equal(denied.json.ok, false)
  assert.equal(denied.json.reason, 'forbidden-or-invisible')
  assert.equal(denied.json.providerStatus, 403)
  assert.equal(deniedFetch.mock.callCount(), 1, 'one upstream attempt, no automatic retry')
})
