import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createPerfReviewHost, ensurePerfReviewHost, handleHostRead } from '../src/host.js'
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

test('enabled: no writer; hostSpan times to settle', async () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-explorer-extra', { version: '0.1.1' })
  assert.equal(env.timers.length, 0)
  host.snapshot()
  assert.equal(env.timers.length, 0)
  assert.equal(host.flush, undefined)
  assert.equal(host.setEnabled, undefined)
  assert.equal(host.takeWindow, undefined)

  api.hostSpan('git-status', () => { env.performance.advance(12) })
  await api.hostSpan('list', () => Promise.resolve().then(() => env.performance.advance(8)))

  const snap = host.snapshot()
  assert.equal(snap.enabled, true)
  assert.deepEqual(snap.contributors, [{ pluginId: 'nano-explorer-extra', build: snap.contributors[0].build }])
  const spans = snap.plugins['nano-explorer-extra'].spans
  assert.equal(spans['git-status'].n, 1)
  assert.equal(spans['git-status'].samples[0], 12)
  assert.equal(spans['list'].n, 1)
  assert.equal(spans['list'].samples[0], 8)
})

test('read({ since }) does not delete; cutWindow advances the cursor', () => {
  const env = fakeEnv({ epoch: 'e1' })
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  api.hostSpan('list', () => { env.performance.advance(4) })
  api.hostSpan('list', () => { env.performance.advance(6) })
  const seq = host._state().seq
  const first = host.read({ since: 'e1.0' })
  const second = host.read({ since: 0 })
  assert.equal(first.status, 200)
  assert.equal(first.basis, 'window')
  assert.equal(first.rows.length, 2)
  assert.equal(second.rows.length, 2)
  assert.equal(host._state().seq, seq)
  const early = host.read({ since: 'e1.1' })
  assert.equal(early.rows.length, 1)
  assert.equal(early.rows[0].seq, 2)
  assert.equal(host.cutWindow, undefined)
  assert.equal(host.snapshot().plugins['nano-x'].spans.list.n, 2)
  assert.equal(host.snapshot().plugins['nano-x'].spans.list.windowN, 2)
  assert.equal(host.read({ since: `e1.${seq}` }).rows.length, 0)
  assert.equal(host.read({ since: 'e1.0' }).rows.length, 2)
})

test('GET perf-review host accepts only since', () => {
  const env = fakeEnv({ epoch: 'e1' })
  const host = createPerfReviewHost(env)
  host.hostJoin('nano-x').hostSpan('list', () => { env.performance.advance(2) })
  const capture = (url, method = 'GET') => {
    const res = { statusCode: 0, headers: {}, body: '', setHeader(k, v) { this.headers[k] = v }, end(s) { this.body = s ?? '' } }
    handleHostRead({ method, url }, res, host)
    return res
  }
  const ok = capture('/nano-notepad/perf-review/host?since=e1.0')
  assert.equal(ok.statusCode, 200)
  const view = JSON.parse(ok.body)
  assert.equal(view.rows.length, 1)
  assert.equal(ok.body.includes('/nano-notepad'), false)
  const mode = capture('/perf-review/host?mode=window')
  assert.equal(mode.statusCode, 400)
  assert.equal(host.read().rows.length, 1)
  const head = capture('/perf-review/host', 'HEAD')
  assert.equal(head.statusCode, 405)
  const post = capture('/perf-review/host', 'POST')
  assert.equal(post.statusCode, 405)
})

test('observe records a contract row and does not drop earlier spans', () => {
  const env = fakeEnv({ epoch: 'e1' })
  const host = createPerfReviewHost(env)
  host.hostJoin('nano-x').hostSpan('list', () => { env.performance.advance(1) })
  host.observe({ surface: 'http', id: 'nx.health', plugin: 'nano-x', outcome: 'ok', ms: 3, status: 200 })
  host.observe({ surface: 'http', id: null, plugin: 'nano-x', outcome: 'ok', ms: 1 })
  const view = host.read({ since: 'e1.0' })
  assert.equal(view.rows.filter(row => row.kind === 'contract').length, 1)
  assert.equal(view.rows.some(row => row.name === 'list'), true)
  assert.equal(host._state().structure.missingBindingId, 1)
  assert.equal(host.read().rows.length, view.rows.length)
})

test('illegal cursor and mode are 400 and do not drop samples', () => {
  const env = fakeEnv({ epoch: 'e1' })
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  api.hostSpan('list', () => { env.performance.advance(1) })
  const seq = host._state().seq
  const n = host.read().rows.length
  const bad = host.read({ mode: 'window', since: 'e1.0' })
  assert.equal(bad.status, 400)
  assert.equal(bad.rows.length, 0)
  assert.equal(host._state().seq, seq)
  assert.equal(host.read().rows.length, n)
  assert.equal(host.read({ since: 'not-a-cursor' }).status, 400)
  const skew = host.read({ since: 'other.0' })
  assert.equal(skew.status, 200)
  assert.equal(skew.basis, 'cumulative')
  assert.ok(skew.truncated.includes('epoch'))
  assert.equal(skew.rows.length, 1)
})

test('hostSpan names outside NAME_RE increment unmappedKey and still run', () => {
  const env = fakeEnv()
  const host = createPerfReviewHost(env)
  const api = host.hostJoin('nano-x')
  let ran = 0
  api.hostSpan('Bad Name', () => { ran += 1 })
  assert.equal(ran, 1)
  assert.equal(host._state().structure.unmappedKey, 1)
  assert.equal(host.snapshot().plugins['nano-x'].spans['Bad Name'], undefined)
  assert.equal(host.read().rows.length, 0)
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
  assert.equal(span.stats.lastTraceId, undefined)
  assert.equal(span.events.length, 3)
  assert.equal(span.events[0].traceId, undefined)
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
