import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('T21 host/client/remote artifacts exist; remote has no secret importer', () => {
  for (const rel of ['lib/host.js', 'lib/client.js', 'lib/remote/devin-workspace.mjs']) {
    assert.ok(existsSync(join(root, rel)), rel)
  }
  const remote = readFileSync(join(root, 'lib/remote/devin-workspace.mjs'), 'utf8')
  assert.doesNotMatch(remote, /nano-cloud-session\.json/)
  assert.doesNotMatch(remote, /createDevinApi/)
  assert.doesNotMatch(remote, /cog_/)
  assert.doesNotMatch(remote, /Bearer /)
})
