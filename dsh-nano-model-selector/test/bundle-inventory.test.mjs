/**
 * bundle-inventory.test.mjs — the async-compaction bundle projection reader.
 *
 * The reader exists because `pluginManager.listBundles()` is a ~0.9 s
 * synchronous inventory read. These tests pin the four properties that make it
 * safe to put behind a UI read: single-flight, TTL reuse, event invalidation,
 * and a fail-soft projection that never throws at the route layer.
 */
import test from 'node:test'
import assert from 'node:assert/strict'

import { COMPACTION_BUNDLE_NAME, createBundleInventory } from '../lib/bundle-inventory.js'

/** A ctx double: only `get('pluginManager')` is used by the reader. */
const ctxWith = manager => ({ get: name => (name === 'pluginManager' ? manager : undefined) })

const row = (over = {}) => ({
  name: COMPACTION_BUNDLE_NAME,
  installed: true,
  enabled: true,
  availability: 'profile',
  ...over,
})

test('projects the companion row onto installed/enabled/known/availability', async () => {
  const inventory = createBundleInventory(ctxWith({ listBundles: async () => [row()] }))
  assert.deepEqual(await inventory.get(), {
    installed: true, enabled: true, known: true, availability: 'profile',
  })
})

test('a missing row is "known but not installed", not "unknown"', async () => {
  const inventory = createBundleInventory(ctxWith({ listBundles: async () => [row({ name: 'other' })] }))
  assert.deepEqual(await inventory.get(), { installed: false, enabled: false, known: true })
})

test('no pluginManager service projects U1 (known:false)', async () => {
  const inventory = createBundleInventory({ get: () => undefined })
  assert.deepEqual(await inventory.get(), { installed: false, enabled: false, known: false })
})

test('a failing read projects U1 and does not throw', async () => {
  const inventory = createBundleInventory(ctxWith({ listBundles: async () => { throw new Error('boom') } }))
  assert.deepEqual(await inventory.get(), { installed: false, enabled: false, known: false })
})

test('concurrent callers share one inventory read (single-flight)', async () => {
  let reads = 0
  const inventory = createBundleInventory(ctxWith({
    listBundles: async () => { reads += 1; await new Promise(r => setTimeout(r, 10)); return [row()] },
  }))
  const answers = await Promise.all([inventory.get(), inventory.get(), inventory.get(), inventory.get()])
  assert.equal(reads, 1)
  for (const answer of answers) assert.equal(answer.enabled, true)
})

test('a warm snapshot is reused for the whole TTL', async () => {
  let reads = 0
  let clock = 0
  const inventory = createBundleInventory(
    ctxWith({ listBundles: async () => { reads += 1; return [row()] } }),
    { ttlMs: 1000, now: () => clock },
  )
  await inventory.get()
  clock = 999
  await inventory.get()
  assert.equal(reads, 1, 'inside the TTL the snapshot must be served')
  clock = 1000
  await inventory.get()
  assert.equal(reads, 2, 'at the TTL boundary the inventory is read again')
})

test('invalidate() drops the snapshot immediately', async () => {
  let reads = 0
  let enabled = true
  const inventory = createBundleInventory(ctxWith({
    listBundles: async () => { reads += 1; return [row({ enabled })] },
  }))
  assert.equal((await inventory.get()).enabled, true)
  enabled = false
  inventory.invalidate()
  assert.equal((await inventory.get()).enabled, false)
  assert.equal(reads, 2)
})

test('an invalidation during an in-flight read wins: the stale value is not cached', async () => {
  let release
  let reads = 0
  const inventory = createBundleInventory(ctxWith({
    listBundles: async () => {
      reads += 1
      const mine = reads
      if (mine === 1) await new Promise(r => { release = r })
      return [row({ enabled: mine === 1 })]
    },
  }))
  const first = inventory.get()          // starts read #1, blocks
  await new Promise(r => setImmediate(r))
  inventory.invalidate()                 // manager changed while reading
  release()
  assert.equal((await first).enabled, true, 'the in-flight answer is still returned to its caller')
  // ...but it must not have been cached: the next get() reads again and sees false.
  assert.equal((await inventory.get()).enabled, false)
  assert.equal(reads, 2)
})

test('a failed read after a good snapshot keeps the last good value', async () => {
  let fail = false
  let clock = 0
  const inventory = createBundleInventory(
    ctxWith({ listBundles: async () => { if (fail) throw new Error('offline'); return [row()] } }),
    { ttlMs: 1000, now: () => clock },
  )
  await inventory.get()
  fail = true
  clock = 5000 // force a re-read
  assert.deepEqual(await inventory.get(), {
    installed: true, enabled: true, known: true, availability: 'profile',
  }, 'a transient inventory failure must not flap the panel to U1')
})

test('the manager is read through ctx.get(), never a property access', async () => {
  // A cordis Context is a Proxy whose property trap resolves a shadow
  // provision. Reading `ctx.pluginManager` would silently answer a different
  // object; the reader must use the explicit service read.
  const touched = []
  const ctx = {
    get(name) { touched.push(name); return { listBundles: async () => [row()] } },
  }
  Object.defineProperty(ctx, 'pluginManager', {
    get() { throw new Error('property access is forbidden') },
  })
  const inventory = createBundleInventory(ctx)
  assert.equal((await inventory.get()).installed, true)
  assert.deepEqual(touched, ['pluginManager'])
})

test('a missing pluginManager is not cached: the next call re-reads once it appears', async () => {
  // Activation order is not guaranteed (pluginManager is not in our inject
  // list), so "no manager yet" must never pin U1 for a whole TTL.
  let manager = null
  const ctx = { get: () => manager }
  const inventory = createBundleInventory(ctx, { ttlMs: 1_800_000 })
  assert.deepEqual(await inventory.get(), { installed: false, enabled: false, known: false })
  manager = { listBundles: async () => [row()] }
  assert.deepEqual(await inventory.get(), {
    installed: true, enabled: true, known: true, availability: 'profile',
  })
})
