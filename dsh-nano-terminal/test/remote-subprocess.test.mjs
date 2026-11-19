import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveExecutionWorld, remoteChildEnv } from '../src/host/execution-world.js'

test('remote env is allowlist-only: TERM/LANG/LC_ALL/COLORTERM pass, all else dropped', () => {
  const env = remoteChildEnv({ DNT_API: 'x', SSH_AUTH_SOCK: '/s', PATH: '/bin', DSH_TOKEN: 'x', PLAIN: 'v', TERM: 'xterm-256color', LANG: 'en_US.UTF-8', LC_ALL: 'C', COLORTERM: 'truecolor' })
  assert.deepEqual(Object.keys(env).sort(), ['COLORTERM', 'LANG', 'LC_ALL', 'TERM'])
})

test('T13 missing binding stays local', () => {
  const world = resolveExecutionWorld({ subprocess: { tag: 'host' } }, 's')
  assert.equal(world.kind, 'local')
  assert.equal(world.subprocess.tag, 'host')
})

test('remote-marked session without binding fails closed, no local spawn', async () => {
  const { SessionRegistry } = await import('../src/host/sessions.js')
  let spawned = 0
  const ctx = {
    subprocess: { spawnTerminal: async () => { spawned++; return {} } },
    sessions: { get: (id) => (id === 's1' ? { header: { executionWorld: 'unbound-remote' } } : undefined) },
  }
  const reg = new SessionRegistry({ ctx, audit() {}, sendBinary() {}, sendText() {}, bus: { emit() {} }, persist: null })
  const world = resolveExecutionWorld(ctx, 's1')
  assert.equal(world.kind, 'remote')
  assert.equal(world.subprocess, null)
  await assert.rejects(
    () => reg.create({ sessionId: 's1' }),
    (e) => e.kind === 'spawn_failed' && /remote execution binding/.test(e.message))
  assert.equal(spawned, 0)
})

test('bound remote spawn forwards binding signal and stripped env', async () => {
  const { SessionRegistry } = await import('../src/host/sessions.js')
  const controller = new AbortController()
  let seen = null
  const { EventEmitter } = await import('node:events')
  const remoteSub = {
    spawnTerminal: async (opts) => {
      seen = opts
      return { pid: 4242, output: new EventEmitter(), done: new Promise(() => {}), write() {}, kill() {} }
    },
  }
  const binding = { subprocess: remoteSub, generation: 'g1', identity: 'remote-1', root: '/remote/root', signal: controller.signal }
  const ctx = {
    get: (name) => ({ workspaceExecution: { get: () => binding }, sessions: { get: () => undefined } })[name],
    subprocess: { spawnTerminal: async () => { throw new Error('must not use host subprocess') } },
    workingDirectory: { get: () => '/w' },
  }
  const reg = new SessionRegistry({ ctx, audit() {}, sendBinary() {}, sendText() {}, bus: { emit() {} }, persist: null })
  const rec = await reg.create({ sessionId: 's9', env: { DSH_TOKEN: 'tok', SSH_AUTH_SOCK: '/s', PLAIN: 'v', TERM: 'xterm' } })
  assert.equal(rec.worldKind, 'remote')
  assert.equal(rec.keep, false)
  assert.equal(rec.generation, 'g1')
  assert.equal(seen.signal, controller.signal)
  assert.equal(seen.cwd, '/remote/root')
  assert.equal(seen.env.TERM, 'xterm')
  for (const key of Object.keys(seen.env)) assert.ok(['TERM','LANG','LC_ALL','COLORTERM'].includes(key), key)
  await reg.dispose()
})

test('restored remote record is a screen-only tombstone that never spawns', async () => {
  const { mkdtempSync } = await import('node:fs')
  const { tmpdir } = await import('node:os')
  const { join } = await import('node:path')
  const { Persist } = await import('../src/host/persist.js')
  const { SessionRegistry, SessionRecord } = await import('../src/host/sessions.js')
  const dir = mkdtempSync(join(tmpdir(), 'dnt-remote-restore-'))
  const p = new Persist(dir)
  const reg = new SessionRegistry({ ctx: { subprocess: {} }, audit() {}, sendBinary() {}, sendText() {}, bus: { emit() {} }, persist: p })
  const rec = new SessionRecord({ id: 'r1', lane: 'local', handle: null, owner: 't', title: 'cloud', name: 'cloudterm', keep: true, meta: { cwd: '/r' }, replayBytes: 100, registry: reg })
  rec.worldKind = 'remote'
  rec.remoteIdentity = 'devin-1'
  rec.generation = 'g7'
  rec.push(Buffer.from('remote screen tail'))
  reg.sessions.set(rec.id, rec)
  p.write(reg)
  const saved = p.load()
  assert.equal(saved.length, 1)
  assert.equal(saved[0].worldKind, 'remote')
  assert.equal(saved[0].remoteIdentity, 'devin-1')
  assert.equal(saved[0].generation, 'g7')

  let spawned = 0
  const reg2 = new SessionRegistry({ ctx: { subprocess: { spawnTerminal: async () => { spawned++; return {} } } }, audit() {}, sendBinary() {}, sendText() {}, bus: { emit() {} }, persist: p })
  reg2.restoreSaved()
  const r2 = reg2.sessions.get('r1')
  assert.equal(r2.pending, false)
  assert.equal(r2.phase, 'exited')
  assert.equal(r2.keep, false)
  assert.equal(r2.exited?.reason, 'remote-binding-ended')
  assert.equal(spawned, 0)
  await reg2.spawnPending(r2)
  assert.equal(spawned, 0)
})

test('partial binding without subprocess is still remote: no local spawn', async () => {
  const { SessionRegistry } = await import('../src/host/sessions.js')
  let spawned = 0
  const binding = { fs: {}, generation: 'g1', identity: 'devin-2' } // no subprocess
  const ctx = {
    get: (name) => ({ workspaceExecution: { get: () => binding }, sessions: { get: () => undefined } })[name],
    subprocess: { spawnTerminal: async () => { spawned++; return {} } },
    workingDirectory: { get: () => '/w' },
  }
  const world = resolveExecutionWorld(ctx, 's2')
  assert.equal(world.kind, 'remote')
  assert.equal(world.unbound, true)
  const reg = new SessionRegistry({ ctx, audit() {}, sendBinary() {}, sendText() {}, bus: { emit() {} }, persist: null })
  await assert.rejects(() => reg.create({ sessionId: 's2' }), (e) => e.kind === 'spawn_failed')
  assert.equal(spawned, 0)
})

test('partial binding with subprocess but no generation still refuses spawn', async () => {
  const { SessionRegistry } = await import('../src/host/sessions.js')
  let spawned = 0
  const binding = { subprocess: { spawnTerminal: async () => { spawned++; return {} } }, identity: 'devin-3', root: '/r' }
  const ctx = {
    get: (name) => ({ workspaceExecution: { get: () => binding }, sessions: { get: () => undefined } })[name],
    subprocess: { spawnTerminal: async () => { throw new Error('host subprocess must not run') } },
    workingDirectory: { get: () => '/w' },
  }
  const reg = new SessionRegistry({ ctx, audit() {}, sendBinary() {}, sendText() {}, bus: { emit() {} }, persist: null })
  const world = resolveExecutionWorld(ctx, 's3')
  assert.equal(world.kind, 'remote')
  assert.equal(world.unbound, true)
  await assert.rejects(() => reg.create({ sessionId: 's3' }), (e) => e.kind === 'spawn_failed')
  assert.equal(spawned, 0)
})
