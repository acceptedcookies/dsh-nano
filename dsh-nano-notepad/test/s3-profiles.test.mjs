import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createProfileStore } from '../src/host/s3-sync.js'

/** Each case gets a private DSH_HOME + store file so env seeding is inert. */
function withStore(run) {
  const dir = mkdtempSync(join(tmpdir(), 'np-s3-profiles-'))
  const file = join(dir, 'profiles.json')
  const previous = {
    DSH_HOME: process.env.DSH_HOME,
    DSH_NP_S3_ENV: process.env.DSH_NP_S3_ENV,
    DSH_NP_S3_PROFILES: process.env.DSH_NP_S3_PROFILES,
    S3_NOTEPAD_ACCESS_KEY: process.env.S3_NOTEPAD_ACCESS_KEY,
  }
  process.env.DSH_HOME = dir
  process.env.DSH_NP_S3_PROFILES = file
  delete process.env.DSH_NP_S3_ENV
  delete process.env.S3_NOTEPAD_ACCESS_KEY
  try {
    return run(dir, file)
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    rmSync(dir, { recursive: true, force: true })
  }
}

const sample = {
  id: 'a', label: 'Alpha', endpoint: 'https://s3.example.com', region: 'shv1',
  bucket: 'bucket-a', prefix: 'np/', pathStyle: true,
  accessKeyId: 'AK-A', secretAccessKey: 'SK-A',
}

test('first boot writes a store and never returns secrets in list()', () => withStore((dir, file) => {
  const store = createProfileStore()
  assert.equal(store.list().length, 0)
  assert.ok(existsSync(file))
  const saved = store.save(sample)
  assert.equal(saved.hasSecret, true)
  const listed = store.list()[0]
  assert.equal(listed.active, true, 'the only profile becomes active')
  assert.equal('secretAccessKey' in listed, false, 'secret must never be exposed')
  assert.equal(JSON.stringify(store.list()).includes('SK-A'), false)
  const raw = JSON.parse(readFileSync(file, 'utf8'))
  assert.equal(raw.profiles[0].secretAccessKey, 'SK-A')
}))

test('editing with a blank secret keeps the stored one', () => withStore(() => {
  const store = createProfileStore()
  store.save(sample)
  const edited = store.save({ ...sample, label: 'Alpha 2', secretAccessKey: '' })
  assert.equal(edited.label, 'Alpha 2')
  const raw = JSON.parse(readFileSync(process.env.DSH_NP_S3_PROFILES, 'utf8'))
  assert.equal(raw.profiles[0].secretAccessKey, 'SK-A')
}))

test('abortSwitch restores the previous active id', () => withStore(() => {
  const store = createProfileStore()
  store.save(sample)
  store.save({ ...sample, id: 'b', label: 'Beta', bucket: 'bucket-b' })
  assert.equal(store.activeId(), 'a')
  store.beginSwitch('b')
  assert.equal(store.activeId(), 'b')
  assert.ok(store.pending())
  store.abortSwitch()
  assert.equal(store.activeId(), 'a')
  assert.equal(store.pending(), null)
}))

test('an interrupted switch is rolled back on the next boot', () => withStore(() => {
  const first = createProfileStore()
  first.save(sample)
  first.save({ ...sample, id: 'b', label: 'Beta', bucket: 'bucket-b' })
  first.beginSwitch('b')          // crash before commit
  const second = createProfileStore()
  assert.equal(second.activeId(), 'a')
  assert.equal(second.pending(), null)
}))

test('active endpoint cannot be deleted', () => withStore(() => {
  const store = createProfileStore()
  store.save(sample)
  assert.throws(() => store.remove('a'), /active/)
}))
