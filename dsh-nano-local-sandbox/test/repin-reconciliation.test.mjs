import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { inspectedRecipe, recipeDrift } from '../src/host/kitesurf-reconciliation.js'
import { KITESURF_RUNTIME_FILES, kitesurfImage, kitesurfRecipe, kitesurfRuntimeRoot } from '../src/host/kitesurf-runtime.js'
import { routeSpecs } from '../src/host/routes.js'

const profileDir = fileURLToPath(new URL('../profiles/kitesurf/', import.meta.url))

function fixture({ built = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dnls-reconcile-'))
  const profilesRoot = join(root, 'profiles')
  const profile = join(profilesRoot, 'kitesurf')
  mkdirSync(profile, { recursive: true })
  for (const file of ['profile.yaml', 'Dockerfile', 'entrypoint.sh', 'mcp-bridge.mjs']) {
    cpSync(join(profileDir, file), join(profile, file))
  }
  const yaml = join(profile, 'profile.yaml')
  const ref = 'be'.repeat(20)
  writeFileSync(yaml, readFileSync(yaml, 'utf8')
    .replace(/ref: [0-9a-f]{40}/, `ref: ${ref}`)
    .replace(/image: [^\r\n]+/, `image: fixture-engine:${ref}`))
  const deps = { profilesRoot, env: { HOME: root, DSH_HOME: join(root, '.dsh-dev') } }
  const recipe = kitesurfRecipe(deps)
  const runtime = kitesurfRuntimeRoot(recipe, deps)
  const state = join(root, 'adopted-state')
  mkdirSync(state)
  writeFileSync(join(state, 'durable-marker'), 'keep me\n')
  if (built) {
    mkdirSync(dirname(runtime), { recursive: true })
    writeFileSync(join(dirname(runtime), 'artifact.json'), JSON.stringify({ ref }))
    for (const file of [recipe.profile.build.checkout.verify, ...KITESURF_RUNTIME_FILES]) {
      const path = join(runtime, file)
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, 'nonempty derived output\n')
    }
    mkdirSync(join(runtime, 'node_modules'))
  }
  return { root, deps, recipe, runtime, state, image: kitesurfImage(recipe, deps.env) }
}

function inspected(f, overrides = {}, state = 'running') {
  return { raw: JSON.stringify([{ status: { state }, configuration: {
    image: { reference: `docker.io/library/${f.image}`, descriptor: { digest: `sha256:${'ab'.repeat(32)}` } },
    mounts: [
      { destination: '/opt/kitesurf', source: f.runtime, type: { virtiofs: {} }, options: ['ro'] },
      { destination: '/opt/kitesurf/packages/engine/.wrangler', source: 'tmpfs', type: { tmpfs: {} }, options: [] },
      { destination: '/var/lib/kitesurf-state', source: f.state, type: { virtiofs: {} }, options: [] },
    ],
    publishedPorts: [
      { containerPort: 8787, hostPort: 48798, hostAddress: '127.0.0.1' },
      { containerPort: 8791, hostPort: 48799, hostAddress: '127.0.0.1' },
    ],
    resources: { cpus: f.recipe.resources.cpus, memoryInBytes: 4 * 1024 ** 3 },
    initProcess: { environment: ['DNLS_HOME=/opt/kitesurf'] },
    labels: { 'fixture.recipe': 'visible' },
    ...overrides,
  } }]) }
}

function backendFor(info, failAt) {
  const calls = []
  return {
    calls,
    async inspect() { return info },
    async stop(name) { calls.push(['stop', name]); if (failAt === 'stop') throw new Error('stop refused') },
    async remove(name) { calls.push(['remove', name]); if (failAt === 'remove') throw new Error('remove refused') },
    async create(spec) { calls.push(['create', spec]) },
    async start(name) { calls.push(['start', name]) },
  }
}

function cachedSession(calls) {
  const client = { alive: true, close() { calls.push(['close']) } }
  return { phase: 'running', history: [], cdp: client }
}

async function prepare(f, backend, session = { phase: 'idle', history: [] }, extra = {}) {
  const route = routeSpecs({ ...f.deps, backend, session, prepareTimeoutMs: 0, httpProbe: () => false, ...extra })
    .find((row) => row.path.endsWith('/recover'))
  let raw
  const res = { statusCode: 0, end(text) { raw = text } }
  await route.handler({ method: 'POST', url: route.path, body: {} }, res)
  return { status: res.statusCode, body: JSON.parse(raw) }
}

function assertPreserved(f, spec) {
  assert.equal(spec.containerName, 'kitesurf-dev')
  assert.equal(spec.image, f.image)
  assert.deepEqual(spec.resources, f.recipe.resources)
  assert.deepEqual(spec.mounts, [
    { arg: `type=virtiofs,source=${f.runtime},target=/opt/kitesurf,readonly` },
    { arg: 'type=tmpfs,target=/opt/kitesurf/packages/engine/.wrangler' },
    { arg: `type=virtiofs,source=${f.state},target=/var/lib/kitesurf-state` },
  ])
  assert.deepEqual(spec.ports, [{ publish: '127.0.0.1:48798:8787' }, { publish: '127.0.0.1:48799:8791' }])
  assert.equal(readFileSync(join(f.state, 'durable-marker'), 'utf8'), 'keep me\n')
}

