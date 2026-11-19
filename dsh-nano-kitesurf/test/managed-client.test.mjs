// Managed design client: no object request exists before discovery + an
// explicit selection, and every bound request is refused or stamped by the
// announced contract. Hermetic — a recorded fetch never touches the wire.
import assert from 'node:assert/strict'
import test from 'node:test'
import { createManagedDesignClient, listSandboxRows } from '../src/shared/managed-client.js'

const ORIGIN = 'https://host.example'
const SB_A = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const SB_B = 'bbbbbbbb-1111-2222-3333-444444444444'

const RES = (status, body, headers = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  clone() { return this },
  json: async () => body,
})
const CONTRACT = (caps = ['sandbox.list', 'sandbox.inspect', 'sandbox.lifecycle', 'sandbox.operations',
  'dnls.status', 'dnls.open', 'dnls.shot', 'dnls.recover']) =>
  RES(200, { contractVersion: 'dnls.control/1', capabilities: caps }, { 'x-dnls-contract': 'dnls.control/1' })
const OBJECT = (body, over = {}) => RES(200, { ok: true, contractVersion: 'dnls.control/1', ...body, ...over },
  { 'x-dnls-contract': 'dnls.control/1' })

function recorder(handler) {
  const sent = []
  const impl = async (url, init = {}) => {
    sent.push({ url, init })
    return handler(url, init)
  }
  return { sent, impl }
}
const objectWrites = (sent) => sent.filter(({ url }) => new URL(url).pathname !== '/nano-local-sandbox/contract'
  && new URL(url).pathname !== '/nano-local-sandbox/sandboxes')

async function discovered(handler) {
  const { sent, impl } = recorder(handler)
  const client = createManagedDesignClient({ fetch: impl, origin: ORIGIN })
  await client.discover()
  return { sent, client }
}

test('no discovery, no selection: bind and list refuse without sending anything', async () => {
  const { sent, impl } = recorder(() => { throw new Error('wire must stay silent') })
  const client = createManagedDesignClient({ fetch: impl, origin: ORIGIN })
  await assert.rejects(() => client.list())
  assert.throws(() => client.bind(SB_A))
  assert.throws(() => client.bind(''))
  assert.equal(sent.length, 0)
})

test('wrong discovery contract stops operation: zero object writes, no retries', async () => {
  const { sent, impl } = recorder(() =>
    RES(200, { contractVersion: 'dnls.control/9', capabilities: [] }, { 'x-dnls-contract': 'dnls.control/9' }))
  const client = createManagedDesignClient({ fetch: impl, origin: ORIGIN })
  await assert.rejects(() => client.discover(), /contract/i)
  await assert.rejects(() => client.list())
  assert.throws(() => client.bind(SB_A))
  assert.equal(sent.length, 1) // discovery itself only
})

