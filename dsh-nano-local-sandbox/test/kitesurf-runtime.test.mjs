import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { KITESURF_RUNTIME_FILES } from '../profiles/kitesurf/driver/runtime.js'
import { loadProfileDriver, profilesRootFor } from '../src/host/profile-drivers.js'
import { routeSpecs } from '../src/host/routes.js'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const profileDir = join(packageRoot, 'profiles', 'kitesurf')

async function fixture({ cpus = 6, memory = '6G', ref = 'ab'.repeat(20) } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-runtime-'))
  const profilesRoot = join(root, 'profiles')
  const profile = join(profilesRoot, 'kitesurf')
  cpSync(profileDir, profile, { recursive: true })
  const yaml = join(profile, 'profile.yaml')
  writeFileSync(yaml, readFileSync(yaml, 'utf8')
    .replace(/ref: [0-9a-f]{40}/, `ref: ${ref}`)
    .replace(/image: [^\r\n]+/, `image: fixture-engine:${ref}`)
    .replace(/cpus: \d+/, `cpus: ${cpus}`)
    .replace(/memory: \d+G/, `memory: ${memory}`))
  // The fixture image tag no longer matches the recipe digest; pin the digest
  // the way an image rebuild would so the loader accepts the profile.
  const loaded = await loadProfileDriver(profile)
  const nextYaml = readFileSync(yaml, 'utf8').replace(/digest: sha256:[0-9a-f]{64}/, `digest: ${loaded.digest}`)
  writeFileSync(yaml, nextYaml)
  const ready = await loadProfileDriver(profile)
  assert.deepEqual(ready.errors, [])
  const deps = { profilesRoot, env: { HOME: root, DSH_HOME: join(root, '.dsh-dev') } }
  return {
    root,
    deps,
    profile: ready.manifest,
    driver: ready.driver,
    runtime: ready.driver.runtimeRoot(ready.manifest, deps),
  }
}

function materializeRuntime(root, profile) {
  mkdirSync(dirname(root), { recursive: true })
  writeFileSync(join(dirname(root), 'artifact.json'), JSON.stringify({ ref: profile.build.checkout.ref, sourceTree: 'fixture-hash' }))
  for (const file of [profile.build.checkout.verify, ...KITESURF_RUNTIME_FILES]) {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, 'fixture build output\n')
  }
  mkdirSync(join(root, 'node_modules'), { recursive: true })
}

function inspected(resources = { cpus: 6, memoryInBytes: 6 * 1024 ** 3 }, state = 'running') {
  return { raw: JSON.stringify([{ status: { state }, configuration: { resources, publishedPorts: [] } }]) }
}

function backendFor(info) {
  const calls = []
  return {
    calls,
    async inspect() { return info },
    async create(spec) { calls.push(['create', spec]) },
    async start(name) { calls.push(['start', name]) },
    async stop(name) { calls.push(['stop', name]) },
    async remove(name) { calls.push(['remove', name]) },
  }
}

async function prepare(deps, backend) {
  const route = routeSpecs({ ...deps, backend, session: { phase: 'idle', history: [] }, prepareTimeoutMs: 0, httpProbe: () => false })
    .find((row) => row.path.endsWith('/recover'))
  let raw
  const res = { statusCode: 0, end(text) { raw = text } }
  await route.handler({ method: 'POST', url: route.path, body: {} }, res)
  return { status: res.statusCode, body: JSON.parse(raw) }
}

test('profile selection and runtime/image/resources all follow the same profile', async () => {
  const { deps, profile, driver, runtime } = await fixture()
  deps.env.DNLS_PROFILES = '/unused/profiles'
  assert.equal(profilesRootFor(deps), deps.profilesRoot)
  assert.deepEqual(driver.image(profile), `fixture-engine:${profile.build.checkout.ref}`)
  assert.equal(runtime, join(deps.env.DSH_HOME, 'artifacts', 'kitesurf', profile.build.checkout.ref, 'runtime'))
  assert.equal(driver.runtimeRoot(profile, { env: { HOME: '/home/fixture' } }), join('/home/fixture/.dsh/artifacts/kitesurf', profile.build.checkout.ref, 'runtime'))
  assert.equal(driver.runtimeRoot(profile, { env: { DSH_HOME: '/home/desktop' }, runtimeRoot: '/derived/runtime' }), '/derived/runtime')
})

