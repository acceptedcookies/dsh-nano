import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createAppleBackend as apple } from '../src/host/backend-apple.js'
import { createInstanceRegistry } from '../src/host/instance-registry.js'
import { profileFixture } from './support/profile-fixture.mjs'

function registry() {
  const calls = []
  const backend = {
    async create(spec) { calls.push(['create', spec.containerName]); return { id: spec.containerName } },
    async stop(name) { calls.push(['stop', name]) },
  }
  const root = mkdtempSync(join(tmpdir(), 'dnls-mig-'))
  return {
    calls,
    backend,
    box: createInstanceRegistry({
      backend,
      profile: profileFixture(),
      volumeFor: (id) => join(root, id),
    }),
  }
}

test('a loopback start builds a detached container command', async () => {
  const seen = []
  const backend = apple({}, { spawn(file, args) { seen.push([file, args]); return Promise.resolve({ code: 0 }) } })
  await backend.create({ containerName: 'dnls-a', image: 'node:22-bookworm-slim', resources: { cpus: 4, memory: '4G' }, mounts: [], ports: [] })
  assert.equal(seen[0][0], 'container')
  assert.equal(seen[0][1][0], 'run')
  assert.equal(seen[0][1][1], '-d')
  assert.equal(seen[0][1].includes('--name'), true)
  assert.equal(seen[0][1].includes('-c'), true)
  assert.equal(seen[0][1].includes('4'), true)
  assert.equal(seen.length, 1)
  assert.equal(backend.calls.create, 1)
  assert.notEqual(seen[0][1].includes('latest'), true)
})

test('a remote origin is not started on this machine', () => {
  assert.throws(() => apple({ network: 'vmnet' }))
  assert.equal(typeof apple, 'function')
})

test('a missing local container is created, and suspend stops it', async () => {
  const { calls, box, backend } = registry()
  const created = await box.ensure({ sessionId: 's', policy: { mode: 'read-only', workspaceRoot: '/work', extraRoots: [] } })
  assert.equal(created.ok, true)
  assert.equal(calls.filter((row) => row[0] === 'create').length, 1)
  await backend.stop(created.instance.containerName)
  assert.deepEqual(calls.map((row) => row[0]), ['create', 'stop'])
})

test('an existing container with matching ports is started, not recreated', async () => {
  const { calls, box } = registry()
  const policy = { mode: 'read-only', workspaceRoot: '/work', extraRoots: [] }
  const first = await box.ensure({ sessionId: 's', policy })
  const second = await box.ensure({ sessionId: 's', policy })
  assert.equal(first.instance.instanceId, second.instance.instanceId)
  assert.equal(calls.filter((row) => row[0] === 'create').length, 1)
})

test('a container whose published ports drifted is deleted and recreated', async () => {
  const { box } = registry()
  const first = await box.ensure({ sessionId: 'a', policy: { mode: 'read-only', workspaceRoot: '/a', extraRoots: [] } })
  const second = await box.ensure({ sessionId: 'b', policy: { mode: 'read-only', workspaceRoot: '/b', extraRoots: [] } })
  assert.notEqual(first.instance.endpoints.engine, second.instance.endpoints.engine)
  assert.notEqual(first.instance.instanceId, second.instance.instanceId)
})

test('a remap onto an occupied host port must NOT delete the working container', async () => {
  const { calls, box } = registry()
  const created = await box.ensure({ sessionId: 's', policy: { mode: 'workspace-write', workspaceRoot: '/work', extraRoots: [] } })
  const stale = await box.ensure({ sessionId: 's', policy: { mode: 'danger-full-access', workspaceRoot: '/work', extraRoots: [] } })
  assert.equal(stale.errorId, 'sandbox.instance.policy-stale')
  assert.equal(calls.some((row) => row[0] === 'stop'), false)
  assert.equal(box.instances.has(created.instance.instanceId), true)
})

