import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveNativeChat } from '../src/host-adapters/native-chat.js'
import { resolveExecutionBinding } from '../src/host-adapters/execution.js'

test('T17 0.2.2-rc.1 has no H-CHAT; agents.enter is not sufficient', () => {
  const none = resolveNativeChat({ agents: { enter() {} }, sessions: { create() {} } })
  assert.equal(none.available, false)
  assert.equal(none.reason, 'NATIVE_UNAVAILABLE')
  const ok = resolveNativeChat({
    get: (name) => name === 'externalChat' ? { open: async () => ({ localId: 'x' }), capabilities: { externalProjection: true } } : null,
  })
  assert.equal(ok.available, true)
})

test('A03 H-EXEC missing on this host version', () => {
  const miss = resolveExecutionBinding({ fs: {}, subprocess: {} }, 's1')
  assert.equal(miss.available, false)
})
