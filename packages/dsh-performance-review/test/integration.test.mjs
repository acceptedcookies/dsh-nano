/**
 * PRE1116-T11/T13 — the v2 host read view must feed the page report without
 * a shape conversion hidden inside a fixture.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { buildReport, clipOversize, MAX_REPORT_BYTES } from '../src/aggregate.js'
import { createPerfReview } from '../src/client.js'
import { createPerfReviewHost, handleHostRead } from '../src/host.js'
import { createCollectorState, createStructure } from '../src/state.js'
import { fakeEnv } from '../test-helpers/index.mjs'

const clock = () => ({ t: 0, now() { return this.t }, advance(ms) { this.t += ms } })

function pageEnv(perf, host, extra = {}) {
  return {
    performance: perf,
    PerformanceObserver: class { constructor(cb) { this.cb = cb } observe() {} disconnect() {} },
    navigator: { userAgent: 'Chrome/143' },
    forceEnabled: true,
    global: {},
    setInterval: () => ({ unref() {} }),
    fetch: async () => {
      const res = { statusCode: 200, headers: {}, setHeader() {}, end(s) { this.body = s } }
      handleHostRead({ method: 'GET', url: '/nano-x/perf-review/host' }, res, host)
      const body = JSON.parse(res.body)
      return { json: async () => body }
    },
    ...extra,
  }
}

test('T11: real host read rows become report host rows and page.host', async () => {
  const perf = clock()
  const host = createPerfReviewHost({ process: { env: { DSH_PERF_REVIEW: '1' } }, performance: perf, epoch: 'e1', global: {} })
  const hostApi = host.hostJoin('nano-x')
  hostApi.hostSpan('list', () => { perf.advance(10) })
  hostApi.hostSpan('list', () => { perf.advance(20) })
  const review = createPerfReview(pageEnv(perf, host))
  review.join('nano-x', { hostRoute: '/nano-x/perf-review/host' })
  await new Promise(resolve => setTimeout(resolve, 0))
  const report = review.read()
  assert.equal(report.page.host.source, 'read')
  assert.equal(report.page.host.epoch, 'e1')
  assert.equal(report.plugins['nano-x'].host.list.n, 2)
  assert.equal(report.plugins['nano-x'].host.list.p95, 20)
  assert.equal(report.structure.badShape, 0)

  const explicit = review.read({ host: host.read({}) })
  assert.equal(explicit.page.host.source, 'read')
  assert.equal(explicit.plugins['nano-x'].host.list.n, 2)
})

test('T11: an unusable poll payload increments badShape', async () => {
  const perf = clock()
  const env = pageEnv(perf, createPerfReviewHost({ performance: perf, global: {} }))
  env.fetch = async () => ({ json: async () => ({ unexpected: true }) })
  const review = createPerfReview(env)
  review.join('nano-x', { hostRoute: '/nano-x/perf-review/host' })
  await new Promise(resolve => setTimeout(resolve, 0))
  review.read()
  assert.equal(review._state().structure.badShape, 1)
})

test('T11: clipOversize trims both top-level and page evidence under 256 KB', () => {
  const collector = createCollectorState()
  const report = buildReport({ collector, plugins: new Map(), structure: createStructure(), enabled: true })
  report.page.evidence.interactions.push('x'.repeat(300_000))
  report.evidence = report.page.evidence
  clipOversize(report)
  assert.deepEqual(report.evidence.interactions, [])
  assert.deepEqual(report.page.evidence.interactions, [])
  assert.ok(new TextEncoder().encode(JSON.stringify(report)).length <= MAX_REPORT_BYTES)
})

test('T11: meta.window and heavy frame evidence are filled', () => {
  const perf = clock()
  const review = createPerfReview({
    performance: perf,
    PerformanceObserver: class { constructor(cb) { this.cb = cb } observe() {} disconnect() {} },
    navigator: { userAgent: 'Chrome/143' },
    forceEnabled: true,
    global: {},
  })
  review.join('nano-x')
  review._absorbLoafEntry({ startTime: 10, duration: 120, blockingDuration: 60, styleAndLayoutDuration: 4, scripts: [] })
  perf.advance(25)
  const report = review.read()
  assert.equal(typeof report.meta.window.startedAt, 'string')
  assert.equal(report.meta.window.ms >= 0, true)
  assert.equal(report.page.evidence.frames.length, 1)
  assert.equal(report.page.evidence.frames[0].blockingDuration, 60)
})

test('T12: cutWindow advances the next poll cursor past the old window', async () => {
  const perf = clock()
  const host = createPerfReviewHost({ process: { env: { DSH_PERF_REVIEW: '1' } }, performance: perf, epoch: 'e1', global: {} })
  const hostApi = host.hostJoin('nano-x')
  hostApi.hostSpan('list', () => { perf.advance(5) })
  const urls = []
  const env = pageEnv(perf, host)
  env.fetch = async (url) => {
    urls.push(url)
    const res = { statusCode: 200, headers: {}, setHeader() {}, end(s) { this.body = s } }
    handleHostRead({ method: 'GET', url }, res, host)
    return { json: async () => JSON.parse(res.body) }
  }
  const review = createPerfReview(env)
  review.join('nano-x', { hostRoute: '/nano-x/perf-review/host' })
  await new Promise(resolve => setTimeout(resolve, 0))
  const before = urls.length
  const seen = review.read().page.host.to
  review.cutWindow()
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.ok(urls.length > before, 'cutWindow polls again')
  assert.equal(urls.at(-1).includes(`since=${encodeURIComponent(seen)}`), true)
})
