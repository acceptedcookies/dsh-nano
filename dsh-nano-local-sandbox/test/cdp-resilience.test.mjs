import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureClient, resetClient } from '../src/host/cdp-elements.js'

function quietClient(overrides = {}) {
  return {
    alive: true,
    probedAt: Date.now(),
    send: async () => ({}),
    listen: () => () => {},
    close() {},
    ...overrides,
  }
}

test('a cached client that is already dead is replaced before any request', async () => {
  const session = { cdp: quietClient({ alive: false }) }
  let connects = 0
  const fresh = quietClient()
  const client = await ensureClient(session, 'http://127.0.0.1:1', async () => {
    connects += 1
    return fresh
  })
  assert.equal(connects, 1)
  assert.equal(client, fresh)
  assert.equal(session.cdp, fresh)
})

test('a half-open socket fails its liveness probe and is replaced', async () => {
  const dead = quietClient({
    probedAt: 0,
    async send(method) {
      if (method === 'Browser.getVersion') throw new Error('Browser.getVersion timed out')
      return {}
    },
  })
  const session = { cdp: dead }
  let connects = 0
  const fresh = quietClient()
  const client = await ensureClient(session, 'http://127.0.0.1:1', async () => {
    connects += 1
    return fresh
  })
  assert.equal(connects, 1)
  assert.equal(client, fresh)
})

test('a live client is reused without reconnecting', async () => {
  const live = quietClient({ probedAt: Date.now() })
  const session = { cdp: live }
  let connects = 0
  const client = await ensureClient(session, 'http://127.0.0.1:1', async () => {
    connects += 1
    return quietClient()
  })
  assert.equal(connects, 0)
  assert.equal(client, live)
})

test('an idle live client is probed, and a passing probe keeps the same socket', async () => {
  const probed = []
  const live = quietClient({
    probedAt: 0,
    async send(method) {
      probed.push(method)
      return {}
    },
  })
  const session = { cdp: live }
  let connects = 0
  await ensureClient(session, 'http://127.0.0.1:1', async () => {
    connects += 1
    return quietClient()
  })
  assert.equal(connects, 0)
  assert.equal(probed.includes('Browser.getVersion'), true)
})

test('resetClient closes the socket and clears the slot', () => {
  let closed = false
  const live = quietClient({ close() { closed = true } })
  const session = { cdp: live }
  resetClient(session)
  assert.equal(closed, true)
  assert.equal(session.cdp, null)
})
