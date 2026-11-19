import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRemoteSessionId } from '../src/providers/devin/session-id.js'
import { buildSshArgv, fallbackIdentityFile, systemIdentityPath } from '../src/providers/devin/ssh.js'

const base = {
  identityFile: '/tmp/id',
  knownHostsFile: '/tmp/known',
  sessionId: 'devin-abc123',
}

test('T05 session id rejects host/option/shell injection', () => {
  for (const bad of ['devin-abc;rm', 'devin-abc@evil', '-oProxyCommand=x', 'a b', "devin-abc'"]) {
    assert.throws(() => parseRemoteSessionId(bad), /session_id/)
  }
  const ok = parseRemoteSessionId('787a9b68ddb94958880517d11a38da18')
  assert.equal(ok.gatewayUser, 'devin-787a9b68ddb94958880517d11a38da18')
})

test('T05 ssh argv never contains -A -R -N or StrictHostKeyChecking=no', () => {
  const argv = buildSshArgv({ ...base, remoteArgv: ['uname', '-s'] })
  assert.equal(argv[0], 'ssh')
  assert.ok(!argv.includes('-A'))
  assert.ok(!argv.includes('-R'))
  assert.ok(!argv.includes('-N'))
  assert.ok(argv.includes('StrictHostKeyChecking=yes') || argv.some(x => x.includes('StrictHostKeyChecking=yes')))
  assert.throws(() => buildSshArgv({ ...base, strictHostKeyChecking: 'no' }), /forbidden|StrictHostKeyChecking/)
  assert.throws(() => buildSshArgv({ ...base, strictHostKeyChecking: 'accept-new' }), /pin the fingerprint|StrictHostKeyChecking/)
  assert.throws(() => buildSshArgv({ ...base, extraOptions: ['ForwardAgent=yes'] }))
  assert.throws(() => buildSshArgv({ ...base, remoteArgv: ['rm', ';reboot'] }))
  assert.ok(argv.includes('ssh.devin.ai'))
  assert.ok(!argv.some(x => String(x).includes('ProxyCommand')))
})

test('T05 user-supplied host is ignored; gateway is fixed', () => {
  const argv = buildSshArgv({ ...base, sessionId: 'devin-zzzz' })
  assert.equal(argv.filter(x => x === 'ssh.devin.ai').length, 1)
  assert.ok(argv.includes('-l'))
  assert.ok(argv.includes('devin-zzzz'))
})

test('T06 dedicated-key failure falls back to system identity, never another host', () => {
  const system = systemIdentityPath()
  assert.equal(fallbackIdentityFile('/tmp/nano-cloud-session-ssh', { identityFile: '/forced' }), null)
  const next = fallbackIdentityFile('/tmp/nano-cloud-session-ssh', {})
  if (next) assert.equal(next, system)
  assert.equal(fallbackIdentityFile(system, {}), null)
})
