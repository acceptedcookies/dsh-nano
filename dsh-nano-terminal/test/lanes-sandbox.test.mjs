// McpLane managed-sandbox branch vs legacy third-party MCP path.
// Stubs: global fetch (MCP control plane) + global WebSocket (data plane).
import assert from 'node:assert/strict'
import test from 'node:test'
import { makeLane, McpLane } from '../src/client/lanes.js'

const ok = (data) => ({ json: async () => ({ result: { structuredContent: data } }) })
const err = (message) => ({ json: async () => ({ error: { message } }) })

/** A recorded fetch stub; `script(name)` answers each tools/call by name. */
function mcpFetch(script) {
  const calls = []
  const stub = async (url, init) => {
    const body = JSON.parse(init.body)
    calls.push({ url, body })
    if (body.method === 'tools/call') {
      const name = body.params.name
      return (script[name] ?? (() => err(`no script for ${name}`)))(body)
    }
    return ok({})
  }
  stub.calls = calls
  return stub
}

/** Fake WebSocket: queue-driven open; sent payloads recorded; closable. */
function fakeWs() {
  const made = []
  class FakeWs {
    constructor(url) {
      this.url = url
      this.sent = []
      this.readyState = 0
      this.onopen = this.onmessage = this.onclose = this.onerror = null
      made.push(this)
      queueMicrotask(() => { this.readyState = 1; this.onopen?.() })
    }
    send(payload) {
      this.sent.push(payload)
      if (typeof payload === 'string') {
        const msg = JSON.parse(payload)
        if (msg.type === 'open') {
          queueMicrotask(() => this.ready({ type: 'ready', v: msg.v ?? 2, align: msg.align ?? 1, session: msg.session }))
        }
      }
    }
    close(code = 1000) { this.readyState = 3; this.onclose?.({ code }) }
    ready(msg) { this.onmessage?.({ data: JSON.stringify(msg) }) }
    binary(buf) { this.onmessage?.({ data: buf }) }
  }
  FakeWs.made = made
  return FakeWs
}

const CONTRACT = {
  contractVersion: 'dnls.control/1',
  capabilities: ['term.session.attach', 'term.session.create', 'sandbox.status'],
}
const ATTACH = (sandboxId, terminalId) => ({
  contractVersion: 'dnls.control/1',
  sandboxId, terminalId,
  attach: { protocol: 'dnt-ws-v2', url: 'ws://h/nano-local-sandbox/term/x' },
})

// The managed endpoint can live at ANY same-host path — selection is by the
// announced contractVersion (T-O-45), never by plugin name or URL features.
function spec(over = {}) {
  return { lane: 'mcp', url: 'http://h/alternate/control', contractVersion: 'dnls.control/1', sandboxId: 'box-1', paneId: 'pane-1', openId: 'open-1', ...over }
}
const meta = { cols: 80, rows: 24, sessionId: 'sess-1' }

test('managed open: contract discovery → create → attach with dnls.control/1, v2 open, initial CREDIT', async (t) => {
  const fetchStub = mcpFetch({
    'sandbox.contract': () => ok(CONTRACT),
    'term.session.create': () => ok({ contractVersion: 'dnls.control/1', sandboxId: 'box-1', terminalId: 'term-9' }),
    'term.session.attach': () => ok(ATTACH('box-1', 'term-9')),
  })
  const Ws = fakeWs()
  t.mock.method(globalThis, 'fetch', fetchStub)
  t.mock.property(globalThis, 'WebSocket', Ws)
  const lane = makeLane(spec(), meta)
  assert.ok(lane instanceof McpLane)
  await lane.open()
  const names = fetchStub.calls.map((c) => c.body.params.name)
  assert.deepEqual(names, ['sandbox.contract', 'term.session.create', 'term.session.attach'])
  for (const c of fetchStub.calls) {
    assert.equal(c.body.params._meta?.['dnls/contract'], 'dnls.control/1')
  }
  const createArgs = fetchStub.calls[1].body.params.arguments
  assert.equal(createArgs.sandboxId, 'box-1')
  assert.equal(createArgs.openId, 'open-1')
  assert.equal(createArgs.sessionId, undefined, 'no legacy sessionId on the managed wire')
  const ws = Ws.made[0]
  const openMsg = JSON.parse(ws.sent[0])
  assert.deepEqual(openMsg, { type: 'open', v: 2, align: 1, session: 'term-9' })
  ws.ready({ type: 'ready', v: 2, align: 1, session: 'term-9' })
  await new Promise((r) => setImmediate(r))
  const credit = ws.sent.map((s) => s instanceof Uint8Array ? s : null).filter(Boolean)[0]
  assert.ok(credit, 'initial CREDIT frame after aligned ready')
  assert.equal(credit[4], 1, 'CREDIT kind')
  lane.close()
  const frames = ws.sent.filter((s) => s instanceof Uint8Array)
  assert.equal(frames[frames.length - 1][4], 3, 'CLOSE=detach frame')
  assert.equal(fetchStub.calls.some((c) => c.body.params?.name === 'term.session.close'), false, 'detach never closes the terminal')
})

