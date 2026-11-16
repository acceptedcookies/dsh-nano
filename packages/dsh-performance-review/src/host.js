/**
 * dsh-performance-review — host singleton.
 *
 * One process owns one `globalThis[Symbol.for('dsh.perfReviewHost.v2')]`
 * (T-O-PRE1116-07). The legacy string key is never read, written, migrated,
 * or upgraded. Enablement is `DSH_PERF_REVIEW=1`, read lazily at the first
 * span or snapshot. There is no writer and no `setEnabled`.
 */

import {
  LIB_VERSION,
  NAME_RE,
  HOST_KEY,
  BUILD_STAMP,
  percentile,
  createSpanRow,
  createStructure,
  installSingleton,
  RESERVOIR_CAP,
  MAX_USAGE_KEYS,
  roundMs,
} from './state.js'

/** Bound the per-span window sample list (T-O-PRE1116-08.7). */
const WINDOW_SAMPLE_CAP = 512
/** Ring of recent {ms,at,err} events per span. */
const EVENT_CAP = 32

const isPromiseLike = value => value !== null && typeof value === 'object' && typeof value.then === 'function'

function spanStats(span) {
  const reservoir = span.reservoir ?? []
  return {
    n: span.n,
    p50: roundMs(percentile(reservoir, 0.5)),
    p95: roundMs(percentile(reservoir, 0.95)),
    max: roundMs(reservoir.length === 0 ? null : Math.max(...reservoir)),
    errors: span.errors ?? 0,
    lastMs: span.lastMs ?? null,
    lastAt: span.lastAt ?? null,
    lastErrorAt: span.lastErrorAt ?? null,
  }
}

/**
 * Cumulative host view. Does not delete samples.
 * @param {object} state
 */
export function hostSnapshot(state) {
  const plugins = {}
  for (const [pluginId, row] of state.plugins) {
    const spans = {}
    for (const [name, span] of row.spans) {
      spans[name] = {
        n: span.n,
        samples: [...span.reservoir],
        windowN: span.window.length,
        windowSamples: [...span.window],
        stats: spanStats(span),
        events: [...(span.events ?? [])],
      }
    }
    const counts = {}
    if (row.counts instanceof Map) {
      for (const [name, n] of row.counts) counts[name] = n
    }
    plugins[pluginId] = { version: row.version ?? null, spans, counts }
  }
  return {
    version: 2,
    enabled: state.enabled === true,
    contributors: state.contributors.map(item => ({ ...item })),
    sinceStart: state.sinceStart,
    epoch: state.epoch,
    seq: state.seq,
    cursor: state.cursor,
    writtenAt: state.sinceStart,
    plugins,
    structure: { ...state.structure, audits: [...(state.structure.audits ?? [])] },
  }
}

/**
 * Parse a cursor. Returns `{epoch, seq}` or `{error:true}`.
 * A bare non-negative integer uses the host epoch (T-O-PRE1116-08.7).
 */
export function parseCursor(since, epoch) {
  if (typeof since === 'number') {
    if (!Number.isInteger(since) || since < 0) return { error: true }
    return { epoch, seq: since }
  }
  if (typeof since === 'string') {
    const dot = since.lastIndexOf('.')
    if (dot <= 0) return { error: true }
    const ep = since.slice(0, dot)
    const seq = Number(since.slice(dot + 1))
    if (ep.length === 0 || !Number.isInteger(seq) || seq < 0) return { error: true }
    return { epoch: ep, seq }
  }
  if (since !== null && typeof since === 'object' && !Array.isArray(since)) {
    const seq = since.seq
    if (since.epoch == null || !Number.isInteger(seq) || seq < 0) return { error: true }
    return { epoch: String(since.epoch), seq }
  }
  return { error: true }
}

