import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, cpSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { buildImage } from '../src/host/build.js'
import { CLOSED, OPEN, createCdpKeeper } from '../src/host/cdp-keeper.js'
import { createInstanceRegistry } from '../src/host/instance-registry.js'
import { policyFingerprint } from '../src/host/policy-adapter.js'
import { ensureReady } from '../src/host/profile-registry.js'
import { acceptUpgrade, routeSpecs } from '../src/host/routes.js'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { createTermSession } from '../src/host/terminal-driver.js'
import { profileFixture } from './support/profile-fixture.mjs'
import { createMcpHandler } from '../../dsh-nano-terminal/lib/mcp.js'

const profileDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'profiles', 'kitesurf')

function copyProfile(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'dnls-threat-'))
  cpSync(profileDir, dir, { recursive: true })
  const yamlPath = join(dir, 'profile.yaml')
  writeFileSync(yamlPath, mutate(readFileSync(yamlPath, 'utf8'), dir))
  return dir
}

test('bad digest and a short checkout ref never call ensureImage', async () => {
  const badDigest = copyProfile((yaml) => yaml.replace(/digest: sha256:[0-9a-f]+/, 'digest: sha256:' + 'cd'.repeat(32)))
  const badRef = copyProfile((yaml) => yaml.replace(/ref: [0-9a-f]{40}/, 'ref: abc'))
  for (const dir of [badDigest, badRef]) {
    const backend = { calls: 0, async ensureImage() { this.calls += 1 } }
    const result = await ensureReady(dir, backend)
    assert.equal(result.ok, false)
    assert.equal(backend.calls, 0)
  }
  const legal = { calls: 0, async ensureImage() { this.calls += 1 } }
  const ok = await ensureReady(profileDir, legal)
  assert.equal(ok.ok, true)
  assert.equal(legal.calls >= 1, true)
})

test('a checkout path that escapes the profile never reaches confine or spawn', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dnls-build-'))
  let confined = 0
  let spawned = 0
  const escaped = await buildImage({
    ctx: { sandbox: { async confine() { confined += 1; return {} } } },
    profileDir: root,
    checkout: join(root, '..', 'outside'),
    spawn() { spawned += 1 },
  })
  assert.equal(escaped.ok, false)
  assert.equal(confined, 0)
  assert.equal(spawned, 0)
  const legal = await buildImage({
    ctx: { sandbox: { async confine() { confined += 1; return {} } } },
    profileDir: root,
    checkout: join(root, 'inside'),
    argv: ['build', root],
    spawn() { spawned += 1 },
  })
  assert.equal(legal.ok, true)
  assert.equal(confined >= 1, true)
  assert.equal(spawned, 0)
})

test('building without ctx.sandbox throws and does not spawn npm or curl', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dnls-nosandbox-'))
  const naked = { npm: 0, curl: 0 }
  await assert.rejects(() => buildImage({
    ctx: {},
    profileDir: root,
    checkout: join(root, 'inside'),
    argv: ['build', root],
    spawn(cmd) {
      if (cmd === 'npm') naked.npm += 1
      if (cmd === 'curl') naked.curl += 1
    },
  }))
  assert.equal(naked.npm, 0)
  assert.equal(naked.curl, 0)
  let confined = 0
  await buildImage({
    ctx: { sandbox: { async confine() { confined += 1; return {} } } },
    profileDir: root,
    checkout: join(root, 'inside'),
    argv: ['build', root],
    spawn() { naked.npm += 1 },
  })
  assert.equal(confined >= 1, true)
  assert.equal(naked.npm, 0)
})

test('one instance workspace root is not mounted into another instance', async () => {
  const calls = []
  const box = createInstanceRegistry({
    backend: { async create(spec) { calls.push(spec); return {} }, async stop() {} },
    profile: profileFixture(),
    volumeFor: (id) => join(mkdtempSync(join(tmpdir(), 'dnls-mnt-')), id),
  })
  const a = await box.ensure({ sessionId: 'a', policy: { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] } })
  const b = await box.ensure({ sessionId: 'b', policy: { mode: 'workspace-write', workspaceRoot: '/work/b', extraRoots: [] } })
  assert.equal(b.instance.mounts.some((mount) => mount.source === '/work/a'), false)
  assert.equal(a.instance.mounts.some((mount) => mount.source === '/work/a'), true)
  assert.equal(calls[1].mounts.some((mount) => String(mount.arg).includes('/work/a')), false)
})

