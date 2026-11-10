/**
 * Gate-A acceptance tests (performance-alpha.md §10.7.3 A1–A5).
 * Each test maps to a "验收证据" cell in the execution ledger.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  createPerfReview,
  isUsableRoot,
  firstVisibleRoot,
  pickOwner,
  LIB_VERSION as CLIENT_LIB_VERSION,
} from '../src/client.js'
import {
  buildReport,
  interactionSamples,
  mergeHostSnapshot,
  diffHostSnapshots,
} from '../src/aggregate.js'
import { createCollectorState, createPluginRow, createStructure } from '../src/state.js'
import { createPerfReviewHost, LIB_VERSION as HOST_LIB_VERSION } from '../src/host.js'
import { fakeEnv, fakePerf, el } from '../test-helpers/index.mjs'

const hostEnv = (over = {}) => ({
  process: {
    env: { DSH_PERF_REVIEW: '1', DSH_DATA_DIR: '/tmp/dsh-test' },
    once: () => {},
  },
  setInterval: fn => { timers.push(fn); return { unref() {} } },
  fs: { async mkdir() {}, async writeFile() {} },
  path: { join: (...parts) => parts.join('/') },
  performance: { t: 0, now() { return this.t }, advance(ms) { this.t += ms } },
  global: {},
  timers,
  ...over,
})
// `timers` must exist before the object literal is evaluated.
const timers = []

// ---------- A1: host → browser link ----------

const hostSnapshotFixture = () => ({
  version: 1,
  enabled: true,
  observerVersion: '0.1.0',
  contributors: [],
  sinceStart: '2026-11-10T00:00:00Z',
  writtenAt: '2026-11-10T01:00:00Z',
  window: true,
  plugins: {
    'nano-explorer-extra': {
      version: '0.1.1',
      spans: {
        'git-status': { n: 4, samples: [10, 20, 30, 40] },
        list: { n: 2, samples: [3, 7] },
        stats: { n: 1, samples: [14444.8] },
      },
    },
  },
  structure: { hostWriteErrors: 2 },
})

test('A1: report(meta, hostSnapshot) actually fills hostSpan + host errors + timing meta', () => {
  const review = createPerfReview(fakeEnv())
  review.join('nano-explorer-extra')
  const report = review.report({ scenario: 'files-expand' }, hostSnapshotFixture())
  const plugin = report.plugins['nano-explorer-extra']
  assert.equal(plugin.hostSpan['git-status'].n, 4)
  assert.equal(plugin.hostSpan['git-status'].p95, 40)
  assert.equal(plugin.hostSpan.list.n, 2)
  assert.equal(plugin.hostSpan.stats.p95, 14444.8)
  assert.equal(report.structure.hostWriteErrors, 2)
  assert.equal(report.meta.hostWrittenAt, '2026-11-10T01:00:00Z')
  assert.equal(report.meta.hostSinceStart, '2026-11-10T00:00:00Z')
  assert.equal(report.meta.hostWindow, true)
})

test('A1: mergeHostSnapshot is pure w.r.t. absent/disabled host data', () => {
  const report = buildReport({
    collector: createCollectorState(),
    plugins: new Map([['nano-x', createPluginRow()]]),
    structure: createStructure(),
    enabled: true,
  })
  assert.deepEqual(report.plugins['nano-x'].hostSpan, {})
  mergeHostSnapshot(report, null)
  assert.deepEqual(report.plugins['nano-x'].hostSpan, {})
  mergeHostSnapshot(report, hostSnapshotFixture())
  assert.deepEqual(report.plugins['nano-x'].hostSpan, {}) // no matching pluginId
})

test('A1: diffHostSnapshots turns cumulative n into a per-scenario delta', () => {
  const before = { plugins: { 'nano-x': { spans: { list: { n: 10, samples: [1, 2] } } } } }
  const after = { plugins: { 'nano-x': { spans: { list: { n: 13, samples: [1, 2, 3] } } } } }
  const diff = diffHostSnapshots(before, after)
  assert.equal(diff.plugins['nano-x'].spans.list.n, 3)
  assert.deepEqual(diff.plugins['nano-x'].spans.list.samples, [1, 2, 3])
  assert.equal(diffHostSnapshots(null, after).plugins['nano-x'].spans.list.n, 13)
})

test('A1: host takeWindow() is exact-per-window and does not disturb snapshot()', () => {
  const host = createPerfReviewHost(hostEnv())
  const api = host.hostJoin('nano-x', { version: '0.1.1' })
  api.hostSpan('list', () => { host._state().enabled === true })
  const cumulative = host.snapshot()
  assert.equal(cumulative.plugins['nano-x'].spans.list.n, 1)
  const window = host.takeWindow()
  assert.equal(window.window, true)
  assert.equal(window.plugins['nano-x'].spans.list.n, 1)
  assert.equal(window.plugins['nano-x'].spans.list.samples.length, 1)
  // second takeWindow is empty; cumulative snapshot is unchanged
  assert.equal(host.takeWindow().plugins['nano-x'].spans.list.n, 0)
  assert.equal(host.snapshot().plugins['nano-x'].spans.list.n, 1)
  assert.equal(host.snapshot().plugins['nano-x'].spans.list.windowN, 0)
})

// ---------- A2: finalizeDue on a clock, no lost samples ----------

test('A2: >4096 span events after a finalized interaction do not erase its samples', () => {
  const env = fakeEnv({ performance: fakePerf(50) })
  const review = createPerfReview(env)
  const api = review.join('nano-x')
  env.performance.t = 110
  api.span('work', () => { env.performance.advance(2) }) // span [110,112]
  review._absorbEventEntry({ interactionId: 1, startTime: 100, duration: 40, target: el('div') })
  // The production sweep (250 ms) closes the window at t=200, well before the flood.
  env.performance.t = 200
  review._finalizeDue(env.performance.now())
  const first = review._state().collector.interactions.find(ix => ix.interactionId === 1)
  assert.ok(first, 'interaction must be finalized by the sweep')
  assert.equal(first.samples['nano-x'].spans, 1)

  for (let i = 0; i < 5000; i += 1) {
    env.performance.advance(1)
    api.span('work', () => {})
  }
  const after = review._state().collector.interactions.find(ix => ix.interactionId === 1)
  assert.equal(after.samples['nano-x'].spans, 1, 'samples already captured survive the ring')
  assert.ok(review._state().collector.spanEvents.length <= 4096)
})

test('A2: observer callback finalizes pending interactions automatically', () => {
  const env = fakeEnv({ performance: fakePerf(50) })
  const review = createPerfReview(env)
  review.join('nano-x')
  const po = env.PerformanceObserver.instances[0]
  env.performance.t = 100
  po.emit([{ interactionId: 7, startTime: 100, duration: 40, target: el('div') }])
  env.performance.t = 200
  po.emit([{ interactionId: 8, startTime: 200, duration: 20, target: el('div') }])
  assert.equal(review._state().collector.pendingInteractions.size, 1) // only #8 still open
  assert.equal(review._state().collector.interactions.length, 1)
})

test('A2: events older than 60 s are pruned, recent ones kept', () => {
  const env = fakeEnv({ performance: fakePerf(0) })
  const review = createPerfReview(env)
  const api = review.join('nano-x')
  env.performance.t = 100
  api.span('old', () => { env.performance.advance(1) })
  env.performance.t = 70_000
  api.span('new', () => { env.performance.advance(1) })
  review._finalizeDue(env.performance.now())
  assert.ok(review._state().collector.spanEvents.every(e => e.end >= 10_000))
  assert.equal(review._state().collector.spanEvents.length, 1)
})

// ---------- A3: dead fields + libVersion ----------

test('A3: plugin.scriptMs reads collector.pluginScriptMs (was a dead field)', () => {
  const collector = createCollectorState()
  collector.pluginScriptMs.set('nano-x', 42.4)
  const report = buildReport({
    collector,
    plugins: new Map([['nano-x', createPluginRow()]]),
    structure: createStructure(),
    enabled: true,
  })
  assert.equal(report.plugins['nano-x'].scriptMs, 42.4)
})

test('A3: LIB_VERSION is exported from both halves for implants to pass explicitly', () => {
  assert.equal(typeof CLIENT_LIB_VERSION, 'string')
  assert.equal(typeof HOST_LIB_VERSION, 'string')
  assert.equal(CLIENT_LIB_VERSION, HOST_LIB_VERSION)
})

test('A3: join honours the caller copy libVersion (not the singleton default)', () => {
  const review = createPerfReview(fakeEnv())
  review.join('nano-a', { libVersion: CLIENT_LIB_VERSION })
  review.join('nano-b', { libVersion: '0.9.9-skew' })
  const report = review.report()
  const versions = Object.fromEntries(report.meta.contributors.map(c => [c.pluginId, c.libVersion]))
  assert.equal(versions['nano-a'], CLIENT_LIB_VERSION)
  assert.equal(versions['nano-b'], '0.9.9-skew')
})

// ---------- A4: multi-instance live, nested spans, counter reset ----------

test('A4: two handles with the same track name detach independently', () => {
  const review = createPerfReview(fakeEnv())
  const api = review.join('nano-x')
  const a = api.track('mutation', 'card-wake')
  const b = api.track('mutation', 'card-wake')
  const live = () => review._state().plugins.get('nano-x').tracks.get('card-wake').live
  a.attach(); b.attach()
  assert.equal(live(), 2)
  a.detach()
  assert.equal(live(), 1, 'one instance unmounting must not zero the other')
  b.detach()
  assert.equal(live(), 0)
})

test('A4: nested spans contribute NET ms, not a double-counted sum', () => {
  const spans = [
    { start: 100, end: 200, pluginId: 'nano-x', name: 'list-level' },
    { start: 120, end: 150, pluginId: 'nano-x', name: 'apply-status' },
  ]
  const samples = interactionSamples({ start: 100, duration: 100 }, spans, [])
  assert.equal(samples['nano-x'].spans, 2)
  assert.equal(samples['nano-x'].spanMs, 100, 'union of [100,200] and [120,150] is 100 ms')
})

test('A4: resetCounters clears cumulative usage and page counts', () => {
  const review = createPerfReview(fakeEnv())
  const api = review.join('nano-x')
  api.count('panel-open', 5)
  assert.equal(review.report().counts['panel-open'], 5)
  review.resetCounters()
  const after = review.report()
  assert.equal(after.plugins['nano-x'].usage['panel-open'], undefined)
  assert.equal(after.counts['panel-open'], undefined)
})

// ---------- A5: partial observer install is visible ----------

test('A5: a single failing observe() increments observersMissing, not observerErrors', () => {
  class PartialPO {
    constructor(cb) { this.cb = cb; PartialPO.instances.push(this) }
    observe(opts) { if (opts.type === 'event') throw new Error('event unsupported') }
    disconnect() {}
    emit(entries) { this.cb({ getEntries: () => entries }) }
  }
  PartialPO.instances = []
  const env = fakeEnv({ PerformanceObserver: PartialPO })
  const review = createPerfReview(env)
  review.join('nano-x')
  const structure = review._state().structure
  assert.equal(structure.observersMissing, 1)
  assert.equal(structure.observerErrors, 0, 'all-zero structure no longer hides a partial install')
})

test('A5: root() helpers never perform a layout read', () => {
  const poisoned = new Proxy({
    isConnected: true, hidden: false, closest: () => null, contains: () => true,
  }, {
    get(target, prop) {
      if (prop === 'getBoundingClientRect' || prop === 'getComputedStyle' || prop === 'offsetWidth') {
        throw new Error(`layout read: ${String(prop)}`)
      }
      return target[prop]
    },
  })
  assert.doesNotThrow(() => isUsableRoot(poisoned))
  assert.doesNotThrow(() => firstVisibleRoot([poisoned]))
  const structure = { rootErrors: 0 }
  assert.doesNotThrow(() => pickOwner(new Map([['nano-x', { _root: () => poisoned }]]), el('span'), structure))
  assert.equal(structure.rootErrors, 0)
})

test('A5: report notes state the nanoCombined sampling conditions', () => {
  const report = buildReport({
    collector: createCollectorState(),
    plugins: new Map(),
    structure: createStructure(),
    enabled: true,
  })
  assert.ok(report.notes.some(n => n.includes('长帧')))
  assert.ok(report.notes.some(n => n.includes('过度归因')))
  assert.ok(report.notes.some(n => n.includes('combo')))
})

// ---------- L1: Event Timing three-way split ----------

test('L1: report carries inputDelay/processing/presentation P95', () => {
  const env = fakeEnv({ performance: fakePerf(50) })
  const review = createPerfReview(env)
  review.join('nano-x')
  review._absorbEventEntry({
    interactionId: 1, startTime: 100, duration: 300,
    processingStart: 102, processingEnd: 110, target: el('div'),
  })
  review._finalizeDue(1000)
  const report = review.report()
  assert.equal(report.page.inputDelayP95, 2)
  assert.equal(report.page.processingP95, 8)
  assert.equal(report.page.presentationP95, 290)
  assert.ok(report.notes.some(n => n.includes('Event Timing 三段')))
})

test('L1: merged interaction keeps parts from the max-duration entry', () => {
  const env = fakeEnv({ performance: fakePerf(50) })
  const review = createPerfReview(env)
  review.join('nano-x')
  const target = el('div')
  review._absorbEventEntry({ interactionId: 7, startTime: 100, duration: 40, processingStart: 101, processingEnd: 103, target })
  review._absorbEventEntry({ interactionId: 7, startTime: 100, duration: 300, processingStart: 150, processingEnd: 160, target })
  review._finalizeDue(1000)
  const report = review.report()
  assert.equal(report.page.nativeInpP75, 300)
  assert.equal(report.page.inputDelayP95, 50)
  assert.equal(report.page.processingP95, 10)
  assert.equal(report.page.presentationP95, 240)
})

test('L1: missing processingStart/End degrades to zero, never throws', () => {
  const env = fakeEnv()
  const review = createPerfReview(env)
  review.join('nano-x')
  review._absorbEventEntry({ interactionId: 3, startTime: 10, duration: 24, target: el('div') })
  review._finalizeDue(1000)
  const report = review.report()
  assert.equal(report.page.inputDelayP95, 0)
  assert.equal(report.page.processingP95, 0)
  assert.equal(report.page.presentationP95, 24)
})

// ---------- regressions found during real-machine execution ----------

test('A5: reset() preserves initial-load resource bytes across scenarios', () => {
  const env = fakeEnv()
  const review = createPerfReview(env)
  review.join('nano-x')
  review._absorbResourceEntry({
    name: '/plugins/??dsh-nano-explorer-extra/client.js,dsh-nano-notepad/client.js&rev=x',
    initiatorType: 'script', encodedBodySize: 681043,
  })
  const before = review.report()
  assert.equal(before.page.nanoCombined.clientJsBytes, 681043)
  // The lab calls reset() at the start of the next scenario; bytes must survive.
  review.reset()
  const after = review.report()
  assert.equal(after.page.nanoCombined.clientJsBytes, 681043)
  assert.equal(after.page.nanoCombined.comboResources, 1)
})

test('A2: opaque-origin localStorage does not break importing the library', () => {
  // On about:blank / sandboxed frames `typeof localStorage` itself throws.
  // The globals fallback must be guarded or the whole bundle dies at import.
  const saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() { throw new Error('Access is denied for this document') },
  })
  try {
    const env = fakeEnv({ forceEnabled: undefined })
    env.location = { search: '?perf-review=1' }
    const review = createPerfReview(env)
    review.join('nano-x')
    assert.equal(review._state().enabled, true)
  } finally {
    if (saved === undefined) delete globalThis.localStorage
    else Object.defineProperty(globalThis, 'localStorage', saved)
  }
})
