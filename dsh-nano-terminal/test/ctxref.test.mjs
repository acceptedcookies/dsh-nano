/**
 * ctxref.test.mjs — `[ DNT:{conv8}@{term8} ]` context-reference contract.
 *
 * Covers the shared primitives (stamp8/formatCtxRef/parseCtxRef/bareTermStamp/
 * stampOrKeep8) and the host-side resolution: SessionRegistry.resolve must
 * match a ctx ref — or a bare 8-hex term stamp — to the session whose labels
 * carry `t` (and `conv` when given), without breaking id|name|addr refs.
 * `info().ctx` must render `DNT:{conv}@{t}` verbatim.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { stamp8, formatCtxRef, parseCtxRef, bareTermStamp, stampOrKeep8 } from '../src/shared/ctxref.js'
import { SessionRegistry, SessionRecord } from '../src/host/sessions.js'

const UUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

test('stamp8 keeps a uuid first 8 and hashes non-uuid ids deterministically', () => {
  assert.equal(stamp8(UUID), 'f47ac10b')
  assert.equal(stamp8('session-abc'), stamp8('session-abc'))
  assert.match(stamp8('session-abc'), /^[0-9a-f]{8}$/)
  assert.equal(stamp8(''), '00000000')
  assert.equal(stamp8(undefined), '00000000')
  // Uppercase uuid is accepted case-insensitively.
  assert.equal(stamp8(UUID.toUpperCase()), 'f47ac10b')
})

test('stampOrKeep8 keeps 8-hex, stamps everything else, nulls empties', () => {
  assert.equal(stampOrKeep8('DeAdBeEf'), 'deadbeef')
  assert.equal(stampOrKeep8(UUID), 'f47ac10b')
  assert.equal(stampOrKeep8('session-xyz'), stamp8('session-xyz'))
  assert.equal(stampOrKeep8(''), null)
  assert.equal(stampOrKeep8(null), null)
  assert.equal(stampOrKeep8(42), null)
})

test('formatCtxRef renders the clipboard form', () => {
  assert.equal(formatCtxRef(UUID, 'aabbccdd'), '[ DNT:f47ac10b@aabbccdd ]')
  // Both sides are normalized — a uuid term id collapses to its own 8.
  assert.equal(formatCtxRef('conv-1', UUID), `[ DNT:${stamp8('conv-1')}@f47ac10b ]`)
  // Empties degrade to the zero stamp, never a malformed ref.
  assert.equal(formatCtxRef(null, null), '[ DNT:00000000@00000000 ]')
})

test('parseCtxRef is whitespace/case tolerant and allows a missing conv', () => {
  assert.deepEqual(parseCtxRef('[ DNT:f47ac10b@aabbccdd ]'), { conv: 'f47ac10b', term: 'aabbccdd' })
  assert.deepEqual(parseCtxRef('[DNT:f47ac10b@aabbccdd]'), { conv: 'f47ac10b', term: 'aabbccdd' })
  assert.deepEqual(parseCtxRef('DNT:F47AC10B@AABBCCDD'), { conv: 'f47ac10b', term: 'aabbccdd' })
  assert.deepEqual(parseCtxRef('DNT:@aabbccdd'), { conv: null, term: 'aabbccdd' })
  assert.equal(parseCtxRef('DNT:aabbccdd@not-hex!'), null)
  assert.equal(parseCtxRef('hello'), null)
  assert.equal(parseCtxRef('[ DNN:12345678@foo ]'), null) // notepad ref ≠ terminal ref
  assert.equal(parseCtxRef(null), null)
})

test('bareTermStamp accepts only 8-hex', () => {
  assert.equal(bareTermStamp('AABBCCDD'), 'aabbccdd')
  assert.equal(bareTermStamp('aabbccdd1'), null)
  assert.equal(bareTermStamp('local/dead'), null)
  assert.equal(bareTermStamp(null), null)
})

// —— host resolution ——
// SessionRecord is constructible without a live pty: resolve() only reads
// id/name/addr/labels, so a stub handle keeps the test hermetic.
function stubRecord({ id, name, labels = {} }) {
  return new SessionRecord({
    id, lane: 'local', name,
    handle: { pid: 1, write() {}, resize() {}, done: Promise.resolve(), terminate() {} },
    owner: 'test', title: '', parent: null, keep: false,
    labels, meta: {}, replayBytes: 0,
    registry: { bus: { emit() {} } },
  })
}

function registryWith(records) {
  const reg = new SessionRegistry({ ctx: null, audit() {}, sendBinary() {}, sendText() {}, bus: { emit() {} }, persist: null })
  for (const r of records) {
    reg.sessions.set(r.id, r)
    if (r.name) reg.names.set(r.name, r.id)
  }
  return reg
}

test('resolve maps ctx refs, bare stamps and legacy refs to the labelled session', () => {
  const rec = stubRecord({ id: 'aabbccddeeff0011', labels: { t: 'd3adb33f', conv: 'c0ffee01' } })
  const other = stubRecord({ id: '0011223344556677', labels: { t: 'baadf00d', conv: 'c0ffee02' } })
  const reg = registryWith([rec, other])

  // full ctx ref — conv+term both must match
  assert.equal(reg.resolve('[ DNT:c0ffee01@d3adb33f ]'), rec)
  assert.equal(reg.resolve('DNT:c0ffee02@d3adb33f'), undefined, 'conv mismatch must not match')
  // conv-less ctx ref — term alone is enough
  assert.equal(reg.resolve('DNT:@baadf00d'), other)
  // bare 8-hex term stamp
  assert.equal(reg.resolve('d3adb33f'), rec)
  // legacy refs still work: id, name, addr, short prefix
  assert.equal(reg.resolve('aabbccddeeff0011'), rec)
  // a lane-prefixed term stamp strips the lane and still resolves via `t`.
  assert.equal(reg.resolve('local/baadf00d'), other)
  const named = stubRecord({ id: '9999888877776666', name: 'review' })
  reg.sessions.set(named.id, named); reg.names.set('review', named.id)
  assert.equal(reg.resolve('local/review'), named)
  assert.equal(reg.resolve('no-such-thing'), undefined)
})

test('info().ctx renders DNT:{conv}@{t} and stays null without both labels', () => {
  const full = stubRecord({ id: 'x1', labels: { t: 'd3adb33f', conv: 'c0ffee01' } })
  assert.equal(full.info().ctx, 'DNT:c0ffee01@d3adb33f')
  assert.equal(stubRecord({ id: 'x2', labels: { t: 'd3adb33f' } }).info().ctx, null)
  assert.equal(stubRecord({ id: 'x3', labels: {} }).info().ctx, null)
})