test('fingerprint ignores fields outside the tuple and changes with workspaceRoot', () => {
  const base = { sessionId: 's', mode: 'read-only', workspaceRoot: '/work', extraRoots: ['/b', '/a'] }
  assert.equal(policyFingerprint({ ...base, label: 'one' }), policyFingerprint({ ...base, label: 'two', extraRoots: ['/a', '/b'] }))
  assert.notEqual(policyFingerprint(base), policyFingerprint({ ...base, workspaceRoot: '/other' }))
})

test('unauthenticated HTTP and websocket upgrade do not run the handler first', async () => {
  let handlers = 0
  let handshakes = 0
  const ctx = {
    get() { return { requestRejection: () => 401 } },
    webServer: { register(route) { return route } },
  }
  const registered = registerRoutes(ctx, routeSpecs({ onHandler() { handlers += 1 } }), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  const shot = registered.find ? null : null
  void shot
  const routes = []
  const host = {
    get() { return { requestRejection: () => 401 } },
    webServer: { register(route) { routes.push(route); return () => {} } },
  }
  registerRoutes(host, routeSpecs({ onHandler() { handlers += 1 } }), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  const live = routes.find((route) => route.path.endsWith('/shot'))
  const res = { statusCode: 0, end() {} }
  await live.handler({ method: 'POST' }, res)
  assert.equal(handlers, 0)
  assert.equal(res.statusCode, 401)
  const denied = acceptUpgrade({}, {}, () => 401, () => { handshakes += 1 })
  assert.equal(denied.handshake, false)
  assert.equal(handshakes, 0)
  acceptUpgrade({}, {}, () => undefined, () => { handshakes += 1 })
  assert.equal(handshakes >= 1, true)
})

test('a recipe that mentions container machine is refused before spawn', async () => {
  const dir = copyProfile((yaml, folder) => {
    writeFileSync(join(folder, 'Dockerfile'), `${readFileSync(join(folder, 'Dockerfile'), 'utf8')}\n# container machine\n`)
    return yaml
  })
  const backend = { calls: 0, async ensureImage() { this.calls += 1 } }
  const result = await ensureReady(dir, backend)
  assert.equal(result.ok, false)
  assert.equal(backend.calls, 0)
  const legal = { calls: 0, async ensureImage() { this.calls += 1 } }
  assert.equal((await ensureReady(profileDir, legal)).ok, true)
  assert.equal(legal.calls >= 1, true)
})

test('evaluate over 2000 characters does not execute and is not the previous DOM', async () => {
  const keeper = createCdpKeeper()
  keeper.attach('A', { readyState: OPEN }, { dom: 'PREVIOUS' })
  let ran = 0
  const blocked = await keeper.evaluate('A', 'x'.repeat(2001), () => { ran += 1; return 'NEXT' })
  assert.equal(ran, 0)
  assert.notEqual(blocked.dom, 'PREVIOUS')
  const legal = await keeper.evaluate('A', 'document.title', () => { ran += 1; return 'TITLE' })
  assert.equal(ran, 1)
  assert.equal(legal.dom, 'TITLE')
})

test('term.session.create does not create audit.jsonl', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dnls-audit-'))
  const auditPath = join(dir, 'term.audit')
  const mcp = createMcpHandler({
    registry: {
      async create() { return { id: 't1', addr: 't1', lane: 'local', title: 't' } },
      resolve() { return null },
      list() { return [] },
    },
    bus: { subscribe() { return () => {} } },
    auditPath,
    laneStatus() { return { local: { status: 'up' } } },
  })
  const reply = await mcp.handleRpc({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: { name: 'term.session.create', arguments: { cols: 80, rows: 24 } },
  })
  assert.equal(reply.result.structuredContent.attach.url.includes('session='), true)
  assert.equal(Object.hasOwn(reply.result.structuredContent.attach, 'path'), false)
  assert.equal(readdirSync(dir).includes('audit.jsonl'), false)
  assert.equal(readdirSync(dir).includes('term.audit'), false)
  const audit = []
  const auditFile = join(dir, 'term.audit')
  createTermSession({ cols: 80, rows: 24 }, audit, 'ws://127.0.0.1/term?session=a', auditFile)
  assert.equal(audit.length >= 1, true)
  assert.equal(readFileSync(auditFile, 'utf8').includes('"op":"open"'), true)
  assert.equal(CLOSED, 3)
})
