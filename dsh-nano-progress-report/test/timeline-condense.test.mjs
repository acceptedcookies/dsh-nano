/** DNPR-T12/T13 — schedule prompt opens a turn group (shared open.js seam);
 *  prompt context-envelope folding (C7-02); zero-count menu hiding (C0-05);
 *  condensed wiring facts (C-layer strip fields removed from Row rendering). */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { openKind, openerRowType } from '../src/shared/open.js'
import { groupRows } from '../src/client/group.js'
import { rowFromNode } from '../src/client/rows.js'
import { visibleMenuOptions } from '../src/client/filter-menu.js'

const src = file => readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '..', 'src', file), 'utf8')

test('openKind: user/goal/schedule open; restart/fork/agent kinds do not', () => {
  assert.equal(openKind('user'), 'user')
  assert.equal(openKind('goal'), 'goal')
  assert.equal(openKind('schedule'), 'schedule')
  for (const kind of ['restart', 'fork', 'agent-message', 'subagent-settled', 'team-message', 'injection', undefined]) {
    assert.equal(openKind(kind), null)
  }
  assert.equal(openerRowType('schedule'), 'schedule')
  assert.equal(openerRowType('goal'), 'goal')
})

const node = (row, data = {}) => ({ key: `k${row}`, kind: 'progress-x', id: 'i', data: { row, seq: 1, time: 1, ...data } })

test('schedule row opens its own group like a prompt', () => {
  const rows = [
    { ...rowFromNode(node('prompt', { text: 'first' })), key: 'p', seq: 1 },
    { ...rowFromNode(node('schedule', { text: 'nightly run' })), key: 's', seq: 5, type: 'schedule' },
    { ...rowFromNode(node('message', { text: 'working' })), key: 'm', seq: 6 },
  ]
  const groups = groupRows(rows)
  assert.equal(groups.length, 2)
  assert.equal(groups[1].opener.type, 'schedule')
})

test('C7-02: leading context envelopes fold out of the prompt summary', () => {
  const row = rowFromNode(node('prompt', {
    text: '<system-reminder>x</system-reminder>\n<context>y</context>\nDo the actual thing',
  }))
  assert.equal(row.summary, 'Do the actual thing')
  // raw stays in detail
  assert.match(row.detail.text, /system-reminder/)
  const only = rowFromNode(node('prompt', { text: '<ctx>only context</ctx>' }))
  assert.equal(only.summary, '(attached context)')
})

test('C0-05: zero-count types hide from the menu; selected tokens stay', () => {
  const all = ['prompt', 'shell', 'lifecycle', 'job']
  const counts = { prompt: 3, shell: 1 }
  assert.deepEqual(visibleMenuOptions(all, counts, [], 'type'), ['prompt', 'shell'])
  assert.deepEqual(visibleMenuOptions(all, counts, ['type:job'], 'type'), ['prompt', 'shell', 'job'])
})

test('src/client renders no args/result/reasoning detail fields (C0-02)', () => {
  const body = src('client/view/Row.jsx')
  assert.doesNotMatch(body, /data-field=['"](args|result|reasoning)['"]/)
  assert.doesNotMatch(body, /argsRaw|resultText|reasoningText/)
  const turn = src('client/view/Turn.jsx')
  assert.match(turn, /condenseGroup/)
  const pb = src('client/view/ProgressBody.jsx')
  assert.match(pb, /condensed: true/)
  assert.match(pb, /visibleMenuOptions/)
})
