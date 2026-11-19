import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import test from 'node:test'
import { createAppleBackend } from '../src/host/backend-apple.js'

test('recipe image build executes only the command returned by the host confinement seam', async () => {
  const commands = []
  const backend = createAppleBackend({}, { spawnProcess(command, args) {
    commands.push([command, ...args])
    const child = new EventEmitter()
    queueMicrotask(() => child.emit('close', 0))
    return child
  } })
  let wrapped
  const ctx = { sandbox: { async confine(argv) { wrapped = argv; return { argv: ['host-sandbox', '--', ...argv] } } } }
  const result = await backend.build({ ctx, contextDir: '/derived/image', dockerfile: '/derived/image/Dockerfile', image: 'engine:officialsha', buildArgs: ['ENGINE_BASE_IMAGE=node:22-bookworm-slim'] })
  assert.equal(result.ok, true)
  assert.deepEqual(commands, [['host-sandbox', '--', ...wrapped]])
  assert.ok(wrapped.includes('ENGINE_BASE_IMAGE=node:22-bookworm-slim'))
  assert.equal(wrapped.includes('KITESURF_BASE_IMAGE=node:22-bookworm-slim'), false, 'the kernel only passes the profile build args through')
})

test('no sandbox or invalid confinement result cannot execute image creation', async () => {
  let spawned = 0
  const backend = createAppleBackend({}, { spawnProcess() { spawned++; throw new Error('must not spawn') } })
  await assert.rejects(backend.build({ ctx: {}, image: 'engine:sha' }), /confine/)
  await assert.rejects(backend.build({ ctx: { sandbox: { confine: async () => ({}) } }, image: 'engine:sha' }), /confined/)
  assert.equal(spawned, 0)
})
