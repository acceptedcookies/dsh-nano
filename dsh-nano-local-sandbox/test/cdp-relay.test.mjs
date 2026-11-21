import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import net from 'node:net'
import { acceptKey, createFrameDecoder, sendFrame, makeCdpRelay } from '../profiles/kitesurf/mcp-bridge.mjs'

/** A WebSocket frame encoder for test-side (client-role, masked) frames. */
function maskedTextFrame(text) {
  const payload = Buffer.from(text)
  const mask = Buffer.from([1, 2, 3, 4])
  const header = payload.length < 126
    ? Buffer.from([0x81, 0x80 | payload.length])
    : payload.length < 65536
      ? Buffer.from([0x81, 0x80 | 126, payload.length >> 8, payload.length & 0xff])
      : (() => { const b = Buffer.alloc(10); b[0] = 0x81; b[1] = 0x80 | 127; b.writeBigUInt64BE(BigInt(payload.length), 2); return b })()
  const masked = Buffer.from(payload)
  for (let i = 0; i < masked.length; i += 1) masked[i] ^= mask[i % 4]
  return Buffer.concat([header, mask, masked])
}

/** Parse wire frames with the bridge's own decoder; resolves on first message. */
function frameCollector(onText) {
  return createFrameDecoder({
    onMessage: onText,
    onPing: () => {},
    onClose: () => {},
    maxFrame: 4 * 1024 * 1024,
    maxMessage: 8 * 1024 * 1024,
  })
}

/**
 * Fake client socket: 'data' events carry client→relay frames; writes carry
 * relay→client frames we parse for assertions.
 */
function fakeClientSocket() {
  const incoming = new PassThrough()
  const emitter = new EventEmitter()
  const messages = []
  const waits = []
  const decode = frameCollector((text) => {
    const message = JSON.parse(text)
    messages.push(message)
    for (const wait of waits.splice(0)) wait()
  })
  const socket = Object.assign(emitter, {
    write: (chunk) => decode(chunk),
    destroy: () => {},
    setTimeout: () => {},
    sendFrame: (text) => incoming.push(maskedTextFrame(text)),
    // Drain the queue first — a reply can land before the caller registers a
    // wait, and a waiter registered afterwards must not hang forever.
    nextMessage: () => (messages.length
      ? Promise.resolve(messages.shift())
      : new Promise((resolve) => waits.push(() => resolve(messages.shift())))),
    messages,
  })
  incoming.on('data', (chunk) => emitter.emit('data', chunk))
  return socket
}

