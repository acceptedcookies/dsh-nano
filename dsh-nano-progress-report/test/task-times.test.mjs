import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { taskCompletionTimes } from '../src/client/task-times.js'

const todo = (time, list) => ({
  type: 'todo',
  time,
  detail: { todos: list.map(([content, status]) => ({ content, status })) },
})

describe('task completion times', () => {
  it('uses the first snapshot in which a task appears completed', () => {
    const at = taskCompletionTimes([
      todo(1000, [['A', 'pending'], ['B', 'pending']]),
      todo(2000, [['A', 'completed'], ['B', 'in_progress']]),
      todo(3000, [['A', 'completed'], ['B', 'completed']]),
      todo(4000, [['A', 'completed'], ['B', 'completed']]),
    ])
    assert.equal(at.get('A'), 2000)
    assert.equal(at.get('B'), 3000)
    assert.equal(at.size, 2)
  })

  it('ignores other rows, malformed payloads and undated snapshots', () => {
    assert.equal(taskCompletionTimes([
      { type: 'shell', time: 1, detail: { todos: [{ content: 'A', status: 'completed' }] } },
      { type: 'todo', time: 2, detail: {} },
      { type: 'todo', time: Number.NaN, detail: { todos: [{ content: 'A', status: 'completed' }] } },
      { type: 'todo', time: 3, detail: { todos: [{ content: '', status: 'completed' }, null] } },
    ]).size, 0)
  })

  it('does not mutate or reorder the input rows', () => {
    const rows = [todo(5, [['A', 'completed']])]
    const copy = JSON.parse(JSON.stringify(rows))
    taskCompletionTimes(rows)
    assert.deepEqual(rows, copy)
  })
})
