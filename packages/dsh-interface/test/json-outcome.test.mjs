/**
 * CF1115-T10 — createJsonClient / JsonOutcome.
 * Q8 discrimination-matrix seven-state fixtures + F14.8 fine-grained fixtures:
 * aborted/local-protocol never issues a request; illegal 2xx never ok:true;
 * legal null/degraded/empty-body succeed; body read once; httpStatus/domainCode
 * classified; no auto-retry / endpoint-swap / invented timeout.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { createJsonClient } from '../src/host/createJsonClient.js'
import { ok, failure, FAILURE_KIND, isOk, isFailure } from '../src/contracts/jsonOutcome.js'

const client = (fetchImpl) => createJsonClient({ fetch: fetchImpl, resolveUrl: () => '/op' })
const res = (status, body = '') => ({ status, headers: {}, text: async () => body })

// Identity operation: encode → request, decode → default JSON.
const OP = { path: '/op', method: 'POST' }

test('aborted before request: cancelled and fetch never called', async () => {
  let n = 0
  const c = client(async () => { n++; return res(200, '{}') })
  const ac = new AbortController(); ac.abort()
  const out = await c.call(OP, {}, { signal: ac.signal })
  assert.equal(out.error.kind, 'cancelled')
  assert.equal(n, 0, 'fetch must not be called on an already-aborted signal')
})

test('local encode failure: protocol and fetch never called', async () => {
  let n = 0
  const c = client(async () => { n++; return res(200) })
  const out = await c.call({ encode: () => { throw new Error('bad input') } }, {})
  assert.equal(out.error.kind, 'protocol')
  assert.equal(n, 0, 'fetch must not be called on a local encode failure')
})

test('resolveUrl failure: protocol, no request', async () => {
  let n = 0
  const c = createJsonClient({ fetch: async () => { n++; return res(200) }, resolveUrl: () => { throw new Error('no binding') } })
  const out = await c.call(OP, {})
  assert.equal(out.error.kind, 'protocol'); assert.equal(n, 0)
})

test('network reject → transport, no fabricated status', async () => {
  const c = client(async () => { throw new Error('socket reset') })
  const out = await c.call(OP, {})
  assert.equal(out.error.kind, 'transport'); assert.equal(out.error.httpStatus, undefined)
})

test('fetch abort during flight → cancelled', async () => {
  const c = client(async () => { const e = new Error('aborted'); e.name = 'AbortError'; throw e })
  const out = await c.call(OP, {})
  assert.equal(out.error.kind, 'cancelled')
})

test('non-2xx unrecognized → http, real status kept', async () => {
  const c = client(async () => res(503, 'oops'))
  const out = await c.call(OP, {})
  assert.equal(out.error.kind, 'http'); assert.equal(out.error.httpStatus, 503)
})

test('illegal 2xx → protocol, NEVER ok:true', async () => {
  const c = client(async () => res(200, 'this is { not json'))
  const out = await c.call(OP, {})
  assert.equal(out.ok, false); assert.equal(out.error.kind, 'protocol')
})

test('2xx sanctioned domain failure → domain with code + real status', async () => {
  const op = { path: '/op', decode: async (r, body) => ({ ok: false, kind: 'domain', domainCode: 'X_BUSY', message: 'busy' }) }
  const c = client(async () => res(200, '{}'))
  const out = await c.call(op, {})
  assert.equal(out.error.kind, 'domain'); assert.equal(out.error.domainCode, 'X_BUSY'); assert.equal(out.error.httpStatus, 200)
})

test('legal null / empty body / degraded → ok:true (not truthiness errors)', async () => {
  const nullOp = { path: '/op', decode: async () => ({ ok: true, data: null }) }
  const c = client(async () => res(200, ''))
  assert.equal((await c.call(nullOp, {})).ok, true)
  assert.equal((await c.call(nullOp, {})).data, null)
  // default decode on empty body → data null, still ok
  assert.equal((await c.call(OP, {})).ok, true)
})

test('no auto-retry / endpoint swap / extra request', async () => {
  let n = 0
  const c = client(async () => { n++; return res(500, 'x') })
  await c.call(OP, {})
  assert.equal(n, 1, 'exactly one request — no retry')
})

test('response body read at most once', async () => {
  let reads = 0
  const c = client(async () => ({ status: 200, headers: {}, text: async () => { reads++; return '{}' } }))
  await c.call(OP, {})
  assert.equal(reads, 1)
})

test('contracts exports: ok/failure shape + kind guard', () => {
  assert.deepEqual(ok({ a: 1 }), { ok: true, data: { a: 1 } })
  const f = failure('domain', 'm', { domainCode: 'C', httpStatus: 200 })
  assert.equal(isFailure(f), true); assert.equal(isOk(f), false)
  assert.throws(() => failure('nonsense', 'm'))
  assert.equal(FAILURE_KIND.DOMAIN, 'domain')
})
