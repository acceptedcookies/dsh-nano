import assert from 'node:assert/strict'
import test from 'node:test'
import { SANDBOX_TOOL_NAMES, answerNativeTool, toolsList } from '../src/host/mcp-sandbox.js'

const FROZEN = [
  'sandbox.profile.list', 'sandbox.profile.describe', 'sandbox.instance.ensure',
  'sandbox.instance.start', 'sandbox.instance.stop', 'sandbox.instance.restart',
  'sandbox.instance.status', 'sandbox.diagnostics', 'sandbox.console', 'sandbox.operations',
  'sandbox.error_catalog', 'sandbox.targets', 'sandbox.history', 'sandbox.dom',
  'sandbox.elements', 'sandbox.selftest', 'sandbox.network', 'sandbox.ports',
  'sandbox.recovery_plan', 'sandbox.bridge_health',
]

test('tools/list sandbox set is exactly the frozen twenty and does not wait for a host push', () => {
  const listed = new Set(toolsList().map((tool) => tool.name))
  const frozen = new Set(FROZEN)
  assert.deepEqual([...listed].filter((name) => !frozen.has(name)), [])
  assert.deepEqual([...frozen].filter((name) => !listed.has(name)), [])
  assert.equal(listed.size, 20)
  assert.deepEqual(SANDBOX_TOOL_NAMES.filter((name) => name.startsWith('kitesurf' + '_')), [])
  const state = { diagnostics: { phase: 'idle' }, pushes: 0 }
  const answer = answerNativeTool('sandbox.diagnostics', state)
  assert.equal(answer.ok, true)
  assert.equal(state.pushes, 0)
})
