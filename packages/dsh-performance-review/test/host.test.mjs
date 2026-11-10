import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPerfReviewHost, ensurePerfReviewHost } from '../src/host.js'
import { RESERVOIR_CAP } from '../src/state.js'

const fakeEnv = (over = {}) => {
  const timers = []
  return {
    process: {
      env: { DSH_PERF_REVIEW: '1', DSH_DATA_DIR: '/tmp/dsh-test' },
      once: () => {},
    },
    setInterval: fn => { timers.push(fn); return { unref() {} } },
    fs: {
      writes: [],
      async mkdir() {},
      async writeFile(path, data) { this.writes.push({ path, data }) },
    },
    path: { join: (...parts) => parts.join('/') },
    performance: { t: 0, now() { return this.t }, advance(ms) { this.t += ms } },
    global: {},
    timers,
    ...over,
  }
}

test('disabled without env flag: passthrough hostSpan, no writer', () => {
  const env = fakeEnv()
  env.process.env = {}
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  let ran = 0
  api.hostSpan('save', () => { ran += 1 })
  assert.equal(ran, 1)
  assert.equal(env.timers.length, 0) // writer never started
  assert.equal(host.snapshot().enabled, false)
})

test('enabled: writer armed, timer unref-able, hostSpan times to settle', async () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-explorer-extra', { version: '0.1.1' })
  assert.equal(env.timers.length, 1)

  api.hostSpan('git-status', () => { env.performance.advance(12) })
  await api.hostSpan('list', () => Promise.resolve().then(() => env.performance.advance(8)))

  const snap = host.snapshot()
  assert.equal(snap.enabled, true)
  assert.deepEqual(snap.contributors, [{ pluginId: 'nano-explorer-extra', libVersion: '0.1.0' }])
  const spans = snap.plugins['nano-explorer-extra'].spans
  assert.equal(spans['git-status'].n, 1)
  assert.equal(spans['git-status'].samples[0], 12)
  assert.equal(spans['list'].n, 1)
  assert.equal(spans['list'].samples[0], 8)
})

test('writeFile failures count hostWriteErrors; no throw, no retry', async () => {
  const env = fakeEnv()
  env.fs.writeFile = async () => { throw new Error('disk full') }
  const host = createPerfReviewHost(env)
  host.hostJoin('nano-x')
  await host.flush()
  await host.flush()
  assert.equal(host.snapshot().structure.hostWriteErrors, 2)
})

test('flush writes plugins/perf-review/host.json under data dir', async () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  host.hostJoin('nano-x')
  await host.flush()
  assert.equal(env.fs.writes.length, 1)
  assert.ok(env.fs.writes[0].path.endsWith('/tmp/dsh-test/plugins/perf-review/host.json'))
  const parsed = JSON.parse(env.fs.writes[0].data)
  assert.equal(parsed.version, 1)
  assert.equal(parsed.enabled, true)
})

test('reservoir caps host span samples at RESERVOIR_CAP', () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  for (let i = 0; i < 200; i += 1) api.hostSpan('s', () => env.performance.advance(1))
  const span = host.snapshot().plugins['nano-x'].spans.s
  assert.equal(span.n, 200)
  assert.equal(span.samples.length, RESERVOIR_CAP)
})

test('two bundled copies share one process singleton', () => {
  const global = {}
  const a = ensurePerfReviewHost(fakeEnv({ global }))
  const b = ensurePerfReviewHost(fakeEnv({ global }))
  assert.equal(a, b)
})

test('sync hostSpan that throws still records and rethrows', () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  assert.throws(() => api.hostSpan('boom', () => { env.performance.advance(4); throw new Error('x') }))
  const span = host.snapshot().plugins['nano-x'].spans.boom
  assert.equal(span.n, 1)
  assert.equal(span.samples[0], 4)
})