test('when the requested port is busy but the container still owns its own port, adopt it', async () => {
  const { box } = registry()
  const created = await box.ensure({ sessionId: 's', policy: { mode: 'read-only', workspaceRoot: '/work', extraRoots: [] } })
  box.reconcile(created.instance.instanceId, { healthy: true })
  assert.equal(created.instance.phase, 'running')
  assert.equal(typeof created.instance.endpoints.engine, 'string')
  assert.equal(created.instance.endpoints.engine.startsWith('http://127.0.0.1:'), true)
  assert.notEqual(created.instance.endpoints.cdp, created.instance.endpoints.mcp)
  assert.equal(box.instances.size, 1)
})

test('a cold subsystem failure surfaces the system-start error, not the run', async () => {
  const backend = apple({}, { spawn() { return Promise.reject(new Error('system start failed')) } })
  await assert.rejects(() => backend.start('dnls-a'), /system start failed/)
})

test('a missing checkout is a config fault, not an engine failure', async () => {
  const { loadProfile } = await import('../src/host/profile-registry.js')
  const loaded = loadProfile(new URL('../profiles/kitesurf/', import.meta.url).pathname)
  assert.equal(loaded.manifest.scope, 'session')
  assert.equal(typeof loaded.manifest.build.checkout.ref, 'string')
})

test('init writes a lock once and the second call returns it', async () => {
  const { calls, box } = registry()
  const policy = { mode: 'read-only', workspaceRoot: '/work', extraRoots: [] }
  const first = await box.ensure({ sessionId: 'lock', policy })
  const second = await box.ensure({ sessionId: 'lock', policy })
  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.equal(first.instance.instanceId, second.instance.instanceId)
  assert.equal(calls.filter((row) => row[0] === 'create').length, 1)
  assert.equal(box.instances.size, 1)
})

test('an old Node does not write the lock', async () => {
  const { createNvxBackend } = await import('../src/host/backend-nvx.js')
  await assert.rejects(createNvxBackend({}).ensureImage(), (error) => error.code === 'backend.nvx.unimplemented')
  assert.equal(createNvxBackend({}).calls, undefined)
})

test('start, suspend, and resume follow one path and call the engine hooks', async () => {
  const seen = []
  const backend = apple({}, {
    spawn(_file, args) { seen.push(args[0]); return Promise.resolve({ code: 0 }) },
  })
  await backend.start('a')
  await backend.stop('a')
  await backend.restart('a')
  assert.deepEqual(seen, ['start', 'stop', 'restart'])
  assert.equal(seen[0], 'start')
  assert.equal(seen[1], 'stop')
  assert.equal(seen[2], 'restart')
  assert.equal(backend.calls.start, 1)
  assert.equal(backend.calls.stop, 1)
  assert.equal(backend.calls.restart, 1)
  assert.equal(backend.calls.spawn, 3)
  await assert.rejects(apple({}, { spawn() { return Promise.reject(new Error('no')) } }).start('a'))
})

test('a failed start does not leave the engine running', async () => {
  const { box } = registry()
  const created = await box.ensure({ sessionId: 's', policy: { mode: 'read-only', workspaceRoot: '/work', extraRoots: [] } })
  box.reconcile(created.instance.instanceId, { healthy: false })
  assert.equal(created.instance.phase, 'idle')
  assert.equal(box.instances.has(created.instance.instanceId), true)
})

test('a remote engine needs allowRemote, and credentials are never allowed', () => {
  assert.throws(() => apple({ identity: { user: 'kitesurf' } }))
  assert.throws(() => apple({ network: { mode: 'virtiofs' } }))
  assert.throws(() => apple({ container: true }))
  assert.equal(apple({}).calls.create, 0)
  assert.equal(typeof apple({}).capabilities().exec, 'object')
  assert.equal(apple({ image: 'node:22-bookworm-slim' }).calls.spawn, 0)
})

test('init on an old Node refuses even when a lock already exists', async () => {
  const nvx = await import('../src/host/backend-nvx.js')
  await assert.rejects(nvx.createNvxBackend({}).start(), (error) => error.code === 'backend.nvx.unimplemented')
})
