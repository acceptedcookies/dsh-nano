import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveExecutionWorld, remoteChildEnv } from '../src/host/execution-world.js'

test('T13 remote env strips DNT_API and SSH_AUTH_SOCK', () => {
  const env = remoteChildEnv({ DNT_API: 'http://127.0.0.1:9', SSH_AUTH_SOCK: '/tmp/s', PATH: '/bin', DSH_TOKEN: 'x' })
  assert.equal(env.DNT_API, undefined)
  assert.equal(env.SSH_AUTH_SOCK, undefined)
  assert.equal(env.PATH, '/bin')
})

test('T13 missing binding stays local', () => {
  const world = resolveExecutionWorld({ subprocess: { tag: 'host' } }, 's')
  assert.equal(world.kind, 'local')
  assert.equal(world.subprocess.tag, 'host')
})
