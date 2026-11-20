/** DNPR-T11 — registration seam: apply() registers exactly the ledger unit +
 *  read_progress + the anchor; the removed summary unit must not appear. This
 *  is register-and-read-key, not a source string scan. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { apply } from '../src/host/index.js'
import { progressLedger } from '../src/host/ledger.js'

test('apply registers ledger + read_progress + prompt context; summary unit is gone', async () => {
  const registered = []
  const tools = []
  const contexts = []
  const ctx = {
    effect: fn => fn(),
    sessionProjections: {
      register: definition => {
        registered.push(definition.key)
        return Promise.resolve({ definition, stateOf: () => undefined, wire: definition.wire })
      },
      snapshot: () => ({ values: {} }),
    },
    tools: { register: definition => tools.push(definition.name) },
    systemPrompt: { context: def => contexts.push(def) },
    agents: { list: () => [] },
    get: () => undefined,
  }
  await apply(ctx)
  assert.deepEqual(registered, ['nano-progress-report:ledger'])
  assert.deepEqual(tools, ['read_progress'])
  assert.equal(contexts.length, 1)
  assert.equal(contexts[0].name, 'nano-progress-report:progress')
  assert.equal(contexts[0].order, 180)
  assert.equal(contexts[0].required, false)
  // no legacy summary unit anywhere in the registration list
  assert.ok(!registered.includes('nano-progress-report:summary'))
})

test('the registered unit carries the frozen contract (stateVersion 1, wire + summary:false)', () => {
  assert.equal(progressLedger.stateVersion, 1)
  assert.equal(progressLedger.wire.summary, false)
  assert.equal(typeof progressLedger.wire.view, 'function')
  assert.equal(progressLedger.wire.view(progressLedger.init({ cwd: '/x' }, 0)).v, 1)
})
