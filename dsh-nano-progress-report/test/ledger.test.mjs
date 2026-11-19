/** DNPR-T03/T04/T05/T06 — the work-item ledger: open rules, demotion/eviction,
 *  failure→recovery discipline, file/task tracking, waiting status,
 *  unattributed counts, checkpoint round-trip, wire view shape. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { progressLedger as ledger } from '../src/host/ledger.js'
import { bashFingerprint, digest } from '../src/shared/fingerprint.js'

const ev = (seq, type, data = {}, time = seq * 1000) => ({ seq, type, data, time })
const prompt = (seq, text, kind = 'user') =>
  ev(seq, 'user/message', { source: { kind }, content: [{ type: 'text', text }] })
const call = (seq, callId, name, args = {}) =>
  ev(seq, 'tool/call', { callId, name, arguments: JSON.stringify(args) })
const result = (seq, callId, { failed = false, meta, text = 'done' } = {}) =>
  ev(seq, 'tool/result', { meta, message: {
    source: { kind: 'tool', callId }, isError: failed, content: [{ type: 'text', text }],
  } })
const bashOk = { meta: { cwd: '/p' } }
const init = (inherited = 0) => ledger.init({ cwd: '/p' }, inherited)
const fold = (events, state = init()) => events.reduce(ledger.apply, state)
const viewOf = state => ledger.wire.view(state)

test('openers: user/goal/schedule open items; inter-agent and second-open do not reopen… attribution lands on newest', () => {
  let state = fold([prompt(1, 'first task')])
  assert.equal(state.items.length, 1)
  assert.equal(state.items[0].kind, 'user')
  assert.equal(state.items[0].title, 'first task')
  // agent relay does not open a new item but extends coverage
  state = fold([ev(2, 'user/message', { source: { kind: 'agent-message' }, content: 'hi' })], state)
  assert.equal(state.items.length, 1)
  assert.equal(state.items[0].lastSeq, 2)
  state = fold([prompt(3, 'goal round text', 'goal'), prompt(4, 'scheduled run', 'schedule')], state)
  assert.deepEqual(state.items.map(i => i.kind), ['schedule', 'goal', 'user'])
  // a second opener also opens its own item; calls attribute to the newest
  state = fold([call(5, 'c1', 'read', {}), result(6, 'c1', { meta: {} })], state)
  assert.equal(state.items[0].calls, 1)
  assert.equal(state.items[2].calls, 0)
})

test('demotion at 17 full; skeleton eviction past 16+64; asOfSeq tracks fact seq only', () => {
  let state = fold(Array.from({ length: 17 }, (_, i) => prompt(10 + i, `task ${i}`)))
  assert.equal(state.items.filter(i => i.tier === 'full').length, 16)
  assert.equal(state.items.at(-1).tier, 'skeleton')
  const skeleton = state.items.at(-1)
  assert.equal(skeleton.files, undefined)
  assert.deepEqual(skeleton.counts ?? { calls: skeleton.calls }, { calls: 0 })
  // 81 items → 80 kept, oldest evicted
  state = fold(Array.from({ length: 81 }, (_, i) => prompt(100 + i, `t${i}`)), init())
  assert.equal(state.items.length, 80)
  assert.equal(state.items.filter(i => i.tier === 'skeleton').length, 64)
  assert.equal(state.items.at(-1).title, 't1')
  assert.equal(state.truncated.items, 1)
  // a no-fact event does not move asOfSeq backwards/forwards weirdly
  const before = state.asOfSeq
  state = ledger.apply(state, ev(500, 'user/message', { source: { kind: 'agent-message' }, content: 'x' }))
  // current is full → lastSeq extends
  assert.equal(state.items[0].lastSeq, 500)
  assert.ok(state.asOfSeq >= before)
})

test('failure/recovery: same fingerprint recovers; unmatched/non-zero-exit/other-tool rules hold', () => {
  const cmd = { command: 'npm test', description: 'copy' }
  let state = fold([
    prompt(1, 't'),
    call(2, 'a', 'bash', cmd), result(3, 'a', { failed: true }),
    call(4, 'b', 'bash', { command: 'other' }), result(5, 'b', bashOk),   // different fp → no recovery
    call(6, 'c', 'bash', cmd), result(7, 'c', { ...bashOk, text: 'out\n[exit code: 1]' }), // non-zero exit ≠ failure and no recovery
    call(8, 'd', 'bash', cmd), result(9, 'd', bashOk),                   // same fp success → recovers
  ])
  const item = state.items[0]
  assert.equal(item.failures.length, 0)
  assert.equal(item.calls, 4)
  assert.equal(item.failedCalls, 1)
  // unregistered other-tool failure: key from canonical args; retry recovers
  state = fold([
    call(10, 'x', 'apply_patch', { patch: 'p' }), result(11, 'x', { failed: true }),
    call(12, 'y', 'apply_patch', { patch: 'p' }), result(13, 'y', {}),
  ], state)
  assert.equal(state.items[0].failures.length, 0)
  // background bash: no fingerprint but the failure still records (key null)
  state = fold([
    call(20, 'bg', 'bash', { command: 'sleep 99', run_in_background: true }),
    result(21, 'bg', { failed: true }),
  ], state)
  assert.deepEqual(state.items[0].failures.map(f => f.key), [null])
  assert.equal(state.items[0].failures[0].tool, 'bash')
})

test('files: successes record paths (meta diffs), failures do not; 32-cap evicts oldest-lastSeq', () => {
  let state = fold([
    prompt(1, 't'),
    call(2, 'w', 'write', { file_path: '/a' }), result(3, 'w', { meta: { path: '/a' } }),
    call(4, 'e', 'edit', { file_path: '/b' }), result(5, 'e', { failed: true }),
    call(6, 'p', 'apply_patch', { patch: 'x' }), result(7, 'p', { meta: { diffs: [{ path: '/m1' }, { path: '/m2' }] } }),
  ])
  assert.deepEqual(state.items[0].files.map(f => f.path), ['/a', '/m1', '/m2'])
  // cap: write 40 files → 32 kept
  const events = [prompt(100, 't2')]
  for (let i = 0; i < 40; i += 1) {
    events.push(call(110 + i * 2, `w${i}`, 'write', { file_path: `/f${i}` }),
      result(111 + i * 2, `w${i}`, { meta: { path: `/f${i}` } }))
  }
  state = fold(events, init())
  const files = state.items[0].files
  assert.equal(files.length, 32)
  assert.equal(state.items[0].truncated.files, 8)
  assert.equal(state.items[0].files.includes('x'), false)
})

test('tasks: snapshot merge, completed sticky on revert, first completion wins, content cap', () => {
  let state = fold([
    prompt(1, 't'),
    ev(2, 'todo/write', { todos: [{ content: 'a', status: 'pending' }, { content: 'b', status: 'pending' }] }),
    ev(3, 'todo/write', { todos: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'in_progress' }] }),
    ev(4, 'todo/write', { todos: [{ content: 'a', status: 'in_progress' }, { content: 'b', status: 'completed' }] }),
  ], init())
  const [a, b] = state.items[0].tasks
  assert.equal(a.status, 'in_progress')           // reverted
  assert.equal(a.completedSeq, 3)                  // but completion mark stays
  assert.equal(b.completedSeq, 4)
  assert.equal(state.items[0].tasks.length, 2)
})

test('waiting: undecided approval flips status; decision flips back; approval survives item switch', () => {
  let state = fold([prompt(1, 't'), ev(2, 'turn/start'), ev(3, 'approval/asked', { id: 'ap1', toolName: 'bash' })])
  assert.equal(viewOf(state).items[0].status, 'waiting')
  state = fold([prompt(4, 'new item'), ev(5, 'approval/decided', { id: 'ap1', outcome: 'approved' })], state)
  // decided closes the approval attributed to the OLD item
  assert.equal(state.approvals['ap1'], undefined)
  const old = state.items.find(i => i.title === 't')
  assert.equal(old.awaiting, 0)
})

test('unattributed: results and jobs before any item count separately; view exposes counters', () => {
  let state = fold([
    call(1, 'a', 'bash', { command: 'ls' }), result(2, 'a', { failed: true }),
    ev(3, 'job/registered', { jobId: 'j1', kind: 'bash' }),
  ])
  assert.equal(state.unattributed.calls, 1)
  assert.equal(state.unattributed.failures, 1)
  assert.equal(state.unattributed.jobs, 1)
  const view = viewOf(state)
  assert.equal(view.unattributed.calls, 1)
  assert.equal(view.items.length, 0)
  // the buffered call is itself an observed fact → coverage starts at seq 1
  assert.equal(view.coverage.firstSeq, 1)
})

test('inherited prefix cut: events below inherited are skipped; checkpoint round-trip replays', () => {
  let state = fold([prompt(1, 't'), call(2, 'a', 'edit', { file_path: '/x' })])
  const restored = ledger.stateSchema.parse(JSON.parse(JSON.stringify(state)))
  const tail = [result(3, 'a', { meta: { path: '/x' } })]
  assert.deepEqual(tail.reduce(ledger.apply, restored), tail.reduce(ledger.apply, state))
  const child = ledger.init({ cwd: '/p' }, 10)
  assert.strictEqual(ledger.apply(child, ev(5, 'user/message', { source: { kind: 'user' }, content: 'old' })), child)
  assert.strictEqual(ledger.apply(child, ev(9, 'turn/start')), child)
  // checkpoint cannot smuggle payloads
  assert.throws(() => ledger.stateSchema.parse({ ...restored, items: [{ tier: 'full', id: 0, kind: 'u', title: '', firstSeq: 1, lastSeq: 1, files: 'nope' }] }))
})

test('wire view: reference stability for unchanged items + summary:false + shape', () => {
  assert.equal(ledger.wire.summary, false)
  assert.equal(ledger.stateVersion, 1)
  assert.equal(ledger.key, 'nano-progress-report:ledger')
  let state = fold([prompt(1, 'a'), prompt(2, 'b')])
  const v1 = viewOf(state)
  assert.equal(v1.v, 1)
  assert.equal(v1.items.length, 2)
  state = fold([call(3, 'c', 'read', {}), result(4, 'c', {})], state)
  const v2 = viewOf(state)
  // unchanged skeleton/full item keeps the same view object
  assert.strictEqual(v2.items[1], v1.items[1])
  assert.notStrictEqual(v2.items[0], v1.items[0])
  // view re-run on the same state is the same object (publication suppressible)
  assert.strictEqual(viewOf(state), v2)
})

test('coverage seq + asOfSeq advances only on fact change', () => {
  const state = fold([prompt(1, 't'), call(2, 'a', 'read', {})])
  const v = viewOf(state)
  assert.deepEqual(v.coverage, { firstSeq: 1, lastSeq: 2 })
  assert.equal(v.asOfSeq, 2)
  // dropped result for unknown callId does not advance asOfSeq
  const after = ledger.apply(state, result(9, 'ghost'))
  assert.equal(viewOf(after).asOfSeq, 2)
})
