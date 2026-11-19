/** DNPR-T02 — A/B/C layering and B-segment merge semantics (spec-v1.1 §4.4). */
import assert from 'node:assert/strict'
import test from 'node:test'
import { classify, condenseGroup, tailOf } from '../src/shared/condense.js'

let seq = 0
const row = (over = {}) => ({
  key: `r${seq += 1}`, kind: 'progress-tool-call', type: 'tool', status: 'ok',
  summary: 'step', tool: '', time: seq, role: 'exec', expandable: true,
  detail: {}, ...over,
})
const toolRow = (tool, status = 'ok', argsRaw = '{}') => row({
  type: { read: 'file', glob: 'file', grep: 'file', write: 'file', edit: 'file', bash: 'shell' }[tool] ?? 'tool',
  tool, status, summary: `${tool} it`, detail: { argsRaw },
})
const group = (rows, over = {}) => ({
  rows, end: null, outcome: null, startTime: 1, ...over,
})
const types = items => items.map(item => item.segment === true ? `seg:${item.category}` : item.type)

test('classify: milestones A, mergeables B, strip-list C', () => {
  assert.equal(classify(row({ type: 'prompt' })), 'a')
  assert.equal(classify(row({ type: 'schedule' })), 'a')
  assert.equal(classify(row({ type: 'turn', reason: 'completed' })), 'c')
  assert.equal(classify(row({ type: 'turn', reason: 'aborted' })), 'a')
  assert.equal(classify(row({ type: 'wait', outcome: 'approved', status: 'ok' })), 'c')
  assert.equal(classify(row({ type: 'wait', outcome: 'rejected', status: 'failed' })), 'a')
  assert.equal(classify(row({ type: 'wait', status: 'awaiting' })), 'a')
  assert.equal(classify(row({ type: 'lifecycle', eventType: 'model/selection' })), 'c')
  assert.equal(classify(row({ type: 'lifecycle', eventType: 'command/done' })), 'a')
  assert.equal(classify(row({ type: 'lifecycle', eventType: 'compaction/injected' })), 'a')
  assert.equal(classify(row({ type: 'lifecycle', eventType: 'plan/mode', status: 'failed' })), 'a')
  assert.equal(classify(row({ type: 'message' })), 'c')
  assert.equal(classify(row({ type: 'subagent' })), 'a')
  assert.equal(classify(toolRow('read')), 'b')
  assert.equal(classify(toolRow('read', 'failed')), 'b')
  assert.equal(classify(toolRow('subagent', 'failed')), 'a')
  assert.equal(classify(row({ type: 'wait', tool: 'ask_user_question', status: 'failed' })), 'a')
})

test('consecutive same-category tool rows merge into one segment line', () => {
  const { rows } = condenseGroup(group([
    toolRow('read', 'ok', '{"file_path":"/a"}'),
    row({ type: 'message', summary: 'narration' }),           // C in between
    toolRow('read', 'ok', '{"file_path":"/b"}'),
    toolRow('glob', 'ok', '{"pattern":"**/*.mjs"}'),
    row({ type: 'wait', status: 'awaiting', summary: 'wait' }), // A breaks
    toolRow('grep', 'ok', '{"pattern":"x"}'),
  ]))
  assert.deepEqual(types(rows), ['seg:explore', 'wait', 'seg:explore'])
  assert.match(rows[0].summary, /Explore 2 files · 1 search/)
  assert.equal(rows[0].detail.children.length, 3)
  assert.equal(rows[2].detail.children.length, 1)
})

test('failed→succeeded same fingerprint folds into "passed after N"; unresolved failure promotes to A', () => {
  const same = '{"command":"npm test"}'
  const { rows } = condenseGroup(group([
    toolRow('bash', 'failed', same),
    toolRow('bash', 'failed', same),
    toolRow('bash', 'ok', same),
  ]))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].segment, true)
  assert.match(rows[0].summary, /passed after 2 failed attempts/)
  assert.equal(rows[0].status, 'ok')

  const { rows: mixed } = condenseGroup(group([
    toolRow('bash', 'ok', '{"command":"ls"}'),
    toolRow('bash', 'failed', '{"command":"make build"}'),
    toolRow('bash', 'ok', '{"command":"pwd"}'),
  ]))
  assert.deepEqual(mixed.map(item => item.segment === true ? 'seg' : item.status), ['seg', 'failed', 'seg'])
})

test('C-layer strip: narration, merged approvals, completed turn, default lifecycle, unchanged todo', () => {
  const todoA = row({ type: 'todo', kind: 'progress-todo-write', summary: 'Task list: 1/3 done',
    detail: { todos: [{ status: 'completed' }, { status: 'pending' }, { status: 'pending' }] } })
  const todoB = row({ type: 'todo', kind: 'progress-todo-write', summary: 'Task list: 1/3 done',
    detail: todoA.detail.todos })
  const todoC = row({ type: 'todo', kind: 'progress-todo-write', summary: 'Task list: 2/3 done',
    detail: { todos: [{ status: 'completed' }, { status: 'completed' }, { status: 'pending' }] } })
  const end = row({ type: 'turn', reason: 'completed', status: 'ok', time: 90 })
  const outcome = row({ type: 'message', summary: 'all done', detail: {} })
  const g = group([
    row({ type: 'message', summary: 'narrating' }),
    row({ type: 'wait', outcome: 'approved', status: 'ok', summary: 'Approval approved' }),
    todoA, todoB, todoC,
    row({ type: 'lifecycle', eventType: 'model/selection', summary: 'model' }),
    outcome,
  ], { end, outcome })
  const { rows } = condenseGroup(g)
  assert.deepEqual(rows.map(item => item.type), ['todo', 'todo', 'message'])
  // completed end row dropped; tail carries duration for the opener's column.
  const { rows: withEnd, tail } = condenseGroup(g, { includeEnd: true })
  assert.deepEqual(withEnd.map(item => item.type), ['todo', 'todo', 'message'])
  assert.equal(tail.reason, undefined)
  assert.equal(tail.durationMs, 89)
})

test('non-completed end stays a row and its reason goes to the tail column', () => {
  const end = row({ type: 'turn', reason: 'aborted', status: 'failed', time: 50 })
  const { rows, tail } = condenseGroup(group([toolRow('read')], { end }))
  assert.equal(rows[rows.length - 1], end)
  assert.equal(tail.reason, 'aborted')
  assert.equal(tail.durationMs, 49)
  assert.equal(tailOf(group([], { end: null })), null)
})

test('reasoning text never reaches the condensed view (T-O-3)', () => {
  const reasoning = row({ type: 'message', summary: '', detail: { reasoning: 'thinking about it' } })
  const wait = row({ type: 'wait', status: 'awaiting', summary: 'Approval requested', detail: {} })
  const { rows } = condenseGroup(group([reasoning, wait]))
  assert.equal(rows.length, 1)
  assert.equal(rows[0].detail.text, undefined)
  assert.equal(rows[0].detail.reasoning, undefined)
})
