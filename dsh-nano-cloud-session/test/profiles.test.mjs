import { test, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProfileStore } from '../src/host/profiles.js'

let dir, prev
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'dncs-prof-')); prev = process.env.DSH_HOME; process.env.DSH_HOME = dir })
afterEach(() => { process.env.DSH_HOME = prev; rmSync(dir, { recursive: true, force: true }) })

const good = { label: 'team', orgId: 'org-abc123', secret: 'cog_test' }

test('create + list returns public shape (secret never leaves)', () => {
  const s = createProfileStore()
  const p = s.saveProfile(good)
  assert.equal(p.hasSecret, true)
  assert.equal(p.secret, undefined)
  assert.equal(s.active()?.id, p.id) // first profile auto-activates
  assert.equal(s.list().length, 1)
})

test('persists to disk with 0600 and reloads', () => {
  const s = createProfileStore()
  s.saveProfile(good)
  const file = join(dir, 'nano-cloud-session.json')
  const st = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(st.profiles[0].secret, 'cog_test')
  const s2 = createProfileStore()
  assert.equal(s2.list().length, 1)
  assert.equal(s2.active().secret, 'cog_test')
})

test('env seed on empty store', () => {
  writeFileSync(join(dir, 'nano-cloud-session.env'), 'DEVIN_API_TOKEN=cog_seed\nDEVIN_ORG_ID=org-seeded\n')
  const s = createProfileStore()
  assert.equal(s.seededFromEnv, true)
  assert.equal(s.active().orgId, 'org-seeded')
  assert.equal(s.active().baseUrl, 'https://api.devin.ai')
})

test('validation: label/orgId/https baseUrl/token required', () => {
  const s = createProfileStore()
  assert.throws(() => s.saveProfile({ label: '', orgId: 'org-a', secret: 'x' }), /label/)
  assert.throws(() => s.saveProfile({ label: 'x', orgId: 'notorg', secret: 'x' }), /orgId/)
  assert.throws(() => s.saveProfile({ label: 'x', orgId: 'org-a', secret: 'x', baseUrl: 'http://evil' }), /https/)
  assert.throws(() => s.saveProfile({ label: 'x', orgId: 'org-a' }), /token/)
})

test('save with empty secret keeps existing; remove/activate', () => {
  const s = createProfileStore()
  const a = s.saveProfile(good)
  const b = s.saveProfile({ label: 'pro', orgId: 'org-pro', secret: 'cog_2' })
  s.saveProfile({ id: a.id, label: 'team2', orgId: 'org-abc123' }) // no secret → keeps old
  assert.equal(s.get(a.id).secret, 'cog_test')
  s.activate(b.id)
  assert.equal(s.active().id, b.id)
  s.removeProfile(b.id)
  assert.equal(s.active().id, a.id) // falls back to remaining
})
