/** DNPR-T09/T10 — read_progress: verbatim description/schema, present labels
 *  (execution-locked), when-gate, overview/detail formats, ≤16KiB clip,
 *  unknown-id Error, skeleton detail. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { makeReadProgressDefinition } from '../src/host/read-progress.js'
import { progressLedger as ledger } from '../src/host/ledger.js'

const ev = (seq, type, data = {}, time = seq * 1000) => ({ seq, type, data, time })
const prompt = (seq, text) => ev(seq, 'user/message', { source: { kind: 'user' }, content: text })
const call = (seq, callId, name, args = {}) =>
  ev(seq, 'tool/call', { callId, name, arguments: JSON.stringify(args) })
const result = (seq, callId, opts = {}) =>
  ev(seq, 'tool/result', { meta: opts.meta, message: {
    source: { kind: 'tool', callId }, isError: opts.failed === true, content: [{ type: 'text', text: 'x' }],
  } })

const DESCRIPTION = 'Read this session\'s progress record: work items started by user requests, '
  + 'goals, and scheduled tasks, with their tasks, changed files, and tool failures that '
  + 'no later identical call fixed. Omit item for an overview of recent work items; pass '
  + 'an item id from the overview for its details.'

function handleFor(state) {
  // registered-handle shape: stateOf(session) → state; carry wire for the view
  return { stateOf: () => state, wire: ledger.wire }
}

test('definition: verbatim description, schema, concurrency, present labels', () => {
  const def = makeReadProgressDefinition(handleFor(ledger.init({ cwd: '/p' }, 0)))
  assert.equal(def.name, 'read_progress')
  assert.equal(def.description, DESCRIPTION)
  assert.deepEqual(def.parameters, {
    type: 'object',
    properties: { item: { type: 'integer', minimum: 0, description: 'Work item id from the overview. Omit for the overview.' } },
    additionalProperties: false,
  })
  assert.deepEqual(def.output, { schema: { type: 'string' } })
  assert.equal(def.isConcurrencySafe(), true)
  assert.equal(def.presentCall({}), '查看进度概览')
  assert.equal(def.presentCall({ item: 42 }), '查看工作项 42')
  assert.equal(def.presentResult({ item: 42 }, 'x'), '查看进度')
  // no commands/paths inside present labels
  assert.doesNotMatch(def.presentCall({ item: 9 }), /[\/`$]/)
})

test('when: hidden with zero items or no agent; visible once an item exists', () => {
  const empty = makeReadProgressDefinition(handleFor(ledger.init({ cwd: '/p' }, 0)))
  assert.equal(empty.when({ agent: { session: {} } }), false)
  assert.equal(empty.when({}), false)
  const state = [prompt(1, 't')].reduce(ledger.apply, ledger.init({ cwd: '/p' }, 0))
  const def = makeReadProgressDefinition(handleFor(state))
  assert.equal(def.when({ agent: { session: {} } }), true)
})

test('overview: first line asOfSeq + totals; six slots per item; cumulative tail', () => {
  let state = [
    prompt(1, 'first'), prompt(2, 'second'),
    ev(3, 'todo/write', { todos: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'pending' }] }),
    call(4, 'w', 'write', { file_path: '/x' }), result(5, 'w', { meta: { path: '/x' } }),
    call(6, 'b', 'bash', { command: 'make' }), result(7, 'b', { failed: true }),
  ].reduce(ledger.apply, ledger.init({ cwd: '/p' }, 0))
  state = ledger.apply(state, ev(8, 'turn/start'))
  const def = makeReadProgressDefinition(handleFor(state))
  const out = def.execute({}, { agent: { session: {} } })
  const lines = out.split('\n')
  assert.match(lines[0], /^asOfSeq 8 · 2 work items \(2 full, 0 skeleton\)$/)
  assert.match(lines[1], /^item 2 · a user request · in progress · tasks 1\/2 · files 1 · unresolved failures 1$/)
  assert.match(lines[2], /^item 1 · a user request · in progress · tasks 0\/0 · files 0 · unresolved failures 0$/)
  assert.match(lines.at(-1), /^cumulative · 2 items .* coverage seq 1–8$/)
  assert.ok(out.length < 16 * 1024)
})

test('detail: tasks verbatim, file seqs, unresolved failures with seqs, recovered count, unknown id', () => {
  const cmd = { command: 'make' }
  let state = [
    prompt(1, 't'),
    ev(2, 'todo/write', { todos: [{ content: 'write tests & <checks>', status: 'in_progress' }] }),
    call(3, 'w', 'write', { file_path: '/a.js' }), result(4, 'w', { meta: { path: '/a.js' } }),
    call(5, 'b1', 'bash', cmd), result(6, 'b1', { failed: true }),
    call(7, 'b2', 'bash', cmd), result(8, 'b2', { failed: true }),
    call(9, 'e', 'edit', { file_path: '/b.js' }), result(10, 'e', { failed: true }),
  ].reduce(ledger.apply, ledger.init({ cwd: '/p' }, 0))
  const def = makeReadProgressDefinition(handleFor(state))
  const out = def.execute({ item: 1 }, { agent: { session: {} } })
  assert.match(out, /^item 1 · a user request/m)
  assert.match(out, /^task in_progress write tests & <checks>$/m)
  assert.match(out, /^file \/a\.js seq 4$/m)
  assert.match(out, /^failure bash - ×2 seq 6–8$/m)
  assert.match(out, /^failure edit \/b\.js ×1 seq 10$/m)
  assert.doesNotMatch(out, /make/)          // no command text
  // recovered-failure accounting: fail twice then succeed once
  state = [
    ...[], // keep prior
  ].reduce(ledger.apply, state)
  const recovered = [
    call(11, 'b3', 'bash', cmd), result(12, 'b3', { meta: { cwd: '/p' } }),
  ].reduce(ledger.apply, state)
  const detail = makeReadProgressDefinition(handleFor(recovered)).execute({ item: 1 }, { agent: { session: {} } })
  assert.match(detail, /recovered failures: 2$|recovered failures: 2\n/)
  // unknown id → plain Error with the locked phrase
  assert.throws(() => def.execute({ item: 999 }, { agent: { session: {} } }),
    err => err instanceof Error && !err.code && /Omit item for the overview/.test(err.message))
})

test('skeleton detail gives counts + detail not retained', () => {
  const events = Array.from({ length: 17 }, (_, i) => prompt(10 + i, `task ${i}`))
  const state = events.reduce(ledger.apply, ledger.init({ cwd: '/p' }, 0))
  const def = makeReadProgressDefinition(handleFor(state))
  const oldest = state.items.at(-1)
  const out = def.execute({ item: oldest.firstSeq }, { agent: { session: {} } })
  assert.match(out, /skeleton: calls 0, failures 0, files 0, tasks 0 · detail not retained/)
})

test('16KiB cap clips with a marker line', () => {
  // Per-item caps keep real details under ~13KB, so exercise the clip with a
  // fabricated oversized view (the cap is the contract, not the typical size).
  const bigView = {
    v: 1, asOfSeq: 1, items: [{
      tier: 'full', kind: 'user', status: 'in progress', firstSeq: 1, lastSeq: 1,
      tasks: Array.from({ length: 32 }, (_, i) => ({ status: 'pending', content: `t${i}-${'x'.repeat(400)}`, firstSeq: 1 })),
      files: Array.from({ length: 32 }, (_, i) => ({ path: `/${'d'.repeat(380)}/${i}`, firstSeq: 1, lastSeq: 1 })),
      failures: [], jobs: [],
      counts: { calls: 0, failures: 0, files: 32, tasks: 32, jobs: 0 },
      truncated: { files: 0, failures: 0, tasks: 0 },
    }],
    unattributed: { calls: 0, failures: 0, jobs: 0 }, truncated: { items: 0 },
    coverage: { firstSeq: 1, lastSeq: 1 },
  }
  const def = makeReadProgressDefinition({ stateOf: () => ({}), wire: { view: () => bigView } })
  const out = def.execute({ item: 1 }, { agent: { session: {} } })
  assert.ok(Buffer.byteLength(out) <= 16 * 1024)
  assert.match(out, /\[truncated at 16 KiB\]$/)
})