test('inspect retains Apple image reference/digest, actual mounts and GC/recipe evidence', () => {
  const f = fixture({ built: false })
  const configuration = JSON.parse(inspected(f).raw)[0].configuration
  const info = inspectedRecipe(configuration)
  assert.equal(info.imageRef, `docker.io/library/${f.image}`)
  assert.equal(info.imageDigest, `sha256:${'ab'.repeat(32)}`)
  assert.equal(info.runtimeSource, f.runtime)
  assert.equal(info.stateSource, f.state)
  assert.deepEqual(info.mounts[0], { source: f.runtime, target: '/opt/kitesurf', type: { virtiofs: {} }, options: ['ro'] })
  assert.deepEqual(info.environment, ['DNLS_HOME=/opt/kitesurf'])
  assert.deepEqual(info.labels, { 'fixture.recipe': 'visible' })
  assert.equal(recipeDrift(info, { image: f.image, runtimeRoot: f.runtime }), null)
})

test('image aliases compare equally and absent fixture fields or GC env do not invent drift', () => {
  for (const reference of ['engine:pin', 'docker.io/engine:pin', 'docker.io/library/engine:pin', 'index.docker.io/library/engine:pin']) {
    assert.equal(recipeDrift(inspectedRecipe({ image: { reference } }), { image: 'engine:pin', runtimeRoot: '/new/runtime' }), null)
  }
  assert.equal(recipeDrift(inspectedRecipe({ image: 'org/engine:pin' }), { image: 'docker.io/org/engine:pin' }), null)
  for (const configuration of [{}, { mounts: [] }, { mounts: [{ target: '/unrelated', source: '/work' }] }, { initProcess: { environment: [] } }]) {
    assert.equal(recipeDrift(inspectedRecipe(configuration), { image: 'engine:pin', runtimeRoot: '/new/runtime' }), null)
  }
  assert.match(recipeDrift(inspectedRecipe({ image: 'engine:old' }), { image: 'engine:pin' }), /image/)
  assert.match(recipeDrift(inspectedRecipe({ mounts: [{ target: '/opt/kitesurf', source: '/old/runtime' }] }), { runtimeRoot: '/new/runtime' }), /runtime/)
})

test('a missing new image preserves the old running or stopped container and socket', async (t) => {
  for (const state of ['running', 'stopped']) await t.test(state, async () => {
    const f = fixture()
    const backend = backendFor(inspected(f, { image: 'fixture-engine:old' }, state))
    backend.ensureImage = async () => { backend.calls.push(['ensureImage']); throw new Error('image missing') }
    const session = cachedSession(backend.calls)
    const result = await prepare(f, backend, session)
    assert.equal(result.status, 502)
    assert.deepEqual(backend.calls.map(([action]) => action), ['ensureImage'])
    assert.ok(session.cdp)
    assert.equal(readFileSync(join(f.state, 'durable-marker'), 'utf8'), 'keep me\n')
  })
})

test('image-only and runtime-only drift each recreate a running container with the current recipe', async (t) => {
  for (const field of ['image', 'mounts']) await t.test(field, async () => {
    const f = fixture()
    const overrides = field === 'image'
      ? { image: { reference: 'docker.io/library/fixture-engine:old' } }
      : { mounts: JSON.parse(inspected(f).raw)[0].configuration.mounts.map((mount) => mount.destination === '/opt/kitesurf' ? { ...mount, source: '/old/derived/runtime' } : mount) }
    const backend = backendFor(inspected(f, overrides))
    const session = cachedSession(backend.calls)
    const result = await prepare(f, backend, session)
    assert.equal(result.status, 200)
    assert.equal(result.body.action, 'recreated')
    assert.deepEqual(backend.calls.map(([action]) => action), ['stop', 'close', 'remove', 'create'])
    assert.equal(session.cdp, null)
    assert.equal(session.cdpGeneration, 1)
    assertPreserved(f, backend.calls[3][1])
  })
})

test('stopped containers reconcile recipe/resource drift before any start', async (t) => {
  for (const drift of ['image', 'mounts', 'resources']) await t.test(drift, async () => {
    const f = fixture()
    const overrides = drift === 'image' ? { image: 'fixture-engine:old' }
      : drift === 'mounts' ? { mounts: JSON.parse(inspected(f).raw)[0].configuration.mounts.map((mount) => mount.destination === '/opt/kitesurf' ? { ...mount, source: '/old/runtime' } : mount) }
        : { resources: { cpus: 2, memoryInBytes: 2 * 1024 ** 3 } }
    const backend = backendFor(inspected(f, overrides, 'stopped'))
    const session = cachedSession(backend.calls)
    const result = await prepare(f, backend, session)
    assert.equal(result.status, 200)
    assert.match(result.body.action, drift === 'resources' ? /^resized / : /^recreated$/)
    assert.deepEqual(backend.calls.map(([action]) => action), ['close', 'remove', 'create'])
    assert.equal(session.cdpGeneration, 1)
    assertPreserved(f, backend.calls[2][1])
  })
})

