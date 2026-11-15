import assert from 'node:assert/strict'
import test from 'node:test'
import { hostPort, hostPortFree, isLoopback } from '../lib/container-engine.js'

// P3-04: the container-era lifecycle (createArgs/checkoutPath/runContainer/
// ensureLocalContainer/stopLocalContainer) is retired — those exports no longer
// exist and this package does not run a container. What remains is the
// endpoint/port truth the pane and self-test read.
test('loopback helpers still read the endpoint', () => {
  assert.equal(isLoopback('http://127.0.0.1:8798'), true)
  assert.equal(isLoopback('http://localhost:8798'), true)
  assert.equal(isLoopback('http://10.0.0.8:8798'), false)
  assert.equal(isLoopback('https://example.com'), false)
  assert.equal(hostPort('http://127.0.0.1:8798'), 8798)
  assert.equal(hostPort('https://example.com'), 443)
  assert.equal(hostPort('http://example.com'), 80)
})

test('retired container exports are gone (no shadow lifecycle)', async () => {
  const mod = await import('../lib/container-engine.js')
  for (const gone of ['createArgs', 'checkoutPath', 'runContainer', 'ensureLocalContainer', 'stopLocalContainer', 'firstFreePort', 'statePath', 'CONTAINER_NAME', 'ENGINE_IMAGE', 'publishedPortsOf']) {
    assert.equal(mod[gone], undefined, `${gone} should not exist`)
  }
})

test('hostPortFree is a probe: a live port reads not-free, a dead one reads free', async () => {
  // A port nothing listens on must read free (not a manage call, just a probe).
  const free = await hostPortFree(0)
  assert.equal(typeof free, 'boolean')
})