test('managed salvage: explicit terminalId attaches — never creates', async (t) => {
  const fetchStub = mcpFetch({
    'sandbox.contract': () => ok(CONTRACT),
    'term.session.attach': () => ok(ATTACH('box-1', 'term-7')),
    'term.session.create': () => { throw new Error('create must not be called') },
  })
  const Ws = fakeWs()
  t.mock.method(globalThis, 'fetch', fetchStub)
  t.mock.property(globalThis, 'WebSocket', Ws)
  const lane = makeLane(spec({ terminalId: 'term-7' }), meta)
  await lane.open()
  const names = fetchStub.calls.map((c) => c.body.params.name)
  assert.deepEqual(names, ['sandbox.contract', 'term.session.attach'])
  assert.equal(lane.id, 'term-7')
  lane.close()
})

test('managed reconnect on transport loss only: one fresh attach, never create', async (t) => {
  const fetchStub = mcpFetch({
    'sandbox.contract': () => ok(CONTRACT),
    'term.session.create': () => ok({ contractVersion: 'dnls.control/1', sandboxId: 'box-1', terminalId: 'term-9' }),
    'term.session.attach': () => ok(ATTACH('box-1', 'term-9')),
  })
  const Ws = fakeWs()
  t.mock.method(globalThis, 'fetch', fetchStub)
  t.mock.property(globalThis, 'WebSocket', Ws)
  const lane = makeLane(spec(), meta)
  await lane.open()
  const first = Ws.made[0]
  first.ready({ type: 'ready', v: 2, align: 1, session: 'term-9' })
  first.close() // transport loss
  await new Promise((r) => setTimeout(r, 2400))
  const names = fetchStub.calls.map((c) => c.body.params.name)
  assert.deepEqual(names.filter((n) => n === 'term.session.create'), ['term.session.create'], 'no second create')
  assert.equal(names.filter((n) => n === 'term.session.attach').length, 2, 'fresh attach under same contract')
  assert.equal(Ws.made.length, 2)
  // Third-party loss would reuse the old URL; sandbox must not.
  assert.equal(Ws.made[1].url, Ws.made[0].url, 're-attached URL is the freshly issued one')
  lane.close()
})

test('managed attach rejects non-ws, credentialed, or mismatched targets', async (t) => {
  for (const [label, attach] of [
    ['http scheme', { sandboxId: 'box-1', terminalId: 'term-9', attach: { protocol: 'dnt-ws-v2', url: 'http://h/x' } }],
    ['credential', { sandboxId: 'box-1', terminalId: 'term-9', attach: { protocol: 'dnt-ws-v2', url: 'ws://u:p@h/x' } }],
    ['token query', { sandboxId: 'box-1', terminalId: 'term-9', attach: { protocol: 'dnt-ws-v2', url: 'ws://h/x?token=1' } }],
    ['cross-origin', { sandboxId: 'box-1', terminalId: 'term-9', attach: { protocol: 'dnt-ws-v2', url: 'ws://evil.example/x' } }],
    ['hash', { sandboxId: 'box-1', terminalId: 'term-9', attach: { protocol: 'dnt-ws-v2', url: 'ws://h/x#f' } }],
    ['wrong terminal', { sandboxId: 'box-1', terminalId: 'term-OTHER', attach: { protocol: 'dnt-ws-v2', url: 'ws://h/x' } }],
    ['wrong protocol', { sandboxId: 'box-1', terminalId: 'term-9', attach: { protocol: 'dnt-ws-v1', url: 'ws://h/x' } }],
  ]) {
    const fetchStub = mcpFetch({
      'sandbox.contract': () => ok(CONTRACT),
      'term.session.attach': () => ok(attach),
    })
    t.mock.method(globalThis, 'fetch', fetchStub)
    t.mock.property(globalThis, 'WebSocket', fakeWs())
    const lane = makeLane(spec({ terminalId: 'term-9' }), meta)
    await assert.rejects(() => lane.open(), new RegExp('attach'))
    t.mock.restoreAll()
  }
})