test('runtime mounts require nonempty outputs and never create missing runtime paths', async () => {
  const { deps, profile, driver, runtime, root } = await fixture()
  const state = join(root, 'state')
  assert.throws(() => driver.mounts(profile, deps, state), /built runtime receipt is missing or invalid/)
  assert.equal(existsSync(runtime), false)
  assert.equal(existsSync(state), false)
  materializeRuntime(runtime, profile)
  assert.equal(driver.assertRuntime(profile, deps), runtime)
  const mounts = driver.mounts(profile, deps, state)
  assert.deepEqual(mounts, [
    { arg: `type=virtiofs,source=${runtime},target=/opt/kitesurf,readonly` },
    { arg: 'type=tmpfs,target=/opt/kitesurf/packages/engine/.wrangler' },
    { arg: `type=virtiofs,source=${state},target=/var/lib/kitesurf-state` },
  ])
  writeFileSync(join(runtime, KITESURF_RUNTIME_FILES[0]), '')
  assert.throws(() => driver.assertRuntime(profile, deps), /kitesurf_core_bg.wasm/)
})

test('a runtime override wins, but a git source checkout or unsafe path cannot be mounted', async () => {
  const { deps, profile, driver, root } = await fixture()
  const override = join(root, 'built-runtime')
  const overridden = { ...deps, runtimeRoot: override }
  materializeRuntime(override, profile)
  assert.equal(driver.assertRuntime(profile, overridden), override)
  mkdirSync(join(override, '.git'))
  assert.throws(() => driver.assertRuntime(profile, overridden), /not a source checkout/)
  const alias = join(root, 'alias')
  symlinkSync(override, alias)
  assert.throws(() => driver.assertRuntime(profile, { ...deps, runtimeRoot: alias }), /not a source checkout/)
  for (const path of ['relative/runtime', '/tmp/runtime,readonly=false', '/tmp/run\ntime']) {
    deps.env.DNLS_CHECKOUT = path
    assert.notEqual(driver.runtimeRoot(profile, deps), path)
  }
})

test('the sibling build receipt must identify the exact profile ref, including for an override', async () => {
  const { deps, profile, driver, root } = await fixture()
  const override = join(root, 'override-runtime')
  const overridden = { ...deps, runtimeRoot: override }
  materializeRuntime(override, profile)
  const receiptPath = join(dirname(override), 'artifact.json')
  writeFileSync(receiptPath, JSON.stringify({ ref: 'cd'.repeat(20) }))
  assert.throws(() => driver.assertRuntime(profile, overridden), /receipt ref does not match profile pin/)
  writeFileSync(receiptPath, 'invalid json')
  assert.throws(() => driver.assertRuntime(profile, overridden), /receipt is missing or invalid/)
  writeFileSync(receiptPath, JSON.stringify({ ref: profile.build.checkout.ref }))
  assert.equal(driver.assertRuntime(profile, overridden), override)
})

test('images never fall back to an untagged reference or moving default', async () => {
  const { profile, driver } = await fixture()
  for (const image of ['kitesurf-engine', 'kitesurf-engine:latest']) {
    assert.throws(() => driver.image({ ...profile, build: { ...profile.build, image } }), /pinned/)
  }
  assert.equal(driver.image({ ...profile, build: { ...profile.build, image: 'test-engine:explicit' } }), 'test-engine:explicit')
})

