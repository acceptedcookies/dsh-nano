import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveExecutionWorld, worldCacheKey, assertBoundWorld } from '../src/host/execution-world.js'

test('T12 local world is used when H-EXEC is absent', () => {
  const fs = { tag: 'local' }
  const world = resolveExecutionWorld({ fs, subprocess: {} }, 'sess', '/same')
  assert.equal(world.kind, 'local')
  assert.equal(world.fs.tag, 'local')
})

test('T12 remote binding with the same root string does not share cache identity', () => {
  const local = resolveExecutionWorld({ fs: { tag: 'L' } }, 's', '/workspace')
  const remote = resolveExecutionWorld({
    get: (n) => n === 'workspaceExecution' ? {
      get: () => ({ fs: { tag: 'R' }, subprocess: {}, generation: 'g1', identity: 'devin-1', root: '/workspace' }),
    } : null,
  }, 's', '/workspace')
  assert.notEqual(worldCacheKey(local), worldCacheKey(remote))
  assert.equal(remote.fs.tag, 'R')
  assert.equal(local.fs.tag, 'L')
})

test('T12 unbound-remote without H-EXEC does not fall back to local cwd', () => {
  const world = resolveExecutionWorld({ fs: { tag: 'L' } }, 's', '/tmp/host-project')
  assert.throws(() => assertBoundWorld({ executionWorld: 'unbound-remote', cwd: '/tmp/host-project' }, world), /no working directory/)
  assert.doesNotThrow(() => assertBoundWorld({ cwd: '/tmp/host-project' }, world))
})

test('scopeOf refuses a remote-bound session before any local fs/git/watch side effect', async () => {
  const { createRoutes } = await import('../src/host/routes.js')
  const bomb = () => { throw new Error('local surface must not be touched') }
  const binding = { fs: {}, subprocess: {}, generation: 'g1', identity: 'devin-1', root: '/remote' }
  const ctx = {
    get: (name) => ({
      sessions: { get: () => ({ header: { cwd: '/remote', executionWorld: 'unbound-remote' } }) },
      workspaceExecution: { get: () => binding },
      sessionPersistence: { stat: async () => null },
    })[name],
    fs: { get read() { bomb() } },
    subprocess: { get spawn() { bomb() } },
  }
  const routes = createRoutes(ctx, { gitTimeoutMs: 1000, gitCommand: 'git' })
  await assert.rejects(
    () => routes['/status'].run({ url: '/nano-explorer-extra/status?sessionId=s1' }),
    /remote workspace binding is incomplete|not implemented/)
})

test('scopeOf refuses even a complete remote binding: consumption is not implemented', async () => {
  const { createRoutes } = await import('../src/host/routes.js')
  const binding = { fs: {}, subprocess: {}, watch: {}, generation: 'g1', identity: 'devin-1', root: '/remote' }
  const ctx = {
    get: (name) => ({
      sessions: { get: () => ({ header: { cwd: '/remote' } }) },
      workspaceExecution: { get: () => binding },
      sessionPersistence: { stat: async () => null },
    })[name],
    fs: {},
    subprocess: {},
  }
  const routes = createRoutes(ctx, { gitTimeoutMs: 1000, gitCommand: 'git' })
  await assert.rejects(
    () => routes['/status'].run({ url: '/nano-explorer-extra/status?sessionId=s1' }),
    /not implemented/)
})
