import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'
import { openControlRegistry } from '../src/host/control-registry.js'
import { createUseBindings } from '../src/host/instance-registry.js'

const here = dirname(fileURLToPath(import.meta.url))
const REGISTRY_SRC_URL = pathToFileURL(join(here, '..', 'src', 'host', 'control-registry.js')).href

const ROW_KEYS = ['sandboxId', 'name', 'profileId', 'principal', 'recipeRef', 'origin', 'stateVolume', 'binding', 'ports', 'managedAt', 'desiredRevision', 'appliedRevision', 'operations', 'terminals', 'removed'].sort()
const DOC_KEYS = ['version', 'envId', 'sandboxes'].sort()

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-reg-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  return { root, registryPath: join(root, 'registry.json'), lockPath: join(root, 'registry.lock') }
}

function open(t, root, envId = 'dev') {
  const registry = openControlRegistry({ root, envId })
  t.after(() => {
    try {
      registry.close()
    } catch (closeError) {
      void closeError
    }
  })
  return registry
}

const intent = (over = {}) => ({ name: 'alpha', profileId: 'kitesurf', principal: 'owner:test', recipeRef: 'recipe@1', ...over })
const readBytes = (path) => readFileSync(path)

function assertConflict(error, errorId = 'sandbox.state_conflict') {
  assert.equal(error?.errorId, errorId, `expected ${errorId}, got ${error?.message}`)
  assert.equal(error?.status, 409)
  return true
}

function storedRow(over = {}) {
  return {
    sandboxId: '0c6b2f8e-8f2a-4d1e-9c3b-7a5e2f1d4b60',
    name: 'stored',
    profileId: 'kitesurf',
    principal: 'owner:test',
    recipeRef: 'recipe@1',
    origin: 'adopted',
    stateVolume: '/abs/stored-mount',
    binding: { locator: 'dnls-stored', generation: 'gen-1' },
    ports: [],
    ...over,
  }
}

