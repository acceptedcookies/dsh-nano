import assert from 'node:assert/strict'
import test from 'node:test'
import { CDP_TIMEOUTS, connectCdp, ensureClient } from '../src/host/cdp-elements.js'

/** Browser-compatible socket fixture: exercises the real timers and dispatcher. */
function socketFixture(onSend = () => {}, { open = true } = {}) {
  const sockets = []
  class Socket extends EventTarget {
    constructor(url) {
      super()
      this.url = url
      this.closed = 0
      this.timers = new Set()
      sockets.push(this)
      if (open) queueMicrotask(() => this.dispatchEvent(new Event('open')))
    }
    send(raw) { onSend(JSON.parse(raw), this) }
    reply(frame, result = {}) {
      this.dispatchEvent(Object.assign(new Event('message'), { data: JSON.stringify({ id: frame.id, result }) }))
    }
    replyAfter(frame, result, delay) {
      const timer = setTimeout(() => { this.timers.delete(timer); this.reply(frame, result) }, delay)
      this.timers.add(timer)
    }
    close() {
      this.closed += 1
      for (const timer of this.timers) clearTimeout(timer)
      this.timers.clear()
      this.dispatchEvent(new Event('close'))
    }
    fail() { this.dispatchEvent(new Event('error')) }
  }
  return { Socket, sockets }
}

test('production command budgets preserve slow navigation and screenshot work', () => {
  assert.deepEqual(CDP_TIMEOUTS, { connect: 4000, call: 20000, navigate: 45000, screenshot: 30000 })
})

test('a withdrawn non-adjacent relay cannot redirect CDP to the adjacent listener or a private page', async () => {
  const { Socket, sockets } = socketFixture(() => {}, { open: false })
  const connecting = connectCdp('http://127.0.0.1:40000', { WebSocket: Socket, relayUrl: 'ws://127.0.0.1:40002/cdp' })
  sockets[0].fail()
  await assert.rejects(connecting)
  assert.deepEqual(sockets.map(s => s.url), ['ws://127.0.0.1:40002/cdp'])
  await assert.rejects(ensureClient({}, 'http://127.0.0.1:40000'), /verified CDP bridge/)
})

test('method-aware transport budgets allow delayed navigation and screenshots', async (t) => {
  const { Socket, sockets } = socketFixture((frame, socket) => socket.replyAfter(frame, { method: frame.method }, 20))
  const client = await connectCdp('http://fixture.invalid', {
    WebSocket: Socket,
    timeouts: { call: 5, navigate: 200, screenshot: 150 },
  })
  t.after(() => client.close())
  await assert.rejects(client.send('Runtime.evaluate'), /Runtime.evaluate timed out/)
  assert.equal(client.alive, true)
  const navigation = client.send('Page.navigate', { url: 'https://example.com/' }, 's')
  assert.equal(client.navigating, true)
  assert.equal((await navigation).method, 'Page.navigate')
  assert.equal(client.navigating, false)
  assert.equal((await client.send('Page.captureScreenshot', {}, 's')).method, 'Page.captureScreenshot')
  assert.equal(sockets[0].closed, 0)
})

test('a probe deadline preserves the socket and the next command can succeed', async (t) => {
  const { Socket, sockets } = socketFixture((frame, socket) => {
    if (frame.method !== 'Browser.getVersion') socket.reply(frame, { result: { value: 'same-page' } })
  })
  const client = await connectCdp('http://fixture.invalid', { WebSocket: Socket })
  t.after(() => client.close())
  await assert.rejects(client.send('Browser.getVersion', {}, undefined, 5), /Browser.getVersion timed out/)
  assert.equal(client.alive, true)
  assert.equal(sockets[0].closed, 0)
  const session = { cdp: client }
  assert.equal(await ensureClient(session, 'http://fixture.invalid'), client)
  assert.equal((await client.send('Runtime.evaluate')).result.value, 'same-page')
  assert.equal(session.cdpGeneration, undefined)
})

test('a navigation deadline stays non-destructive until a late engine reply', async (t) => {
  let frame
  const { Socket, sockets } = socketFixture((sent) => { frame = sent })
  const client = await connectCdp('http://fixture.invalid', { WebSocket: Socket })
  t.after(() => client.close())
  const session = { cdp: client }
  await assert.rejects(client.send('Page.navigate', { url: 'https://example.com/' }, 's', 5), /Page.navigate timed out/)
  assert.equal(client.alive, true)
  assert.equal(client.navigating, true)
  client.probedAt = 0
  assert.equal(await ensureClient(session, 'http://fixture.invalid'), client)
  assert.equal(sockets[0].closed, 0)
  sockets[0].reply(frame, { frameId: 'completed-late' })
  assert.equal(client.navigating, false)
})

for (const event of ['close', 'error']) {
  test(`an actual socket ${event} invalidates transport and rejects pending work`, async () => {
    const { Socket, sockets } = socketFixture()
    const client = await connectCdp('http://fixture.invalid', { WebSocket: Socket })
    const pending = client.send('Page.navigate')
    if (event === 'close') sockets[0].close()
    else sockets[0].fail()
    await assert.rejects(pending, new RegExp(`cdp socket ${event === 'close' ? 'closed' : 'error'}`))
    assert.equal(client.alive, false)
    assert.equal(client.navigating, false)
    await assert.rejects(client.send('Runtime.evaluate'), /cdp socket closed/)
  })
}

test('a synchronous send failure is not mistaken for a close/error event', async (t) => {
  const { Socket } = socketFixture(() => { throw new Error('fixture send rejected') })
  const client = await connectCdp('http://fixture.invalid', { WebSocket: Socket })
  t.after(() => client.close())
  await assert.rejects(client.send('Page.navigate'), /fixture send rejected/)
  assert.equal(client.alive, true)
  assert.equal(client.navigating, false)
})

test('a handshake deadline closes the unopened socket and rejects promptly', async () => {
  const { Socket, sockets } = socketFixture(undefined, { open: false })
  await assert.rejects(connectCdp('http://fixture.invalid', { WebSocket: Socket, timeouts: { connect: 5 } }), /cdp connect timeout/)
  assert.equal(sockets[0].closed, 1)
})

test('a close before the handshake finishes rejects without waiting for its deadline', async () => {
  const { Socket, sockets } = socketFixture(undefined, { open: false })
  // Transport contract test: pin the socket to the direct path (relayUrl '').
  const connected = connectCdp('http://fixture.invalid', { WebSocket: Socket, relayUrl: '' })
  sockets[0].close()
  await assert.rejects(connected, /cdp socket closed/)
})
