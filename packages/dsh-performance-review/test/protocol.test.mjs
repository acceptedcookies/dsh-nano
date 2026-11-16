import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import {
  createPerfReview,
  ensurePerfReview,
} from '../src/client.js'
import { createPerfReviewHost, ensurePerfReviewHost } from '../src/host.js'
import { CLIENT_KEY, HOST_KEY, sourceStamp } from '../src/state.js'
import { buildReport, clipOversize, NOTE_GLOSSARY } from '../src/aggregate.js'
import { createCollectorState, createPluginRow, createStructure } from '../src/state.js'
import { fakeEnv } from '../test-helpers/index.mjs'

const srcDir = new URL('../src/', import.meta.url)

test('T09 legacy key is not read, written, or adopted', () => {
  const legacy = { field: 1, nested: { a: 2 }, writer: { on: true } }
  const before = JSON.stringify(legacy)
  const global = { __perfReview: legacy }
  const review = ensurePerfReview({ ...fakeEnv({ global, build: 'stamp-a' }), global, build: 'stamp-a' })
  assert.equal(JSON.stringify(legacy), before)
  assert.equal(global.__perfReview, legacy)
  assert.equal(global[CLIENT_KEY], review)
  assert.equal(review._state().structure.legacyCopies, 1)
  assert.notEqual(review._state().plugins, legacy.nested)
  assert.equal(Object.prototype.hasOwnProperty.call(legacy, '_state'), false)
  const hostLegacy = { field: 7, writer: { flush: true } }
  const hostBefore = JSON.stringify(hostLegacy)
  const hostGlobal = { __perfReviewHost: hostLegacy }
  const host = ensurePerfReviewHost({ global: hostGlobal, build: 'stamp-a', process: { env: {} } })
  assert.equal(JSON.stringify(hostLegacy), hostBefore)
  assert.equal(hostGlobal.__perfReviewHost, hostLegacy)
  assert.equal(hostGlobal[HOST_KEY], host)
  assert.equal(host._state().structure.legacyCopies, 1)
  assert.notEqual(host._state().plugins, hostLegacy.writer)
})

test('T10 same source same stamp; a second stamp audits and does not replace', () => {
  const text = readFileSync(new URL('../src/state.js', import.meta.url), 'utf8')
  assert.equal(sourceStamp(text), sourceStamp(text))
  assert.notEqual(sourceStamp(text), sourceStamp(`${text} `))

  const global = {}
  const first = ensurePerfReview({ ...fakeEnv(), global, build: 'aaa' })
  const again = ensurePerfReview({ ...fakeEnv(), global, build: 'aaa' })
  assert.equal(again, first)
  assert.equal(first._state().structure.audits.filter(item => item.code === 'build-stamp').length, 0)

  first.join('nano-x', { build: '1' })
  const api = first.join('nano-x', { build: '1' })
  api.span('s', () => {})
  const second = ensurePerfReview({ ...fakeEnv(), global, build: 'bbb' })
  assert.equal(second, first)
  const audits = first._state().structure.audits.filter(item => item.code === 'build-stamp')
  assert.equal(audits.length, 1)
  assert.deepEqual(audits[0], { level: 'audit', code: 'build-stamp', have: 'aaa', saw: 'bbb' })
  ensurePerfReview({ ...fakeEnv(), global, build: 'bbb' })
  assert.equal(first._state().structure.audits.filter(item => item.code === 'build-stamp').length, 1)

  const detached = createPerfReview(fakeEnv({ build: 'bbb' }))
  assert.notEqual(detached._state().plugins, first._state().plugins)
  assert.equal(detached.read().plugins['nano-x'], undefined)
  assert.equal(first.read().plugins['nano-x'].hand.spans.s.n, 1)

  first.join('nano-x', { build: '1' })
  assert.equal(first.read().page.contributors.filter(item => item.pluginId === 'nano-x').length, 1)
})

