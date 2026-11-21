import assert from 'node:assert/strict'
import test from 'node:test'
import { createUseBindings } from '../src/host/instance-registry.js'

// DNLS03-T02: object-targeted use bindings over the managed control ledger.
// Session and locator are never lookup keys; the ledger row is the identity.
function spyingRegistry(row) {
  const seen = []
  return {
    seen,
    get(id) {
      seen.push(id)
      return id === row?.sandboxId ? row : null
    },
  }
}

const sandboxRow = {
  sandboxId: 'sb-0001',
  name: 'alpha',
  profileId: 'kitesurf',
  principal: 'owner:test',
  recipeRef: 'recipe@1',
  origin: 'created',
  stateVolume: '/state/kitesurf/sb-0001',
  binding: { locator: 'dnls-0001', generation: 'gen-1' },
  ports: [],
  operations: [],
}

const usePolicy = (over = {}) => ({ mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [], ...over })

test('DNLS03-T02 two sessions bind the same object row under one sandboxId', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  const a = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  const b = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-b', policy: usePolicy() })
  assert.equal(a.ok, true)
  assert.equal(b.ok, true)
  assert.equal(a.use.sandboxId, 'sb-0001')
  assert.equal(b.use.sandboxId, 'sb-0001')
  assert.notEqual(a.use.sessionId, b.use.sessionId)
  assert.equal(bindings.list('sb-0001').length, 2)
  for (const key of registry.seen) assert.equal(key, 'sb-0001')
})

test('DNLS03-T02 the same session reuses its own use binding', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  const first = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  const second = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  assert.equal(first.status, 201)
  assert.equal(second.status, 200)
  assert.equal(bindings.list('sb-0001').length, 1)
})

test('DNLS03-T02 no lookup happens by session guess or by locator', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  const missing = bindings.ensure({ sessionId: 'sess-a', policy: usePolicy() })
  assert.equal(missing.ok, false)
  assert.equal(registry.seen.length, 0)
  const locatorGuess = bindings.ensure({ sandboxId: 'dnls-0001', sessionId: 'sess-a', policy: usePolicy() })
  assert.equal(locatorGuess.ok, false)
  assert.equal(locatorGuess.status, 404)
  assert.deepEqual(registry.seen, ['dnls-0001'])
})

test('DNLS03-T02 release drops only that use and the object row is untouched', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-b', policy: usePolicy() })
  assert.equal(bindings.release({ sandboxId: 'sb-0001', sessionId: 'sess-a' }), true)
  assert.equal(bindings.list('sb-0001').length, 1)
  assert.equal(bindings.list('sb-0001')[0].sessionId, 'sess-b')
  const kept = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-b', policy: usePolicy() })
  assert.equal(kept.status, 200)
  assert.equal(bindings.release({ sandboxId: 'sb-0001', sessionId: 'sess-b' }), true)
  assert.equal(bindings.release({ sandboxId: 'sb-0001', sessionId: 'sess-b' }), false)
  const reopened = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-c', policy: usePolicy() })
  assert.equal(reopened.status, 201)
  assert.equal(reopened.sandbox.sandboxId, 'sb-0001')
})

test('DNLS03-T02 a changed policy on the same use is refused, not rebound', () => {
  const registry = spyingRegistry(sandboxRow)
  const bindings = createUseBindings(registry)
  bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy() })
  const stale = bindings.ensure({ sandboxId: 'sb-0001', sessionId: 'sess-a', policy: usePolicy({ mode: 'read-only' }) })
  assert.equal(stale.ok, false)
  assert.equal(stale.errorId, 'sandbox.instance.policy-stale')
  assert.equal(bindings.list('sb-0001').length, 1)
})

test('DNLS03-T02 an unknown sandboxId is a clean refusal, not a claim', () => {
  const registry = spyingRegistry(null)
  const bindings = createUseBindings(registry)
  const answer = bindings.ensure({ sandboxId: 'sb-nope', sessionId: 'sess-a', policy: usePolicy() })
  assert.equal(answer.ok, false)
  assert.equal(answer.status, 404)
  assert.deepEqual(registry.seen, ['sb-nope'])
})