test('announced contract with no sandbox target fails locally — zero wire', async (t) => {
  const fetchStub = mcpFetch({})
  t.mock.method(globalThis, 'fetch', fetchStub)
  const lane = makeLane({ lane: 'mcp', url: 'http://h/alternate/control', contractVersion: 'dnls.control/1' }, meta)
  await assert.rejects(() => lane.open(), /sandbox target/)
  assert.equal(fetchStub.calls.length, 0, 'a typed target never issues a legacy create')
})

test('an unrecognized contractVersion fails — never a legacy fallthrough', async (t) => {
  const fetchStub = mcpFetch({ 'sandbox.contract': () => ok(CONTRACT) })
  t.mock.method(globalThis, 'fetch', fetchStub)
  const lane = makeLane({ lane: 'mcp', url: 'http://h/x', contractVersion: 'other.contract/9', sandboxId: 'box-1', paneId: 'pane-1', openId: 'open-1' }, meta)
  await assert.rejects(() => lane.open(), /unrecognized managed contract/)
  assert.equal(fetchStub.calls.length, 0)
})

test('managed mode selects only the same-origin endpoint; foreign url + ids fails', async (t) => {
  const fetchStub = mcpFetch({ 'sandbox.contract': () => ok(CONTRACT) })
  t.mock.method(globalThis, 'fetch', fetchStub)
  globalThis.location = { origin: 'http://h' }
  t.after(() => { delete globalThis.location })
  const lane = makeLane({ lane: 'mcp', url: 'http://other.example/mcp', contractVersion: 'dnls.control/1', sandboxId: 'box-1', paneId: 'pane-1', openId: 'open-1' }, meta)
  await assert.rejects(() => lane.open(), /same-origin http endpoint/)
  assert.equal(fetchStub.calls.length, 0)
})

test('object results without the contract envelope are not trusted', async (t) => {
  for (const [label, result] of [
    ['wrong version', { ...ATTACH('box-1', 'term-7'), contractVersion: 'dnls.control/2' }],
    ['missing envelope', (({ contractVersion, ...rest }) => rest)(ATTACH('box-1', 'term-7'))],
  ]) {
    const fetchStub = mcpFetch({
      'sandbox.contract': () => ok(CONTRACT),
      'term.session.attach': () => ok(result),
    })
    t.mock.method(globalThis, 'fetch', fetchStub)
    t.mock.property(globalThis, 'WebSocket', fakeWs())
    const lane = makeLane(spec({ terminalId: 'term-7' }), meta)
    await assert.rejects(() => lane.open(), /contract/, label)
    t.mock.restoreAll()
  }
})

test('discovery requires the exact contractVersion — caps alone are not enough', async (t) => {
  const fetchStub = mcpFetch({ 'sandbox.contract': () => ok({ capabilities: CONTRACT.capabilities }) })
  t.mock.method(globalThis, 'fetch', fetchStub)
  const lane = makeLane(spec(), meta)
  await assert.rejects(() => lane.open(), /contract version/)
})

test('create requires explicit paneId and openId; salvage requires neither', async (t) => {
  t.mock.method(globalThis, 'fetch', mcpFetch({}))
  await assert.rejects(makeLane(spec({ paneId: undefined }), meta).open(), /create target/)
  await assert.rejects(makeLane(spec({ openId: undefined }), meta).open(), /create target/)
  await assert.rejects(makeLane(spec({ sandboxId: undefined }), meta).open(), /sandbox target/)
  t.mock.restoreAll()
  // Salvage with only sandboxId+terminalId reaches the attach fetch.
  const fetchStub = mcpFetch({
    'sandbox.contract': () => ok(CONTRACT),
    'term.session.attach': () => ok(ATTACH('box-1', 'term-7')),
  })
  t.mock.method(globalThis, 'fetch', fetchStub)
  t.mock.property(globalThis, 'WebSocket', fakeWs())
  const lane = makeLane(spec({ terminalId: 'term-7', paneId: undefined, openId: undefined }), meta)
  await lane.open()
  assert.equal(lane.id, 'term-7')
  lane.close()
})

