import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureClient, navigate, resetClient } from '../src/host/cdp-elements.js'

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

test('an idle probe timeout preserves a socket whose transport is still open', async () => {
  let closes = 0
  const live = quietClient({
    probedAt: 0,
    async send(method) {
      if (method === 'Browser.getVersion') throw new Error('Browser.getVersion timed out')
      return {}
    },
    close() { closes += 1 },
  })
  const session = { cdp: live }
  let connects = 0
  const client = await ensureClient(session, 'http://127.0.0.1:1', async () => {
    connects += 1
    return quietClient()
  })
  assert.equal(connects, 0)
  assert.equal(closes, 0)
  assert.equal(client, live)
  assert.equal(client.alive, true)
})

test('an actual transport failure during a probe replaces the socket', async () => {
  const dead = quietClient({
    probedAt: 0,
    async send() {
      this.alive = false // the transport observed close/error
      throw new Error('cdp socket closed')
    },
  })
  const session = { cdp: dead }
  const fresh = quietClient()
  const client = await ensureClient(session, 'http://127.0.0.1:1', async () => fresh)
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

test('a navigation in progress skips the idle liveness probe', async () => {
  const calls = []
  const live = quietClient({ probedAt: 0, navigating: true, async send(method) { calls.push(method); return {} } })
  assert.equal(await ensureClient({ cdp: live }, 'http://fixture.invalid'), live)
  assert.deepEqual(calls, [])
})

function deferred() {
  let resolve
  let reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}

test('concurrent cold acquisitions share one connection and one initialization', async () => {
  const connected = deferred()
  let connects = 0
  let initialized = 0
  const live = quietClient({ async send() { initialized += 1; return {} } })
  const session = {}
  const connect = () => { connects += 1; return connected.promise }
  const first = ensureClient(session, 'http://fixture.invalid', connect)
  const second = ensureClient(session, 'http://fixture.invalid', connect)
  assert.equal(first, second)
  connected.resolve(live)
  assert.deepEqual(await Promise.all([first, second]), [live, live])
  assert.equal(connects, 1)
  assert.equal(initialized, 3)
  assert.equal(session.cdp, live)
})

test('concurrent expired probes cannot close a newly acquired socket', async () => {
  const probe = deferred()
  let probes = 0
  let closes = 0
  const live = quietClient({
    probedAt: 0,
    send() { probes += 1; return probe.promise },
    close() { closes += 1 },
  })
  const session = { cdp: live }
  const first = ensureClient(session, 'http://fixture.invalid')
  const second = ensureClient(session, 'http://fixture.invalid')
  assert.equal(first, second)
  await Promise.resolve()
  assert.equal(probes, 1)
  probe.reject(new Error('Browser.getVersion timed out'))
  assert.deepEqual(await Promise.all([first, second]), [live, live])
  assert.equal(closes, 0)
  assert.equal(session.cdpGeneration, undefined)
})

test('a failed connection clears its flight so a later acquisition can retry', async () => {
  const session = {}
  let connects = 0
  const live = quietClient()
  const connect = async () => {
    connects += 1
    if (connects === 1) throw new Error('cdp connect failed')
    return live
  }
  await assert.rejects(ensureClient(session, 'http://fixture.invalid', connect), /connect failed/)
  assert.equal(await ensureClient(session, 'http://fixture.invalid', connect), live)
  assert.equal(connects, 2)
})

function pageClient(sendNavigate, targets = [{ type: 'page', targetId: 'p', sessionId: 's' }]) {
  return quietClient({
    async send(method, params) {
      if (method === 'Target.getTargets') return { targetInfos: targets }
      if (method === 'Page.navigate') return sendNavigate(params.url)
      return {}
    },
  })
}

test('explicit navigations for the same session run sequentially without retries', async () => {
  const firstReply = deferred()
  const calls = []
  const firstStarted = deferred()
  const session = { cdp: pageClient((url) => {
    calls.push(url)
    if (calls.length === 1) { firstStarted.resolve(); return firstReply.promise }
    return {}
  }) }
  const first = navigate(session, 'http://fixture.invalid', 'https://one.example/')
  const second = navigate(session, 'http://fixture.invalid', 'https://two.example/')
  await firstStarted.promise
  assert.deepEqual(calls, ['https://one.example/'])
  firstReply.resolve({ frameId: 'one' })
  assert.deepEqual(await first, { ok: true, url: 'https://one.example/' })
  assert.deepEqual(await second, { ok: true, url: 'https://two.example/' })
  assert.deepEqual(calls, ['https://one.example/', 'https://two.example/'])
})

test('a failed navigation releases its queue without retrying the failed command', async () => {
  const calls = []
  const session = { cdp: pageClient((url) => {
    calls.push(url)
    if (calls.length === 1) throw new Error('Page.navigate timed out')
    return {}
  }) }
  const first = navigate(session, 'http://fixture.invalid', 'https://one.example/')
  const second = navigate(session, 'http://fixture.invalid', 'https://two.example/')
  await assert.rejects(first, /timed out/)
  assert.deepEqual(await second, { ok: true, url: 'https://two.example/' })
  assert.deepEqual(calls, ['https://one.example/', 'https://two.example/'])
})

test('a cancelled queued navigation never runs after the preceding page finishes', async () => {
  const firstReply = deferred()
  const started = deferred()
  const calls = []
  let cancelled = false
  const session = { cdp: pageClient(url => {
    calls.push(url)
    started.resolve()
    return firstReply.promise
  }) }
  const first = navigate(session, 'http://fixture.invalid', 'https://one.example/')
  await started.promise
  const second = navigate(session, 'http://fixture.invalid', 'https://two.example/', undefined, { isCancelled: () => cancelled })
  const rejected = assert.rejects(second, { errorId: 'kitesurf.navigate.failed' })
  cancelled = true
  firstReply.resolve({ frameId: 'one' })
  await first
  await rejected
  assert.deepEqual(calls, ['https://one.example/'])
})

test('navigation surfaces a refused result and a missing page as failures', async () => {
  const refused = { cdp: pageClient(() => ({ errorText: 'net::ERR_CONNECTION_REFUSED' })) }
  await assert.rejects(navigate(refused, 'http://fixture.invalid', 'https://one.example/'), (error) => {
    assert.equal(error.errorId, 'kitesurf.navigate.failed')
    assert.equal(error.status, 502)
    return /ERR_CONNECTION_REFUSED/.test(error.message)
  })
  const empty = { cdp: pageClient(() => ({}), []) }
  await assert.rejects(navigate(empty, 'http://fixture.invalid', 'https://one.example/'), (error) => {
    assert.equal(error.errorId, 'kitesurf.elements.empty')
    assert.equal(error.status, 502)
    return true
  })
})

test('resetClient closes the socket and clears the slot', () => {
  let closed = false
  const live = quietClient({ close() { closed = true } })
  const session = { cdp: live }
  resetClient(session)
  assert.equal(closed, true)
  assert.equal(session.cdp, null)
})
