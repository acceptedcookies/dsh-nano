import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import {
  parsePolicy, readPolicy, resetPolicy, routeOfAgent, sameRoute, selectionOf, shouldApplyDefault, writePolicy,
} from '../lib/subagent-default.js'

const parent = { provider: 'deepseek', model: 'deepseek-v4', reasoningEffort: 'high' }
const enabled = { enabled: true, provider: 'other', model: 'fast', reasoningEffort: 'low' }

test('an inherited child takes the saved combination', () => {
  assert.equal(shouldApplyDefault(enabled, parent, parent), true)
  assert.deepEqual(selectionOf(enabled), { provider: 'other', model: 'fast', reasoningEffort: 'low' })
})

test('an explicit route, a disabled policy, or a missing parent does not override', () => {
  assert.equal(shouldApplyDefault(enabled, { ...parent, model: 'named' }, parent), false)
  assert.equal(shouldApplyDefault(enabled, { ...parent, reasoningEffort: 'max' }, parent), false)
  assert.equal(shouldApplyDefault({ ...enabled, enabled: false }, parent, parent), false)
  assert.equal(shouldApplyDefault(enabled, parent, undefined), false)
  assert.equal(sameRoute(parent, { ...parent }), true)
})

test('routeOfAgent prefers the latest request header over creation options', () => {
  const agent = {
    options: { provider: 'created', model: 'created', reasoningEffort: 'low' },
    session: { requestHeader: () => ({ config: { provider: 'live', model: 'live', reasoningEffort: 'max' } }) },
  }
  assert.deepEqual(routeOfAgent(agent), { provider: 'live', model: 'live', reasoningEffort: 'max' })
  assert.equal(routeOfAgent(undefined), undefined)
})

test('enable, disable, and reset round-trip one schema-1 file', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dnms-subagent-'))
  const path = join(dir, 'subagent-default.json')
  try {
    assert.deepEqual(readPolicy(path), { ok: true, policy: null })
    assert.equal(writePolicy(path, enabled).ok, true)
    const stored = JSON.parse(readFileSync(path, 'utf8'))
    assert.equal(stored.schema, 1)
    assert.equal(stored.enabled, true)
    assert.equal(writePolicy(path, { enabled: false, provider: 'other', model: 'fast', reasoningEffort: 'low' }).ok, true)
    assert.equal(readPolicy(path).policy.enabled, false)
    assert.equal(readPolicy(path).policy.model, 'fast')
    assert.equal(resetPolicy(path).ok, true)
    assert.deepEqual(readPolicy(path), { ok: true, policy: null })
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('a corrupt file is not overwritten, and reset still removes it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dnms-subagent-'))
  const path = join(dir, 'subagent-default.json')
  try {
    writeFileSync(path, '{', { mode: 0o600 })
    assert.equal(readPolicy(path).ok, false)
    assert.equal(writePolicy(path, enabled).ok, false)
    assert.equal(readFileSync(path, 'utf8'), '{')
    assert.equal(resetPolicy(path).ok, true)
    assert.equal(parsePolicy({ schema: 2, enabled: false }).ok, false)
    assert.equal(parsePolicy({ schema: 1, enabled: true }).ok, false)
    assert.equal(parsePolicy({ schema: 1, enabled: false, provider: 'only' }).ok, false)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
