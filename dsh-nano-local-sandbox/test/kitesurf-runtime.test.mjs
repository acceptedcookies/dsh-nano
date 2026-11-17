import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { assertKitesurfRuntime, KITESURF_RUNTIME_FILES, kitesurfImage, kitesurfMounts, kitesurfRecipe, kitesurfRuntimeRoot, profilesRootFor } from '../src/host/kitesurf-runtime.js'
import { routeSpecs } from '../src/host/routes.js'

const packageRoot = dirname(dirname(fileURLToPath(import.meta.url)))
const profileDir = join(packageRoot, 'profiles', 'kitesurf')

function fixture({ cpus = 6, memory = '6G', ref = 'ab'.repeat(20) } = {}) {
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
  const deps = { profilesRoot, env: { HOME: root, DSH_HOME: join(root, '.dsh-dev') } }
  const recipe = kitesurfRecipe(deps)
  const runtime = kitesurfRuntimeRoot(recipe, deps)
  return { root, deps, recipe, runtime }
}

function materializeRuntime(root, recipe) {
  mkdirSync(dirname(root), { recursive: true })
  writeFileSync(join(dirname(root), 'artifact.json'), JSON.stringify({ ref: recipe.profile.build.checkout.ref, sourceTree: 'fixture-hash' }))
  for (const file of [recipe.profile.build.checkout.verify, ...KITESURF_RUNTIME_FILES]) {
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

test('profile selection and runtime/image/resources all follow the same recipe', () => {
  const { deps, recipe, runtime } = fixture()
  deps.env.KITESURF_PROFILES = '/unused/profiles'
  assert.equal(profilesRootFor(deps), deps.profilesRoot)
  assert.deepEqual(recipe.resources, { cpus: 6, memory: '6G' })
  assert.equal(kitesurfImage(recipe, deps.env), `fixture-engine:${recipe.profile.build.checkout.ref}`)
  assert.equal(runtime, join(deps.env.DSH_HOME, 'artifacts', 'kitesurf', recipe.profile.build.checkout.ref, 'runtime'))
  assert.equal(kitesurfRuntimeRoot(recipe, { env: { HOME: '/home/fixture' } }), join('/home/fixture/.dsh/artifacts/kitesurf', recipe.profile.build.checkout.ref, 'runtime'))
  assert.equal(kitesurfRuntimeRoot(recipe, { env: { DSH_HOME: '/home/desktop', KITESURF_CHECKOUT: '/derived/runtime' } }), '/derived/runtime')
  assert.throws(() => kitesurfRecipe({ profilesRoot: '/missing/profile', env: {} }), /cannot read profile/)
})

test('runtime mounts require nonempty outputs and never create missing runtime paths', () => {
  const { deps, recipe, runtime, root } = fixture()
  const state = join(root, 'state')
  assert.throws(() => kitesurfMounts(recipe, deps, state), /built runtime receipt is missing or invalid/)
  assert.equal(existsSync(runtime), false)
  assert.equal(existsSync(state), false)
  materializeRuntime(runtime, recipe)
  assert.equal(assertKitesurfRuntime(recipe, deps), runtime)
  const mounts = kitesurfMounts(recipe, deps, state)
  assert.deepEqual(mounts, [
    { arg: `type=virtiofs,source=${runtime},target=/opt/kitesurf,readonly` },
    { arg: 'type=tmpfs,target=/opt/kitesurf/packages/engine/.wrangler' },
    { arg: `type=virtiofs,source=${state},target=/var/lib/kitesurf-state` },
  ])
  writeFileSync(join(runtime, KITESURF_RUNTIME_FILES[0]), '')
  assert.throws(() => assertKitesurfRuntime(recipe, deps), /kitesurf_core_bg.wasm/)
})

test('an explicit derived runtime wins, but a git source checkout or unsafe path cannot be mounted', () => {
  const { deps, recipe, root } = fixture()
  const override = join(root, 'built-runtime')
  deps.env.KITESURF_CHECKOUT = override
  materializeRuntime(override, recipe)
  assert.equal(assertKitesurfRuntime(recipe, deps), override)
  mkdirSync(join(override, '.git'))
  assert.throws(() => assertKitesurfRuntime(recipe, deps), /not a source checkout/)
  const alias = join(root, 'alias')
  symlinkSync(override, alias)
  deps.env.KITESURF_CHECKOUT = alias
  assert.throws(() => assertKitesurfRuntime(recipe, deps), /not a source checkout/)
  for (const path of ['relative/runtime', '/tmp/runtime,readonly=false', '/tmp/run\ntime']) {
    deps.env.KITESURF_CHECKOUT = path
    assert.throws(() => kitesurfRuntimeRoot(recipe, deps), /path must be absolute/)
  }
})

test('the sibling build receipt must identify the exact profile ref, including for an override', () => {
  const { deps, recipe, root } = fixture()
  const override = join(root, 'override-runtime')
  deps.env.KITESURF_CHECKOUT = override
  materializeRuntime(override, recipe)
  const receiptPath = join(dirname(override), 'artifact.json')
  writeFileSync(receiptPath, JSON.stringify({ ref: 'cd'.repeat(20) }))
  assert.throws(() => assertKitesurfRuntime(recipe, deps), /receipt ref does not match profile pin/)
  writeFileSync(receiptPath, 'invalid json')
  assert.throws(() => assertKitesurfRuntime(recipe, deps), /receipt is missing or invalid/)
  writeFileSync(receiptPath, JSON.stringify({ ref: recipe.profile.build.checkout.ref }))
  assert.equal(assertKitesurfRuntime(recipe, deps), override)
})

test('images never fall back to an untagged reference or moving default', () => {
  const { recipe } = fixture()
  for (const image of ['kitesurf-engine', 'kitesurf-engine:latest']) {
    assert.throws(() => kitesurfImage(recipe, { KITESURF_IMAGE: image }), /pinned/)
  }
  assert.equal(kitesurfImage(recipe, { KITESURF_IMAGE: 'test-engine:explicit' }), 'test-engine:explicit')
})

test('prepare creates only from the selected profile runtime and keeps env ports/state isolation', async () => {
  const { deps, recipe, runtime, root } = fixture()
  materializeRuntime(runtime, recipe)
  const state = join(root, 'own-state')
  deps.env.KITESURF_STATE = state
  const backend = backendFor(null)
  const result = await prepare(deps, backend)
  assert.equal(result.status, 200)
  assert.equal(result.body.action, 'created')
  assert.equal(backend.calls.length, 1)
  const [action, spec] = backend.calls[0]
  assert.equal(action, 'create')
  assert.equal(spec.containerName, 'kitesurf-dev')
  assert.equal(spec.image, kitesurfImage(recipe, deps.env))
  assert.deepEqual(spec.resources, { cpus: 6, memory: '6G' })
  assert.equal(spec.mounts[0].arg, `type=virtiofs,source=${runtime},target=/opt/kitesurf,readonly`)
  assert.equal(spec.mounts[2].arg, `type=virtiofs,source=${state},target=/var/lib/kitesurf-state`)
  assert.deepEqual(spec.ports, [{ publish: '127.0.0.1:8800:8787' }, { publish: '127.0.0.1:8801:8791' }])
})

test('prepare is honest about missing builds, including before destructive resource reconciliation', async () => {
  const { deps, runtime, root } = fixture()
  for (const info of [null, inspected({ cpus: 4, memoryInBytes: 4 * 1024 ** 3 })]) {
    const backend = backendFor(info)
    const result = await prepare(deps, backend)
    assert.equal(result.status, 400)
    assert.equal(result.body.ok, false)
    assert.match(result.body.error, /built runtime receipt is missing or invalid/)
    assert.deepEqual(backend.calls, [])
  }
  assert.equal(existsSync(runtime), false)
  assert.equal(existsSync(join(root, '.dsh-kitesurf-state-dev')), false)
})

test('existing running/stopped containers remain adoptable without rebuilding runtime', async () => {
  const { deps } = fixture()
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
  const { deps, runtime, recipe } = fixture()
  materializeRuntime(runtime, recipe)
  const backend = backendFor(inspected({ cpus: 4, memoryInBytes: 4 * 1024 ** 3 }))
  const result = await prepare(deps, backend)
  assert.equal(result.status, 200)
  assert.match(result.body.action, /^resized /)
  assert.deepEqual(backend.calls.map(([action]) => action), ['stop', 'remove', 'create'])
  const spec = backend.calls[2][1]
  assert.deepEqual(spec.resources, recipe.resources)
  assert.equal(spec.mounts[2].arg, `type=virtiofs,source=${join(deps.env.HOME, '.dsh-kitesurf-state-dev')},target=/var/lib/kitesurf-state`)
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
