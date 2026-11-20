import assert from 'node:assert/strict'
import test from 'node:test'
import { auditRecord, authorize, createAudit, resolveOwnerPrincipal } from '../src/host/object-authz.js'

const ENVID = 'env-1'
const row = {
  sandboxId: '11111111-2222-3333-4444-555555555555',
  principal: 'key-a',
  binding: { locator: 'dnls-x', generation: 'gen-1' },
  stateVolume: '/v/a',
}
const live = { aborted: false }
const peerOf = (key, extra = {}) => ({ key, signal: live, ...extra })
const twoKeys = ({ peer }) => ({
  key: peer.key,
  operator: peer.operator === true,
  canSee: (target) => peer.operator === true || target.principal === peer.key,
  canUse: (target) => peer.operator === true || target.principal === peer.key,
})

test('DNLS03-T22 exact refusal statuses across the denial ladder', () => {
  assert.equal(authorize({ peer: null, envId: ENVID, row, action: 'stop', resolvePrincipal: twoKeys }).status, 401)
  const aborted = authorize({ peer: { signal: { aborted: true }, key: 'a' }, envId: ENVID, row, action: 'stop', resolvePrincipal: twoKeys })
  assert.equal(aborted.status, 401)
  assert.equal(authorize({ peer: peerOf('a'), envId: ENVID, row, action: 'stop' }).status, 503)
  assert.equal(authorize({ peer: peerOf('a'), envId: ENVID, row, action: 'stop', resolvePrincipal: () => { throw new Error('down') } }).status, 503)
  assert.equal(authorize({ peer: peerOf('a'), envId: ENVID, row, action: 'stop', resolvePrincipal: () => null }).status, 403)
  // A principal with no visibility grants is indistinguishable from absent.
  assert.equal(authorize({ peer: peerOf('a'), envId: ENVID, row, action: 'stop', resolvePrincipal: () => ({ key: 'a' }) }).status, 404)
  // Invisible and absent are indistinguishable.
  assert.equal(authorize({ peer: peerOf('key-b'), envId: ENVID, row, action: 'stop', resolvePrincipal: twoKeys }).status, 404)
  assert.equal(authorize({ peer: peerOf('key-b'), envId: ENVID, row: null, action: 'stop', resolvePrincipal: twoKeys }).status, 404)
  // Visible but unusable is 403.
  const seeOnly = ({ peer }) => ({ key: peer.key, canSee: true, canUse: false })
  assert.equal(authorize({ peer: peerOf('key-a'), envId: ENVID, row, action: 'stop', resolvePrincipal: seeOnly }).status, 403)
  const ok = authorize({ peer: peerOf('key-a'), envId: ENVID, row, action: 'stop', resolvePrincipal: twoKeys })
  assert.equal(ok.principal.key, 'key-a')
})

test('DNLS03-T22 the production shape trusts only kind=owner with a live signal', () => {
  const liveSignal = () => new AbortController().signal
  const dead = new AbortController()
  dead.abort()
  const owner = resolveOwnerPrincipal({ peer: { principal: { kind: 'owner' }, signal: liveSignal() } })
  assert.equal(owner.key, 'owner')
  assert.equal(owner.operator, true)
  assert.equal(owner.canUse(row, 'read'), true)
  // T-O-59: owner may hold its own terminal. The predicate is not the
  // wildcard — the next test proves per-terminal ownership is still checked.
  assert.equal(owner.canUse(row, 'terminal.attach'), true)
  assert.equal(resolveOwnerPrincipal({ peer: { principal: { kind: 'member' }, signal: liveSignal() } }), null)
  assert.equal(resolveOwnerPrincipal({ peer: { principal: { kind: 'owner' }, signal: dead.signal } }), null)
  assert.equal(resolveOwnerPrincipal({ peer: { principal: 'owner', signal: liveSignal() } }), null)
  // peer.id is never a principal key.
  assert.equal(resolveOwnerPrincipal({ peer: { id: 'key-a', signal: liveSignal() } }), null)
  // A missing or merely signal-shaped object never counts as a live signal.
  assert.equal(resolveOwnerPrincipal({ peer: { principal: { kind: 'owner' } } }), null)
  assert.equal(resolveOwnerPrincipal({ peer: { principal: { kind: 'owner' }, signal: { aborted: false } } }), null)
})

test('DNLS03-T22 terminal actions need an independently owned terminal, not operator power', () => {
  const operator = { peer: peerOf('shared-browser-owner', { operator: true }), envId: ENVID, row, action: 'terminal.read', resolvePrincipal: twoKeys }
  assert.equal(authorize({ ...operator, terminal: undefined }).status, 403)
  assert.equal(authorize({ ...operator, terminal: true }).status, 403)
  assert.equal(authorize({ ...operator, terminal: { sandboxId: row.sandboxId, principalKey: 'key-a', generation: 'gen-1' } }).status, 403)
  const owner = { peer: peerOf('key-a'), envId: ENVID, row, action: 'terminal.read', resolvePrincipal: twoKeys }
  assert.equal(authorize({ ...owner, terminal: { sandboxId: row.sandboxId, principalKey: 'key-a', generation: 'gen-1' } }).principal.key, 'key-a')
  for (const wrong of [
    { sandboxId: 'other', principalKey: 'key-a', generation: 'gen-1' },
    { sandboxId: row.sandboxId, principalKey: 'key-b', generation: 'gen-1' },
    { sandboxId: row.sandboxId, principalKey: 'key-a', generation: 'gen-2' },
  ]) {
    assert.equal(authorize({ ...owner, terminal: wrong }).status, 403)
  }
  const staleRow = { ...row, binding: { locator: 'dnls-x', generation: null } }
  assert.equal(authorize({ ...owner, row: staleRow, terminal: { sandboxId: row.sandboxId, principalKey: 'key-a', generation: 'gen-1' } }).status, 403)
})

test('DNLS03-T22 targetless create requires an operator, never a wildcard row', () => {
  const outsider = { peer: peerOf('key-b'), envId: ENVID, row: null, action: 'create', resolvePrincipal: twoKeys }
  assert.equal(authorize(outsider).status, 403)
  const operator = { peer: peerOf('key-b', { operator: true }), envId: ENVID, row: null, action: 'create', resolvePrincipal: twoKeys }
  assert.equal(authorize(operator).principal.key, 'key-b')
})

test('DNLS03-T22 audit records only the whitelist — no URLs, no input fragments', () => {
  assert.throws(() => auditRecord({ principal: 'k', sandboxId: 's', action: 'stop', result: 'ok', input: 'token=abc' }), /whitelist/)
  assert.throws(() => auditRecord({ principal: 'k', sandboxId: 's', action: 'stop', result: 'ok', url: 'ws://x?token=1' }), /whitelist/)
  assert.throws(() => auditRecord({ principal: 'k'.repeat(300), sandboxId: 's', action: 'stop', result: 'ok' }), /out of bounds|required/)
  assert.throws(() => auditRecord(null), /object/)
  const appended = []
  const audit = createAudit((record) => appended.push(record))
  audit({ principal: 'key-a', sandboxId: row.sandboxId, action: 'remove', result: 'succeeded', operationId: 'op-1' })
  const text = JSON.stringify(appended)
  assert.deepEqual(Object.keys(appended[0]).sort(), ['action', 'at', 'operationId', 'principal', 'result', 'sandboxId'].sort())
  assert.equal(text.includes('token='), false)
  assert.equal(text.includes('ws://'), false)
  assert.equal(text.includes('/nano-local-sandbox'), false)
})
