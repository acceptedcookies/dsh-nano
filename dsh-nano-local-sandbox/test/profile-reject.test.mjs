import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { ensureReady, loadProfile } from '../src/host/profile-registry.js'
import { loadProfileDriver } from '../src/host/profile-drivers.js'

const profileDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'profiles', 'kitesurf')

function fixture(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'dnls-profile-'))
  cpSync(profileDir, dir, { recursive: true })
  const yamlPath = join(dir, 'profile.yaml')
  const yaml = readFileSync(yamlPath, 'utf8')
  writeFileSync(yamlPath, mutate(yaml, dir))
  return dir
}

async function rejects(dir, options = {}) {
  const backend = { calls: 0, async ensureImage() { this.calls += 1 } }
  const result = await ensureReady(dir, backend, options)
  // Kernel invariants fail the build gate; profile-specific invariants (npm
  // versions) fail the driver's own validateManifest at load. Both are refusals.
  const kernelReady = loadProfile(dir, options).ready
  const loaded = await loadProfileDriver(dir, options)
  assert.equal(loaded.ready, false)
  if (!kernelReady) assert.equal(result.ok, false)
  assert.equal(backend.calls, 0)
}

test('missing field, latest, caret, floating pin, bad digest, bad ref, verify, and container machine all refuse', async () => {
  await rejects(fixture((yaml) => yaml.replace(/scope: session\r?\n/, '')))
  await rejects(fixture((yaml, dir) => {
    writeFileSync(join(dir, 'Dockerfile'), `${readFileSync(join(dir, 'Dockerfile'), 'utf8')}\n# latest\n`)
    return yaml
  }))
  await rejects(fixture((yaml) => yaml.replace(/wrangler: \d+\.\d+\.\d+/, 'wrangler: ^4.131.2')))
  await rejects(fixture((yaml) => yaml.replace(/wrangler: \d+\.\d+\.\d+/, 'wrangler: 4')))
  await rejects(fixture((yaml) => yaml.replace(/^driver: .*\r?\n/m, '')))
  await rejects(fixture((yaml, dir) => {
    writeFileSync(join(dir, 'driver', 'index.js'), 'export default {}')
    return yaml
  }))
  await rejects(fixture((yaml) => yaml.replace(/image: [^\r\n]+/, 'image: kitesurf-engine:latest')))
  await rejects(fixture((yaml) => yaml.replace(/  image: [^\r\n]+\r?\n/, '')))
  await rejects(fixture((yaml) => yaml.replace(/digest: sha256:[0-9a-f]+/, 'digest: sha256:' + 'ab'.repeat(32))))
  await rejects(fixture((yaml) => yaml.replace(/ref: [0-9a-f]{40}/, 'ref: abc')))
  const missing = fixture((yaml) => yaml)
  await rejects(missing, { checkoutRoot: join(missing, 'no-checkout') })
  await rejects(fixture((yaml, dir) => {
    writeFileSync(join(dir, 'entrypoint.sh'), `${readFileSync(join(dir, 'entrypoint.sh'), 'utf8')}\n# container machine\n`)
    return yaml
  }))
})