function collectRows(state, predicate) {
  const rows = []
  const truncated = []
  for (const [pluginId, row] of state.plugins) {
    for (const [name, span] of row.spans) {
      const minKept = span.minKeptSeq
      if (predicate && minKept != null) {
        // Samples with seq > since that have already left the log.
        const floor = predicate.seq
        if (floor + 1 < minKept) {
          truncated.push({ pluginId, name, lost: minKept - floor - 1 })
        }
      } else if (!predicate && (span.lost ?? 0) > 0) {
        truncated.push({ pluginId, name, lost: span.lost })
      }
      for (const event of span.log ?? []) {
        if (predicate && !(event.seq > predicate.seq)) continue
        rows.push({
          seq: event.seq,
          pluginId,
          name,
          ms: event.ms,
          err: event.err === true,
          at: event.at,
        })
      }
    }
  }
  rows.sort((a, b) => a.seq - b.seq)
  return { rows, truncated }
}

/**
 * @param {object} [env]
 */
export function createPerfReviewHost(env = {}) {
  const processRef = env.process ?? globalThis.process
  const epoch = env.epoch != null ? String(env.epoch) : Math.floor(Math.random() * 1e9).toString(36)
  const state = {
    enabled: env.forceEnabled !== undefined ? env.forceEnabled === true : null,
    plugins: new Map(),
    contributors: [],
    contributorKeys: new Set(),
    sinceStart: new Date().toISOString(),
    epoch,
    seq: 0,
    cursor: 0,
    structure: createStructure(),
    _build: env.build ?? BUILD_STAMP,
  }

  const isEnabled = () => {
    if (state.enabled === null) {
      state.enabled = env.forceEnabled !== undefined
        ? env.forceEnabled === true
        : processRef?.env?.DSH_PERF_REVIEW === '1'
    }
    return state.enabled === true
  }

  const recordSpan = (row, name, t0, t1, err) => {
    if (!isEnabled()) return
    let span = row.spans.get(name)
    if (span === undefined) {
      span = createSpanRow()
      span.errors = 0
      span.events = []
      span.log = []
      span.lost = 0
      span.minKeptSeq = null
      row.spans.set(name, span)
    }
    span.n += 1
    const ms = t1 - t0
    const at = new Date().toISOString()
    const seq = state.seq + 1
    state.seq = seq
    span.lastMs = ms
    span.lastAt = at
    if (err) {
      span.errors += 1
      span.lastErrorAt = at
    }
    span.window.push(ms)
    while (span.window.length > WINDOW_SAMPLE_CAP) span.window.shift()
    if (span.reservoir.length < RESERVOIR_CAP) span.reservoir.push(ms)
    else {
      const slot = Math.floor(Math.random() * span.n)
      if (slot < RESERVOIR_CAP) span.reservoir[slot] = ms
    }
    const rounded = Math.round(ms * 10) / 10
    span.events.push({ ms: rounded, at, err: err === true, seq })
    while (span.events.length > EVENT_CAP) span.events.shift()
    span.log.push({ seq, ms, err: err === true, at })
    while (span.log.length > WINDOW_SAMPLE_CAP) {
      span.log.shift()
      span.lost += 1
      span.minKeptSeq = span.log[0]?.seq ?? null
    }
  }

  const hostJoin = (pluginId, impl = {}) => {
    let row = state.plugins.get(pluginId)
    if (row === undefined) {
      row = { version: impl.version ?? null, spans: new Map(), counts: new Map() }
      state.plugins.set(pluginId, row)
    }
    if (!(row.counts instanceof Map)) row.counts = new Map()
    const libVersion = impl.libVersion ?? LIB_VERSION
    const key = `${pluginId}@${libVersion}`
    if (!state.contributorKeys.has(key)) {
      state.contributorKeys.add(key)
      state.contributors.push({ pluginId, libVersion })
    }
    const clock = env.performance ?? globalThis.performance
    const now = () => clock.now()
    return {
      /**
       * hostSpan(name, fn, ctx?). ctx is ignored: traceId is not stored
       * (T-O-PRE1116-12 / P3-06). A name that fails NAME_RE still runs `fn`,
       * increments `structure.unmappedKey`, and is not recorded.
       */
      hostSpan(name, fn, _ctx) {
        if (typeof name !== 'string' || !NAME_RE.test(name)) {
          state.structure.unmappedKey += 1
          return fn()
        }
        const t0 = now()
        let result
        try {
          result = fn()
        } catch (error) {
          recordSpan(row, name, t0, now(), true)
          throw error
        }
        if (isPromiseLike(result)) {
          return result.then(
            value => { recordSpan(row, name, t0, now(), false); return value },
            error => { recordSpan(row, name, t0, now(), true); throw error },
          )
        }
        recordSpan(row, name, t0, now(), false)
        return result
      },
      count(name, n = 1) {
        if (!NAME_RE.test(name) || !isEnabled()) return
        if (!(row.counts instanceof Map)) row.counts = new Map()
        if (!row.counts.has(name) && row.counts.size >= MAX_USAGE_KEYS) return
        row.counts.set(name, (row.counts.get(name) ?? 0) + n)
      },
      snapshot: () => { isEnabled(); return hostSnapshot(state) },
      read: query => read(query),
    }
  }

  /**
   * Rows with `seq > since`. Does not delete samples (T-O-PRE1116-08.8).
   * `mode` or an illegal cursor → status 400 and no mutation.
   * Epoch mismatch → status 200, cumulative rows, `truncated` contains `'epoch'`.
   */
  const read = (query = {}) => {
    const seq = state.seq
    const base = {
      epoch: state.epoch,
      seq,
      cursor: state.cursor,
      next: `${state.epoch}.${seq}`,
    }
    if (query != null && query.mode !== undefined) {
      return { status: 400, error: 'mode', basis: null, rows: [], truncated: [], ...base }
    }
    if (query == null || query.since === undefined) {
      const { rows, truncated } = collectRows(state, null)
      return { status: 200, basis: 'cumulative', rows, truncated, ...base }
    }
    const parsed = parseCursor(query.since, state.epoch)
    if (parsed.error) {
      return { status: 400, error: 'cursor', basis: null, rows: [], truncated: [], ...base }
    }
    if (parsed.epoch !== state.epoch) {
      const { rows } = collectRows(state, null)
      return { status: 200, basis: 'cumulative', rows, truncated: ['epoch'], ...base }
    }
    const { rows, truncated } = collectRows(state, { seq: parsed.seq })
    return { status: 200, basis: 'window', rows, truncated, ...base }
  }

  return {
    hostJoin,
    read,
    snapshot: () => { isEnabled(); return hostSnapshot(state) },
    _state: () => state,
    _build: state._build,
    libVersion: LIB_VERSION,
  }
}

