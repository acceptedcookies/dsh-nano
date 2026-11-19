import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { rowCounts, rowFromNode, sortRows, toolStatus } from '../src/client/rows.js'

const node = (data, over = {}) => ({
  key: 'ctx-1', kind: 'progress-tool-call', id: 'c1', target: 'progress',
  data: { seq: 1, time: 1000, ...data }, ...over,
})

describe('rowFromNode', () => {
  it('maps bash call to shell row', () => {
    const r = rowFromNode(node({
      row: 'tool', callId: 'c1', name: 'bash',
      argsRaw: '{"command":"cd /tmp && ls"}', status: 'ok',
    }))
    assert.equal(r.type, 'shell')
    assert.equal(r.status, 'ok')
    assert.equal(r.tool, 'bash')
    assert.match(r.summary, /cd \/tmp && ls/)
  })
  it('maps read call to file row', () => {
    const r = rowFromNode(node({ row: 'tool', name: 'read', argsRaw: '{"file_path":"/a"}', status: 'ok' }))
    assert.equal(r.type, 'file')
    assert.match(r.summary, /\/a/)
  })
  it('maps web_fetch to web row', () => {
    const r = rowFromNode(node({ row: 'tool', name: 'web_fetch', argsRaw: '{"url":"https://x"}', status: 'ok' }))
    assert.equal(r.type, 'web')
  })
  it('maps subagent to subagent row', () => {
    const r = rowFromNode(node({ row: 'tool', name: 'subagent', argsRaw: '{"description":"dig"}', status: 'running' }))
    assert.equal(r.type, 'subagent')
  })
  it('maps todo_write to todo row with counts', () => {
    const r = rowFromNode(node({
      row: 'tool', name: 'todo_write', status: 'ok',
      argsRaw: JSON.stringify({ todos: [{ content: 'a', status: 'completed' }, { content: 'b', status: 'pending' }] }),
    }))
    assert.equal(r.type, 'todo')
    assert.match(r.summary, /1\/2 done/)
  })
  it('failed tool result → failed status', () => {
    const r = rowFromNode(node({ row: 'tool', name: 'bash', status: 'failed', error: 'exit 1' }))
    assert.equal(r.status, 'failed')
  })
  it('running tool call → running status', () => {
    const r = rowFromNode(node({ row: 'tool', name: 'bash', status: 'running' }))
    assert.equal(r.status, 'running')
  })
  it('wait_agent/send_message without result → awaiting (spec §3.4)', () => {
    assert.equal(rowFromNode(node({ row: 'tool', name: 'wait_agent', argsRaw: '{}', status: 'running' })).status, 'awaiting')
    assert.equal(rowFromNode(node({ row: 'tool', name: 'send_message', argsRaw: '{}', status: 'running' })).status, 'awaiting')
    // Once the result lands the row settles like any other tool.
    assert.equal(rowFromNode(node({ row: 'tool', name: 'wait_agent', argsRaw: '{}', status: 'ok' })).status, 'ok')
  })
  it('working_directory → file row type', () => {
    const r = rowFromNode(node({ row: 'tool', name: 'working_directory', argsRaw: '{"cd":"src"}', status: 'ok' }))
    assert.equal(r.type, 'file')
  })
  it('approval pending → awaiting wait row; decided → ok/failed', () => {
    const pending = rowFromNode(node({ row: 'approval', toolName: 'bash', reason: 'sudo' }))
    assert.equal(pending.type, 'wait')
    assert.equal(pending.status, 'awaiting')
    assert.match(pending.summary, /Approval requested.*bash/)
    const ok = rowFromNode(node({ row: 'approval', toolName: 'bash', outcome: 'allowed-once' }))
    assert.equal(ok.status, 'ok')
    assert.match(ok.summary, /allowed-once/)
    const denied = rowFromNode(node({ row: 'approval', toolName: 'bash', outcome: 'rejected' }))
    assert.equal(denied.status, 'failed')
  })
  it('inbox spliced → wait ok row', () => {
    const r = rowFromNode(node({ row: 'inbox', summary: 'Inbox next-turn: +1 message(s)' }))
    assert.equal(r.type, 'wait')
    assert.equal(r.status, 'ok')
  })
  it('relay row → subagent ok row with the framed text', () => {
    const r = rowFromNode(node({ row: 'relay', text: 'Agent lead sent a message: \nfix the login page' }))
    assert.equal(r.type, 'subagent')
    assert.equal(r.status, 'ok')
    assert.equal(r.summary, 'Agent lead sent a message: fix the login page')
    assert.equal(r.tool, '')
  })
  it('settled row → subagent row; failed only on a recorded non-completed stopReason', () => {
    const ok = rowFromNode(node({ row: 'settled', summary: 'Background subagent w2 finished.', stopReason: 'completed', text: 'closing' }))
    assert.equal(ok.type, 'subagent')
    assert.equal(ok.status, 'ok')
    assert.equal(ok.summary, 'Background subagent w2 finished.')
    assert.equal(ok.expandable, true)
    assert.equal(rowFromNode(node({ row: 'settled', summary: 's', stopReason: 'error' })).status, 'failed')
    assert.equal(rowFromNode(node({ row: 'settled', summary: 's', stopReason: 'aborted' })).status, 'failed')
    assert.equal(rowFromNode(node({ row: 'settled', summary: 's' })).status, 'ok', 'pre-rc.5 notice has no stopReason')
  })
  it('prompt row', () => {
    const r = rowFromNode(node({ row: 'prompt', text: 'build the thing' }))
    assert.equal(r.type, 'prompt')
    assert.match(r.summary, /build the thing/)
  })
  it('interrupted assistant → failed', () => {
    const r = rowFromNode(node({ row: 'message', text: 'partial', interrupted: true }))
    assert.equal(r.status, 'failed')
  })
  it('turn end with non-completed reason → failed', () => {
    const r = rowFromNode(node({ row: 'turn', turn: 3, reason: 'aborted' }))
    assert.equal(r.type, 'turn')
    assert.equal(r.status, 'failed')
    assert.match(r.summary, /aborted/)
  })
  it('turn end whitelist: blocked → awaiting, forked → ok', () => {
    assert.equal(rowFromNode(node({ row: 'turn', turn: 1, reason: 'blocked' })).status, 'awaiting')
    assert.equal(rowFromNode(node({ row: 'turn', turn: 1, reason: 'forked' })).status, 'ok')
    for (const reason of ['error', 'aborted', 'max-tokens', 'interrupted']) {
      assert.equal(rowFromNode(node({ row: 'turn', turn: 1, reason })).status, 'failed', reason)
    }
  })
  it('job settled failed → failed job row', () => {
    const r = rowFromNode(node({ row: 'job', jobId: 'j1', label: 'build', status: 'failed' }))
    assert.equal(r.status, 'failed')
    assert.match(r.summary, /build/)
  })
  it('nested children survive on tool detail', () => {
    const r = rowFromNode(node({
      row: 'tool', name: 'subagent', argsRaw: '{}', status: 'ok',
      subCalls: [{ name: 'bash', isError: true, error: { reason: 'x' }, arguments: {} }],
    }))
    assert.equal(r.detail.children.length, 1)
    assert.equal(r.detail.children[0].status, 'failed')
  })
})

describe('sortRows + rowCounts', () => {
  it('orders by seq then time', () => {
    const rows = sortRows([
      { key: 'b', seq: 5, time: 0 }, { key: 'a', seq: 2, time: 0 }, { key: 'c', seq: 5, time: 3 },
    ])
    assert.deepEqual(rows.map(r => r.key), ['a', 'b', 'c'])
  })
  it('counts by status and type', () => {
    const counts = rowCounts([
      { type: 'shell', status: 'ok' }, { type: 'shell', status: 'failed' }, { type: 'web', status: 'running' },
    ])
    assert.equal(counts.total, 3)
    assert.equal(counts.failed, 1)
    assert.equal(counts.running, 1)
    assert.equal(counts.byType.shell, 2)
  })
})

describe('toolStatus', () => {
  it('null → running', () => assert.equal(toolStatus(null), 'running'))
  it('isError → failed', () => assert.equal(toolStatus({ isError: true }), 'failed'))
  it('error field → failed', () => assert.equal(toolStatus({ error: {} }), 'failed'))
  it('clean → ok', () => assert.equal(toolStatus({}), 'ok'))
})
