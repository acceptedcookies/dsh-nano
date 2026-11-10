import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  NAME_RE,
  RESERVOIR_CAP,
  createSpanRow,
  recordSpanSample,
  nanoPackagesInUrl,
  packageNameToPluginId,
  targetBucket,
  percentile,
} from '../src/state.js'

test('percentile uses nearest-rank; empty → null', () => {
  assert.equal(percentile([], 0.5), null)
  assert.equal(percentile([10], 0.75), 10)
  assert.equal(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.75), 8)
  assert.equal(percentile([10, 1], 0.5), 1)
})

test('reservoir keeps exact n and caps at RESERVOIR_CAP', () => {
  const row = createSpanRow()
  for (let i = 0; i < 200; i += 1) recordSpanSample(row, i)
  assert.equal(row.n, 200)
  assert.equal(row.window.length, 200)
  assert.equal(row.reservoir.length, RESERVOIR_CAP)
  for (const value of row.reservoir) assert.ok(value >= 0 && value < 200)
})

test('NAME_RE accepts spec names, rejects colons/caps/too-long', () => {
  for (const ok of ['apply-status', 'git-poll', 'x', 'a1']) assert.ok(NAME_RE.test(ok), ok)
  for (const bad of ['has:colon', 'Camel', '-lead', '', 'x'.repeat(41)]) assert.ok(!NAME_RE.test(bad), bad)
})

test('nanoPackagesInUrl extracts package names from combo and single URLs', () => {
  const combo = 'https://dsh-dev.local/plugins/??dsh-nano-explorer-extra/client.js,dsh-nano-notepad/client.js&rev=abc'
  assert.deepEqual(nanoPackagesInUrl(combo), ['dsh-nano-explorer-extra', 'dsh-nano-notepad'])
  assert.deepEqual(
    nanoPackagesInUrl('/plugins/dsh-nano-notepad/client.js'),
    ['dsh-nano-notepad'])
  assert.deepEqual(nanoPackagesInUrl('/assets/app.js'), [])
  // dedupes repeated mentions
  assert.deepEqual(
    nanoPackagesInUrl('/plugins/dsh-nano-notepad/client.js?x=dsh-nano-notepad'),
    ['dsh-nano-notepad'])
})

test('packageNameToPluginId maps dsh-nano-* → nano-*; others → null', () => {
  assert.equal(packageNameToPluginId('dsh-nano-notepad'), 'nano-notepad')
  assert.equal(packageNameToPluginId('dsh-nano-explorer-extra'), 'nano-explorer-extra')
  assert.equal(packageNameToPluginId('dsh-client-ui-primitives'), null)
  assert.equal(packageNameToPluginId(''), null)
})

test('targetBucket maps attribute descriptors to sanitized buckets', () => {
  assert.equal(targetBucket({ tag: 'TEXTAREA', attrs: {} }), 'composer-textarea')
  assert.equal(targetBucket({ tag: 'DIV', attrs: { 'data-nxe': '' } }), 'files-row')
  assert.equal(targetBucket({ tag: 'DIV', attrs: { 'data-nano-model-selector': 'root' } }), 'model-trigger')
  assert.equal(targetBucket({ tag: 'DIV', attrs: { 'data-nano-shared-workspace': '' } }), 'shared-row')
  assert.equal(targetBucket({ tag: 'SPAN', attrs: {} }), 'other')
  assert.equal(targetBucket(null), 'other')
})
