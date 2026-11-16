import assert from 'node:assert/strict'
import test from 'node:test'
import { containerNameFor, envHostPorts, envTag } from '../src/host/routes.js'

test('each local environment derives its own container name', () => {
  assert.equal(containerNameFor({}, { DSH_HOME: '/Users/x/.dsh' }), 'kitesurf')
  assert.equal(containerNameFor({}, { DSH_HOME: '/Users/x/.dsh-dev' }), 'kitesurf-dev')
  assert.equal(containerNameFor({}, { DSH_HOME: '/Users/x/.dsh-desktop' }), 'kitesurf-desktop')
})

test('KITESURF_ENV wins over DSH_HOME and is validated', () => {
  assert.equal(envTag({ KITESURF_ENV: 'staging', DSH_HOME: '/Users/x/.dsh-dev' }), 'staging')
  assert.equal(envTag({ KITESURF_ENV: 'NOT VALID!', DSH_HOME: '/Users/x/.dsh-dev' }), 'dev')
  assert.equal(envTag({ KITESURF_ENV: '', DSH_HOME: '' }), 'prod')
})

test('the three environments never collide on a host port', () => {
  const prod = envHostPorts({ DSH_HOME: '/Users/x/.dsh' })
  const dev = envHostPorts({ DSH_HOME: '/Users/x/.dsh-dev' })
  const desktop = envHostPorts({ DSH_HOME: '/Users/x/.dsh-desktop' })
  assert.deepEqual(prod, { engineHostPort: 8798, bridgeHostPort: 8799, engineContainerPort: 8787, bridgeContainerPort: 8791 })
  assert.deepEqual(dev, { engineHostPort: 8800, bridgeHostPort: 8801, engineContainerPort: 8787, bridgeContainerPort: 8791 })
  assert.deepEqual(desktop, { engineHostPort: 8802, bridgeHostPort: 8803, engineContainerPort: 8787, bridgeContainerPort: 8791 })
  const hosts = [prod, dev, desktop].flatMap((row) => [row.engineHostPort, row.bridgeHostPort])
  assert.equal(new Set(hosts).size, hosts.length)
})

test('an explicit session container name is never overridden', () => {
  assert.equal(containerNameFor({ containerName: 'dnls-abc' }, { DSH_HOME: '/Users/x/.dsh-dev' }), 'dnls-abc')
  assert.equal(containerNameFor({ containerName: '' }, { DSH_HOME: '/Users/x/.dsh-dev' }), 'kitesurf-dev')
})
