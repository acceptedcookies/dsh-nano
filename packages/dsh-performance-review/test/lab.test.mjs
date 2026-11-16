/**
 * PRE1116-T22 — lab reads declarations, keeps the three page scenarios, and
 * uses the v2 verbs only.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { loadDeclarations, PAGE_SCENARIOS, scenarioList, driverFor } from '../../../lab/declarations.mjs'

const ROOT = join(import.meta.dirname, '..', '..', '..')
const read = rel => readFileSync(join(ROOT, rel), 'utf8')
const BANNED_PLUGIN_IDS = [
  'dsh-nano-explorer-extra', 'dsh-nano-notepad', 'dsh-nano-model-selector',
  'dsh-nano-cloud-session', 'dsh-nano-terminal', 'dsh-nano-local-sandbox', 'dsh-nano-kitesurf',
]
const BANNED_TRACKS = ['card-wake', 'card-follow', 'git-poll', 'ctia-watch', 'sidebar-graft', 'sidebar-dedupe']

test('page scenarios stay; plugin scenarios come from declarations', () => {
  assert.deepEqual([...PAGE_SCENARIOS], ['idle-10s', 'composer-type', 'observer-purity'])
  const scenarios = scenarioList()
  assert.equal(scenarios.includes('shared-open'), false)
  for (const id of PAGE_SCENARIOS) assert.equal(scenarios.includes(id), true)
  const declared = loadDeclarations().flatMap(d => (d.scenarios ?? []).map(s => s.id))
  assert.ok(declared.length >= 3)
  for (const id of declared) {
    assert.equal(scenarios.includes(id), true)
    assert.ok(driverFor(id), id)
  }
  const source = read('lab/scenarios.mjs')
  assert.equal(source.includes('shared-open'), false)
  for (const id of declared) assert.equal(source.includes(id), false, `scenario id hardcoded: ${id}`)
})

test('lab source names no plugin or track', () => {
  const sources = ['lab/scenarios.mjs', 'lab/budgets.mjs', 'lab/run.mjs']
  for (const rel of sources) {
    const text = read(rel)
    for (const id of BANNED_PLUGIN_IDS) assert.equal(text.includes(id), false, `${rel} names ${id}`)
    for (const name of BANNED_TRACKS) assert.equal(text.includes(`'${name}'`) || text.includes(`"${name}"`), false, `${rel} names ${name}`)
  }
})

test('lab readers use read/cutWindow and never the retired report()', () => {
  const scenario = read('lab/scenarios.mjs')
  assert.ok(scenario.includes('cutWindow()'))
  assert.ok(scenario.includes('.read('))
  assert.equal(/\.report\s*\(/.test(scenario), false)
  assert.equal(/\.resetCounters\s*\(/.test(scenario), false)
  assert.equal(/__perfReview\b(?!Lib)/.test(scenario.replaceAll('__perfReviewLib', '')), false)
  const budgets = read('lab/budgets.mjs')
  assert.ok(budgets.includes('diagnose('))
  assert.equal(budgets.includes('hostSpan'), false)
})
