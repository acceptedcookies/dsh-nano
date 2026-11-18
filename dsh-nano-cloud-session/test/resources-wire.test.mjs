import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'

let dir, prev
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'dncs-res-')); prev = process.env.DSH_HOME; process.env.DSH_HOME = dir })
afterEach(() => { process.env.DSH_HOME = prev; rmSync(dir, { recursive: true, force: true }) })

async function makeHandlers() {
  const { apply } = await import(`../index.js?wire=${Date.now()}`)
  const routes = new Map()
  const ctx = {
    get: (n) => n === 'connection' ? { requestRejection: () => undefined } : n === 'webServer' ? ctx.webServer : undefined,
    webServer: { register: (spec) => { routes.set(spec.path, spec.handler); return () => {} } },
    effect: (fn) => fn(),
  }
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

test('T10 /resources rejects unknown op and missing scope without SSH', async () => {
  const routes = await makeHandlers()
  const unknown = await call(routes.get('/nano-cloud-session/resources'), { op: 'exec', scopeId: 'x', path: '.' })
  assert.equal(unknown.json.ok, false)
  assert.notEqual(unknown.json.reason, undefined)
  const missing = await call(routes.get('/nano-cloud-session/resources'), { op: 'fs.list', scopeId: 'no-such', path: '.' })
  assert.equal(missing.json.ok, false)
  assert.equal(missing.json.reason, 'workspace-scope-expired')
  assert.doesNotMatch(JSON.stringify(missing.json), /cog_/)
})
