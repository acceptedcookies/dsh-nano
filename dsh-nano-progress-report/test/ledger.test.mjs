/** DNPR-T03/T04/T05/T06 — the work-item ledger: open rules, demotion/eviction,
 *  failure→recovery discipline, file/task tracking, waiting status,
 *  unattributed counts, checkpoint round-trip, wire view shape. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { progressLedger as ledger } from '../src/host/ledger.js'
import { bashFingerprint, digest } from '../src/shared/fingerprint.js'

const ev = (seq, type, data = {}, time = seq * 1000) => ({ seq, type, data, time })
const prompt = (seq, text, kind = 'user', goalId) =>
  ev(seq, 'user/message', {
    source: { kind, ...(goalId !== undefined ? { goalId } : {}) },
    content: [{ type: 'text', text }],
  })
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
  assert.equal(state.items[0].title, undefined) // T-O-9: no prompt text in the ledger
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

test('goal merge: same goalId merges into the item; different goalId opens a new one (T-O-7/9)', () => {
  let state = fold([
    prompt(1, 'goal r1', 'goal', 'g1'),
    call(2, 'a', 'read', {}), result(3, 'a', { meta: {} }),
    prompt(4, 'goal r2', 'goal', 'g1'),
    call(5, 'b', 'read', {}), result(6, 'b', { meta: {} }),
  ])
  assert.equal(state.items.length, 1)
  assert.equal(state.items[0].goalId, 'g1')
  assert.equal(state.items[0].calls, 2)
  state = fold([prompt(7, 'goal other', 'goal', 'g2')], state)
  assert.equal(state.items.length, 2)
  assert.equal(state.items[0].goalId, 'g2')
  // item id stays the first opening seq
  assert.equal(state.items[0].id, 7)
  assert.equal(state.items[1].id, 1)
})

test('same-turn second whitelist message does not reopen; next turn does (T-O-9)', () => {
  // First whitelist hit inside the turn opens the item; later hits attach.
  let state = fold([
    ev(1, 'turn/start'), prompt(2, 'first'), prompt(3, 'second in same turn'),
    call(4, 'a', 'read', {}), result(5, 'a', { meta: {} }),
  ])
  assert.equal(state.items.length, 1)
  assert.equal(state.items[0].id, 2)
  assert.equal(state.items[0].calls, 1)
  assert.equal(state.items[0].lastSeq, 5)
  // A new turn resets: the next user message opens its own item.
  state = fold([ev(6, 'turn/end', { reason: 'completed' }), ev(7, 'turn/start'), prompt(8, 'new')], state)
  assert.equal(state.items.length, 2)
  assert.equal(state.items[0].id, 8)
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
  assert.equal(state.items.at(-1).id, 101) // oldest retained skeleton
  assert.equal(state.cumulative.items, 1)
  assert.equal(state.cumulative.lastSeq, 100)
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
  const old = state.items.find(i => i.id === 1)
  assert.equal(old.awaiting, 0)
})

test('unattributed: results before any item count separately; jobs are not ledger facts (T-O-10)', () => {
  let state = fold([
    call(1, 'a', 'bash', { command: 'ls' }), result(2, 'a', { failed: true }),
    ev(3, 'job/registered', { jobId: 'j1', kind: 'bash' }),
  ])
  assert.equal(state.unattributed.calls, 1)
  assert.equal(state.unattributed.failures, 1)
  assert.equal(state.unattributed.jobs, undefined)
  assert.equal(state.items.length, 0)
  const view = viewOf(state)
  assert.equal(view.unattributed.calls, 1)
  assert.equal(view.items.length, 0)
  // a buffered call is not a fact until its result lands → coverage starts at 2
  assert.equal(view.coverage.firstSeq, 2)
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
  assert.throws(() => ledger.stateSchema.parse({ ...restored, items: [{ tier: 'full', id: 0, kind: 'user', title: '', firstSeq: 1, lastSeq: 1, files: 'nope' }] }))
  assert.throws(() => ledger.stateSchema.parse({ ...restored, items: [{ tier: 'full', id: 0, kind: 'user', firstSeq: 1, lastSeq: 1, files: [], failures: [], tasks: [], truncated: { files: 0, failures: 0, tasks: 0 }, awaiting: 0, calls: 0, failedCalls: 0, evidence: ['x'] }] }),
    /evidence/)
  assert.throws(() => ledger.stateSchema.parse({ ...restored, smuggle: 1 }), /state\.smuggle/)
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
  const opened = fold([prompt(1, 't')])
  const v = viewOf(opened)
  // a buffered call, a cwd change, an unknown event type: no fact moves, and
  // the published view is the very same object (no rebuild, no republish)
  const buffered = fold([call(2, 'a', 'read', {}), ev(3, 'working-directory/change', { cwd: '/q' })], opened)
  assert.notStrictEqual(buffered, opened)
  assert.strictEqual(viewOf(buffered), v)
  assert.deepEqual(v.coverage, { firstSeq: 1, lastSeq: 1 })
  assert.equal(v.asOfSeq, 1)
  assert.strictEqual(ledger.apply(buffered, ev(4, 'model/usage', { tokens: 1 })), buffered)
  // dropped result for unknown callId does not advance asOfSeq
  assert.equal(viewOf(ledger.apply(buffered, result(9, 'ghost'))).asOfSeq, 1)
  // the paired result is a fact
  const landed = ledger.apply(buffered, result(10, 'a', {}))
  assert.equal(viewOf(landed).asOfSeq, 10)
  // a turn with no work item yet changes no fact
  const empty = fold([ev(1, 'turn/start'), ev(2, 'turn/end', { reason: 'completed' })])
  assert.equal(viewOf(empty).asOfSeq, 0)
  assert.equal(viewOf(empty).coverage.firstSeq, null)
})

test('tasks: a task left out of a later snapshot keeps its last status and history (T-O-15)', () => {
  const state = fold([
    prompt(1, 't'),
    ev(2, 'todo/write', { todos: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'in_progress' }] }, 5000),
    ev(3, 'todo/write', { todos: [{ content: 'c', status: 'pending' }] }),
    ev(4, 'turn/start'),                       // official todos clear here; the ledger keeps its rows
    ev(5, 'todo/write', { todos: [{ content: 'b', status: 'completed' }] }, 9000),
  ])
  const tasks = state.items[0].tasks
  assert.deepEqual(tasks.map(t => [t.content, t.status, t.firstSeq]),
    [['a', 'completed', 2], ['b', 'completed', 2], ['c', 'pending', 3]])
  // first listed already completed → the completion mark is that write
  assert.equal(tasks[0].completedSeq, 2)
  assert.equal(tasks[0].completedAt, 5000)
  assert.equal(tasks[1].completedSeq, 5)
  assert.equal(tasks[1].completedAt, 9000)
  assert.equal(tasks[2].completedSeq, undefined)
  // the view carries the same rows
  assert.deepEqual(viewOf(state).items[0].tasks, tasks)
})

test('tasks: over-long content is stored at 200B on a codepoint boundary and still matches on re-list', () => {
  const long = `${'x'.repeat(199)}汉字 tail`
  const state = fold([
    prompt(1, 't'),
    ev(2, 'todo/write', { todos: [{ content: long, status: 'pending' }] }),
    ev(3, 'todo/write', { todos: [{ content: long, status: 'completed' }] }),
  ])
  const tasks = state.items[0].tasks
  assert.equal(tasks.length, 1)
  assert.equal(tasks[0].content, 'x'.repeat(199))
  assert.ok(!tasks[0].content.includes('\uFFFD'))
  assert.equal(tasks[0].completedSeq, 3)
  // the checkpoint round-trips without dropping the row
  const restored = ledger.stateSchema.parse(JSON.parse(JSON.stringify(state)))
  assert.deepEqual(restored.items[0].tasks, tasks)
})

test('tasks: the 32-cap keeps the newest listed rows and counts the rest', () => {
  const todos = Array.from({ length: 40 }, (_, i) => ({ content: `t${i}`, status: 'pending' }))
  const state = fold([prompt(1, 't'), ev(2, 'todo/write', { todos: todos.slice(0, 20) }), ev(3, 'todo/write', { todos: todos.slice(20) })])
  const item = state.items[0]
  assert.equal(item.tasks.length, 32)
  assert.equal(item.truncated.tasks, 8)
  assert.equal(item.tasks[0].content, 't8')
  assert.equal(item.tasks.at(-1).content, 't39')
})

test('skeletons absorb no updates; the current item keeps its view when it shifts to index 1', () => {
  let state = fold([ev(1, 'turn/start'), prompt(2, 'first')])
  const firstView = viewOf(state).items[0]
  state = fold([ev(3, 'turn/end', { reason: 'completed' }), ev(4, 'turn/start'), prompt(5, 'second')], state)
  const shifted = viewOf(state).items[1]
  assert.equal(shifted.tier, 'full')
  assert.equal(shifted.firstSeq, 2)
  assert.equal(shifted.status, 'completed')
  assert.equal(shifted.turnOpen, undefined)
  assert.equal(firstView.firstSeq, 2)
  // demote the oldest, then keep working: the skeleton object never changes
  state = fold([ev(6, 'turn/end', { reason: 'completed' }), ...Array.from({ length: 16 }, (_, i) => prompt(10 + i, `p${i}`))], state)
  const skeleton = state.items.find(item => item.id === 2)
  assert.equal(skeleton.tier, 'skeleton')
  state = fold([call(40, 'c', 'read', {}), result(41, 'c', {}), ev(42, 'todo/write', { todos: [{ content: 'z', status: 'pending' }] })], state)
  assert.strictEqual(state.items.find(item => item.id === 2), skeleton)
})

test('cumulative layer: evicted items fold into counts and the last covered seq (T-O-11)', () => {
  const events = []
  let seq = 0
  for (let i = 0; i < 82; i += 1) {
    events.push(prompt(++seq, `p${i}`))
    events.push(call(++seq, `r${i}`, 'bash', { command: `c${i}` }), result(++seq, `r${i}`, { failed: true }))
  }
  const state = fold(events)
  const view = viewOf(state)
  assert.equal(view.items.length, 80)
  assert.deepEqual(view.cumulative, { items: 2, lastSeq: 6, calls: 2, failures: 2, files: 0, tasks: 0, unresolved: 2 })
  const restored = ledger.stateSchema.parse(JSON.parse(JSON.stringify(state)))
  assert.deepEqual(restored.cumulative, state.cumulative)
  assert.throws(() => ledger.stateSchema.parse({ ...restored, cumulative: { ...restored.cumulative, extra: 1 } }), /cumulative\.extra/)
})

test('recovered failures are counted per item; unresolved stays in the view counts', () => {
  const cmd = { command: 'make' }
  const state = fold([
    prompt(1, 't'),
    call(2, 'a', 'bash', cmd), result(3, 'a', { failed: true }),
    call(4, 'b', 'bash', cmd), result(5, 'b', { failed: true }),
    call(6, 'c', 'grep', { pattern: 'x' }), result(7, 'c', { failed: true }),
    call(8, 'd', 'bash', cmd), result(9, 'd', bashOk),
  ])
  const counts = viewOf(state).items[0].counts
  assert.equal(counts.failures, 3)
  assert.equal(counts.unresolved, 1)
  assert.equal(counts.recovered, 2)
})

test('failures cap keeps the most recently failed entries; item-less turns keep the view', () => {
  let state = fold([prompt(1, 't')])
  let seq = 2
  const fail = path => {
    state = fold([call(seq, `c${seq}`, 'edit', { file_path: path }), result(seq + 1, `c${seq}`, { failed: true, meta: { path } })], state)
    seq += 2
  }
  for (let i = 0; i < 16; i += 1) fail(`/f${i}`)
  fail('/f0')
  fail('/f16')
  const failures = state.items[0].failures
  assert.equal(failures.length, 16)
  assert.ok(failures.some(f => f.path === '/f0'), 'a re-failed early entry stays')
  assert.ok(!failures.some(f => f.path === '/f1'), 'the least recently failed entry is dropped')
  assert.equal(state.items[0].truncated.failures, 1)

  const fresh = init()
  const before = viewOf(fresh)
  const idle = fold([ev(1, 'turn/start'), ev(2, 'approval/asked', { id: 'x' }), ev(3, 'turn/end', { reason: 'completed' })], fresh)
  assert.strictEqual(viewOf(idle), before)
  assert.deepEqual(idle.approvals, {})
})

test('checkpoint: unknown item kinds throw; malformed completion marks and oversized call ids drop', () => {
  const state = fold([
    prompt(1, 't'),
    ev(2, 'todo/write', { todos: [{ content: 'a', status: 'completed' }] }),
    call(3, 'c', 'edit', { file_path: '/x' }), result(4, 'c', { failed: true, meta: { path: '/x' } }),
  ])
  const raw = JSON.parse(JSON.stringify(state))
  assert.throws(() => ledger.stateSchema.parse({ ...raw, items: [{ ...raw.items[0], kind: 'u' }] }), /Invalid progress ledger item/)
  const item = raw.items[0]
  const forged = {
    ...raw,
    items: [{
      ...item,
      tasks: [{ ...item.tasks[0], completedSeq: 'x'.repeat(4096), completedAt: {} }],
      failures: [{ ...item.failures[0], callId: 'y'.repeat(4096) }],
    }],
  }
  const restored = ledger.stateSchema.parse(forged).items[0]
  assert.equal(restored.tasks[0].completedSeq, undefined)
  assert.equal(restored.tasks[0].completedAt, undefined)
  assert.equal(restored.failures[0].callId, '')
  // a well-formed checkpoint keeps both
  const kept = ledger.stateSchema.parse(raw).items[0]
  assert.equal(kept.tasks[0].completedSeq, 2)
  assert.equal(kept.failures[0].callId, 'c')
})
