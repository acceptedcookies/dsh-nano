import test from 'node:test'
import assert from 'node:assert/strict'
import { SESSION_FAMILY, EXISTING_HTTP_PATHS } from '../src/contracts/session-family.js'
import { WORKSPACE_FAMILY, RESOURCE_OPERATION_IDS, mcpToolsList } from '../src/contracts/workspace-family.js'
import { DEVIN_DEFINITION, assertKnownProvider, operationSurface } from '../src/providers/devin/definition.js'
import { defineFamily } from '../../packages/dsh-interface/src/contracts/FamilyDefinition.js'

test('T01 only Devin is a real provider; unknown provider/op rejected', () => {
  assert.equal(DEVIN_DEFINITION.providerKey, 'devin')
  assert.throws(() => assertKnownProvider('ssh-generic'), /unknown provider/)
  const surface = operationSurface()
  assert.deepEqual(new Set(surface.mcp), new Set(RESOURCE_OPERATION_IDS))
  assert.deepEqual(new Set(mcpToolsList().map(t => t.name)), new Set(RESOURCE_OPERATION_IDS))
  assert.equal(SESSION_FAMILY.providers.devin.plugin, 'dsh-nano-cloud-session')
  assert.equal(Object.keys(SESSION_FAMILY.providers).join(), 'devin')
  assert.equal(Object.keys(WORKSPACE_FAMILY.providers).join(), 'devin')
})

test('T01 unapproved authority cannot define a family', () => {
  assert.throws(() => defineFamily({
    contractId: 'x',
    authorityRefs: { review: 'REVIEW' },
    operations: { a: { input: {}, output: {} } },
    bindings: { b: { operationIds: ['a'], transport: 'http' } },
    providers: { p: { plugin: 'p', supports: [{ bindingId: 'b' }] } },
  }), /unapproved-authority/)
})

test('T02 original 12 HTTP paths remain bindings', () => {
  assert.equal(EXISTING_HTTP_PATHS.length, 12)
  assert.ok(EXISTING_HTTP_PATHS.includes('/nano-cloud-session/status'))
  assert.ok(EXISTING_HTTP_PATHS.includes('/nano-cloud-session/ssh'))
  assert.equal(WORKSPACE_FAMILY.bindings['http.workspace'].path, '/nano-cloud-session/workspace')
  assert.equal(WORKSPACE_FAMILY.bindings['http.resources'].path, '/nano-cloud-session/resources')
})
