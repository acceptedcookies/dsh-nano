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

test('enabled: writer armed lazily (first read, not hostJoin), hostSpan times to settle', async () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-explorer-extra', { version: '0.1.1' })
  assert.equal(env.timers.length, 0) // lazy resolution — apply() may set the env var after import
  host.snapshot() // first enablement read arms the writer
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

test('flush writes host.json + host-snapshots.jsonl under data dir (P1-4 time series)', async () => {
  const env = fakeEnv()
  env.fs.readFile = async () => { throw new Error('ENOENT') }
  const host = createPerfReviewHost(env)
  host.hostJoin('nano-x')
  host.snapshot() // resolve enablement lazily before flushing (first read wins)
  await host.flush()
  assert.equal(env.fs.writes.length, 2)
  assert.ok(env.fs.writes[0].path.endsWith('/tmp/dsh-test/plugins/perf-review/host.json'))
  assert.ok(env.fs.writes[1].path.endsWith('/tmp/dsh-test/plugins/perf-review/host-snapshots.jsonl'))
  const parsed = JSON.parse(env.fs.writes[0].data)
  assert.equal(parsed.version, 2)
  assert.equal(parsed.enabled, true)
  const seriesRow = JSON.parse(env.fs.writes[1].data.trim())
  assert.ok(typeof seriesRow.at === 'string')
  assert.ok('plugins' in seriesRow)
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

test('P1-4: span rows carry pre-aggregated stats + {ms,at,err} event ring', async () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  api.hostSpan('shot', () => env.performance.advance(10), { traceId: 'inc-7' })
  api.hostSpan('shot', () => env.performance.advance(30))
  try { api.hostSpan('shot', () => { env.performance.advance(5); throw new Error('k') }) } catch {}
  const span = host.snapshot().plugins['nano-x'].spans.shot
  assert.equal(span.n, 3)
  assert.equal(span.stats.errors, 1)
  assert.equal(span.stats.max, 30)
  assert.equal(typeof span.stats.p50, 'number')
  assert.equal(typeof span.stats.p95, 'number')
  assert.ok(span.stats.lastErrorAt)
  assert.equal(span.stats.lastTraceId, 'inc-7')
  assert.equal(span.events.length, 3)
  assert.equal(span.events[0].traceId, 'inc-7')
  assert.equal(span.events[2].err, true)
})

test('P1-4: count() accumulates per-name counters into snapshot', () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  api.count('shots-taken')
  api.count('shots-taken', 2)
  const counts = host.snapshot().plugins['nano-x'].counts
  assert.equal(counts['shots-taken'], 3)
})

test('P1-4: async rejection marks err=true (was invisible via finally)', async () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  await assert.rejects(() => api.hostSpan('net', () => Promise.reject(new Error('timeout'))))
  const span = host.snapshot().plugins['nano-x'].spans.net
  assert.equal(span.stats.errors, 1)
  assert.equal(span.events[0].err, true)
})
