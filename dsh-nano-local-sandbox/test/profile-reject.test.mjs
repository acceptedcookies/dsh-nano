import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { ensureReady, loadProfile } from '../src/host/profile-registry.js'

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
  assert.equal(result.ok, false)
  assert.equal(backend.calls, 0)
  assert.equal(loadProfile(dir, options).ready, false)
}

test('missing field, latest, caret, floating pin, bad digest, bad ref, verify, and container machine all refuse', async () => {
  await rejects(fixture((yaml) => yaml.replace('scope: session\n', '')))
  await rejects(fixture((yaml, dir) => {
    writeFileSync(join(dir, 'Dockerfile'), `${readFileSync(join(dir, 'Dockerfile'), 'utf8')}\n# latest\n`)
    return yaml
  }))
  await rejects(fixture((yaml) => yaml.replace('wrangler: 4.161.0', 'wrangler: ^4.161.0')))
  await rejects(fixture((yaml) => yaml.replace('wrangler: 4.161.0', 'wrangler: 4')))
  await rejects(fixture((yaml) => yaml.replace(/digest: sha256:[0-9a-f]+/, 'digest: sha256:' + 'ab'.repeat(32))))
  await rejects(fixture((yaml) => yaml.replace(/ref: [0-9a-f]{40}/, 'ref: abc')))
  const missing = fixture((yaml) => yaml)
  await rejects(missing, { checkoutRoot: join(missing, 'no-checkout') })
  await rejects(fixture((yaml, dir) => {
    writeFileSync(join(dir, 'entrypoint.sh'), `${readFileSync(join(dir, 'entrypoint.sh'), 'utf8')}\n# container machine\n`)
    return yaml
  }))
})