test('prepare creates only from the selected profile runtime and keeps env ports/state isolation', async () => {
  const { deps, profile, driver, runtime, root } = await fixture()
  materializeRuntime(runtime, profile)
  const state = join(root, 'own-state')
  deps.env.DNLS_STATE_ROOT = state
  const backend = backendFor(null)
  const result = await prepare(deps, backend)
  assert.equal(result.status, 200)
  assert.equal(result.body.action, 'created')
  assert.equal(backend.calls.length, 1)
  const [action, spec] = backend.calls[0]
  assert.equal(action, 'create')
  assert.equal(spec.containerName, 'kitesurf-dev')
  assert.equal(spec.image, driver.image(profile))
  assert.deepEqual(spec.resources, { cpus: 6, memory: '6G' })
  assert.equal(spec.mounts[0].arg, `type=virtiofs,source=${runtime},target=/opt/kitesurf,readonly`)
  assert.equal(spec.mounts[2].arg, `type=virtiofs,source=${join(state, 'kitesurf', 'kitesurf-dev')},target=/var/lib/kitesurf-state`)
  assert.deepEqual(spec.ports, [{ publish: '127.0.0.1:8800:8787' }, { publish: '127.0.0.1:8801:8791' }])
})

test('prepare is honest about missing builds, including before destructive resource reconciliation', async () => {
  const { deps, runtime, root } = await fixture()
  for (const info of [null, inspected({ cpus: 4, memoryInBytes: 4 * 1024 ** 3 })]) {
    const backend = backendFor(info)
    const result = await prepare(deps, backend)
    assert.equal(result.status, 400)
    assert.equal(result.body.ok, false)
    assert.match(result.body.error, /built runtime receipt is missing or invalid/)
    assert.deepEqual(backend.calls, [])
  }
  assert.equal(existsSync(runtime), false)
  assert.equal(existsSync(join(root, '.dsh-dev', 'nano-local-sandbox')), false)
})

test('existing running/stopped containers remain adoptable without rebuilding runtime', async () => {
  const { deps } = await fixture()
  const running = backendFor(inspected())
  const adopted = await prepare(deps, running)
  assert.equal(adopted.body.action, 'noop')
  assert.deepEqual(running.calls, [])
  const stopped = backendFor(inspected(undefined, 'stopped'))
  const resumed = await prepare(deps, stopped)
  assert.equal(resumed.body.action, 'started')
  assert.deepEqual(stopped.calls, [['start', 'kitesurf-dev']])
})

test('resource drift still rebuilds with the same state mount and the new profile resources', async () => {
  const { deps, profile, driver, runtime } = await fixture()
  materializeRuntime(runtime, profile)
  const backend = backendFor(inspected({ cpus: 4, memoryInBytes: 4 * 1024 ** 3 }))
  const result = await prepare(deps, backend)
  assert.equal(result.status, 200)
  assert.match(result.body.action, /^resized /)
  assert.deepEqual(backend.calls.map(([action]) => action), ['stop', 'remove', 'create'])
  const spec = backend.calls[2][1]
  assert.deepEqual(spec.resources, { cpus: 6, memory: '6G' })
  assert.equal(spec.mounts[2].arg, `type=virtiofs,source=${join(deps.env.DSH_HOME, 'nano-local-sandbox', 'state', 'kitesurf', 'kitesurf-dev')},target=/var/lib/kitesurf-state`)
})

test('entrypoint exports expose-gc once while preserving every caller flag', () => {
  const script = readFileSync(join(profileDir, 'entrypoint.sh'), 'utf8')
  const syntax = spawnSync('/bin/sh', ['-n', join(profileDir, 'entrypoint.sh')], { encoding: 'utf8' })
  assert.equal(syntax.status, 0, syntax.stderr)
  // Execute only initialization: no bridge, engine, build or container process.
  const init = script.slice(0, script.indexOf('# Supervise'))
  for (const flags of [undefined, '--trace-gc --foo=bar', '--trace-gc --expose-gc --foo=bar']) {
    const env = { PATH: process.env.PATH }
    if (flags !== undefined) env.MINIFLARE_WORKERD_V8_FLAGS = flags
    const run = spawnSync('/bin/sh', ['-c', `${init}\nprintf '%s' "$MINIFLARE_WORKERD_V8_FLAGS"`], { env, encoding: 'utf8' })
    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, flags?.includes('--expose-gc') ? flags : `${flags ? flags + ' ' : ''}--expose-gc`)
  }
})
