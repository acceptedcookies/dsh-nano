import assert from 'node:assert/strict'
import test from 'node:test'
import { requestWsOrigin } from '../src/host/term-ws.js'

const listener = () => 'ws://127.0.0.1:3083'

test('attach origin follows the fenced browser origin behind a TLS proxy', () => {
  const req = { headers: { host: 'dsh-dev.local', origin: 'https://dsh-dev.local' } }
  assert.equal(requestWsOrigin(req, listener), 'wss://dsh-dev.local')
})

test('direct listener access keeps plain ws on the same authority', () => {
  const req = { headers: { host: '127.0.0.1:3083', origin: 'http://127.0.0.1:3083' } }
  assert.equal(requestWsOrigin(req, listener), 'ws://127.0.0.1:3083')
})

test('a request without Origin gets the listener origin', () => {
  assert.equal(requestWsOrigin({ headers: { host: 'dsh-dev.local' } }, listener), 'ws://127.0.0.1:3083')
})

test('an Origin naming another authority or scheme is refused, not echoed', () => {
  for (const origin of ['https://evil.example', 'https://dsh-dev.local:444', 'file://dsh-dev.local', 'null']) {
    assert.throws(() => requestWsOrigin({ headers: { host: 'dsh-dev.local', origin } }, listener), { status: 503 })
  }
  assert.throws(() => requestWsOrigin({ headers: { origin: 'https://dsh-dev.local' } }, listener), { status: 503 })
})
