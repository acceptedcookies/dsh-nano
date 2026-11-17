import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { loadProfile } from '../src/host/profile-registry.js'
const root = fileURLToPath(new URL('../', import.meta.url))

test('stage verifies the approved source tree, not just equal local pin/build copies', t => {
  const temp = mkdtempSync(join(tmpdir(), 'dnls-provenance-'))
  t.after(() => rmSync(temp, { recursive: true, force: true }))
  const profile = join(root, 'profiles/kitesurf')
  const ref = loadProfile(profile).manifest.build.checkout.ref
  const pin = join(temp, 'pin'), build = join(temp, 'build'), manifest = join(temp, 'manifest.json')
  mkdirSync(pin); mkdirSync(build)
  writeFileSync(join(pin, 'source.ts'), 'official\n'); cpSync(pin, build, { recursive: true })
  const digest = text => createHash('sha256').update(text).digest('hex')
  const approved = { ref, resolvedSha: ref, sourceTreeSha256: digest('source.ts\0' + digest('official\n')) }
  const invoke = () => spawnSync(process.execPath, [join(root, 'scripts/stage-kitesurf-runtime.mjs'), '--pin', pin, '--build', build, '--home', join(temp, 'home'), '--profile', profile, '--manifest', manifest, '--verify-only'], { encoding: 'utf8' })
  writeFileSync(manifest, JSON.stringify({ deps: { kitesurf: { pinned: approved } } }))
  assert.equal(invoke().status, 0)
  // Both copies can agree with each other while being the wrong upstream source.
  writeFileSync(join(pin, 'source.ts'), 'local patch\n'); writeFileSync(join(build, 'source.ts'), 'local patch\n')
  const wrongSource = invoke()
  assert.notEqual(wrongSource.status, 0)
  assert.match(wrongSource.stderr, /approved upstream pin tree/)
  writeFileSync(manifest, JSON.stringify({ deps: { kitesurf: { pinned: { ...approved, ref: 'ab'.repeat(20) } } } }))
  const wrongRef = invoke()
  assert.notEqual(wrongRef.status, 0)
  assert.match(wrongRef.stderr, /approved manifest pin/)
})
