/**
 * Definition-seam tests: feed real host event envelopes through
 * match()/start()/update()/buildViewNode() and assert the produced view nodes.
 * This is the layer that catches a field-name drift (e.g. host emits
 * `message.source.callId`, `reason.kind`, `content[].type`) that
 * row/builder tests cannot see — they feed pre-made view nodes.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { progressToolDefinition } from '../src/client/events/tool.js'
import { progressAssistantDefinition, progressPromptDefinition } from '../src/client/events/message.js'
import {
  progressApprovalDefinition, progressInboxDefinition,
  progressLifecycleDefinition, progressTurnDefinition,
} from '../src/client/events/turn.js'
import { progressJobDefinition, progressTodoDefinition } from '../src/client/events/job.js'

const evt = (type, data, seq = 1) => ({ type, seq, time: 1000 + seq, data })
// Minimal ConversationNodeContext stand-in: {key,kind,id,state,matches,start?}
// — `reader.previous` is intentionally absent; no definition consumes it.
const ctx = (state, matches = [], start = undefined) => ({ key: 'k', kind: 'd', id: 'id', state, matches, start })

describe('tool definition', () => {
  it('tool/result joins to the call via message.source.callId', () => {
    const m = progressToolDefinition.match(evt('tool/result', {
      message: { source: { callId: 'call-9' }, content: [], isError: false },
    }))
    assert.deepEqual(m, { id: 'call-9', role: 'update' })
  })
  it('tool/result falls back to message.toolCallId', () => {
    const m = progressToolDefinition.match(evt('tool/result', {
      message: { toolCallId: 'call-8', content: [] },
    }))
    assert.deepEqual(m, { id: 'call-8', role: 'update' })
  })
  it('ptc-dispatch joins by rootCallId', () => {
    const m = progressToolDefinition.match(evt('tool/ptc-dispatch', {
      rootCallId: 'root-1', subCallId: 's1', name: 'read', arguments: '{}',
    }))
    assert.deepEqual(m, { id: 'root-1', role: 'update' })
  })
  it('call → result isError produces a failed view node', () => {
    const call = evt('tool/call', { callId: 'c1', name: 'bash', arguments: '{"command":"ls"}', turn: 1, step: 0 }, 5)
    const state = progressToolDefinition.start(ctx(undefined), { event: call })
    const settled = progressToolDefinition.update(ctx(state), {
      event: evt('tool/result', {
        message: { source: { callId: 'c1' }, content: [{ type: 'text', text: 'boom' }], isError: true },
      }, 6),
    })
    const node = progressToolDefinition.buildViewNode(ctx(settled))
    assert.equal(node.data.status, 'failed')
    assert.equal(node.data.name, 'bash')
    assert.equal(node.data.resultText, 'boom')
  })
  it('no-result call produces running status', () => {
    const call = evt('tool/call', { callId: 'c1', name: 'bash', arguments: '{}' }, 5)
    const node = progressToolDefinition.buildViewNode(ctx(progressToolDefinition.start(ctx(undefined), { event: call })))
    assert.equal(node.data.status, 'running')
  })
  it('fallbackState rebuilds a mid-window context from matches', () => {
    const matches = [
      { event: evt('tool/result', { message: { source: { callId: 'x' }, content: [{ text: 'done' }] } }, 3) },
    ]
    const node = progressToolDefinition.buildViewNode(ctx(undefined, matches))
    assert.ok(node, 'fallback should produce a node from result-only window')
    assert.equal(node.data.status, 'ok')
    assert.equal(node.data.resultText, 'done')
  })
})

describe('prompt definition', () => {
  it('only real user messages become prompt rows', () => {
    assert.ok(progressPromptDefinition.match(evt('user/message', { source: { kind: 'user' }, content: [] })))
    for (const kind of ['inbox', 'system', 'developer']) {
      assert.equal(progressPromptDefinition.match(evt('user/message', { source: { kind }, content: [] })), null, kind)
    }
    assert.equal(progressPromptDefinition.match(evt('user/message', { content: [] })), null)
  })
})

describe('todo definition', () => {
  it('todo/write produces per-status counts', () => {
    const state = progressTodoDefinition.start(ctx(undefined), {
      event: evt('todo/write', { todos: [
        { content: 'a', status: 'completed' }, { content: 'b', status: 'in_progress' }, { content: 'c', status: 'pending' },
      ] }),
    })
    const node = progressTodoDefinition.buildViewNode(ctx(state))
    assert.equal(node.data.items, 3)
    assert.deepEqual(node.data.counts, { pending: 1, inProgress: 1, completed: 1 })
  })
})

describe('job definition', () => {
  it('registered → settled merge by jobId', () => {
    assert.deepEqual(progressJobDefinition.match(evt('job/registered', { jobId: 'j1', kind: 'task', label: 'build' })), { id: 'j1', role: 'start' })
    assert.deepEqual(progressJobDefinition.match(evt('job/settled', { jobId: 'j1', status: 'completed' })), { id: 'j1', role: 'update' })
    const running = progressJobDefinition.start(ctx(undefined), {
      event: evt('job/registered', { jobId: 'j1', kind: 'task', label: 'build' }),
    })
    assert.equal(running.status, 'running')
    const settled = progressJobDefinition.update(ctx(running), {
      event: evt('job/settled', { jobId: 'j1', status: 'failed', cause: 'oops' }),
    })
    assert.equal(settled.status, 'failed')
    const node = progressJobDefinition.buildViewNode(ctx(settled))
    assert.equal(node.data.status, 'failed')
    assert.equal(node.data.cause, 'oops')
  })
  it('settled-only window rebuilds via fallback', () => {
    const matches = [{ event: evt('job/settled', { jobId: 'j9', status: 'completed', label: 'x' }, 4) }]
    const node = progressJobDefinition.buildViewNode(ctx(undefined, matches))
    assert.ok(node, 'settled-only window must still produce a row')
    assert.equal(node.data.jobId, 'j9')
    assert.equal(node.data.status, 'completed')
  })
})

describe('assistant message definition', () => {
  const assistant = (blocks, extra = {}) => evt('assistant/message', {
    turn: 2, step: 1, message: { content: blocks }, ...extra,
  }, 7)
  it('match keys identity by turn:step', () => {
    assert.deepEqual(progressAssistantDefinition.match(assistant([])), { id: '2:1', role: 'start' })
    assert.deepEqual(
      progressAssistantDefinition.match(evt('assistant/message', { message: {} }, 9)),
      { id: 'seq:9', role: 'start' })
  })
  it('reads content[].type text + reasoning', () => {
    const state = progressAssistantDefinition.start(ctx(undefined), {
      event: assistant([
        { type: 'reasoning', text: 'thinking…' },
        { type: 'text', text: 'Done.' },
      ]),
    })
    const node = progressAssistantDefinition.buildViewNode(ctx(state))
    assert.equal(node.data.text, 'Done.')
    assert.equal(node.data.reasoning, true)
    assert.equal(node.data.reasoningText, 'thinking…')
  })
  it('data.interrupted marks the row interrupted', () => {
    const state = progressAssistantDefinition.start(ctx(undefined), {
      event: assistant([{ type: 'text', text: 'partial' }], { interrupted: true }),
    })
    assert.equal(state.interrupted, true)
  })
  it('same-step re-emit: last write wins (edit/retry)', () => {
    const old = progressAssistantDefinition.start(ctx(undefined), {
      event: evt('assistant/message', { turn: 2, step: 1, message: { content: [{ type: 'text', text: 'old' }] } }, 7),
    })
    const next = progressAssistantDefinition.update(ctx(old), {
      event: evt('assistant/message', { turn: 2, step: 1, message: { content: [{ type: 'text', text: 'new' }] } }, 8),
    })
    assert.equal(next.text, 'new')
  })
})

describe('turn definition', () => {
  it('reads reason.kind (host TurnEndReason object)', () => {
    const state = progressTurnDefinition.start(ctx(undefined), {
      event: evt('turn/end', { turn: 1, reason: { kind: 'completed' } }),
    })
    assert.equal(state.reason, 'completed')
  })
  it('reads reason.error for error turns', () => {
    const state = progressTurnDefinition.start(ctx(undefined), {
      event: evt('turn/end', { turn: 1, reason: { kind: 'error', error: 'api timeout' } }),
    })
    assert.equal(state.reason, 'error')
    assert.equal(state.error, 'api timeout')
  })
})

describe('approval definition', () => {
  const asked = seq => evt('approval/asked', { id: 'ap-1', toolName: 'bash', reason: 'sudo' }, seq)
  const decided = (outcome, seq) => evt('approval/decided', { id: 'ap-1', outcome }, seq)
  it('asked/decided pair by data.id', () => {
    assert.deepEqual(progressApprovalDefinition.match(asked(1)), { id: 'ap-1', role: 'start' })
    assert.deepEqual(progressApprovalDefinition.match(decided('allowed-once', 2)), { id: 'ap-1', role: 'update' })
  })
  it('starts pending and settles with the outcome', () => {
    const pending = progressApprovalDefinition.start(ctx(undefined), { event: asked(1) })
    const node1 = progressApprovalDefinition.buildViewNode(ctx(pending))
    assert.equal(node1.data.outcome, undefined)
    const settled = progressApprovalDefinition.update(ctx(pending), { event: decided('allowed-once', 2) })
    const node2 = progressApprovalDefinition.buildViewNode(ctx(settled))
    assert.equal(node2.data.outcome, 'allowed-once')
  })
  it('decided-only window still produces a row via matches fallback', () => {
    const matches = [
      { event: asked(1) },
      { event: decided('rejected', 2) },
    ]
    const node = progressApprovalDefinition.buildViewNode(ctx(undefined, matches))
    assert.ok(node, 'decided-only context must render')
    assert.equal(node.data.outcome, 'rejected')
    assert.equal(node.data.toolName, 'bash')
  })
})

describe('inbox definition', () => {
  it('agent/inbox/spliced produces a start row', () => {
    const m = progressInboxDefinition.match(evt('agent/inbox/spliced', { target: 'next-turn', start: 0, inserted: [{}] }))
    assert.deepEqual(m.role, 'start')
    const node = progressInboxDefinition.buildViewNode(ctx(
      progressInboxDefinition.start(ctx(undefined), { event: evt('agent/inbox/spliced', { target: 'next-turn', start: 0, inserted: [{}] }) }),
    ))
    assert.equal(node.data.row, 'inbox')
    assert.match(node.data.summary, /next-turn/)
  })
})

describe('lifecycle definition', () => {
  it('command/run uses data.name + data.args', () => {
    const state = progressLifecycleDefinition.start(ctx(undefined), {
      event: evt('command/run', { commandId: 'c1', name: 'plan', args: 'on', source: 'user' }),
    })
    assert.equal(state.summary, '/plan on')
  })
  it('approval/* events no longer belong to lifecycle', () => {
    assert.equal(progressLifecycleDefinition.match(evt('approval/asked', { id: 'x' })), null)
    assert.equal(progressLifecycleDefinition.match(evt('approval/decided', { id: 'x', outcome: 'allowed-once' })), null)
  })
})