test('T11 evidence cap, oversize, and conditional audits', () => {
  const collector = createCollectorState()
  for (let i = 0; i < 8; i += 1) {
    collector.interactions.push({
      interactionId: i, start: i, duration: 10 + i, owner: 'native', bucket: 'other', samples: {},
    })
  }
  const report = buildReport({
    collector, plugins: new Map(), structure: createStructure(), enabled: true,
  })
  assert.equal(report.meta.protocol, 2)
  assert.equal(report.page.evidence.interactions.length, 5)
  assert.equal(report.page.nativeInpCount, 8)
  assert.equal(report.structure.oversize, 0)
  assert.ok(NOTE_GLOSSARY.some(item => item.text.includes('长帧')))
  assert.equal(report.notes.some(item => item.id === 'event-timing-split'), false)
  report.page.evidence.interactions.push('x'.repeat(300_000))
  clipOversize(report)
  assert.equal(report.structure.oversize, 1)
  assert.deepEqual(report.page.evidence.interactions, [])
})

test('T12 contract keys do not share the manual quota; read leaves host seq', () => {
  const global = {}
  const review = ensurePerfReview({ ...fakeEnv(), global, build: 'a' })
  const host = ensurePerfReviewHost({
    global,
    build: 'a',
    epoch: 'ep',
    process: { env: { DSH_PERF_REVIEW: '1' }, once() {} },
    performance: { t: 0, now() { return this.t }, advance(ms) { this.t += ms } },
  })
  const api = review.join('nano-x')
  for (let i = 0; i < 32; i += 1) api.span(`s${i}`, () => {})
  review.observe({
    surface: 'http', id: 'nxe.list', plugin: 'nano-x', outcome: 'ok', ms: 2, status: 201,
  })
  review.observe({
    surface: 'http', id: 'nxe.list', plugin: 'nano-x', outcome: 'nope', ms: 1,
  })
  review.observe({
    surface: 'http', id: null, plugin: 'nano-x', outcome: 'ok', ms: 1, status: 200,
  })
  api.span('past-quota', () => {})
  const state = review._state()
  assert.equal(state.plugins.get('nano-x').spans.size, 32)
  assert.equal(state.structure.overflowSpans, 1)
  assert.equal(state.structure.badShape, 1)
  assert.equal(state.structure.missingBindingId, 1)
  const report = review.read()
  assert.equal(report.plugins['nano-x'].contract['nxe.list'].outcomes.ok, 1)
  assert.equal(report.plugins['nano-x'].contract['nxe.list'].status['2xx'], 1)
  assert.equal(report.plugins['nano-x'].contract['nxe.list'].outcomes.nope, undefined)
  host.hostJoin('nano-x').hostSpan('list', () => {})
  const seq = host._state().seq
  review.read()
  assert.equal(host._state().seq, seq)
  review.cutWindow()
  assert.equal(host.cutWindow, undefined)
  assert.equal(host._state().seq, seq)
})

test('src has no plugin package-name literals and no retired verbs', () => {
  const banned = ['report', 'resetCounters', 'setHostSnapshotProvider', 'takeWindow', 'setEnabled']
  for (const name of readdirSync(srcDir)) {
    if (!name.endsWith('.js')) continue
    const text = readFileSync(new URL(name, srcDir), 'utf8')
    assert.equal(/dsh-nano-/.test(text), false, name)
    if (name === 'client.js' || name === 'host.js') {
      assert.equal(text.includes('diagnose'), false, name)
      for (const verb of banned) {
        assert.equal(text.includes(` ${verb}(`) || text.includes(`.${verb}`), false, `${name} ${verb}`)
      }
    }
  }
})

test('empty manual rows still carry basis; top-level keys stay closed', () => {
  const row = createPluginRow()
  const span = row.spans
  span.set('render', { n: 1, window: [4], reservoir: [4] })
  const report = buildReport({
    collector: createCollectorState(),
    plugins: new Map([['nano-x', row]]),
    structure: createStructure(),
    enabled: true,
    meta: { generatedAt: '2026-11-16T00:00:00.000Z' },
  })
  assert.equal(report.plugins['nano-x'].hand.spans.render.basis, 'window')
  assert.equal(report.plugins['nano-x'].hand.spans.render.n, 1)
  assert.deepEqual(Object.keys(report).sort(), ['evidence', 'meta', 'notes', 'page', 'plugins', 'schema', 'structure'])
})
