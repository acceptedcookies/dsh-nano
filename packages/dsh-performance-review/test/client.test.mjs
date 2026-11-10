import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createPerfReview,
  ensurePerfReview,
  pickOwner,
  bucketForElement,
  firstVisibleRoot,
  isUsableRoot,
} from '../src/client.js'
import { fakeEnv, el } from '../test-helpers/index.mjs'

const PLUGIN = 'nano-x'

const joinRow = (review, impl = {}) => review.join(PLUGIN, impl)

/** Drive an event entry → finalize → return the resulting interaction. */
const emitEvent = (review, entry, cutoff = 10_000) => {
  review._absorbEventEntry(entry)
  review._finalizeDue(cutoff)
  return review._state().collector.interactions.at(-1)
}

// ---------- enablement ----------

test('disabled by default: join returns passthrough api, no observers installed', () => {
  const env = fakeEnv({ forceEnabled: undefined })
  env.localStorage = { getItem: () => null }
  env.location = { search: '' }
  const review = createPerfReview(env)
  const api = joinRow(review)
  assert.equal(review._state().enabled, false)
  assert.equal(env.PerformanceObserver.instances.length, 0)
  const t0 = env.performance.now()
  const out = api.span('s', () => { env.performance.advance(5); return 7 })
  assert.equal(out, 7)
  assert.equal(env.performance.measures.length, 0)
  assert.equal(env.performance.now() - t0, 5)
})

test('localStorage flag enables at first join, once', () => {
  const env = fakeEnv({ forceEnabled: undefined })
  env.localStorage = { getItem: k => (k === 'dsh-perf-review' ? '1' : null) }
  const review = createPerfReview(env)
  joinRow(review)
  assert.equal(review._state().enabled, true)
  env.localStorage = { getItem: () => null }
  joinRow(review, {})
  assert.equal(review._state().enabled, true) // frozen
})

test('?perf-review=1 enables', () => {
  const env = fakeEnv({ forceEnabled: undefined })
  env.localStorage = { getItem: () => null }
  env.location = { search: '?foo=1&perf-review=1&bar=2' }
  const review = createPerfReview(env)
  joinRow(review)
  assert.equal(review._state().enabled, true)
})

