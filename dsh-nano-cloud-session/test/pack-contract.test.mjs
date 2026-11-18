import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('T21 host/client/remote artifacts exist; remote has no secret importer', async () => {
  for (const rel of ['lib/host.js', 'lib/client.js', 'lib/remote/devin-workspace.mjs']) {
    assert.ok(existsSync(join(root, rel)), rel)
  }
  const { artifactPath } = await import('../src/providers/devin/bootstrap.js')
  assert.ok(existsSync(artifactPath()), artifactPath())
  const host = readFileSync(join(root, 'lib/host.js'), 'utf8')
  assert.match(host, /remote\/devin-workspace\.mjs/)
  const remote = readFileSync(join(root, 'lib/remote/devin-workspace.mjs'), 'utf8')
  assert.doesNotMatch(remote, /nano-cloud-session\.json/)
  assert.doesNotMatch(remote, /createDevinApi/)
  assert.doesNotMatch(remote, /cog_/)
  assert.doesNotMatch(remote, /Bearer /)
})

test('T21 npm pack unpacks and host/remote load without starting the bridge', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'dncs-pack-'))
  try {
    const packedName = execFileSync('npm', ['pack', '--pack-destination', dir], { cwd: root, encoding: 'utf8' }).trim()
    execFileSync('tar', ['-xzf', join(dir, packedName), '-C', dir])
    const packed = join(dir, 'package')
    assert.ok(existsSync(join(packed, 'lib/host.js')))
    assert.ok(existsSync(join(packed, 'lib/client.js')))
    assert.ok(existsSync(join(packed, 'lib/remote/devin-workspace.mjs')))
    const host = await import(pathToFileURL(join(packed, 'lib/host.js')).href)
    assert.equal(typeof host.apply, 'function')
    const remote = await import(pathToFileURL(join(packed, 'lib/remote/devin-workspace.mjs')).href)
    assert.equal(typeof remote.createFilesystem, 'function')
    assert.equal(typeof remote.createMcpServer, 'function')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
