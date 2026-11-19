import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import test from 'node:test'
import { terminalAddress, terminalGesture } from '../src/host/terminal-resource.js'

test('T71: retrying host navigation reuses the one created terminal', async () => {
  const intent = { envId: 'dev', sandboxId: randomUUID(), terminalId: randomUUID(), paneId: randomUUID(), openId: randomUUID() }
  const calls = [], visits = []
  let handler = false
  const gesture = terminalGesture(intent, {
    canOpen: () => handler,
    create: args => { calls.push(args); handler = false; return { sandboxId: intent.sandboxId, terminalId: intent.terminalId } },
    navigate(address) { visits.push(address) },
  })
  assert.deepEqual(await gesture.open(), { state: 'handler-unavailable' })
  assert.equal(calls.length, 0)
  handler = true
  const address = `dsh-resource://sandbox-terminal/dev/${intent.sandboxId}/${intent.terminalId}`
  assert.deepEqual(await gesture.open(), { state: 'created-not-connected', address })
  handler = true
  assert.deepEqual(await gesture.open(), { state: 'navigation-requested', address })
  assert.deepEqual(calls, [{ sandboxId: intent.sandboxId, paneId: intent.paneId, openId: intent.openId }])
  assert.deepEqual(visits, [address])
  for (const field of ['sandboxId', 'terminalId', 'envId']) {
    for (const bad of ['', 'a/b', 'x?token=bad', '../x']) assert.throws(() => terminalAddress({ ...intent, [field]: bad }))
  }
})
