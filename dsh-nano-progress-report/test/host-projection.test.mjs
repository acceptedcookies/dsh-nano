import assert from 'node:assert/strict'
import test from 'node:test'
import { progressProjection as projection } from '../src/host/projection.js'
import { summarizeProgress } from '../src/host/summary.js'

const call = (seq, callId, name, args = {}) => ({
  seq, type: 'tool/call', data: { callId, name, arguments: JSON.stringify(args) },
})
const result = (seq, callId, { failed = false, meta, text = 'done' } = {}) => ({
  seq, type: 'tool/result', data: { meta, message: {
    source: { kind: 'tool', callId }, isError: failed, content: [{ type: 'text', text }],
  } },
})
const shell = { command: 'example command', description: 'not part of recovery identity' }
const success = { meta: { cwd: '/project' } }
const initial = () => projection.init({ cwd: '/project' }, 0)

test('checkpoint + suffix equals replay, including in-flight calls and retry settlement', () => {
  const events = [
    call(0, 'a', 'bash', shell), result(1, 'a', { failed: true }),
    call(2, 'b', 'edit'), call(3, 'c', 'bash', shell),
    result(4, 'b', { meta: { path: '/project/a', diffs: [{ newText: 'private' }] } }),
    result(5, 'c', success),
  ]
  const checkpoint = events.slice(0, 4).reduce(projection.apply, initial())
  assert.equal(checkpoint.failures.length, 1)
  const restored = projection.stateSchema.parse(JSON.parse(JSON.stringify(checkpoint)))
  const updated = events.slice(4).reduce(projection.apply, restored)
  assert.deepEqual(updated, events.reduce(projection.apply, initial()))
  assert.deepEqual(updated.paths, ['/project/a'])
  assert.deepEqual(updated.failures, [])
  assert.doesNotMatch(JSON.stringify(checkpoint), /example command|not part of recovery identity|private/)
  assert.throws(() => projection.stateSchema.parse({ ...checkpoint, pending: [{ id: 'bad', kind: 'bash' }] }))
})

test('failed Bash recovers only on a matching successful foreground result', () => {
  let state = [
    call(0, 'a', 'bash', shell), result(1, 'a', { failed: true }),
    call(2, 'b', 'bash', { ...shell, workdir: 'other' }), result(3, 'b', success),
    call(4, 'c', 'bash', shell), result(5, 'c', { ...success, text: 'output\n[exit code: 1]' }),
    call(6, 'd', 'bash', shell), result(7, 'd', { ...success, text: '[still running after 100ms; moved to background job bash-1]' }),
    call(8, 'e', 'bash', shell), result(9, 'e'),
    { seq: 10, type: 'working-directory/change', data: { cwd: '/other' } },
    call(11, 'f', 'bash', shell), result(12, 'f', { meta: { cwd: '/other' } }),
  ].reduce(projection.apply, initial())
  assert.equal(state.failures.length, 1)
  state = [
    { seq: 13, type: 'working-directory/change', data: { cwd: '/project' } },
    call(14, 'g', 'bash', { ...shell, description: 'different UI copy' }), result(15, 'g', success),
  ].reduce(projection.apply, state)
  assert.equal(state.failures.length, 0)
})

test('ignores inherited and unpaired events, and bounds observed changes', () => {
  const child = projection.init({ cwd: '/project' }, 2)
  assert.strictEqual(projection.apply(child, call(0, 'a', 'edit')), child)
  assert.strictEqual(projection.apply(child, result(3, 'a', { meta: { path: '/foreign' } })), child)
  assert.strictEqual(projection.apply(child, { seq: 4, type: 'user/message', data: {} }), child)
  const events = Array.from({ length: 12 }, (_, i) => [
    call(5 + i * 2, `e${i}`, 'write'), result(6 + i * 2, `e${i}`, { meta: { path: `/file-${i}` } }),
  ]).flat()
  const state = events.reduce(projection.apply, child)
  assert.deepEqual(state.paths, Array.from({ length: 8 }, (_, i) => `/file-${11 - i}`))
  const started = projection.apply(state, call(40, 'late', 'write'))
  const reset = projection.apply(started, { seq: 41, type: 'turn/start', data: {} })
  assert.strictEqual(projection.apply(reset, result(42, 'late', { meta: { path: '/late' } })), reset)
})

test('summary reuses owner services and excludes other sessions and raw inputs', () => {
  const session = { id: 'mine', header: {} }
  const agent = { session }
  const child = (parentSession, status = 'running', origin = 'subagent') => ({
    status, session: { header: { parentSession, origin } },
  })
  const ctx = {
    sessionProjections: { snapshot(s, keys) {
      assert.equal(s, session)
      assert.deepEqual([...keys], ['todos'])
      return { values: { todos: [{ status: 'pending', content: 'private todo' }] } }
    } },
    agents: { list: () => [child('mine'), child('peer'), child('mine', 'idle'), child('mine', 'running', 'fork')] },
    get: name => name === 'goal'
      ? { get(a) {
        assert.equal(a, agent)
        return { phase: 'blocked', roundsStarted: 2, maxGoalRounds: 5, objective: 'private goal' }
      } }
      : { list: caller => {
        assert.equal(caller, 'mine')
        return [{ owner: 'mine', status: 'stopping' }, { status: 'running' },
          { owner: 'peer', status: 'running' }, { owner: 'mine', status: 'completed' }]
      } },
  }
  assert.deepEqual(summarizeProgress(ctx, { stateOf: s => {
    assert.equal(s, session)
    return { paths: ['/file'], failures: ['opaque'] }
  } }, agent), {
    todos: { pending: 1, in_progress: 0, completed: 0 },
    goal: { phase: 'blocked', roundsStarted: 2, maxGoalRounds: 5 },
    paths: ['/file'], unresolvedBash: 1, runningJobs: 1, runningSubagents: 1,
  })
})
