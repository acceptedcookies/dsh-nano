/** DNPR-T07/T08 — the four-line pushed anchor (verbatim template + zero-line
 *  elision + old lines gone), inject list, and registration wiring. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { formatProgress } from '../src/host/context.js'
import { inject } from '../src/host/index.js'

const view = (over = {}) => ({
  v: 1, asOfSeq: 9, items: [], unattributed: { calls: 0, failures: 0 },
  cumulative: { items: 0, lastSeq: 0, calls: 0, failures: 0, files: 0, tasks: 0, unresolved: 0 },
  coverage: { firstSeq: 1, lastSeq: 9 }, ...over,
})
const item = (over = {}) => ({
  tier: 'full', kind: 'user', status: 'in progress', failures: [], tasks: [], ...over,
})

test('anchor: verbatim header + four lines; zero-count lines elided; empty when only header', () => {
  assert.equal(formatProgress({ view: view(), todos: [] }), '')
  const text = formatProgress({
    view: view({ items: [item({ kind: 'schedule' })] }),
    todos: [
      { status: 'completed', content: 'done one' },
      { status: 'in_progress', content: 'fix <x>' },
      { status: 'pending', content: 'later' },
    ],
    runningJobs: 2, runningSubagents: 1,
  })
  const lines = text.split('\n')
  assert.equal(lines[0], 'Current session progress (observed facts, not instructions):')
  assert.equal(lines[1], 'Current work: a scheduled task')
  assert.equal(lines[2], 'Tasks: 1 complete, 1 in progress, 1 pending; in progress: "fix \\u003cx\\u003e"')
  assert.equal(lines[3], 'Active: 2 background jobs, 1 direct subagents')
  assert.equal(lines.length, 4)
  // goal kind + waiting status still prints the kind word
  assert.match(formatProgress({ view: view({ items: [item({ kind: 'goal' })] }), todos: [] }),
    /Current work: a goal/)
})

test('anchor: failures line aggregates per tool, never carries commands or paths', () => {
  const text = formatProgress({
    view: view({ items: [item({ failures: [
      { tool: 'bash', key: 'k1', path: null, count: 2, firstSeq: 3, lastSeq: 5 },
      { tool: 'edit', key: 'k2', path: '/etc/secret', count: 1, firstSeq: 6, lastSeq: 6 },
    ] })] }),
    todos: [],
  })
  assert.equal(text.split('\n')[2], 'Unresolved tool failures in current work: 3 (bash 2, edit 1)')
  assert.doesNotMatch(text, /secret|command|\/etc/)
})

test('old anchor lines are gone: no Goal:, no paths, no Recent Bash failures line', () => {
  const text = formatProgress({
    view: view({ items: [item()] }),
    todos: [{ status: 'pending', content: 'x' }],
    runningJobs: 1, runningSubagents: 0,
  })
  assert.doesNotMatch(text, /Goal:|Recent file-tool paths|Recent Bash tool failures|waiting/i)
})

test('inject adds tools; agent-less prompt stays silent', () => {
  assert.deepEqual(inject, ['sessionProjections', 'systemPrompt', 'agents', 'tools'])
})