/** Minimal upstream WS endpoint answering CDP calls like the pinned engine. */
async function fakeUpstream(replies = {}) {
  const seen = []
  const accepted = []
  const server = net.createServer((socket) => {
    accepted.push(socket)
    let httpBuf = Buffer.alloc(0)
    let opened = false
    let decode = null
    socket.on('data', async (chunk) => {
      if (!opened) {
        httpBuf = Buffer.concat([httpBuf, chunk])
        const end = httpBuf.indexOf('\r\n\r\n')
        if (end < 0) return
        const head = httpBuf.subarray(0, end).toString('utf8')
        const key = /sec-websocket-key:\s*(\S+)/i.exec(head)?.[1]
        const accept = await acceptKey(key)
        socket.write(
          'HTTP/1.1 101 Switching Protocols\r\n' +
          'Upgrade: websocket\r\nConnection: Upgrade\r\n' +
          `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
        )
        opened = true
        decode = frameCollector((text) => {
          const message = JSON.parse(text)
          seen.push(message)
          // String ids count too — the relay namespaces string client ids as
          // 'ks:<slot>:<id>' and the reply must round-trip that string.
          if (typeof message.id === 'number' || typeof message.id === 'string') {
            const fn = replies[message.method]
            const result = typeof fn === 'function' ? fn(message) : fn
            sendFrame(socket, 0x1, JSON.stringify({ id: message.id, result: result ?? {} }))
          }
        })
        const rest = httpBuf.subarray(end + 4)
        if (rest.length) decode(rest)
        return
      }
      decode(chunk)
    })
  })
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    server,
    seen,
    port: server.address().port,
    // Push a server→client (unmasked) frame on the accepted upstream socket.
    emit: (object) => { for (const s of accepted) sendFrame(s, 0x1, JSON.stringify(object)) },
    // server.close() alone leaves accepted sockets open and the event loop
    // alive — tests must tear the wire down explicitly.
    teardown: () => {
      for (const s of accepted) { try { s.destroy() } catch { /* gone */ } }
      server.close()
    },
  }
}

test('cdp relay multiplexes clients onto one upstream page', async () => {
  const upstream = await fakeUpstream({
    'Target.getTargets': () => ({ targetInfos: [{ targetId: 'PAGE-1', type: 'page', url: 'https://example.com/' }] }),
    'Browser.getVersion': () => ({ product: 'Chrome/145.0.0.0' }),
    'Page.navigate': () => ({ frameId: 'F1' }),
  })
  try {
    const relay = makeCdpRelay({ upstreamUrl: `ws://127.0.0.1:${upstream.port}/devtools/browser`, debug: false })
    const a = fakeClientSocket()
    const b = fakeClientSocket()
    await relay.handle(a)
    await relay.handle(b)

    // Both clients' commands are namespaced upstream and answered per-owner.
    a.sendFrame(JSON.stringify({ id: 1, method: 'Browser.getVersion' }))
    b.sendFrame(JSON.stringify({ id: 9, method: 'Browser.getVersion' }))
    const aReply = await a.nextMessage()
    const bReply = await b.nextMessage()
    assert.equal(aReply.id, 1, 'client id must be restored, not namespaced')
    assert.equal(bReply.id, 9)
    assert.equal(aReply.result.product, 'Chrome/145.0.0.0')
    assert.equal(bReply.result.product, 'Chrome/145.0.0.0')

    // The two client ids went upstream with different slot prefixes.
    const sent = upstream.seen.filter((m) => m.method === 'Browser.getVersion')
    assert.equal(sent.length, 2)
    assert.notEqual(sent[0].id >> 20, sent[1].id >> 20, 'each client owns a distinct slot')
    assert.ok((sent[0].id & 0xfffff) === 1 || (sent[0].id & 0xfffff) === 9)

    // about:blank createTarget is answered locally with the shared page and
    // never reaches upstream — the per-connection private page stays dead.
    a.sendFrame(JSON.stringify({ id: 5, method: 'Target.createTarget', params: { url: 'about:blank' } }))
    const created = await a.nextMessage()
    assert.equal(created.result.targetId, 'PAGE-1')
    assert.equal(upstream.seen.filter((m) => m.method === 'Target.createTarget').length, 0)

    // A REAL createTarget (non-blank) forwards upstream — the local refuse
    // lands only with the next image build (bridge code is inside the image).
    b.sendFrame(JSON.stringify({ id: 6, method: 'Target.createTarget', params: { url: 'https://real.example/' } }))
    await b.nextMessage()
    assert.equal(upstream.seen.filter((m) => m.method === 'Target.createTarget').length, 1)
  } finally {
    upstream.teardown()
  }
})

test('cdp relay broadcasts events to every connected client', async () => {
  const upstream = await fakeUpstream({
    'Target.getTargets': () => ({ targetInfos: [{ targetId: 'P', type: 'page' }] }),
  })
  try {
    const relay = makeCdpRelay({ upstreamUrl: `ws://127.0.0.1:${upstream.port}/devtools/browser`, debug: false })
    const a = fakeClientSocket()
    const b = fakeClientSocket()
    await relay.handle(a)
    await relay.handle(b)
    // An upstream event must reach BOTH clients verbatim — sessionId is what
    // lets each side decide relevance.
    upstream.emit({ method: 'Page.frameNavigated', params: { frame: { id: 'F', url: 'https://x/' } }, sessionId: 'S1' })
    const [ea, eb] = await Promise.all([a.nextMessage(), b.nextMessage()])
    assert.equal(ea.method, 'Page.frameNavigated')
    assert.equal(ea.sessionId, 'S1')
    assert.equal(eb.method, 'Page.frameNavigated')
  } finally {
    upstream.teardown()
  }
})

test('cdp relay routes string ids by ks:slot: prefix back to exactly one client', async () => {
  const upstream = await fakeUpstream({
    'Target.getTargets': () => ({ targetInfos: [{ targetId: 'P', type: 'page' }] }),
    'Custom.probe': () => ({ probed: true }),
  })
  try {
    const relay = makeCdpRelay({ upstreamUrl: `ws://127.0.0.1:${upstream.port}/devtools/browser`, debug: false })
    const a = fakeClientSocket()
    const b = fakeClientSocket()
    await relay.handle(a)
    await relay.handle(b)
    // A string id is namespaced upstream as ks:<slot>:<id>; the reply must
    // come back to the SAME client with the prefix stripped.
    a.sendFrame(JSON.stringify({ id: 'req-1', method: 'Custom.probe' }))
    b.sendFrame(JSON.stringify({ id: 'req-2', method: 'Custom.probe' }))
    const aReply = await a.nextMessage()
    const bReply = await b.nextMessage()
    assert.equal(aReply.id, 'req-1')
    assert.equal(bReply.id, 'req-2')
    assert.equal(aReply.result.probed, true)
    const sent = upstream.seen.filter((m) => m.method === 'Custom.probe')
    assert.equal(sent.length, 2)
    for (const row of sent) assert.match(String(row.id), /^ks:\d+:(req-1|req-2)$/)
    assert.notEqual(sent[0].id, sent[1].id, 'each client gets a distinct slot namespace')
  } finally {
    upstream.teardown()
  }
})

test('upstream teardown mass-drops clients and the next handle() rebuilds the upstream', async () => {
  const upstream1 = await fakeUpstream({
    'Target.getTargets': () => ({ targetInfos: [{ targetId: 'P1', type: 'page' }] }),
  })
  try {
    const relay = makeCdpRelay({ upstreamUrl: `ws://127.0.0.1:${upstream1.port}/devtools/browser`, debug: false })
    const a = fakeClientSocket()
    await relay.handle(a)
    assert.ok(relay.clients.size >= 1)
    // Kill the wire, then give the relay a beat to observe the socket death.
    upstream1.teardown()
    await new Promise((resolve) => setTimeout(resolve, 50))
    assert.equal(relay.clients.size, 0, 'upstream death must mass-drop every client')
    assert.equal(relay.shared.pageTargetId, null, 'the shared-page pointer dies with the socket')
    assert.equal(relay.stats().upstreamAlive, false)
  } finally {
    upstream1.teardown()
  }
})

test('a dropped client never shares a slot with the client that replaces it', async () => {
  const upstream = await fakeUpstream({
    'Target.getTargets': () => ({ targetInfos: [{ targetId: 'P', type: 'page' }] }),
    'Browser.getVersion': () => ({ product: 'Kitesurf/1' }),
  })
  try {
    const relay = makeCdpRelay({ upstreamUrl: `ws://127.0.0.1:${upstream.port}/devtools/browser`, debug: false })
    const a = fakeClientSocket()
    const c = fakeClientSocket() // stays live — the collision reference
    await relay.handle(a)
    await relay.handle(c)
    a.emit('close') // dropClient: a is removed and its slot may be reused
    const b = fakeClientSocket()
    await relay.handle(b)
    // The slot allocator must pick a free slot — colliding with the still-live
    // c would route c's replies into b's socket.
    const liveSlots = new Set()
    for (const [, row] of relay.clients) liveSlots.add(row.slot)
    assert.equal(liveSlots.size, relay.clients.size, 'every live client owns a distinct slot')
    assert.equal(relay.clients.size, 2)
    // a's slot may be reused by b — that's the "freed" property; it must only
    // ever be distinct while another client holds it.
    const bSlot = relay.clients.get(b).slot
    const cSlot = relay.clients.get(c).slot
    assert.notEqual(bSlot, cSlot)
  } finally {
    upstream.teardown()
  }
})

test('a reply for a dropped client is swallowed, never rerouted to a live one', async () => {
  const upstream = await fakeUpstream({
    'Target.getTargets': () => ({ targetInfos: [{ targetId: 'P', type: 'page' }] }),
    // A reply the upstream DELAYS long enough that the client is gone by the
    // time it lands — the in-flight window the review flagged.
    'Slow.probe': () => new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 80)),
  })
  try {
    const relay = makeCdpRelay({ upstreamUrl: `ws://127.0.0.1:${upstream.port}/devtools/browser`, debug: false })
    const a = fakeClientSocket()
    const b = fakeClientSocket()
    await relay.handle(a)
    await relay.handle(b)
    a.sendFrame(JSON.stringify({ id: 3, method: 'Slow.probe' }))
    a.emit('close') // drop before the reply lands
    assert.equal(relay.clients.has(a), false)
    // b sends its own fast command; the delayed a-reply must NOT arrive on b.
    b.sendFrame(JSON.stringify({ id: 8, method: 'Slow.probe' }))
    const bReply = await b.nextMessage()
    assert.equal(bReply.id, 8, 'b gets only its own reply')
    // Give the dropped reply a beat to (incorrectly) surface, then assert the
    // client-side queue is empty — swallowed, not leaked across sockets.
    await new Promise((resolve) => setTimeout(resolve, 150))
    assert.equal(a.messages.length, 0, 'dropped socket queue stays empty')
    assert.equal(b.messages.length, 0, 'no stray reply lands on the live client')
  } finally {
    upstream.teardown()
  }
})

test('frame decoder reassembles fragmented + masked client frames', () => {
  const texts = []
  const decode = frameCollector((text) => texts.push(text))
  const full = maskedTextFrame(JSON.stringify({ id: 1, method: 'X' }))
  // Feed in arbitrary splits — TCP never respects frame boundaries.
  decode(full.subarray(0, 3))
  decode(full.subarray(3, 7))
  decode(full.subarray(7))
  assert.equal(texts.length, 1)
  assert.equal(JSON.parse(texts[0]).method, 'X')
})

test('frame decoder enforces maxFrame', () => {
  let closed = false
  const decode = createFrameDecoder({
    onMessage: () => {},
    onPing: () => {},
    onClose: () => { closed = true },
    maxFrame: 8,
    maxMessage: 16,
  })
  decode(maskedTextFrame('this payload is far longer than eight bytes'))
  assert.equal(closed, true)
})

// T-O-63: while humanHold is active, an agent-class relay connection gets only
// the read whitelist; everything else answers kitesurf.control.held, is
// recorded on lastAction, and never moves relay.lastAt. A host-class
// connection is never gated.
test('T-O-63: humanHold gates agent-class relay writes, not the host class or reads', async () => {
  const { makeControl } = await import('../profiles/kitesurf/mcp-bridge.mjs')
  const upstream = await fakeUpstream({
    'Target.getTargets': () => ({ targetInfos: [{ targetId: 'PAGE-1', type: 'page', url: 'https://example.com/' }] }),
    'DOM.getDocument': () => ({ root: { nodeId: 1 } }),
    'Page.navigate': () => ({ frameId: 'F1' }),
  })
  try {
    const control = makeControl()
    control.humanHold = { active: true, owner: 'human', since: 't0', note: 'takeover' }
    const relay = makeCdpRelay({ upstreamUrl: `ws://127.0.0.1:${upstream.port}/devtools/browser`, debug: false, control })
    const agent = fakeClientSocket()
    const host = fakeClientSocket()
    await relay.handle(agent)                 // no klass → agent-class
    await relay.handle(host, 'host')          // generation credential at handshake → host-class

    // relay.conns counts agent-class only.
    assert.equal(relay.agentStats().conns, 1)
    assert.equal(relay.clients.size, 2)

    // Whitelisted read passes for the agent even during the hold.
    agent.sendFrame(JSON.stringify({ id: 1, method: 'DOM.getDocument', params: { depth: 1 } }))
    const read = await agent.nextMessage()
    assert.equal(read.result.root.nodeId, 1)
    assert.equal(upstream.seen.filter((m) => m.method === 'DOM.getDocument').length, 1)

    // Mutating methods are refused in-band, never reach upstream, and do not
    // move relay.lastAt — but DO record lastAction (the refusal itself is the
    // pane-visible action, per T-O-63).
    for (const [id, method] of [[2, 'Page.navigate'], [3, 'Runtime.evaluate'], [4, 'Input.dispatchMouseEvent'], [5, 'Target.createTarget']]) {
      agent.sendFrame(JSON.stringify({ id, method, params: { url: 'https://evil.example/' } }))
      const reply = await agent.nextMessage()
      assert.equal(reply.id, id)
      assert.equal(reply.error.data.errorId, 'kitesurf.control.held', `${method} must be held-refused`)
    }
    assert.equal(upstream.seen.filter((m) => m.method === 'Page.navigate').length, 0)
    assert.equal(upstream.seen.filter((m) => m.method === 'Runtime.evaluate').length, 0)
    assert.equal(control.lastAction.ok, false)
    const stats = relay.agentStats()
    assert.equal(stats.lastMethod, 'DOM.getDocument', 'lastMethod names only the last ADMITTED command')
    assert.notEqual(stats.lastAt, null)

    // Host-class writes sail through the same hold.
    host.sendFrame(JSON.stringify({ id: 7, method: 'Page.navigate', params: { url: 'https://pane.example/' } }))
    const hostReply = await host.nextMessage()
    assert.equal(hostReply.id, 7)
    assert.equal(hostReply.result.frameId, 'F1')
    assert.equal(upstream.seen.filter((m) => m.method === 'Page.navigate').length, 1)

    // Dropping the host socket leaves the agent count untouched; dropping the
    // agent frees it.
    agent.emit('close')
    await new Promise((r) => setTimeout(r, 10))
    assert.equal(relay.agentStats().conns, 0)
  } finally {
    upstream.teardown()
  }
})