test('no input before the first aligned snapshot; DATA bytes reach onOutput without the u32 prefix', async (t) => {
  const fetchStub = mcpFetch({
    'sandbox.contract': () => ok(CONTRACT),
    'term.session.attach': () => ok(ATTACH('box-1', 'term-7')),
  })
  const Ws = fakeWs()
  t.mock.method(globalThis, 'fetch', fetchStub)
  t.mock.property(globalThis, 'WebSocket', Ws)
  const lane = makeLane(spec({ terminalId: 'term-7' }), meta)
  const emitted = []
  lane.onOutput = (b) => emitted.push(b)
  await lane.open() // strict ready done; NO snapshot yet
  const ws = Ws.made[0]
  lane.write(new Uint8Array([104, 105])) // "hi" — gated
  assert.equal(ws.sent.filter((s) => s instanceof Uint8Array && s[4] === 0).length, 0, 'no DATA before alignment')
  // SNAPSHOT frame kind 7, then a seq-prefixed DATA frame.
  const snap = new Uint8Array(9 + 13 + 1)
  const dv = new DataView(snap.buffer)
  dv.setUint32(0, 0); dv.setUint8(4, 7); dv.setUint32(5, 14)
  snap.set([1, 0, 0, 0, 8, 0, 80, 0, 24, 0, 0, 0, 0, 88], 9)
  ws.binary(snap.buffer)
  lane.write(new Uint8Array([104, 105]))
  const dataOut = ws.sent.filter((s) => s instanceof Uint8Array && s[4] === 0)
  assert.equal(dataOut.length, 1, 'input flows after the first snapshot')
  const data = new Uint8Array(9 + 4 + 2)
  const ddv = new DataView(data.buffer)
  ddv.setUint32(0, 0); ddv.setUint8(4, 0); ddv.setUint32(5, 6)
  ddv.setUint32(9, 10) // seq=10 > snapshot seq=8
  data.set([65, 66], 13)
  ws.binary(data.buffer)
  assert.deepEqual([...emitted[emitted.length - 1]], [65, 66], 'emitted bytes carry no u32 prefix')
  lane.close()
})

test('a 1008 denial is not transport loss — no fresh attach, no new socket', async (t) => {
  const fetchStub = mcpFetch({
    'sandbox.contract': () => ok(CONTRACT),
    'term.session.attach': () => ok(ATTACH('box-1', 'term-7')),
  })
  const Ws = fakeWs()
  t.mock.method(globalThis, 'fetch', fetchStub)
  t.mock.property(globalThis, 'WebSocket', Ws)
  const lane = makeLane(spec({ terminalId: 'term-7' }), meta)
  await lane.open()
  Ws.made[0].close(1008)
  await new Promise((r) => setTimeout(r, 2400))
  assert.equal(fetchStub.calls.filter((c) => c.body.params?.name === 'term.session.attach').length, 1)
  assert.equal(Ws.made.length, 1)
  lane.close()
})

test('third-party mcp lane unchanged: legacy create wire, v1 open, close RPC', async (t) => {
  const fetchStub = mcpFetch({
    'term.session.create': () => ok({ id: 'sess-remote', attach: { url: 'ws://remote/x' } }),
    'term.session.close': () => ok({}),
  })
  const Ws = fakeWs()
  t.mock.method(globalThis, 'fetch', fetchStub)
  t.mock.property(globalThis, 'WebSocket', Ws)
  const lane = makeLane({ lane: 'mcp', url: 'http://h/mcp' }, meta)
  assert.equal(lane.sandbox, null)
  await lane.open()
  const create = fetchStub.calls[0]
  assert.equal(create.body.params.name, 'term.session.create')
  assert.equal(create.body.params.arguments.sessionId, 'sess-1', 'legacy sessionId wire intact')
  assert.equal(create.body.params._meta, undefined, 'no dnls contract meta for third-party')
  assert.deepEqual(JSON.parse(Ws.made[0].sent[0]), { type: 'open', session: 'sess-remote' })
  lane.close()
  assert.equal(fetchStub.calls.some((c) => c.body.params?.name === 'term.session.close'), true, 'legacy close RPC kept')
})
