import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { chmodSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import test from 'node:test'
import { createBridge, readHealth } from '../profiles/kitesurf/mcp-bridge.mjs'
import { publishHealth, runPublishHealth } from '../profiles/terminal/public-health.mjs'
import { createAppleBackend } from '../src/host/backend-apple.js'
import { createBridgePublisher } from '../src/host/bridge-projection.js'

const UID = process.getuid()
const ENV = 'dev'
const SBX = randomUUID()
const GEN = randomUUID()

const doc = (over = {}) => ({
  contractVersion: 'dnls.control/1',
  envId: ENV,
  sandboxId: SBX,
  generation: GEN,
  epoch: randomUUID(),
  seq: 1,
  observedAt: '2026-11-19T18:00:00.000Z',
  state: 'running',
  health: 'unknown',
  ...over,
})

function healthDir(t) {
  const dir = mkdtempSync(join(tmpdir(), 'dnls-health-'))
  chmodSync(dir, 0o700)
  t.after(() => rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('publish writes an exact allowlisted doc; read projects only the public summary', (t) => {
  const dir = healthDir(t)
  assert.deepEqual(publishHealth(doc(), { dir, envId: ENV, sandboxId: SBX, uid: UID }), { ok: true })
  const file = join(dir, 'dnls-public-health.json')
  assert.equal(statSync(file).mode & 0o777, 0o644)
  assert.deepEqual(readHealth(dir), {
    contractVersion: 'dnls.control/1',
    state: 'running',
    health: 'unknown',
    observedAt: '2026-11-19T18:00:00.000Z',
  })
  // The public projection never carries the private identity.
  const text = JSON.stringify(readHealth(dir))
  for (const leak of ['envId', 'sandboxId', 'generation', 'epoch', 'seq', SBX, GEN]) {
    assert.equal(text.includes(leak), false, `projection leaked ${leak}`)
  }
})

test('replay, epoch rebind, foreign identity and dir trust all reject without mutation', (t) => {
  const dir = healthDir(t)
  const denied = (fn) => assert.throws(fn, (e) => e?.errorId === 'dnls.health.publish')
  // The first publish for a document must be seq 1 — no mid-stream start.
  denied(() => publishHealth(doc({ seq: 5 }), { dir, envId: ENV, sandboxId: SBX, uid: UID }))
  const epoch = randomUUID()
  const base = doc({ epoch })
  publishHealth(base, { dir, envId: ENV, sandboxId: SBX, uid: UID })
  publishHealth(doc({ epoch, seq: 3 }), { dir, envId: ENV, sandboxId: SBX, uid: UID })
  // Same generation + epoch: seq must strictly increase.
  for (const seq of [3, 2, 0, -1, 1.5, 'x']) {
    denied(() => publishHealth(doc({ epoch, seq }), { dir, envId: ENV, sandboxId: SBX, uid: UID }))
  }
  // A fresh host epoch may rebind only at seq 1.
  denied(() => publishHealth(doc({ epoch: randomUUID(), seq: 2 }), { dir, envId: ENV, sandboxId: SBX, uid: UID }))
  assert.deepEqual(publishHealth(doc({ epoch: randomUUID() }), { dir, envId: ENV, sandboxId: SBX, uid: UID }), { ok: true })
  // Foreign identity or generation can never replace the published doc.
  for (const bad of [
    doc({ sandboxId: randomUUID() }),
    doc({ envId: 'prod' }),
    doc({ generation: randomUUID() }),
    doc({ contractVersion: 'dnls.control/2' }),
    doc({ health: 'healthy' }),
    { ...doc(), extra: 'field' },
    { ...doc(), seq: undefined },
  ]) {
    denied(() => publishHealth(bad, { dir, envId: ENV, sandboxId: SBX, uid: UID }))
  }
  // Wrong expected ids reject even a well-shaped doc.
  denied(() => publishHealth(doc(), { dir, envId: 'prod', sandboxId: SBX, uid: UID }))
  // Group/other-writable dirs and wrong-ownership dirs are untrusted.
  const open = healthDir(t)
  chmodSync(open, 0o775)
  denied(() => publishHealth(doc(), { dir: open, envId: ENV, sandboxId: SBX, uid: UID }))
  denied(() => publishHealth(doc(), { dir, envId: ENV, sandboxId: SBX, uid: UID + 1 }))
  assert.equal(readHealth(dir).observedAt, '2026-11-19T18:00:00.000Z')
})

test('a corrupt or unreadable stored file fails closed for writes and projects nothing', (t) => {
  const dir = healthDir(t)
  const file = join(dir, 'dnls-public-health.json')
  const denied = (fn) => assert.throws(fn, (e) => e?.errorId === 'dnls.health.publish')
  // Garbage bytes: the writer must not overwrite blind; the reader stays null.
  writeFileSync(file, 'not json{', { mode: 0o600 })
  denied(() => publishHealth(doc(), { dir, envId: ENV, sandboxId: SBX, uid: UID }))
  assert.equal(readHealth(dir), null)
  assert.equal(readFileSync(file, 'utf8'), 'not json{')
  // Structurally wrong JSON is still corrupt, never a baseline.
  writeFileSync(file, '[]')
  denied(() => publishHealth(doc(), { dir, envId: ENV, sandboxId: SBX, uid: UID }))
  assert.equal(readFileSync(file, 'utf8'), '[]')
  // A syntactically valid doc with matching identity but a missing/odd seq
  // is corrupt evidence too — refused, bytes identical.
  for (const corrupt of [
    { ...doc(), seq: undefined },
    { ...doc(), seq: 'next' },
    { ...doc(), seq: Number.MAX_SAFE_INTEGER + 5 },
    { ...doc(), observedAt: 'soon' },
  ]) {
    const seeded = JSON.stringify(corrupt)
    writeFileSync(file, seeded)
    denied(() => publishHealth(doc({ seq: 2 }), { dir, envId: ENV, sandboxId: SBX, uid: UID }))
    assert.equal(readFileSync(file, 'utf8'), seeded)
  }
  // A removed file is a clean first publish — seq 1 only.
  rmSync(file)
  denied(() => publishHealth(doc({ seq: 2 }), { dir, envId: ENV, sandboxId: SBX, uid: UID }))
  publishHealth(doc(), { dir, envId: ENV, sandboxId: SBX, uid: UID })
  assert.equal(readHealth(dir).state, 'running')
})

test('the Dockerfile bakes the writer root-owned outside the node-writable bridge path', () => {
  const dockerfile = readFileSync(new URL('../profiles/kitesurf/Dockerfile', import.meta.url), 'utf8')
  const rootCopy = dockerfile.split('\n').find((line) => line.includes('--chown=root:root') && line.includes('0555'))
  assert.ok(rootCopy, 'a root-owned 0555 COPY must exist')
  assert.ok(rootCopy.includes('public-health.mjs'), 'public-health.mjs must ship in the root-owned helper set')
  assert.ok(rootCopy.includes('/opt/dnls/'), 'helpers must land under /opt/dnls/')
  // mcp-bridge.mjs stays node:node — the root channel must never exec it.
  const bridgeCopy = dockerfile.split('\n').find((line) => line.startsWith('COPY') && line.includes('mcp-bridge.mjs'))
  assert.ok(bridgeCopy.includes('--chown=node:node'), 'mcp-bridge.mjs remains runtime-writable by design')
  // And the backend's fixed argv targets the root-baked helper only.
  const backend = readFileSync(new URL('../src/host/backend-apple.js', import.meta.url), 'utf8')
  assert.ok(backend.includes("'/opt/dnls/public-health.mjs'"))
  assert.equal(/['"`]mcp-bridge\.mjs/.test(backend), false, 'backend must not exec the guest-writable bridge path')
  // The bridge itself must carry no writer exports.
  const bridge = readFileSync(new URL('../profiles/kitesurf/mcp-bridge.mjs', import.meta.url), 'utf8')
  assert.equal(/export (async )?function (publish|runPublish)Health/.test(bridge), false)
})

test('publish-health channel binds the doc to /proc/1/environ deployment ids', async (t) => {
  const dir = healthDir(t)
  const environ = join(dir, 'environ')
  writeFileSync(environ, `PATH=/usr/bin\0DNLS_ENV_ID=${ENV}\0DNLS_SANDBOX_ID=${SBX}\0TOKEN=secret\0`)
  const lines = []
  const out = (line) => lines.push(line)
  const res = await runPublishHealth({
    environ, dir, out, uid: UID,
    input: Readable.from([JSON.stringify(doc())]),
  })
  assert.equal(res.ok, true)
  assert.deepEqual(lines, ['{"ok":true}'])
  // Identity never echoes on the channel.
  const text = lines.join('')
  assert.equal(text.includes(SBX), false)
  assert.equal(text.includes('secret'), false)
  // Missing identity fails closed and writes nothing.
  process.exitCode = 0
  const empty = join(dir, 'environ-empty')
  writeFileSync(empty, 'PATH=/usr/bin\0')
  const res2 = await runPublishHealth({ environ: empty, dir, out, uid: UID, input: Readable.from([JSON.stringify(doc())]) })
  assert.equal(res2.ok, false)
  process.exitCode = 0
})

test('POST /diagnostics is a hard 403 with zero mutation; GET projects the published summary', async (t) => {
  const dir = healthDir(t)
  const server = createBridge(0, { ...process.env, DNLS_HEALTH_DIR: dir, AGENT_BROWSER_CDP: 'ws://127.0.0.1:1/cdp' })
  t.after(() => new Promise((done) => server.close(done)))
  await new Promise((done) => server.once('listening', done))
  const base = `http://127.0.0.1:${server.address().port}`
  const request = (method, body) => fetch(`${base}/diagnostics`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body,
  })
  // Before any publish: GET reports no health document.
  let res = await request('GET')
  assert.equal(res.status, 200)
  assert.equal((await res.json()).health, null)
  // POST is refused regardless of payload — the stored doc must not move.
  publishHealth(doc({ epoch: randomUUID() }), { dir, envId: ENV, sandboxId: SBX, uid: UID })
  const stored = readFileSync(join(dir, 'dnls-public-health.json'), 'utf8')
  for (const body of ['{}', JSON.stringify({ history: { entries: [1, 2, 3] } }), JSON.stringify(doc({ seq: 99 }))]) {
    res = await request('POST', body)
    assert.equal(res.status, 403)
  }
  assert.equal(readFileSync(join(dir, 'dnls-public-health.json'), 'utf8'), stored)
  res = await request('GET')
  assert.deepEqual((await res.json()).health, {
    contractVersion: 'dnls.control/1', state: 'running', health: 'unknown',
    observedAt: '2026-11-19T18:00:00.000Z',
  })
  res = await fetch(`${base}/health`)
  assert.equal((await res.json()).health.state, 'running')
})

test('backend publishHealth rides stdin on a fixed env -i argv; create serializes only the two ids', async () => {
  const seen = []
  const io = {
    execSession: async (cmd, args, input) => { seen.push({ args, input }); return '{"ok":true}\n' },
    spawn: async (cmd, args) => { seen.push({ args }); return {} },
    execFile: async () => '[]',
    calls: {},
  }
  const backend = createAppleBackend({}, io)
  const sent = doc()
  await backend.publishHealth('dnls-loc', sent)
  const { args, input } = seen.at(-1)
  assert.deepEqual(args, [
    'exec', '-i', '--user', '0:0', '--workdir', '/', 'dnls-loc',
    '/usr/bin/env', '-i', 'PATH=/usr/local/bin:/usr/bin:/bin',
    '/usr/local/bin/node', '/opt/dnls/public-health.mjs',
  ])
  assert.equal(input, JSON.stringify(sent))
  assert.equal(args.some((a) => a.includes(SBX) || a.includes('NODE_OPTIONS')), false)
  // create serializes exactly the two deployment ids, after validation.
  const sandboxId = randomUUID()
  await backend.create({
    containerName: 'dnls-loc', image: 'img:v1',
    managedIdentity: { envId: 'dev', sandboxId },
    resources: {}, mounts: [], ports: [],
  })
  const run = seen.at(-1).args
  assert.deepEqual(run.filter((a, i) => run[i - 1] === '--env'), [`DNLS_ENV_ID=dev`, `DNLS_SANDBOX_ID=${sandboxId}`])
  await assert.rejects(() => backend.create({
    containerName: 'x', image: 'i:v1', managedIdentity: { envId: 'bad env', sandboxId },
  }), /managed identity/)
  await assert.rejects(() => backend.create({
    containerName: 'x', image: 'i:v1', managedIdentity: { envId: 'dev', sandboxId: 'not-a-uuid' },
  }), /managed identity/)
})

test('createBridgePublisher emits only the public doc and resets seq on a new generation', async () => {
  const generation = randomUUID()
  const row = {
    sandboxId: SBX, origin: 'created', stateVolume: '/v',
    binding: { locator: 'dnls-loc', generation },
    ports: [{ serviceId: 'mcp-bridge' }],
    operations: [],
  }
  const published = []
  const registry = { list: () => [row], get: (id) => (id === SBX ? row : null) }
  const observe = async (r) => ({ locator: 'dnls-loc', generation: r.binding.generation, stateVolume: '/v', state: 'running', observedAt: '2026-11-19T18:00:00.000Z' })
  const publisher = createBridgePublisher({
    envId: ENV, registry, observe,
    publish: async (locator, payload) => { published.push({ locator, payload }) },
  })
  await publisher.tick()
  await publisher.tick()
  assert.equal(published.length, 2)
  assert.deepEqual(published[0].payload, doc({ epoch: published[0].payload.epoch, generation, seq: 1 }))
  assert.equal(published[1].payload.seq, 2)
  assert.equal(published[0].payload.epoch, published[1].payload.epoch)
  // A new generation rebinds at seq 1 on the same epoch.
  row.binding = { locator: 'dnls-loc', generation: randomUUID() }
  await publisher.tick()
  assert.equal(published[2].payload.seq, 1)
  assert.equal(published[2].payload.generation, row.binding.generation)
  await publisher.close()
})