test('list pairs with discovery and refuses when sandbox.list is not announced', async () => {
  const { sent, client } = await discovered(() => CONTRACT([]))
  await assert.rejects(() => client.list(), /sandbox\.list/)
  assert.equal(sent.length, 1)

  const row = { envId: 'dev', sandboxId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', name: 'site', observedState: 'running' }
  const ok = await discovered((url) =>
    new URL(url).pathname === '/nano-local-sandbox/sandboxes'
      ? OBJECT({ envs: ['dev'], rows: [row], total: 1, complete: true })
      : CONTRACT())
  const res = await ok.client.list()
  assert.equal(res.ok, true)
  assert.equal(ok.sent.length, 2)
  assert.equal(new URL(ok.sent[1].url).pathname, '/nano-local-sandbox/sandboxes')
  // The flat `rows` projection is exactly what the picker's select renders.
  assert.deepEqual(listSandboxRows(await res.json()), [row])
  assert.throws(() => listSandboxRows({ envs: [{ envId: 'dev', rows: [row] }] }), /invalid sandbox list/)
})

test('bind stamps selector + contract on every object request and refuses adversarial input', async () => {
  const { sent, client } = await discovered((url) =>
    new URL(url).pathname === '/nano-local-sandbox/status'
      ? OBJECT({ sandboxId: new URL(url).searchParams.get('sandboxId') })
      : CONTRACT())
  const bound = client.bind(SB_A)

  const res = await bound('/nano-local-sandbox/status')
  assert.equal(res.ok, true)
  const req = sent.at(-1)
  const url = new URL(req.url)
  assert.equal(url.origin, ORIGIN)
  assert.equal(url.searchParams.get('sandboxId'), SB_A)
  const headers = req.init.headers
  assert.ok(headers.some(([k, v]) => k === 'x-dnls-contract' && v === 'dnls.control/1'))
  assert.equal(req.init.credentials, 'same-origin')

  const refusals = [
    () => bound('https://other.example/nano-local-sandbox/status'),          // wrong origin
    () => bound('/nano-local-sandbox/unknown-page'),                          // unannounced path
    () => bound('/nano-local-sandbox/status?sandboxId=' + SB_B),              // query selector
    () => bound('/nano-local-sandbox/status?sessionId=x'),
    () => bound('/nano-local-sandbox/open', { method: 'POST', body: JSON.stringify({ url: 'https://x', sandboxId: SB_B }) }),
    () => bound('/nano-local-sandbox/open', { method: 'POST', body: JSON.stringify({ nested: { sessionId: 's' } }) }),
    () => bound('/nano-local-sandbox/status', { headers: { 'x-sandbox-id': SB_B } }),
    () => bound('/nano-local-sandbox/status', { headers: { 'x-dnls-contract': 'dnls.control/9' } }),
    () => bound('/nano-local-sandbox/status', { credentials: 'include' }),
    () => bound('/nano-local-sandbox/status', { body: { raw: true } }),
    () => bound('/nano-local-sandbox/status', { body: 'not json{' }),
  ]
  for (const attempt of refusals) await assert.rejects(attempt)
  assert.equal(sent.length, 2) // contract + the one good object request; refusals are local
})

test('bind refuses missing and malformed ids before any request', async () => {
  const { sent, client } = await discovered(() => CONTRACT())
  for (const id of [undefined, null, '', 'not-a-uuid', `../../${SB_A}`, SB_A.slice(0, -1)]) {
    assert.throws(() => client.bind(id), /sandbox id/i)
  }
  assert.equal(sent.length, 1)
})

test('a success envelope naming a different sandbox is a hard error', async () => {
  const { client } = await discovered((url) =>
    new URL(url).pathname === '/nano-local-sandbox/status' ? OBJECT({ sandboxId: SB_B }) : CONTRACT())
  const bound = client.bind(SB_A)
  await assert.rejects(() => bound('/nano-local-sandbox/status'), /different sandbox/i)
})

test('missing response contract header on a 2xx is a hard error', async () => {
  const { client } = await discovered((url) =>
    new URL(url).pathname === '/nano-local-sandbox/status'
      ? RES(200, { ok: true }) : CONTRACT())
  const bound = client.bind(SB_A)
  await assert.rejects(() => bound('/nano-local-sandbox/status'), /contract/i)
})

test('unannounced capability stops the request locally — no URL inference', async () => {
  // The path exists in bindings but its capability is not announced.
  const { sent, client } = await discovered(() => CONTRACT(['sandbox.list']))
  const bound = client.bind(SB_A)
  await assert.rejects(() => bound('/nano-local-sandbox/status'), /not announced/i)
  await assert.rejects(() => bound('/nano-local-sandbox/lifecycle',
    { method: 'POST', body: JSON.stringify({ action: 'start', requestId: 'r' }) }))
  assert.equal(sent.length, 1)
})

test('late object answers cannot mutate a switched selection', async () => {
  // Two bound fetches are independent: A's response is rejected outright
  // when it names B, and B's bind never reads A's selector.
  const { sent, client } = await discovered((url) => {
    const path = new URL(url).pathname
    if (path === '/nano-local-sandbox/status') {
      return OBJECT({ ok: true, sandboxId: new URL(url).searchParams.get('sandboxId') })
    }
    return CONTRACT()
  })
  const boundA = client.bind(SB_A)
  const boundB = client.bind(SB_B)
  const lateA = boundA('/nano-local-sandbox/status')
  await boundB('/nano-local-sandbox/status')
  await lateA
  assert.equal(new URL(sent[1].url).searchParams.get('sandboxId'), SB_A)
  assert.equal(new URL(sent[2].url).searchParams.get('sandboxId'), SB_B)
})
