import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderMarkdown } from '../src/markdown.js'
import { buildReport } from '../src/aggregate.js'
import {
  createCollectorState, createPluginRow, createStructure,
  createSpanRow, recordSpanSample, usageAdd,
} from '../src/state.js'

const fixture = () => {
  const collector = createCollectorState()
  collector.loafCount = 3
  collector.blockingMs = 41.2
  collector.forcedLayoutMs = 2.4
  collector.nanoScriptMs = 88.5
  collector.resources.nanoClientJsBytes = 452_000
  collector.resources.comboResources = 2
  collector.interactions.push(
    { interactionId: 1, start: 0, duration: 30, owner: 'nano-x', bucket: 'other', samples: {} },
    { interactionId: 2, start: 0, duration: 80, owner: 'native', bucket: 'composer-textarea', samples: {} },
  )
  const row = createPluginRow()
  row.own.interactions.push(30)
  const span = createSpanRow()
  recordSpanSample(span, 12); recordSpanSample(span, 34)
  row.spans.set('render', span)
  row.tracks.set('shortcut-key', { kind: 'listener', callbacks: 42, live: 1, callbackMs: 3.1, totalCallbacks: 42, totalCallbackMs: 3.1 })
  usageAdd(row, { badNames: 0 }, 'panel-open', 5)
  const plugins = new Map([['nano-x', row]])
  return { collector, plugins, structure: createStructure() }
}

test('renderMarkdown emits page, plugin, span, track, structure sections', () => {
  const { collector, plugins, structure } = fixture()
  const report = buildReport({
    meta: { scenario: 'composer-type', arm: 'on', generatedAt: '2026-11-10T10:00:00Z' },
    collector, plugins, structure, enabled: true,
  })
  const md = renderMarkdown(report)
  assert.ok(md.includes('# perf-review · composer-type'))
  assert.ok(md.includes('nativeInpP75'))
  assert.ok(md.includes('## nano-x'))
  assert.ok(md.includes('| span | n | windowN | p50 | p95 | maxMs |'))
  assert.ok(md.includes('| render |'))
  assert.ok(md.includes('shortcut-key'))
  assert.ok(md.includes('panel-open=5'))
  assert.ok(md.includes('## structure'))
  // human-readable nulls
  assert.ok(!md.includes('undefined'))
})