test('DNLS03-T01 reserve persists intent, survives reopen and keeps a stable sandboxId', (t) => {
  const { root, registryPath } = fixture(t)
  let registry = open(t, root)
  const row = registry.reserve(intent())
  assert.match(row.sandboxId, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  assert.match(row.binding.locator, /^dnls-[0-9a-f-]{36}$/)
  assert.equal(row.binding.generation, null)
  assert.equal(row.origin, 'created')
  assert.equal(row.stateVolume, join(root, 'kitesurf', row.sandboxId))
  const bytesBeforeClose = readBytes(registryPath)
  registry.close()

  registry = open(t, root)
  const again = registry.get(row.sandboxId)
  assert.deepEqual(again, row)
  assert.equal(readBytes(registryPath).toString('utf8'), bytesBeforeClose.toString('utf8'))

  again.name = 'mutated-by-caller'
  again.binding.locator = 'mutated'
  assert.equal(registry.get(row.sandboxId).name, 'alpha')
  assert.notEqual(registry.get(row.sandboxId).binding.locator, 'mutated')
  assert.equal(registry.get('no-such-id'), null)
})

test('DNLS03-T01 persisted document carries only whitelisted fields; injected fields fail closed', (t) => {
  const { root, registryPath } = fixture(t)
  const registry = open(t, root)
  registry.reserve(intent())
  registry.close()

  const doc = JSON.parse(readBytes(registryPath, 'utf8'))
  assert.deepEqual(Object.keys(doc).sort(), DOC_KEYS)
  assert.equal(doc.version, 1)
  assert.equal(doc.envId, 'dev')
  assert.equal(doc.sandboxes.length, 1)
  assert.deepEqual(Object.keys(doc.sandboxes[0]).sort(), ROW_KEYS)
  assert.deepEqual(Object.keys(doc.sandboxes[0].binding).sort(), ['generation', 'locator'])
  assert.equal(JSON.stringify(doc).includes('url'), false)
  assert.equal(JSON.stringify(doc).includes('attach'), false)

  const poisoned = JSON.parse(readBytes(registryPath, 'utf8'))
  poisoned.sandboxes[0].injected = { attach: 'ws://evil' }
  writeFileSync(registryPath, JSON.stringify(poisoned))
  assert.throws(() => openControlRegistry({ root, envId: 'dev' }), assertConflict)
  assert.equal(readBytes(registryPath).toString('utf8'), JSON.stringify(poisoned))
})

test('DNLS03-T01 intent rejects injected fields and unsafe profileId segments', (t) => {
  const { root } = fixture(t)
  const registry = open(t, root)
  assert.throws(() => registry.reserve(intent({ attach: 'ws://x' })), assertConflict)
  for (const bad of ['a/b', '..', '.', 'a\\b', '']) {
    assert.throws(() => registry.reserve(intent({ profileId: bad })), assertConflict)
  }
  registry.reserve(intent({ name: 'taken' }))
  assert.throws(() => registry.reserve(intent({ name: 'taken' })), (error) => {
    assert.equal(error?.errorId, 'sandbox.name_taken')
    return true
  })
})

test('DNLS03-T01 rename updates the display name and never moves the sandboxId', (t) => {
  const { root } = fixture(t)
  let registry = open(t, root)
  const row = registry.reserve(intent())
  const other = registry.reserve(intent({ name: 'beta' }))
  assert.throws(() => registry.rename(row.sandboxId, 'beta'), (error) => {
    assert.equal(error?.errorId, 'sandbox.name_taken')
    return true
  })
  const renamed = registry.rename(row.sandboxId, 'gamma')
  assert.equal(renamed.sandboxId, row.sandboxId)
  assert.equal(renamed.name, 'gamma')
  assert.equal(other.sandboxId === row.sandboxId, false)
  registry.close()

  registry = open(t, root)
  assert.equal(registry.get(row.sandboxId).name, 'gamma')
})

test('DNLS03-T01 a failed publish poisons the handle and preserves committed bytes', (t) => {
  const { root, registryPath } = fixture(t)
  const registry = open(t, root)
  const first = registry.reserve(intent())
  const committed = readBytes(registryPath)

  const savedPath = join(root, 'committed-snapshot.json')
  renameSync(registryPath, savedPath)
  mkdirSync(registryPath)

  assert.throws(() => registry.reserve(intent({ name: 'second' })), assertConflict)
  assert.equal(readBytes(savedPath).toString('utf8'), committed.toString('utf8'))
  assert.throws(() => registry.get(first.sandboxId), assertConflict)
  assert.throws(() => registry.list(), assertConflict)
  assert.throws(() => registry.rename(first.sandboxId, 'still-poisoned'), assertConflict)
})

test('DNLS03-T01 fresh roots and files use owner-only permissions', (t) => {
  const { root, registryPath, lockPath } = fixture(t)
  rmSync(root, { recursive: true, force: true })
  const registry = open(t, root)
  registry.reserve(intent())
  assert.equal(lstatSync(root).mode & 0o777, 0o700)
  assert.equal(lstatSync(registryPath).mode & 0o777, 0o600)
  assert.equal(lstatSync(lockPath).mode & 0o777, 0o600)
})

test('DNLS03-T01 symlinked or non-regular registry and lock entries are refused without writing', (t) => {
  const linked = fixture(t)
  mkdirSync(join(linked.root, 'real'))
  symlinkSync(join(linked.root, 'real'), linked.registryPath)
  assert.throws(() => openControlRegistry({ root: linked.root, envId: 'dev' }), assertConflict)

  // Dangling links fail the same way and nothing is written through them.
  const danglingRegistry = fixture(t)
  const registryTarget = join(danglingRegistry.root, 'registry-payload-target')
  symlinkSync(registryTarget, danglingRegistry.registryPath)
  assert.throws(() => openControlRegistry({ root: danglingRegistry.root, envId: 'dev' }), assertConflict)
  assert.equal(existsSync(registryTarget), false)
  assert.equal(
    readdirSync(danglingRegistry.root).filter((name) => name.startsWith('registry.json.tmp.')).length,
    0,
  )

  const danglingLock = fixture(t)
  const lockTarget = join(danglingLock.root, 'lock-payload-target')
  symlinkSync(lockTarget, danglingLock.lockPath)
  assert.throws(() => openControlRegistry({ root: danglingLock.root, envId: 'dev' }), assertConflict)
  assert.equal(existsSync(lockTarget), false)

  const notAFile = fixture(t)
  mkdirSync(notAFile.registryPath)
  assert.throws(() => openControlRegistry({ root: notAFile.root, envId: 'dev' }), assertConflict)
})

function waitFor(child, predicate, timeoutMs = 15000) {
  return new Promise((resolvePromise, rejectPromise) => {
    let out = ''
    const timer = setTimeout(() => rejectPromise(new Error(`child timeout; saw: ${out}`)), timeoutMs)
    child.stdout.on('data', (chunk) => {
      out += chunk.toString('utf8')
      const match = predicate(out)
      if (match) {
        clearTimeout(timer)
        resolvePromise(match)
      }
    })
    child.on('exit', (code) => {
      clearTimeout(timer)
      rejectPromise(new Error(`child exited ${code}; saw: ${out}`))
    })
  })
}

function waitForExit(child, timeoutMs = 15000) {
  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => rejectPromise(new Error('child did not exit')), timeoutMs)
    child.on('exit', (code, signal) => {
      clearTimeout(timer)
      resolvePromise({ code, signal })
    })
  })
}

