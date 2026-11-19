/**
 * Definition-seam tests: feed real host event envelopes through
 * match()/start()/update()/buildViewNode() and assert the produced view nodes.
 * This is the layer that catches a field-name drift (e.g. host emits
 * `message.source.callId`, `reason.kind`, `content[].type`) that
 * row/builder tests cannot see — they feed pre-made view nodes.
 */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { progressToolDefinition, RESULT_MAX } from '../src/client/events/tool.js'
import { progressAgentMessageDefinition, progressAssistantDefinition, progressPromptDefinition } from '../src/client/events/message.js'
import {
  progressApprovalDefinition, progressGoalChangeDefinition,
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
  it('result text is capped for display but keeps the full length', () => {
    const call = evt('tool/call', { callId: 'c1', name: 'bash', arguments: '{}', turn: 2, step: 3 }, 5)
    const state = progressToolDefinition.start(ctx(undefined), { event: call })
    const big = 'x'.repeat(RESULT_MAX + 50)
    const settled = progressToolDefinition.update(ctx(state), {
      event: evt('tool/result', { message: { source: { callId: 'c1' }, content: [{ type: 'text', text: big }] } }, 6),
    })
    const node = progressToolDefinition.buildViewNode(ctx(settled))
    assert.equal(node.data.resultText.length, RESULT_MAX)
    assert.equal(node.data.resultLength, RESULT_MAX + 50)
    assert.equal(node.data.step, 3)
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
  it('a goal continuation becomes a goal row carrying goalId and round', () => {
    const e = evt('user/message', { source: { kind: 'goal', goalId: 'g1', revision: 2, round: 3 }, content: [{ type: 'text', text: 'continue' }] })
    assert.ok(progressPromptDefinition.match(e))
    const node = progressPromptDefinition.buildViewNode(ctx(progressPromptDefinition.start(ctx(undefined), { event: e })))
    assert.equal(node.data.row, 'goal')
    assert.equal(node.data.goalId, 'g1')
    assert.equal(node.data.round, 3)
  })
})

describe('team-message delivery', () => {
  it('agent-team mailbox messages become team rows with the sender name', () => {
    const e = evt('user/message', {
      source: { kind: 'team-message', teamId: 't', messageId: 'm', senderId: 'session-a', senderName: 'lead' },
      content: [{ type: 'text', text: 'take task 2' }],
    })
    assert.ok(progressAgentMessageDefinition.match(e))
    const node = progressAgentMessageDefinition.buildViewNode(ctx(progressAgentMessageDefinition.start(ctx(undefined), { event: e })))
    assert.equal(node.data.row, 'team')
    assert.equal(node.data.senderName, 'lead')
    assert.equal(node.data.sender, 'session-a')
  })
})

describe('agent message definition', () => {
  const relay = evt('user/message', {
    content: [{ type: 'text', text: 'Agent lead sent a message: ' }, { type: 'text', text: 'fix the login page' }],
    source: { kind: 'agent-message', form: 'relay', senderSessionId: 'lead-1' },
  }, 11)
  const settled = (source, content = [{ type: 'text', text: 'Background subagent w2 failed before it finished.' }]) => evt('user/message', {
    content, source: { kind: 'subagent-settled', form: 'notice', senderSessionId: 'w2', ...source },
  }, 12)
  it('matches relay and settled notices, not prompts or host context', () => {
    assert.deepEqual(progressAgentMessageDefinition.match(relay), { id: '11', role: 'start' })
    assert.ok(progressAgentMessageDefinition.match(settled({ summary: 's' })))
    for (const kind of ['user', 'goal', 'runtime-context', 'working-directory']) {
      assert.equal(progressAgentMessageDefinition.match(evt('user/message', { source: { kind }, content: [] })), null, kind)
    }
    assert.equal(progressPromptDefinition.match(relay), null, 'a relay is not a human prompt')
  })
  it('relay keeps the framed text and sender', () => {
    const node = progressAgentMessageDefinition.buildViewNode(ctx(progressAgentMessageDefinition.start(ctx(undefined), { event: relay })))
    assert.equal(node.data.row, 'relay')
    assert.equal(node.data.sender, 'lead-1')
    assert.match(node.data.text, /^Agent lead sent a message: \nfix the login page$/)
  })
  it('settled notice carries summary and stopReason (absent before rc.5)', () => {
    const rc5 = progressAgentMessageDefinition.buildViewNode(ctx(progressAgentMessageDefinition.start(ctx(undefined), {
      event: settled({ summary: 'Background subagent w2 failed before it finished.', stopReason: 'error' }),
    })))
    assert.equal(rc5.data.row, 'settled')
    assert.equal(rc5.data.stopReason, 'error')
    assert.match(rc5.data.summary, /failed/)
    const rc1 = progressAgentMessageDefinition.buildViewNode(ctx(progressAgentMessageDefinition.start(ctx(undefined), {
      event: settled({ summary: 'Background subagent w2 finished.' }),
    })))
    assert.equal(rc1.data.stopReason, undefined)
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

describe('goal change definition', () => {
  it('goal/change snapshot carries operation, phase and round budget', () => {
    const e = evt('goal/change', {
      kind: 'goal/change', version: 1, operation: 'block',
      goal: { id: 'g1', revision: 3, objective: 'ship it', phase: 'blocked', blockedReason: { code: 'x', message: 'needs a key' }, maxGoalRounds: 10 },
      roundsStarted: 4, createdAt: 1, updatedAt: 2,
    })
    const node = progressGoalChangeDefinition.buildViewNode(ctx(progressGoalChangeDefinition.start(ctx(undefined), { event: e })))
    assert.equal(node.data.row, 'goal-change')
    assert.equal(node.data.operation, 'block')
    assert.equal(node.data.blocked, 'needs a key')
    assert.equal(node.data.roundsStarted, 4)
    assert.equal(node.data.maxGoalRounds, 10)
  })
  it('the clear tombstone keeps the cleared goal id', () => {
    const e = evt('goal/change', { kind: 'goal/change', version: 1, operation: 'clear', cleared: { id: 'g1', revision: 4 }, clearedAt: 3 })
    const state = progressGoalChangeDefinition.start(ctx(undefined), { event: e })
    assert.equal(state.goalId, 'g1')
    assert.equal(state.operation, 'clear')
  })
  it('agent/inbox/spliced is no longer a progress row', () => {
    assert.equal(progressGoalChangeDefinition.match(evt('agent/inbox/spliced', { target: 'next-turn' })), null)
    assert.equal(progressLifecycleDefinition.match(evt('agent/inbox/spliced', { target: 'next-turn' })), null)
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
