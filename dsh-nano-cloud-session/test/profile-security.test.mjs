import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProfileStore } from '../src/host/profiles.js'
import { encodeCreateSession } from '../src/providers/devin/profile-codec.js'

let dir, prev
test('T15 changing origin without a new secret is rejected', () => {
  dir = mkdtempSync(join(tmpdir(), 'dncs-sec-'))
  prev = process.env.DSH_HOME
  process.env.DSH_HOME = dir
  try {
    const s = createProfileStore()
    const p = s.saveProfile({ label: 't', orgId: 'org-t', secret: 'cog_xtok45678', baseUrl: 'https://api.devin.ai' })
    assert.throws(() => s.saveProfile({
      id: p.id, label: 't', orgId: 'org-t', baseUrl: 'https://evil.example',
    }), /rebinding/)
    const epoch = s.configEpoch()
    s.saveProfile({ id: p.id, label: 't2', orgId: 'org-t', secret: 'cog_newtok999' })
    assert.ok(s.configEpoch() > epoch)
    const snap = s.get(p.id)
    assert.equal(snap.label, 't2')
    assert.notEqual(snap, p)
  } finally {
    process.env.DSH_HOME = prev
    rmSync(dir, { recursive: true, force: true })
  }
})

test('T20 create codec keeps explicit false/0 and drops only undefined', () => {
  const body = encodeCreateSession({
    prompt: 'hi',
    resumable: false,
    max_acu_limit: 0,
    title: '',
    tags: [],
  })
  assert.equal(body.resumable, false)
  assert.equal(body.max_acu_limit, 0)
  assert.equal(body.title, '')
  assert.deepEqual(body.tags, [])
  assert.equal('playbook_id' in body, false)
})