test('combined recipe/resource drift recreates once and a second prepare is noop', async () => {
  const f = fixture()
  const old = inspected(f, { image: 'fixture-engine:old', resources: { cpus: 2, memoryInBytes: 2 * 1024 ** 3 } })
  const backend = backendFor(old)
  let current = old
  backend.inspect = async () => current
  backend.create = async (spec) => { backend.calls.push(['create', spec]); current = inspected(f) }
  const first = await prepare(f, backend)
  assert.equal(first.body.action, 'recreated')
  assert.deepEqual(backend.calls.map(([action]) => action), ['stop', 'remove', 'create'])
  assertPreserved(f, backend.calls[2][1])
  backend.calls.length = 0
  const second = await prepare(f, backend)
  assert.equal(second.body.action, 'noop')
  assert.deepEqual(backend.calls, [])
})

test('missing, incomplete or wrong-receipt new runtime never stops/removes/starts the old container', async (t) => {
  for (const state of ['running', 'stopped']) for (const fault of ['missing', 'incomplete', 'receipt']) await t.test(`${state}/${fault}`, async () => {
    const f = fixture({ built: fault !== 'missing' })
    if (fault === 'incomplete') writeFileSync(join(f.runtime, KITESURF_RUNTIME_FILES[0]), '')
    if (fault === 'receipt') writeFileSync(join(dirname(f.runtime), 'artifact.json'), JSON.stringify({ ref: 'cd'.repeat(20) }))
    const backend = backendFor(inspected(f, { image: 'fixture-engine:old' }, state))
    const session = cachedSession(backend.calls)
    const original = session.cdp
    const result = await prepare(f, backend, session)
    assert.equal(result.status, 400)
    assert.equal(result.body.ok, false)
    assert.match(result.body.error, /built runtime/)
    assert.deepEqual(backend.calls, [])
    assert.equal(session.cdp, original)
    assert.equal(session.cdpGeneration, undefined)
    assert.equal(existsSync(join(f.root, '.dsh-kitesurf-state-dev')), false)
  })
})

test('stop/remove errors propagate and never create; CDP resets only once stopped', async (t) => {
  for (const failed of ['stop', 'remove']) await t.test(failed, async () => {
    const f = fixture()
    const backend = backendFor(inspected(f, { image: 'fixture-engine:old' }), failed)
    const session = cachedSession(backend.calls)
    const original = session.cdp
    const result = await prepare(f, backend, session)
    assert.equal(result.status, 502)
    assert.equal(result.body.ok, false)
    assert.match(result.body.error, new RegExp(`${failed} refused`))
    assert.deepEqual(backend.calls.map(([action]) => action), failed === 'stop' ? ['stop'] : ['stop', 'close', 'remove'])
    assert.equal(session.cdp, failed === 'stop' ? original : null)
    assert.equal(session.cdpGeneration, failed === 'stop' ? undefined : 1)
  })
})

test('http-only recovery also resets CDP only after its stop succeeds', async () => {
  const f = fixture({ built: false })
  for (const failAt of [undefined, 'stop']) {
    const backend = backendFor(inspected(f), failAt)
    const session = cachedSession(backend.calls)
    session.cdp.probedAt = Date.now()
    session.cdp.send = async () => { throw new Error('probe timed out') }
    const original = session.cdp
    const result = await prepare(f, backend, session, {
      httpProbe: () => true,
      connect: async () => ({ async send() { throw new Error('probe timed out') } }),
    })
    assert.equal(result.body.action, failAt ? 'noop' : 'restarted')
    assert.deepEqual(backend.calls.map(([action]) => action), failAt ? ['stop'] : ['stop', 'close', 'start'])
    assert.equal(session.cdpGeneration, failAt ? undefined : 1)
    if (failAt) assert.equal(session.cdp, original)
    else assert.notEqual(session.cdp, original)
  }
})

test('matching production inspect is noop/resume with no runtime build and retains the live CDP socket', async () => {
  const f = fixture({ built: false })
  for (const state of ['running', 'stopped']) {
    const backend = backendFor(inspected(f, {}, state))
    const session = cachedSession(backend.calls)
    const original = session.cdp
    const result = await prepare(f, backend, session)
    assert.equal(result.status, 200)
    assert.equal(result.body.action, state === 'running' ? 'noop' : 'started')
    assert.deepEqual(backend.calls, state === 'running' ? [] : [['start', 'kitesurf-dev']])
    assert.equal(session.cdp, original)
    assert.equal(session.cdpGeneration, undefined)
  }
})
