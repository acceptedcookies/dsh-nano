import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildReport,
  interactionSamples,
  pushInteraction,
} from '../src/aggregate.js'
import {
  createCollectorState,
  createPluginRow,
  createStructure,
  INTERACTION_CAP,
} from '../src/state.js'

const ix = (over = {}) => ({
  interactionId: 1, start: 100, duration: 40, owner: 'native',
  bucket: 'other', samples: {}, ...over,
})

test('interaction window overlap: span inside counts; outside does not', () => {
  const spans = [
    { start: 105, end: 120, pluginId: 'nano-a', name: 's' },   // inside
    { start: 500, end: 510, pluginId: 'nano-b', name: 's' },   // outside
    { start: 139, end: 400, pluginId: 'nano-c', name: 's' },   // starts in window, settles after
  ]
  const tracks = [
    { at: 110, ms: 1.5, pluginId: 'nano-a', name: 't' },
    { at: 500, ms: 9, pluginId: 'nano-b', name: 't' },
  ]
  const samples = interactionSamples({ start: 100, duration: 40 }, spans, tracks)
  assert.equal(samples['nano-a'].spans, 1)
  assert.equal(samples['nano-a'].callbacks, 1)
  assert.equal(samples['nano-c'].spans, 1)
  assert.equal(samples['nano-c'].spanAfterWindow, true)
  assert.equal(samples['nano-b'], undefined)
  // window = [99, 148]; nano-b at 500 is out
})

test('pushInteraction caps at INTERACTION_CAP dropping oldest', () => {
  const collector = createCollectorState()
  for (let i = 0; i < INTERACTION_CAP + 10; i += 1) {
    pushInteraction(collector, ix({ interactionId: i, start: i * 100 }))
  }
  assert.equal(collector.interactions.length, INTERACTION_CAP)
  assert.equal(collector.interactions[0].interactionId, 10) // oldest dropped
})

test('buildReport: INP is page-level; plugin rows get own/native only', () => {
  const collector = createCollectorState()
  const plugins = new Map()
  const structure = createStructure()
  const row = createPluginRow()
  plugins.set('nano-x', row)

  collector.interactions.push(
    ix({ owner: 'nano-x', duration: 30 }),
    ix({ interactionId: 2, owner: 'native', duration: 60 }),
    ix({ interactionId: 3, owner: 'native', duration: 90 }),
  )
  row.own.interactions.push(30)
  row.native.spanMs.push(12, 20)
  row.native.trackMs.push(2)
  row.samples.spans = 2
  row.samples.callbacks = 1

  const report = buildReport({ collector, plugins, structure, enabled: true })
  assert.equal(report.page.nativeInpCount, 3)
  assert.equal(report.page.nativeInpP75, 90) // p75 of [30,60,90]
  const px = report.plugins['nano-x']
  assert.equal(px.own.inpP75, 30)
  assert.equal(px.own.inpCount, 1)
  assert.equal(px.native.spanMsP95, 20)
  assert.equal(px.native.trackMsP95, 2)
  assert.equal(px.native.samples.spans, 2)
  // no INP copied into the plugin row
  assert.equal(px.native.inpP75, undefined)
  assert.equal(px.inpP75, undefined)
})

test('buildReport: INP null when no samples; threshold recorded', () => {
  const collector = createCollectorState()
  const report = buildReport({
    collector, plugins: new Map(), structure: createStructure(), enabled: true,
  })
  assert.equal(report.page.nativeInpP75, null)
  assert.equal(report.page.nativeInpCount, 0)
  assert.equal(report.page.nativeInpDurationThreshold, 16)
})

test('buildReport merges hostSnapshot into hostSpan rows', () => {
  const plugins = new Map()
  plugins.set('nano-explorer-extra', createPluginRow())
  const report = buildReport({
    collector: createCollectorState(),
    plugins,
    structure: createStructure(),
    enabled: true,
    hostSnapshot: {
      plugins: {
        'nano-explorer-extra': {
          spans: { 'git-status': { n: 4, samples: [10, 20, 30, 40] } },
        },
      },
    },
  })
  const hs = report.plugins['nano-explorer-extra'].hostSpan['git-status']
  assert.equal(hs.n, 4)
  assert.equal(hs.p50, 20)
  assert.equal(hs.p95, 40)
})

test('buildReport notes: <8 interactions warned; nanoBlocking noted', () => {
  const collector = createCollectorState()
  collector.interactions.push(ix(), ix({ interactionId: 2 }))
  collector.nanoBlockingMs = 12
  const report = buildReport({
    collector, plugins: new Map(), structure: createStructure(), enabled: true,
  })
  assert.ok(report.notes.some(n => n.includes('nativeInpCount')))
  assert.ok(report.notes.some(n => n.includes('nanoBlockingMs')))
})
