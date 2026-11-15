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

test('/rpc still whitelists manifest.get + corpus.list/corpus.read/claim.read', async () => {
  const h = pipelineRpcHandler({})
  // A whitelisted name passes the method gate and only fails later (no s3
  // target configured → a different rejection, NOT unknown-method). That
  // proves the name is accepted; the alias names fail AT the gate.
  for (const method of ['manifest.get', 'corpus.list', 'corpus.read', 'claim.read']) {
    const r = await call(h, { method, target: 'nonexistent' })
    assert.notEqual(r.json.reason, 'unknown-method', `${method} should pass the method gate`)
  }
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
