import { test } from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pipelineRpcHandler } from '../src/host/pipeline.js'

/* P4-04 / F21.6: the retired alias names must be rejected by name — `/rpc`
 * keeps only `manifest.get` (+ corpus.list/corpus.read/claim.read); the
 * `lsrag.manifest` delegate is retired and must answer unknown-method BEFORE
 * any S3 target resolution. `/s3/config` keeps only `probe`; `testOne` is a
 * retired action that falls to the unknown-action branch. */

const req = body => { const r = Readable.from([Buffer.from(JSON.stringify(body ?? {}))]); r.method = 'POST'; r.headers = { 'content-type': 'application/json' }; return r }
const res = () => ({ statusCode: 0, body: '', headers: {}, setHeader(k, v) { this.headers[k] = v }, end(s) { this.body = s } })
const call = async (h, body) => { const r = res(); await h(req(body), r, { bodyLimit: 4096 }); return { status: r.statusCode, json: JSON.parse(r.body || '{}') } }

test('/rpc retires lsrag.manifest → unknown-method (before target resolution)', async () => {
  const h = pipelineRpcHandler({ /* no s3 ctx needed: rejected by name first */ })
  const r = await call(h, { method: 'lsrag.manifest' })
  assert.equal(r.json.ok, false)
  assert.equal(r.json.reason, 'unknown-method')
  assert.equal(r.json.method, 'lsrag.manifest')
})

test('/rpc whitelisted methods pass the gate and reach their branch', async () => {
  /* A whitelisted method clears the gate AND dispatches to its case — each
   * calls an s3 method that throws a DISTINCTIVE marker → 'failed' with the
   * marker. An unknown method dies at the gate → 'unknown-method'. This proves
   * gate-clearance + dispatch, not just Set membership. */
  const MARK = '__s3-marker__'
  const s3 = {
    getJson: async () => { throw new Error(MARK) },
    getBytes: async () => { throw new Error(MARK) },
    list: async () => { throw new Error(MARK) },
  }
  const h = pipelineRpcHandler({ _s3ForTest: s3 })
  for (const method of ['manifest.get', 'corpus.list', 'corpus.read', 'claim.read']) {
    const r = await call(h, { method, params: method === 'corpus.read' ? { key: 'kb-x' } : method === 'claim.read' ? { key: 'sess-1' } : {} })
    assert.equal(r.json.reason, 'failed', `${method} should clear gate, reach s3, and fail with the marker`)
    assert.ok(String(r.json.message).includes(MARK), `${method} should reach its s3 call`)
  }
})

test('/rpc manifest.get: denied/network failure surfaces as error, never forged into null', async () => {
  /* F21.7: null means "confirmed absent" (404) ONLY. A 403/network failure is
   * a real error → {ok:false,reason:'failed'}, NOT {ok:true,result:null}. The
   * _s3ForTest seam injects a stub whose getJson throws a non-404 denial. */
  const MARK = 'S3 GET sqlite/manifest.json failed: HTTP 403'
  const stubS3 = { getJson: async () => { throw new Error(MARK) }, list: async () => [], getBytes: async () => undefined }
  const h = pipelineRpcHandler({ _s3ForTest: stubS3 })
  const r = await call(h, { method: 'manifest.get', target: {} })
  assert.equal(r.json.ok, false)
  assert.equal(r.json.reason, 'failed')
  assert.ok(String(r.json.message).includes('HTTP 403'))
})

test('/s3/config retires testOne → unknown action', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'np-s3-alias-'))
  const prev = process.env.DSH_HOME; process.env.DSH_HOME = dir
  try {
    const { createSyncEngine } = await import('../src/host/s3-sync.js')
    const engine = createSyncEngine()
    // probe remains valid (no profile → its own failure, not unknown-action);
    // testOne must now fall to the default throw.
    await assert.rejects(() => engine.config({ action: 'testOne' }), /unknown s3 config action/)
    // probe is still a recognized action (reaches probeProfile, not the default).
    await assert.doesNotReject(() => engine.config({ action: 'probe', id: 'missing' }), /unknown s3 config action/)
  } finally { process.env.DSH_HOME = prev; rmSync(dir, { recursive: true, force: true }) }
})
