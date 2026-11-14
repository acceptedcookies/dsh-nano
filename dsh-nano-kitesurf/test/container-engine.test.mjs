import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureLocalContainer, hostPort, isLoopback, stopLocalContainer } from '../lib/container-engine.js'

test('loopback helpers still read the endpoint, and this package does not start a container', async () => {
  assert.equal(isLoopback('http://127.0.0.1:8798'), true)
  assert.equal(isLoopback('http://10.0.0.8:8798'), false)
  assert.equal(hostPort('http://127.0.0.1:8798'), 8798)
  const commands = []
  const io = { run: async (args) => { commands.push(args[0]) } }
  const remote = await ensureLocalContainer({ httpBase: 'http://10.0.0.8:8798', mcpPort: 8799 }, io)
  assert.equal(remote.local, false)
  await assert.rejects(
    () => ensureLocalContainer({ httpBase: 'http://127.0.0.1:8798', mcpPort: 8799 }, io),
    (error) => error.id === 'kitesurf.kite.container' && /does not start/.test(error.message),
  )
  const stopped = await stopLocalContainer({ httpBase: 'http://127.0.0.1:8798', mcpPort: 8799 }, io)
  assert.equal(stopped.stopped, false)
  assert.deepEqual(commands, [])
})
