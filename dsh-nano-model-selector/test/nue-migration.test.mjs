/**
 * nue-migration.test.mjs — NUE-1117 Phase 4 migration contract for [DNMS].
 *
 * NUE1117-T18: the history dialog is a main-window dialog (no region
 * measurement, no `:has()` graft on the host portal), hand-drawn controls are
 * replaced by host primitives, and the Tooltip `label` fix (T14) stays.
 * The T19 guard here only pins the anti-sideload half: [DNMS] never reads
 * the cloud-session plugin's DOM marker. Cloud-session self-detection itself
 * is deferred until the host exposes a public session field for it.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const srcDir = join(root, 'src')

function walk(dir) {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return walk(path)
    return /\.(jsx?|mjs)$/.test(name) ? [path] : []
  })
}

const sources = walk(srcDir).map(path => ({ path: path.slice(root.length + 1), text: readFileSync(path, 'utf8') }))
const agents = { path: 'AGENTS.md', text: readFileSync(join(root, 'AGENTS.md'), 'utf8') }
const read = rel => readFileSync(join(root, rel), 'utf8')

function hits(files, needle) {
  return files.filter(file => file.text.includes(needle)).map(file => file.path)
}

test('T18: region containment is retired from src and package AGENTS', () => {
  assert.ok(sources.length > 10, 'source walk found the client tree')
  for (const needle of ['regionElement', '--nms-region-', 'data-conversation-region', '.nms-hist-dialog)']) {
    assert.deepEqual(hits([...sources, agents], needle), [], `${needle} must be gone`)
  }
})

test('T18: no :has() graft and no numeric z-index in the stylesheet', () => {
  const styles = read('src/client/styles.js')
  assert.equal(/:has\(/.test(styles), false)
  assert.deepEqual(styles.match(/z-index\s*:\s*-?\d+/g) ?? [], [])
  assert.match(styles, /z-index: var\(--nano-layer-window\)/)
})

test('T18: history dialog keeps a fixed height through NanoDialog', () => {
  const dialog = read('src/client/AsyncHistoryDialog.jsx')
  assert.match(dialog, /fixedHeight: 640/)
  assert.equal(/\bTooltip\b/.test(dialog.split('} from \'@deepseek-ai/dsh-client-ui-primitives\'')[0]), false, 'unused Tooltip import removed')
  const index = read('src/client/index.jsx')
  assert.equal(index.includes('querySelector'), false)
})

test('T18: hand-drawn tag / switch / tabs replaced by host primitives', () => {
  assert.deepEqual(hits(sources, 'nms-tag'), [])
  assert.deepEqual(hits(sources, 'nms-switch'), [])
  assert.deepEqual(hits(sources, 'nms-explain-tab'), [])
  const selector = read('src/client/ModelSelector.jsx')
  assert.match(selector, /import \{[^}]*\bTag\b[^}]*\} from '@deepseek-ai\/dsh-client-ui-primitives'/)
  assert.ok((selector.match(/<Tag tone=/g) ?? []).length >= 3, 'engine, badge and context tags use host Tag')
  const panel = read('src/client/CompactPanel.jsx')
  assert.match(panel, /import \{ SegmentedControl, Switch(?:, Tag)? \} from '@deepseek-ai\/dsh-client-ui-primitives'/)
  assert.match(panel, /<Switch\b[\s\S]*?checked=\{enabled\}[\s\S]*?onChange=\{doSwitch\}/)
  assert.match(panel, /<SegmentedControl\b[\s\S]*?id="nms-compact-explain"/)
})

test('T18: NanoToast is anchored on the trigger', () => {
  const selector = read('src/client/ModelSelector.jsx')
  const calls = selector.match(/<NanoToast\b[^>]*\/>/g) ?? []
  assert.ok(calls.length >= 1)
  for (const call of calls) assert.match(call, /anchor=\{triggerRef\.current\}/)
  assert.equal(read('src/client/styles.js').includes('.nano-toast'), false, 'no re-anchoring of a nano-ui toast class')
})

test('T18/T14 regression: AsyncStatusBadge passes Tooltip label, not content', () => {
  const badge = read('src/client/AsyncStatusBadge.jsx')
  assert.match(badge, /createElement\(Tooltip, \{ label: /)
  assert.equal(/createElement\(Tooltip, \{[^}]*\bcontent:/.test(badge), false)
})

test('T18: AGENTS lists two presentation constraints, not three', () => {
  assert.match(agents.text, /两个必须遵守的呈现约束/)
  assert.equal(agents.text.includes('三个必须遵守的呈现约束'), false)
})

test('T19 guard: [DNMS] never reads the cloud-session DOM marker', () => {
  for (const needle of ['dncs', 'data-dncs-cloud', 'dncsCloud']) {
    assert.deepEqual(hits(sources, needle), [], `${needle} must not appear in [DNMS] src`)
  }
})
