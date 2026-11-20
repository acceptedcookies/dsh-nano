/** DNPR-T18 — run AFTER `npm run build` (kept out of `npm test`'s glob on
 *  purpose; invoked explicitly as `node --test test/built-host.mjs`). Asserts
 *  the shipped host bundle registers the ledger + tool and reads the anchor. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const lib = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'host.js')

test('built lib/host.js exposes apply() with the ledger + read_progress seam', async () => {
  assert.equal(existsSync(lib), true, 'run `npm run build` first')
  const mod = await import(lib)
  const registered = []
  const tools = []
  const ctx = {
    effect: fn => fn(),
    sessionProjections: {
      register: def => { registered.push(def.key); return Promise.resolve({ stateOf: () => undefined }) },
      snapshot: () => ({ values: {} }),
    },
    tools: { register: def => tools.push(def.name) },
    systemPrompt: { context: () => {} },
    agents: { list: () => [] },
    get: () => undefined,
  }
  await mod.apply(ctx)
  assert.deepEqual(registered, ['nano-progress-report:ledger'])
  assert.deepEqual(tools, ['read_progress'])
})
