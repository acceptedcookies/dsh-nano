import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { denoise, groupRows } from '../src/client/group.js'
import { countsText, defaultOpen, durationText } from '../src/client/group-format.js'

let seq = 0
const row = (over) => {
  seq += 1
  return { key: `r${seq}`, seq, time: 1000 + seq, kind: 'progress-x', type: 'message', status: 'ok', summary: 's', role: 'agent', turn: 1, step: 0, detail: {}, ...over }
}
const tool = (over) => row({ kind: 'progress-tool-call', type: 'shell', role: 'exec', ...over, detail: { callId: 'c', ...over?.detail } })

describe('denoise', () => {
  it('folds a background job into the tool call that started it', () => {
    const t = tool({ detail: { callId: 'c1' } })
    const j = row({ type: 'job', status: 'failed', summary: 'npm test', role: 'boundary', detail: { callId: 'c1' } })
    const out = denoise([t, j])
    assert.equal(out.length, 1)
    assert.equal(out[0].status, 'failed')
    assert.deepEqual(out[0].job, { status: 'failed', label: 'npm test' })
    assert.equal(t.status, 'ok', 'input row is not mutated')
  })
  it('keeps a job whose callId matches no tool row', () => {
    const j = row({ type: 'job', detail: { callId: 'nope' } })
    assert.deepEqual(denoise([j]), [j])
  })
  it('drops an empty assistant step and moves its reasoning to the first tool of that step', () => {
    const m = row({ empty: true, summary: '', step: 2, detail: { reasoning: 'think' } })
    const a = tool({ step: 2, detail: { callId: 'a' } })
    const b = tool({ step: 2, detail: { callId: 'b' } })
    const out = denoise([m, a, b])
    assert.deepEqual(out.map(r => r.key), [a.key, b.key])
    assert.equal(out[0].detail.reasoning, 'think')
    assert.equal(out[1].detail.reasoning, undefined)
  })
  it('keeps a reasoning-only step without tools, drops a fully empty one', () => {
    const r1 = row({ empty: true, summary: '', step: 5, detail: { reasoning: 'hmm' } })
    const r2 = row({ empty: true, summary: '', step: 6, detail: {} })
    assert.deepEqual(denoise([r1, r2]).map(r => r.key), [r1.key])
  })
})

describe('groupRows', () => {
  it('a prompt opens a group and the turn row closes it', () => {
    const p = row({ type: 'prompt', role: 'human' })
    const t = tool({ type: 'shell' })
    const f = tool({ type: 'file', status: 'failed', detail: { callId: 'f' } })
    const m = row({ summary: 'done' })
    const e = row({ type: 'turn', role: 'boundary', status: 'ok' })
    const [g, ...rest] = groupRows([p, t, f, m, e])
    assert.equal(rest.length, 0)
    assert.equal(g.opener, p)
    assert.equal(g.end, e)
    assert.equal(g.outcome, m)
    assert.equal(g.failed, 1)
    assert.deepEqual(g.byType, { shell: 1, file: 1 })
    assert.equal(g.status, 'ok')
  })
  it('a goal round opener carries goalId and round', () => {
    const [g] = groupRows([row({ type: 'goal', role: 'goal', goalId: 'g1', round: 4 })])
    assert.equal(g.goalId, 'g1')
    assert.equal(g.round, 4)
    assert.equal(g.status, 'open')
  })
  it('a peer message mid-turn stays inside; after the turn closes it opens a new group', () => {
    const p = row({ type: 'prompt', role: 'human' })
    const peer1 = row({ type: 'subagent', role: 'peer' })
    const e = row({ type: 'turn', role: 'boundary' })
    const peer2 = row({ type: 'subagent', role: 'peer' })
    const groups = groupRows([p, peer1, e, peer2])
    assert.equal(groups.length, 2)
    assert.deepEqual(groups[0].rows, [peer1])
    assert.equal(groups[1].opener, peer2)
  })
  it('activity before any opener, or after a close, starts an opener-less group', () => {
    const a = tool({})
    const e = row({ type: 'turn', role: 'boundary' })
    const b = tool({ detail: { callId: 'b' } })
    const groups = groupRows([a, e, b])
    assert.equal(groups.length, 2)
    assert.equal(groups[0].opener, null)
    assert.equal(groups[0].key, a.key)
    assert.equal(groups[1].key, b.key)
  })
  it('an awaiting row marks the group awaiting', () => {
    const [g] = groupRows([row({ type: 'prompt' }), row({ type: 'wait', status: 'awaiting' })])
    assert.equal(g.awaiting, true)
  })
})

describe('group format', () => {
  const t = k => ({ 'count.shell': '{n} shell', 'count.file': '{n} file', 'count.web': '{n} web', 'dur.s': '{n}s', 'dur.m': '{n}m', 'dur.h': '{n}h' })[k] ?? k
  it('counts are largest first and capped', () => {
    assert.equal(countsText({ file: 2, shell: 5, web: 1 }, t, 2), '5 shell · 2 file')
    assert.equal(countsText({ message: 3 }, t), '')
  })
  it('durations', () => {
    assert.equal(durationText(500, t), '')
    assert.equal(durationText(42_000, t), '42s')
    assert.equal(durationText(300_000, t), '5m')
    assert.equal(durationText(5_400_000, t), '1.5h')
  })
  it('only the latest, in-flight or awaiting groups start open', () => {
    assert.equal(defaultOpen({ status: 'ok', awaiting: false }, false), false)
    assert.equal(defaultOpen({ status: 'ok', awaiting: false }, true), true)
    assert.equal(defaultOpen({ status: 'open', awaiting: false }, false), true)
    assert.equal(defaultOpen({ status: 'ok', awaiting: true }, false), true)
  })
})