test('DNLS03-T03 a live owner blocks any second writer; an ungraceful exit frees the lock', async (t) => {
  const { root, registryPath } = fixture(t)
  const owner = spawn(
    process.execPath,
    [
      '-e',
      `import(${JSON.stringify(REGISTRY_SRC_URL)}).then((m) => {
        const registry = m.openControlRegistry({ root: process.env.DNLS_T03_ROOT, envId: process.env.DNLS_T03_ENV })
        const row = registry.reserve(JSON.parse(process.env.DNLS_T03_INTENT))
        console.log('READY ' + row.sandboxId)
        setInterval(() => {}, 1000)
      }).catch((error) => { console.error(error); process.exit(2) })`,
    ],
    {
      env: {
        ...process.env,
        DNLS_T03_ROOT: root,
        DNLS_T03_ENV: 'dev',
        DNLS_T03_INTENT: JSON.stringify(intent()),
      },
      stdio: ['ignore', 'pipe', 'inherit'],
    },
  )
  t.after(() => { try { owner.kill('SIGKILL') } catch (killError) { void killError } })

  const sandboxId = (await waitFor(owner, (out) => out.match(/READY ([0-9a-f-]{36})/)))[1]
  const committed = readBytes(registryPath)

  assert.throws(() => openControlRegistry({ root, envId: 'dev' }), assertConflict)
  assert.throws(() => openControlRegistry({ root, envId: 'another-env' }), assertConflict)
  assert.equal(readBytes(registryPath).toString('utf8'), committed.toString('utf8'))
  const doc = JSON.parse(committed.toString('utf8'))
  assert.equal(doc.sandboxes.length, 1)
  assert.equal(doc.sandboxes[0].sandboxId, sandboxId)

  owner.kill('SIGKILL')
  const exit = await waitForExit(owner)
  assert.equal(exit.signal, 'SIGKILL')

  const registry = open(t, root)
  const row = registry.get(sandboxId)
  assert.equal(row.sandboxId, sandboxId)
  assert.equal(row.name, 'alpha')
})

