import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { createMcpClient } from '../src/providers/devin/mcp-client.js'
import { CONSTRAINTS } from '../src/contracts/workspace-family.js'

class FakeChild extends EventEmitter {
  constructor() {
    super()
    this.stdin = new PassThrough()
    this.stdout = new PassThrough()
    this.stderr = new PassThrough()
    this.exitCode = null
    this.killed = false
    this.signals = []
  }
  kill(sig) { this.killed = true; this.signals.push(sig); return true }
  respond(obj) { this.stdout.write(`${JSON.stringify(obj)}\n`) }
  die() { this.exitCode = 1; this.emit('exit', 1); this.emit('close', 1) }
}

const reasonOf = async promise => {
  try { await promise; return null } catch (e) { return e.reason ?? e.message }
}

test('transport exit settles reads as unavailable and sent mutations as outcome-unknown', async () => {
  const child = new FakeChild()
  const client = createMcpClient(child)
  const read = client.call('fs.read', { path: 'a' })
  const write = client.call('fs.write', { path: 'a', bytes: 'x' })
  child.die()
  assert.equal(await reasonOf(read), 'workspace-unavailable')
  assert.equal(await reasonOf(write), 'workspace-outcome-unknown')
  // nothing is replayed after the transport died
  assert.equal(await reasonOf(client.call('fs.read', { path: 'a' })), 'workspace-unavailable')
})

test('read timeout is unavailable; mutating timeout is outcome-unknown', async () => {
  const child = new FakeChild()
  const client = createMcpClient(child, { timeoutMs: 20 })
  assert.equal(await reasonOf(client.call('fs.read', { path: 'a' })), 'workspace-unavailable')
  assert.equal(await reasonOf(client.call('fs.write', { path: 'a', bytes: 'x' })), 'workspace-outcome-unknown')
  child.die()
})

test('in-flight cap is enforced beyond CONSTRAINTS.maxInFlight', async () => {
  const child = new FakeChild()
  const client = createMcpClient(child)
  const calls = []
  for (let i = 0; i < CONSTRAINTS.maxInFlight; i++) calls.push(client.call('fs.read', { path: `${i}` }))
  assert.equal(await reasonOf(client.call('fs.read', { path: 'overflow' })), 'workspace-limit')
  child.die()
  await Promise.allSettled(calls)
})

test('oversized inbound frame settles all pending calls as unavailable', async () => {
  const child = new FakeChild()
  const client = createMcpClient(child)
  const read = client.call('fs.read', { path: 'a' })
  const write = client.call('fs.write', { path: 'a', bytes: 'x' })
  child.stdout.write('x'.repeat(CONSTRAINTS.maxFrameBytes + 16))
  assert.equal(await reasonOf(read), 'workspace-unavailable')
  assert.equal(await reasonOf(write), 'workspace-unavailable')
  assert.ok(child.signals.includes('SIGKILL'))
})

test('stdin write failure settles pending calls', async () => {
  const child = new FakeChild()
  const client = createMcpClient(child)
  const read = client.call('fs.read', { path: 'a' })
  child.stdin.destroy(new Error('broken pipe'))
  assert.equal(await reasonOf(read), 'workspace-unavailable')
})

test('close resolves only after the child actually exits and stays idempotent', async () => {
  const child = new FakeChild()
  const client = createMcpClient(child)
  const pending = client.call('fs.read', { path: 'a' })
  const pendingReason = reasonOf(pending)
  const closing = client.close()
  let resolved = false
  void closing.then(() => { resolved = true })
  await new Promise(r => setTimeout(r, 30))
  assert.equal(resolved, false) // child still alive
  child.die()
  await closing
  assert.equal(resolved, true)
  assert.equal(await pendingReason, 'workspace-unavailable')
  await client.close() // second close resolves the same promise
})
