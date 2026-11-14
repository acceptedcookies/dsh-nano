import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { createInstanceRegistry } from '../src/host/instance-registry.js'
import { foreignHistoryFiles, historyFile } from '../src/host/state-service.js'
import { profileFixture } from './support/profile-fixture.mjs'

test('history rows on the instance volume match writes and there is no second file', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dnls-hist-'))
  const registry = createInstanceRegistry({
    backend: { async create() {}, async stop() {} },
    profile: profileFixture(),
    volumeFor: (id) => join(root, id),
  })
  const created = await registry.ensure({
    sessionId: 's1',
    policy: { mode: 'read-only', workspaceRoot: '/work/a', extraRoots: [] },
  })
  registry.recordHistory(created.instance.instanceId, { url: 'https://example.com/a' })
  registry.recordHistory(created.instance.instanceId, { url: 'https://example.com/b' })
  const onDisk = JSON.parse(readFileSync(historyFile(created.instance.stateVolume), 'utf8'))
  assert.equal(onDisk.length, 2)
  assert.deepEqual(foreignHistoryFiles(created.instance.stateVolume), [])
  assert.equal(onDisk.some((row) => row.source === 'workerd-kv'), false)
})
