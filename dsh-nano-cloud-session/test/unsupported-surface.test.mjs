import test from 'node:test'
import assert from 'node:assert/strict'
import { WORKSPACE_FAMILY } from '../src/contracts/workspace-family.js'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

test('T14 port-forward operations are not advertised (no fake success)', () => {
  assert.equal(WORKSPACE_FAMILY.operations['forward.open'], undefined)
  assert.equal(WORKSPACE_FAMILY.operations['port.access'], undefined)
  const tools = WORKSPACE_FAMILY.bindings['mcp.resources'].operationIds
  assert.ok(!tools.some(id => id.startsWith('forward') || id.startsWith('port')))
})

test('T22 live workspace e2e is opt-in and is not npm test', () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.scripts.test, 'node --test')
  assert.ok(pkg.scripts.e2e)
  const live = readFileSync(join(root, 'scripts/e2e-devin-workspace.mjs'), 'utf8')
  assert.match(live, /DNCS_LIVE_WORKSPACE/)
  assert.doesNotMatch(pkg.scripts.test, /e2e-devin-workspace/)
})