test('DNLS03-T04 malformed, missing or foreign documents fail closed and preserve bytes', (t) => {
  // Malformed JSON on a claimed root.
  const damaged = fixture(t)
  let registry = open(t, damaged.root)
  registry.reserve(intent())
  registry.close()
  writeFileSync(damaged.registryPath, '{ not json')
  assert.throws(() => openControlRegistry({ root: damaged.root, envId: 'dev' }), assertConflict)
  assert.equal(readBytes(damaged.registryPath).toString('utf8'), '{ not json')

  // Unsupported schema version.
  const versioned = fixture(t)
  registry = open(t, versioned.root)
  registry.close()
  const upgraded = JSON.stringify({ version: 2, envId: 'dev', sandboxes: [] })
  writeFileSync(versioned.registryPath, upgraded)
  assert.throws(() => openControlRegistry({ root: versioned.root, envId: 'dev' }), assertConflict)
  assert.equal(readBytes(versioned.registryPath).toString('utf8'), upgraded)

  // Env mismatch.
  const foreign = fixture(t)
  registry = open(t, foreign.root)
  registry.close()
  assert.throws(() => openControlRegistry({ root: foreign.root, envId: 'prod' }), assertConflict)

  // Registry absent but prior entries exist on disk.
  const leftover = fixture(t)
  mkdirSync(join(leftover.root, 'kitesurf', 'orphaned-volume'), { recursive: true })
  assert.throws(() => openControlRegistry({ root: leftover.root, envId: 'dev' }), assertConflict)
  assert.equal(existsSync(leftover.registryPath), false)

  // Initialized root whose registry was lost, even with no other entries.
  const lost = fixture(t)
  registry = open(t, lost.root)
  registry.close()
  rmSync(lost.registryPath)
  assert.throws(() => openControlRegistry({ root: lost.root, envId: 'dev' }), assertConflict)

  // A valid registry reopened under a fresh lock re-commits the marker.
  const rekeyed = fixture(t)
  registry = open(t, rekeyed.root)
  registry.reserve(intent())
  registry.close()
  rmSync(rekeyed.lockPath)
  registry = open(t, rekeyed.root)
  registry.close()
  rmSync(rekeyed.registryPath)
  assert.throws(() => openControlRegistry({ root: rekeyed.root, envId: 'dev' }), assertConflict)
})

test('DNLS03-T04 crafted stored rows are rejected without an empty-ledger claim', (t) => {
  const cases = [
    ['sandboxId carrying a path traversal', storedRow({ sandboxId: '../escape/vol' })],
    ['sandboxId not a canonical UUID', storedRow({ sandboxId: 'dnls-0001' })],
    ['adopted row without a verified generation', storedRow({ binding: { locator: 'dnls-stored', generation: null } })],
    ['ports carrying an arbitrary payload', storedRow({ ports: [{ host: 8080, token: 'x' }] })],
    ['duplicate physical state volume', [
      storedRow(),
      storedRow({ sandboxId: '1d7c3a9f-9a3b-4e2f-8d4c-6b5f3e2c5a71', name: 'second', binding: { locator: 'dnls-other', generation: 'gen-2' } }),
    ]],
  ]
  for (const [what, sandboxes] of cases) {
    const { root, registryPath } = fixture(t)
    const registry = open(t, root)
    registry.close()
    const rows = Array.isArray(sandboxes) ? sandboxes : [sandboxes]
    const crafted = JSON.stringify({ version: 1, envId: 'dev', sandboxes: rows })
    writeFileSync(registryPath, crafted)
    assert.throws(() => openControlRegistry({ root, envId: 'dev' }), assertConflict, what)
    assert.equal(readBytes(registryPath).toString('utf8'), crafted, what)
  }
})

test('DNLS03-T04 reconcile returns unknown without proof and never rebinds', async (t) => {
  const { root, registryPath } = fixture(t)
  const registry = open(t, root)
  const row = registry.reserve(intent())
  assert.equal(row.binding.generation, null)

  const confirmed = registry.confirm(row.sandboxId, {
    locator: row.binding.locator,
    generation: 'gen-1',
    stateVolume: row.stateVolume,
  })
  assert.equal(confirmed.binding.generation, 'gen-1')
  assert.throws(
    () => registry.confirm(row.sandboxId, { locator: row.binding.locator, generation: 'gen-2', stateVolume: row.stateVolume }),
    assertConflict,
  )
  assert.throws(
    () => registry.confirm(row.sandboxId, { locator: 'dnls-elsewhere', generation: 'gen-9', stateVolume: row.stateVolume }),
    assertConflict,
  )

  let inspectCalls = 0
  const failing = async () => { inspectCalls += 1; throw new Error('backend unreachable') }
  assert.deepEqual(await registry.reconcile(row.sandboxId, failing), { state: 'unknown', generation: null })

  const renamedGeneration = async (locator) => ({ locator, generation: 'gen-2', stateVolume: row.stateVolume, state: 'running' })
  assert.deepEqual(await registry.reconcile(row.sandboxId, renamedGeneration), { state: 'unknown', generation: null })

  const inventedStatus = async (locator) => ({ locator, generation: 'gen-1', stateVolume: row.stateVolume, state: 'restarting?' })
  assert.deepEqual(await registry.reconcile(row.sandboxId, inventedStatus), { state: 'unknown', generation: null })

  const honest = async (locator) => ({ locator, generation: 'gen-1', stateVolume: row.stateVolume, state: 'running' })
  assert.deepEqual(await registry.reconcile(row.sandboxId, honest), { state: 'running', generation: 'gen-1' })

  const persisted = JSON.parse(readBytes(registryPath, 'utf8'))
  assert.equal(persisted.sandboxes[0].binding.generation, 'gen-1')
  assert.equal(persisted.sandboxes[0].binding.locator, row.binding.locator)
  assert.equal(inspectCalls > 0, true)
})

