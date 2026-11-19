import assert from 'node:assert/strict'
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { loadProfileDriver, profileContext, resetProfileCache } from '../../src/host/profile-drivers.js'
import { loadProfile } from '../../src/host/profile-registry.js'

const profileDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'profiles', 'kitesurf')
const profilesRoot = join(profileDir, '..')

function copy(mutate) {
  const dir = mkdtempSync(join(tmpdir(), 'dnls-contract-'))
  cpSync(profileDir, dir, { recursive: true })
  const yamlPath = join(dir, 'profile.yaml')
  const yaml = readFileSync(yamlPath, 'utf8')
  writeFileSync(yamlPath, mutate(yaml, dir))
  return dir
}

test('a profile without a driver entry is rejected, not silently kernel-only', () => {
  const dir = copy((yaml) => yaml.replace(/^driver: .*\r?\n/m, ''))
  const loaded = loadProfile(dir)
  assert.equal(loaded.ready, false)
  assert.equal(loaded.errors.includes('missing:driver'), true)
})

test('the driver declares its namespace and the kernel composes wire ids from it', async () => {
  const loaded = await loadProfileDriver(profileDir)
  assert.equal(loaded.ready, true)
  assert.equal(loaded.driver.id, loaded.manifest.id)
  assert.equal(loaded.driver.errors.namespace, 'kitesurf')
  const ctx = await profileContext({ profilesRoot })
  assert.equal(ctx.driver.errors.namespace, 'kitesurf')
  assert.equal(typeof ctx.driver.settings.apply, 'function')
  assert.equal(typeof ctx.driver.history.navigate, 'function')
  assert.equal(ctx.driver.selftest.ids.length, loaded.manifest.health.selftest)
  resetProfileCache()
})

test('the browser profile is discovered by capability, not by literal id', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dnls-root-'))
  try {
    cpSync(profilesRoot, root, { recursive: true })
    const yamlPath = join(root, 'kitesurf', 'profile.yaml')
    writeFileSync(yamlPath, readFileSync(yamlPath, 'utf8').replace(/\n    - cdp/, ''))
    resetProfileCache()
    await assert.rejects(() => profileContext({ profilesRoot: root }), /no profile with the cdp driver/)
  } finally {
    rmSync(root, { recursive: true, force: true })
    resetProfileCache()
  }
})
