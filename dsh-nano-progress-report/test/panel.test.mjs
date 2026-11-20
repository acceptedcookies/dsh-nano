/** DNPR-T14 — footer list rules (T-O-16): list selection falls back to Tasks
 *  when the persisted list empties, files list newest first, and failure
 *  labels are `<tool> <label> ×n` with the bash title borrowed only at view
 *  time. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { PANEL_VIEWS, activeView, failureLabel, filesNewestFirst } from '../src/client/panel.js'

test('view key values are exactly tasks/jobs/files/failures; an empty list falls back to Tasks', () => {
  assert.deepEqual([...PANEL_VIEWS].sort(), ['failures', 'files', 'jobs', 'tasks'])
  const counts = { tasks: 2, files: 1, failures: 0, jobs: 0 }
  assert.equal(activeView('files', counts), 'files')
  assert.equal(activeView('failures', counts), 'tasks')
  assert.equal(activeView('jobs', counts), 'tasks')
  assert.equal(activeView('bogus', counts), 'tasks')
  assert.equal(activeView('tasks', { tasks: 0 }), 'tasks')
})

test('files: most recently touched first', () => {
  const files = [{ path: '/a', firstSeq: 1, lastSeq: 9 }, { path: '/b', firstSeq: 5, lastSeq: 5 }, { path: '/c', firstSeq: 7, lastSeq: 7 }]
  assert.deepEqual(filesNewestFirst(files).map(f => f.path), ['/a', '/c', '/b'])
  assert.deepEqual(files.map(f => f.path), ['/a', '/b', '/c'])
})

test('failure labels: tool + path/borrowed title + ×n; others tool only', () => {
  const titles = new Map([['c1', 'npm test']])
  const titleOf = id => titles.get(id) ?? null
  assert.equal(failureLabel({ tool: 'edit', path: '/src/a.js', count: 2, callId: 'e1' }, titleOf), 'edit /src/a.js ×2')
  assert.equal(failureLabel({ tool: 'bash', path: null, count: 1, callId: 'c1' }, titleOf), 'bash npm test ×1')
  // bash row not loaded → tool only; filled in once the row loads
  assert.equal(failureLabel({ tool: 'bash', path: null, count: 3, callId: 'gone' }, titleOf), 'bash ×3')
  // other tools never borrow, even if a row with that call id exists
  titles.set('g1', 'grep pattern')
  assert.equal(failureLabel({ tool: 'grep', path: null, count: 1, callId: 'g1' }, titleOf), 'grep ×1')
})
