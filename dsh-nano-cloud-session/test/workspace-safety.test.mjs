import test from 'node:test'
import assert from 'node:assert/strict'
import { createWorkspaceScopes } from '../src/host/workspace-scopes.js'
import { WorkspaceError } from '../src/host/errors.js'
import { createFilesystem } from '../src/remote/filesystem.js'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, lstatSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

const profile = { id: 'p', orgId: 'org-t', baseUrl: 'https://api.devin.ai', secret: 'cog_x' }
const readyFactory = async scope => {
  scope.resources = 'ready'
  return { root: '/tmp', resources: 'ready', api: 'ready' }
}

test('a settled-then-invalidated tracked promise cannot crash the process or deliver', async () => {
  const scopes = createWorkspaceScopes({ configEpochOf: () => 1 })
  const snap = await scopes.connect(profile, { session_id: 'devin-t1' }, readyFactory)
  const scope = scopes.requireReady(snap.scopeId, {})
  let release
  const slow = new Promise(resolve => { release = () => resolve({ data: 1 }) })
  const tracked = scopes.track(scope, slow)
  const outcome = tracked.then(() => 'delivered', error => `rejected:${error.reason}`)
  await scopes.disconnect(snap.scopeId)
  release()
  assert.equal(await outcome, 'rejected:workspace-scope-expired')
  /* the rejection was captured through `tracked`; no floating chain exists */
})

test('an invalidated mutating call reports outcome-unknown, not expired', async () => {
  const scopes = createWorkspaceScopes({ configEpochOf: () => 1 })
  const snap = await scopes.connect(profile, { session_id: 'devin-t2' }, readyFactory)
  const scope = scopes.requireReady(snap.scopeId, {})
  let release
  const slow = new Promise(resolve => { release = () => resolve({ ok: true }) })
  const tracked = scopes.track(scope, slow, { mutating: true })
    .then(() => 'delivered', error => `rejected:${error.reason}`)
  await scopes.disconnect(snap.scopeId)
  release()
  assert.equal(await tracked, 'rejected:workspace-outcome-unknown')
})

test('invalidation drops indexes synchronously: reconnect cannot join the dead scope', async () => {
  const scopes = createWorkspaceScopes({ configEpochOf: () => 1 })
  const first = await scopes.connect(profile, { session_id: 'devin-t3' }, readyFactory)
  await scopes.disconnect(first.scopeId)
  const second = await scopes.connect(profile, { session_id: 'devin-t3' }, readyFactory)
  assert.notEqual(second.scopeId, first.scopeId)
  assert.throws(() => scopes.status(first.scopeId), /not valid|expired/)
})

test('invalidateRemote kills only the matching scope (the call sleep/terminate make)', async () => {
  const scopes = createWorkspaceScopes({ configEpochOf: () => 1 })
  const snap = await scopes.connect(profile, { session_id: 'devin-t4' }, readyFactory)
  assert.doesNotThrow(() => scopes.requireReady(snap.scopeId, {}))
  await scopes.invalidateRemote(profile.id, 'devin-t4')
  assert.throws(() => scopes.requireReady(snap.scopeId, {}), /not valid|expired/)
  /* other remotes on the same profile survive */
  const other = await scopes.connect(profile, { session_id: 'devin-t5' }, readyFactory)
  assert.doesNotThrow(() => scopes.requireReady(other.scopeId, {}))
})

test('an in-flight connect invalidated mid-flight is not delivered or joinable', async () => {
  const scopes = createWorkspaceScopes({ configEpochOf: () => 1 })
  let release
  const gate = new Promise(resolve => { release = resolve })
  const pending = scopes.connect(profile, { session_id: 'devin-t6' }, async scope => {
    scope.resources = 'ready'
    await gate
    return { root: '/tmp', resources: 'ready', api: 'ready' }
  }).then(s => `connected:${s.scopeId}`, e => `failed:${e.reason}`)
  /* invalidate everything before the factory resolves */
  await scopes.invalidateAll()
  release()
  const outcome = await pending
  assert.equal(outcome.startsWith('failed:'), true)
  /* a fresh connect gets a clean attempt rather than the retired scope */
  const next = await scopes.connect(profile, { session_id: 'devin-t6' }, readyFactory)
  assert.ok(next.scopeId)
})

test('rename moves the joined entry and never follows a symlinked source', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-fs-'))
  mkdirSync(join(dir, 'real'), { recursive: true })
  writeFileSync(join(dir, 'real', 'a.txt'), 'A')
  const outside = join(dir, 'outside.txt')
  writeFileSync(outside, 'SECRET')
  symlinkSync(outside, join(dir, 'link.txt'))
  const fs = createFilesystem(dir)
  const result = fs.rename({ from: 'link.txt', to: 'moved.txt' })
  assert.ok(result.destinationVersion)
  /* the symlink itself moved; the outside target was never written or removed */
  assert.equal(lstatSync(join(dir, 'moved.txt')).isSymbolicLink(), true)
  assert.equal(existsSync(outside), true)
})
