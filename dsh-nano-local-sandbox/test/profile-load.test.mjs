import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { loadProfile } from '../src/host/profile-registry.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const profileDir = join(root, 'profiles', 'kitesurf')

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'test') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files(path, out)
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(path)
  }
  return out
}

test('scope is read from profile.yaml and the recipe stays in this package', () => {
  const yaml = readFileSync(join(profileDir, 'profile.yaml'), 'utf8')
  const loaded = loadProfile(profileDir)
  assert.equal(loaded.ready, true, loaded.errors.join(','))
  assert.equal(loaded.manifest.scope, 'session')
  assert.match(yaml, /^scope: session$/m)
  const docker = readFileSync(join(profileDir, 'Dockerfile'), 'utf8')
  assert.match(docker, /__res_init/)
  assert.equal(loaded.manifest.build.base, 'node:22-bookworm-slim')
  assert.equal(loaded.manifest.build.checkout.ref, '39feadfb9a3e6c14b40cf170a559ce417d0fce5d')
  assert.equal(loaded.manifest.build.image, `kitesurf-engine:${loaded.manifest.build.checkout.ref}-${loaded.digest.slice(7, 19)}`)
  assert.equal(loaded.manifest.build.npmPrefix.wrangler, '4.131.2')
  assert.match(docker, /ARG KITESURF_BASE_IMAGE\r?\nFROM \$\{KITESURF_BASE_IMAGE\}/)
  const imports = []
  for (const file of files(root)) {
    const text = readFileSync(file, 'utf8')
    if (/from\s+['"]dsh-nano-kitesurf/.test(text) || /import\s+['"]dsh-nano-kitesurf/.test(text)) imports.push(file)
  }
  assert.deepEqual(imports, [])
})
