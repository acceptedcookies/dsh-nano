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

test('tools/list sandbox set is exactly the frozen twenty and does not wait for a host push', async () => {
  const listed = new Set(toolsList().map((tool) => tool.name))
  const frozen = new Set(FROZEN)
  assert.deepEqual([...listed].filter((name) => !frozen.has(name)), [])
  assert.deepEqual([...frozen].filter((name) => !listed.has(name)), [])
  assert.equal(listed.size, 20)
  assert.deepEqual(SANDBOX_TOOL_NAMES.filter((name) => name.startsWith('kitesurf' + '_')), [])
  // P3-03: a real owner read, not the retired uniform digest.
  const owners = { state: { diagnostics: { phase: 'idle' } } }
  const answer = await answerNativeTool('sandbox.diagnostics', owners, {})
  assert.equal(answer.ok, true)
  assert.deepEqual(answer.data, { phase: 'idle' })
})

test('every tool advertises a non-empty additionalProperties:false inputSchema (no {properties:{}} stub)', () => {
  const byName = new Map(toolsList().map((t) => [t.name, t.inputSchema]))
  for (const name of SANDBOX_TOOL_NAMES) {
    const schema = byName.get(name)
    assert.equal(schema.type, 'object', `${name} schema type`)
    assert.equal(schema.additionalProperties, false, `${name} must reject extra fields`)
    assert.ok(schema.properties, `${name} has a properties object`)
  }
})

test('dispatch validates params: extra field and missing required are rejected, never pass-through', async () => {
  // extra field on a zero-arg tool is a param error, not silently accepted.
  const extra = await answerNativeTool('sandbox.diagnostics', {}, {}, { bogus: 1 })
  assert.equal(extra.ok, false)
  assert.equal(extra.errorId, 'sandbox.params.extra')
  // missing required (profile.describe needs id).
  const missing = await answerNativeTool('sandbox.profile.describe', { profiles: { describe: () => null } }, {}, {})
  assert.equal(missing.ok, false)
  assert.equal(missing.errorId, 'sandbox.params.required')
})

test('dispatch calls the REAL injected owner and returns {ok:true,data}; unknown tool is an error', async () => {
  let ensureCalls = 0
  const owners = {
    instances: { ensure: async () => { ensureCalls++; return { action: 'created', phase: 'running' } } },
  }
  const a = await answerNativeTool('sandbox.instance.ensure', owners, {}, { sessionId: 's1' })
  assert.equal(a.ok, true)
  assert.deepEqual(a.data, { action: 'created', phase: 'running' })
  assert.equal(ensureCalls, 1, 'business owner was actually invoked')
  const bad = await answerNativeTool('sandbox.not.a.tool', owners, {}, {})
  assert.equal(bad.ok, false)
  assert.equal(bad.errorId, 'kitesurf.tool.unknown')
})