test('DNLS03-T04 explicit adoption registers the verified mount exactly once', (t) => {
  const { root } = fixture(t)
  const registry = open(t, root)
  const mount = join(root, '..', 'legacy-mount')
  const observation = { locator: 'legacy-box', generation: 'gen-9', stateVolume: mount, state: 'running' }
  const request = intent({ name: 'adopted' })

  const first = registry.adopt(request, observation)
  assert.equal(first.origin, 'adopted')
  assert.equal(first.stateVolume, mount)
  assert.equal(first.binding.generation, 'gen-9')

  const again = registry.adopt(request, observation)
  assert.equal(again.sandboxId, first.sandboxId)
  assert.equal(registry.list().length, 1)

  assert.throws(
    () => registry.adopt(intent({ name: 'adopted' }), { ...observation, generation: 'gen-10' }),
    assertConflict,
  )
  assert.throws(
    () => registry.adopt(request, { ...observation, stateVolume: join(root, '..', 'different-mount') }),
    assertConflict,
  )
  assert.throws(
    () => registry.adopt(intent({ name: 'adopted', recipeRef: 'recipe@2' }), observation),
    assertConflict,
  )
  assert.throws(
    () => registry.adopt(intent({ name: 'other', principal: 'owner:other' }), observation),
    assertConflict,
  )
  assert.throws(() => registry.adopt(intent({ name: 'unverified' }), { locator: 'x', stateVolume: mount }), assertConflict)
  assert.throws(
    () => registry.adopt(intent({ name: 'relative' }), { locator: 'y', generation: 'g', stateVolume: 'relative/path' }),
    assertConflict,
  )
  assert.throws(
    () => registry.adopt(intent({ name: 'volume-thief' }), { locator: 'new-box', generation: 'gen-1', stateVolume: mount }),
    assertConflict,
  )
})

test('DNLS03-T02 an on-disk registry row backs session use bindings end to end', async (t) => {
  const { root } = fixture(t)
  let registry = open(t, root)
  const row = registry.reserve(intent())
  registry.confirm(row.sandboxId, { locator: row.binding.locator, generation: 'gen-1', stateVolume: row.stateVolume })

  const policy = { mode: 'workspace-write', workspaceRoot: '/work/a', extraRoots: [] }
  const bindings = createUseBindings(registry)
  const a = bindings.ensure({ sandboxId: row.sandboxId, sessionId: 'sess-a', policy })
  const b = bindings.ensure({ sandboxId: row.sandboxId, sessionId: 'sess-b', policy })
  assert.equal(a.status, 201)
  assert.equal(b.status, 201)
  assert.equal(bindings.list(row.sandboxId).length, 2)
  bindings.release({ sandboxId: row.sandboxId, sessionId: 'sess-a' })
  bindings.release({ sandboxId: row.sandboxId, sessionId: 'sess-b' })
  assert.equal(bindings.list(row.sandboxId).length, 0)
  registry.close()

  registry = open(t, root)
  assert.equal(registry.list().length, 1)
  assert.equal(registry.get('sess-a'), null)
  assert.equal(registry.get(row.binding.locator), null)
  const rebound = createUseBindings(registry)
  const bySession = rebound.ensure({ sessionId: 'sess-a', policy })
  assert.equal(bySession.ok, false)
  const byLocator = rebound.ensure({ sandboxId: row.binding.locator, sessionId: 'sess-a', policy })
  assert.equal(byLocator.ok, false)
  assert.equal(byLocator.status, 404)
})