// Regression: real callers pass no env at all — the flag sources must fall back
// to the page globals, or the URL/localStorage flags are dead in the wild.
test('globals fallback: ?perf-review=1 enables with an empty env (browser path)', () => {
  const saved = { location: globalThis.location, localStorage: globalThis.localStorage }
  globalThis.location = { search: '?perf-review=1' }
  globalThis.localStorage = { getItem: () => null }
  try {
    const review = createPerfReview()
    joinRow(review)
    assert.equal(review._state().enabled, true)
  } finally {
    if (saved.location === undefined) delete globalThis.location
    else globalThis.location = saved.location
    if (saved.localStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = saved.localStorage
  }
})

test('globals fallback: localStorage flag enables with an empty env (browser path)', () => {
  const saved = { location: globalThis.location, localStorage: globalThis.localStorage }
  globalThis.location = { search: '' }
  globalThis.localStorage = { getItem: k => (k === 'dsh-perf-review' ? '1' : null) }
  try {
    const review = createPerfReview()
    joinRow(review)
    assert.equal(review._state().enabled, true)
  } finally {
    if (saved.location === undefined) delete globalThis.location
    else globalThis.location = saved.location
    if (saved.localStorage === undefined) delete globalThis.localStorage
    else globalThis.localStorage = saved.localStorage
  }
})

// ---------- span ----------

test('span records measure + window sample; async timed to settle; reject still timed', async () => {
  const env = fakeEnv()
  const review = createPerfReview(env)
  const api = joinRow(review)

  api.span('sync-work', () => { env.performance.advance(5); return 'x' })
  await api.span('async-work', () => new Promise(res => setTimeout(() => {
    env.performance.advance(9)
    res('y')
  }, 0)))
  await assert.rejects(
    api.span('fails', () => Promise.reject(new Error('boom'))))

  const state = review._state()
  const row = state.plugins.get(PLUGIN)
  assert.equal(row.spans.get('sync-work').n, 1)
  assert.equal(row.spans.get('async-work').n, 1)
  assert.equal(row.spans.get('fails').n, 1)
  const names = env.performance.measures.map(m => m.name)
  assert.deepEqual(names, [
    'nano:nano-x:sync-work', 'nano:nano-x:async-work', 'nano:nano-x:fails',
  ])
  // async settled ~9ms after t0 despite setTimeout(0)
  assert.ok(row.spans.get('async-work').window[0] >= 9)
})

test('bad span name → badNames++, fn still runs; overflow caps at 32 keys', () => {
  const env = fakeEnv()
  const review = createPerfReview(env)
  const api = joinRow(review)
  let ran = 0
  api.span('BAD:name', () => { ran += 1 })
  assert.equal(ran, 1)
  assert.equal(review._state().structure.badNames, 1)
  for (let i = 0; i < 40; i += 1) api.span(`span-${i}`, () => {})
  const row = review._state().plugins.get(PLUGIN)
  assert.equal(row.spans.size, 32)
  assert.equal(review._state().structure.overflowSpans, 8)
})

// ---------- track ----------

test('track wrap counts callbacks + callbackMs; attach/detach drive live', () => {
  const env = fakeEnv()
  const review = createPerfReview(env)
  const api = joinRow(review)
  const handle = api.track('listener', 'shortcut-key')

  const wrapped = handle.wrap(() => { env.performance.advance(2) })
  handle.attach()
  wrapped()
  env.performance.advance(1)
  wrapped()
  handle.detach()
  wrapped() // still counts callbacks after detach

  const track = review._state().plugins.get(PLUGIN).tracks.get('shortcut-key')
  assert.equal(track.callbacks, 3)
  assert.equal(track.live, 0)
  assert.ok(track.callbackMs >= 4)
})

test('resetLive zeroes live (observer disconnect covers all nodes)', () => {
  const review = createPerfReview(fakeEnv())
  const api = joinRow(review)
  const handle = api.track('mutation', 'card-wake')
  handle.attach(3)
  assert.equal(review._state().plugins.get(PLUGIN).tracks.get('card-wake').live, 3)
  handle.resetLive()
  assert.equal(review._state().plugins.get(PLUGIN).tracks.get('card-wake').live, 0)
})

// ---------- attribution ----------

test('event entries merge by interactionId (max duration) → one interaction', () => {
  const review = createPerfReview(fakeEnv())
  joinRow(review)
  const target = el('div')
  for (const [id, start, duration] of [[7, 100, 8], [7, 108, 40], [7, 148, 12]]) {
    review._absorbEventEntry({ interactionId: id, startTime: start, duration, target })
  }
  review._finalizeDue(10_000)
  const list = review._state().collector.interactions
  assert.equal(list.length, 1)
  assert.equal(list[0].duration, 40)
  assert.equal(list[0].start, 100)
})

test('interactionId 0 events are ignored (not INP data)', () => {
  const review = createPerfReview(fakeEnv())
  review._absorbEventEntry({ interactionId: 0, startTime: 5, duration: 99, target: el('div') })
  review._finalizeDue(10_000)
  assert.equal(review._state().collector.interactions.length, 0)
})

test('native-owned interaction attributes samples to plugin; own-owned goes to own.inp', () => {
  const env = fakeEnv()
  const review = createPerfReview(env)
  const root = el('div', { 'data-nxe': '' })
  const inside = el('span', {}, [])
  inside.parentElement = root
  const outside = el('div')
  const api = joinRow(review, { root: () => root })
  const track = api.track('listener', 'shortcut-key')
  const cb = track.wrap(() => { env.performance.advance(1) })

  // native-owned interaction at t=100; callback lands inside window [99,148]
  env.performance.t = 110
  cb()
  const ixNative = emitEvent(review,
    { interactionId: 1, startTime: 100, duration: 40, target: outside })
  assert.equal(ixNative.owner, 'native')
  assert.equal(ixNative.samples[PLUGIN].callbacks, 1)
  const row = review._state().plugins.get(PLUGIN)
  assert.equal(row.samples.callbacks, 1)
  assert.ok(row.native.trackMs[0] >= 1)

  // own-owned interaction → own.inp, not native.samples
  emitEvent(review, { interactionId: 2, startTime: 300, duration: 30, target: inside })
  assert.equal(review._state().collector.interactions.at(-1).owner, PLUGIN)
  assert.equal(row.own.interactions.at(-1), 30)
  assert.equal(row.samples.callbacks, 1) // unchanged
})

test('pickOwner: deepest root wins over ancestor root; throws → rootErrors', () => {
  const structure = { rootErrors: 0 }
  const deep = el('div')
  const mid = el('div', {}, [deep])
  const top = el('div', {}, [mid])
  const target = el('span')
  target.parentElement = deep
  const plugins = new Map([
    ['nano-outer', { _root: () => top }],
    ['nano-inner', { _root: () => deep }],
    ['nano-broken', { _root: () => { throw new Error('x') } }],
  ])
  assert.equal(pickOwner(plugins, target, structure), 'nano-inner')
  assert.equal(structure.rootErrors, 1)
  const lonely = el('div')
  assert.equal(pickOwner(plugins, lonely, structure), 'native')
})

test('bucketForElement walks ancestors to nearest data-* marker', () => {
  const row = el('div', { 'data-nxe': '' })
  const icon = el('span')
  icon.parentElement = row
  assert.equal(bucketForElement(icon, ['data-nxe']), 'files-row')
  const deep = el('i')
  const mid = el('div', { 'data-nano-notepad': 'root' }, [deep])
  assert.equal(bucketForElement(deep, ['data-nano-notepad']), 'notepad-panel')
  assert.equal(bucketForElement(el('div'), ['data-nxe']), 'other')
})

test('firstVisibleRoot picks the connected, unhidden pane via scope', () => {
  const paneHidden = el('section', { 'data-sidebar-right-pane': '' })
  paneHidden.hidden = true
  const paneShown = el('section', { 'data-sidebar-right-pane': '' })
  const rootA = el('div', { 'data-nxe': '' })
  rootA.parentElement = paneHidden
  const rootB = el('div', { 'data-nxe': '' })
  rootB.parentElement = paneShown
  const picked = firstVisibleRoot([rootA, rootB], e => e.parentElement)
  assert.equal(picked, rootB)
  assert.equal(firstVisibleRoot([rootA], e => e.parentElement), null)
  assert.equal(isUsableRoot(el('div')), true)
  assert.equal(isUsableRoot(null), false)
  const detached = el('div')
  detached.isConnected = false
  assert.equal(isUsableRoot(detached), false)
})

// ---------- LoAF / resources ----------

test('loaf entry: page totals + combo scripts to nanoCombined; unique-package to plugin scriptMs', () => {
  const review = createPerfReview(fakeEnv())
  joinRow(review)
  review._absorbLoafEntry({
    duration: 120, blockingDuration: 70,
    scripts: [
      { duration: 30, sourceURL: '/plugins/??dsh-nano-notepad/client.js,dsh-nano-explorer-extra/client.js&rev=x', forcedStyleAndLayoutDuration: 4 },
      { duration: 10, sourceURL: '/plugins/dsh-nano-notepad/client.chunk.js?rev=x', forcedStyleAndLayoutDuration: 0 },
      { duration: 50, sourceURL: '/assets/vendor.js', forcedStyleAndLayoutDuration: 2 },
    ],
  })
  const c = review._state().collector
  assert.equal(c.loafCount, 1)
  assert.equal(c.blockingMs, 70)
  assert.equal(c.forcedLayoutMs, 6)
  assert.equal(c.nanoScriptMs, 30)            // combo script → combined only
  assert.equal(c.pluginScriptMs.get('nano-notepad'), 10) // unique → attributable
  assert.equal(c.nanoLoafCount, 1)
  assert.equal(c.nanoBlockingMs, 70)          // whole entry charged, note explains
})

test('resource entries: only JS counted; nano bytes + combo resources split', () => {
  const review = createPerfReview(fakeEnv())
  review._absorbResourceEntry({ name: '/plugins/??dsh-nano-notepad/client.js,dsh-nano-explorer-extra/client.js&rev=x', initiatorType: 'script', encodedBodySize: 300_000 })
  review._absorbResourceEntry({ name: '/plugins/dsh-nano-notepad/client.chunk.js?rev=x', initiatorType: 'script', encodedBodySize: 8_000 })
  review._absorbResourceEntry({ name: '/assets/app.css', initiatorType: 'css', encodedBodySize: 50_000 })
  review._absorbResourceEntry({ name: '/assets/vendor.js', initiatorType: 'script', encodedBodySize: 200_000 })
  const r = review._state().collector.resources
  assert.equal(r.nanoClientJsBytes, 308_000)
  assert.equal(r.comboResources, 1)
  assert.equal(r.totalJsBytes, 508_000)
})

// ---------- singleton / contributors ----------

test('two bundled copies share one singleton; contributors recorded per join', () => {
  const global = {}
  const envA = fakeEnv({ global, forceEnabled: true })
  const envB = fakeEnv({ global, forceEnabled: true })
  const a = ensurePerfReview(envA)
  const b = ensurePerfReview(envB)
  assert.equal(a, b)
  a.join('nano-x', { libVersion: '0.1.0' })
  b.join('nano-y', { libVersion: '0.2.0' }) // skewed copy
  const report = a.report()
  const ids = report.meta.contributors.map(c => `${c.pluginId}@${c.libVersion}`)
  assert.deepEqual(ids.sort(), ['nano-x@0.1.0', 'nano-y@0.2.0'].sort())
  assert.ok(report.plugins['nano-x'].meta.implanted)
  assert.ok(report.plugins['nano-y'].meta.implanted)
})

// ---------- report / reset ----------

test('report() flushes pending, returns JSON, and clears window (not totals)', () => {
  const env = fakeEnv()
  const review = createPerfReview(env)
  const api = joinRow(review)
  api.span('s1', () => env.performance.advance(3))
  const t = api.track('listener', 'l')
  const cb = t.wrap(() => {})
  cb(); cb()
  api.count('panel-open', 2)
  emitEvent(review, { interactionId: 1, startTime: 50, duration: 20, target: el('div') })

  const report = review.report({ scenario: 'idle-10s' })
  assert.equal(report.version, 1)
  assert.equal(report.meta.scenario, 'idle-10s')
  assert.equal(report.meta.chromeMajor, 143)
  assert.equal(report.enabled, true)
  assert.equal(report.plugins[PLUGIN].spans.s1.n, 1)
  assert.equal(report.plugins[PLUGIN].tracks.l.callbacks, 2)
  assert.equal(report.plugins[PLUGIN].usage['panel-open'], 2)
  assert.equal(report.counts['panel-open'], 2)

  // window cleared; totals persist
  const row = review._state().plugins.get(PLUGIN)
  assert.equal(row.samples.callbacks, 0)
  assert.equal(row.spans.get('s1').window.length, 0)
  assert.equal(row.tracks.get('l').totalCallbacks, 2)
  const report2 = review.report()
  assert.equal(report2.plugins[PLUGIN].tracks.l.callbacks, 0)
  assert.equal(report2.plugins[PLUGIN].tracks.l.totalCallbacks, 2)
  assert.equal(report2.plugins[PLUGIN].usage['panel-open'], 2)
})