export { LIB_VERSION }

/**
 * Install-or-reuse the process singleton on the v2 symbol only.
 * @param {object} [env]
 */
/**
 * GET handler for `/<prefix>/perf-review/host` (T-O-PRE1116-10.1 / 10.2).
 * Only `since` is accepted. `mode` and any other query key are 400.
 * The body is the cursor view. It does not echo the URL, session, or headers.
 * @param {object} req
 * @param {object} res
 * @param {{ read: (query?: object) => object }} host
 */
export function handleHostRead(req, res, host) {
  const method = req?.method ?? 'GET'
  const finish = (status, body) => {
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    if (method === 'HEAD') res.end()
    else res.end(JSON.stringify(body))
  }
  if (method !== 'GET' && method !== 'HEAD') {
    finish(405, { status: 405, error: 'method' })
    return
  }
  let keys = []
  try {
    const url = new URL(req?.url ?? '/', 'http://localhost')
    keys = [...url.searchParams.keys()]
    const extra = keys.filter(key => key !== 'since')
    if (extra.length > 0) {
      finish(400, { status: 400, error: extra.includes('mode') ? 'mode' : 'query' })
      return
    }
    const since = url.searchParams.get('since')
    const view = host.read(since == null ? {} : { since })
    finish(view.status ?? 200, view)
  } catch {
    finish(400, { status: 400, error: 'query' })
  }
}

export function ensurePerfReviewHost(env = {}) {
  const global = env.global ?? globalThis
  const stamp = env.build ?? BUILD_STAMP
  return installSingleton(global, HOST_KEY, '__perfReviewHost', stamp, () => createPerfReviewHost(env))
}
