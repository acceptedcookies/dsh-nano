import { chmodSync, lstatSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const MINUTE = 60_000
const WINDOW = new Map([['24h', 1440], ['7d', 10080], ['30d', 43200]])
const RETAIN = WINDOW.get('30d')
const MAX_OBJECTS = 64
const BUDGET_PAGES = 65536 // At 4 KiB/page, the database cannot exceed 256 MiB.
const uint = value => Number.isSafeInteger(value) && value >= 0
const slot = ms => Math.floor(ms / MINUTE)
const verified = (row, obs) => row.binding.generation && row.binding.generation === obs?.generation &&
  row.binding.locator === obs?.locator && row.stateVolume === obs?.stateVolume
const segmentOf = row => (row.operations ?? []).findLast(op => op.state === 'succeeded' &&
  op.step !== 'already' && ['create', 'start', 'stop', 'restart', 'recreate'].includes(op.action))?.operationId ?? ''

function rates(cur, prev) {
  const elapsed = prev && cur.at - prev.at
  if (cur.state !== 'running' || prev?.state !== 'running' || prev.minute + 1 !== cur.minute ||
      cur.generation !== prev.generation || cur.segment !== prev.segment || !uint(cur.cpu_us) || !uint(prev.cpu_us) ||
      cur.cpu_us < prev.cpu_us || !(elapsed > 0)) return null
  return { cores: (cur.cpu_us - prev.cpu_us) / (1000 * elapsed), elapsed }
}

// Only entire minutes of the authorized managed lifetime enter the denominator.
// The lower bound is the earliest VERIFIED create's finishedAt where the
// ledger carries one — a registered-but-never-created row contributes no
// samples before that mark, and a later recreation never moves it.
function lifetime({ managedAt, operations, binding, visibleFrom = managedAt, visibleUntil = Number.MAX_SAFE_INTEGER }) {
  // A bound-but-never-created row contributes no interval at all.
  if (binding && !binding.generation) return [Number.MAX_SAFE_INTEGER, 0]
  const verified = (Array.isArray(operations) ? operations : [])
    .filter((op) => op.action === 'create' && op.state === 'succeeded' && op.step === 'verify' && typeof op.finishedAt === 'string')
    .map((op) => Date.parse(op.finishedAt))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0]
  const born = verified ?? managedAt
  if (![born, visibleFrom, visibleUntil].every(uint)) throw new TypeError('invalid usage history interval')
  return [Math.ceil(Math.max(born, visibleFrom) / MINUTE), slot(visibleUntil)]
}

/** Opens one sampling writer on a trusted environment registry root. Callers scope history before querying. */
export function openUsageMinutes({ root, envId, registry, observe, backend, clock = Date.now, onError } = {}) {
  const path = join(root, 'usage-minutes.sqlite')
  for (const suffix of ['', '-journal', '-wal', '-shm']) {
    const st = lstatSync(path + suffix, { throwIfNoEntry: false })
    if (st && !st.isFile()) throw new Error('invalid usage store path')
  }
  const db = new DatabaseSync(path)
  try {
    chmodSync(path, 0o600)
    db.exec(`PRAGMA busy_timeout=0; PRAGMA locking_mode=EXCLUSIVE; PRAGMA page_size=4096;
      PRAGMA max_page_count=${BUDGET_PAGES}; BEGIN EXCLUSIVE;
      CREATE TABLE IF NOT EXISTS identity(version INTEGER NOT NULL, env TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS samples (
        id TEXT NOT NULL, minute INTEGER NOT NULL, at INTEGER NOT NULL, generation TEXT, segment TEXT,
        state TEXT NOT NULL, memory_bytes INTEGER, cpu_us INTEGER,
        PRIMARY KEY (id,minute)
      ) WITHOUT ROWID;
      CREATE INDEX IF NOT EXISTS samples_by_time ON samples(minute);`)
    const meta = db.prepare('SELECT version,env FROM identity').all()
    if (!meta.length) db.prepare('INSERT INTO identity VALUES(1,?)').run(envId)
    else if (meta.length !== 1 || meta[0].version !== 1 || meta[0].env !== envId) throw new Error('foreign usage store')
    db.exec('COMMIT')
  } catch (error) {
    db.close()
    throw error
  }
  const prune = db.prepare('DELETE FROM samples WHERE minute < ?')
  const claim = db.prepare("INSERT OR IGNORE INTO samples VALUES(?,?,?,NULL,NULL,'failed',NULL,NULL)")
  const save = db.prepare('UPDATE samples SET at=?,generation=?,segment=?,state=?,memory_bytes=?,cpu_us=? WHERE id=? AND minute=?')
  const range = db.prepare('SELECT minute,at,generation,segment,state,memory_bytes,cpu_us FROM samples WHERE id=? AND minute>=? AND minute<? ORDER BY minute')
  const known = db.prepare('SELECT DISTINCT id FROM samples')
  let flight = null
  let timer = null
  let stopping = false
  let closing = null
  let lastError = null

  async function sample(row, minute) {
    const at = clock()
    if (slot(at) !== minute || !claim.run(row.sandboxId, minute, at).changes) return
    // Reserve the attempt before the probe. A crash leaves a failed sample, not permission to poll twice.
    let obs
    let report
    try {
      obs = await observe(row)
      if (!verified(row, obs)) return
      const segment = segmentOf(row)
      if (obs.state === 'stopped') report = [at, obs.generation, segment, 'stopped', null, null]
      else {
        if (obs.state !== 'running') return
        const sample = await backend.sampleUsage(obs.locator)
        if (sample?.locator !== obs.locator) return
        const measuredAt = clock()
        if (slot(measuredAt) !== minute) return
        const after = await observe(row)
        const current = registry.get(row.sandboxId)
        if (!verified(row, after) || after.state !== 'running' ||
            current?.binding.generation !== obs.generation || segmentOf(current) !== segment) return
        report = [measuredAt, obs.generation, segment, 'running',
          uint(sample.memoryBytes) ? sample.memoryBytes : null,
          uint(sample.cpuUsec) ? sample.cpuUsec : null]
      }
    } catch {
      return // The persisted attempt remains failed; never substitute a zero.
    }
    save.run(...report, row.sandboxId, minute)
  }

  async function pass() {
    const minute = slot(clock())
    prune.run(minute - RETAIN)
    const retained = new Set(known.all().map(r => r.id))
    for (const row of registry.list()) {
      if (stopping || slot(clock()) !== minute) break
      // A bound row without a verified generation was never created — no claim.
      if (row.binding && !row.binding.generation) continue
      if (!retained.has(row.sandboxId) && retained.size >= MAX_OBJECTS) continue
      retained.add(row.sandboxId)
      await sample(row, minute)
    }
  }

  function tick() {
    if (stopping) throw new Error('usage writer closed')
    if (!flight) flight = pass().then(() => { lastError = null }, error => {
      lastError = 'usage sampling unavailable'
      throw error
    }).finally(() => { flight = null })
    return flight
  }

  function start() {
    if (timer || stopping) return
    const run = () => {
      tick().catch(() => onError?.('usage sampling unavailable')).finally(() => {
        if (!stopping) timer = setTimeout(run, MINUTE - clock() % MINUTE).unref()
      })
    }
    timer = setTimeout(run, MINUTE - clock() % MINUTE).unref()
  }

  function summary(scope, window) {
    if (!WINDOW.has(window)) throw new TypeError('unsupported usage window')
    const [born, until] = lifetime(scope)
    const end = slot(clock())
    const lo = Math.max(end - WINDOW.get(window), born)
    const hi = Math.min(end, until)
    const expected = Math.max(0, hi - lo)
    const samples = range.all(scope.sandboxId, Math.max(born, lo - 1), hi)
    const states = { running: 0, stopped: 0, failed: 0, missing: expected }
    // Bin only authorized, completed UTC minutes. Keep validity counts per
    // metric: a hole in the chart is not a sample with a value of zero.
    const stride = Math.max(1, Math.ceil(expected / 36))
    const bins = Array.from({ length: Math.ceil(expected / stride) }, (_, i) => ({
      at: (lo + i * stride) * MINUTE, minutes: Math.min(stride, expected - i * stride),
      memoryValid: 0, cpuValid: 0, bytes: 0, coreMs: 0, ms: 0,
    }))
    let memSlots = 0, memSum = 0, memPeak = 0, cpuSlots = 0, cpuPeak = 0, cpuCoreMs = 0, cpuMs = 0
    for (let i = 0; i < samples.length; i++) {
      const s = samples[i]
      if (s.minute < lo) continue
      const bin = bins[Math.floor((s.minute - lo) / stride)]
      states[s.state]++
      states.missing--
      if (s.state === 'running' && uint(s.memory_bytes)) {
        bin.bytes += s.memory_bytes
        bin.memoryValid++
        memSlots++
        memSum += s.memory_bytes
        memPeak = Math.max(memPeak, s.memory_bytes)
      }
      const cpu = rates(s, samples[i - 1])
      if (!cpu) continue
      bin.coreMs += cpu.cores * cpu.elapsed
      bin.ms += cpu.elapsed
      bin.cpuValid++
      cpuSlots++
      cpuCoreMs += cpu.cores * cpu.elapsed
      cpuMs += cpu.elapsed
      cpuPeak = Math.max(cpuPeak, cpu.cores)
    }
    return {
      sandboxId: scope.sandboxId, window, end: end * MINUTE, source: 'backend.stats', states,
      history: bins.map(({ at, minutes, memoryValid, cpuValid, bytes, coreMs, ms }) => ({
        at, minutes, memoryValid, cpuValid,
        memoryBytes: memoryValid ? bytes / memoryValid : null, cpuCores: ms ? coreMs / ms : null,
      })),
      memory: { unit: 'bytes', expected, valid: memSlots, mean: memSlots ? memSum / memSlots : null, peak: memSlots ? memPeak : null },
      cpu: { unit: 'core', expected, valid: cpuSlots, mean: cpuMs ? cpuCoreMs / cpuMs : null, peak: cpuSlots ? cpuPeak : null },
    }
  }

  function lastMinute(row) {
    const minute = slot(clock()) - 1
    const [lo, hi] = lifetime(row)
    if (minute < lo || minute >= hi) return null
    const pair = range.all(row.sandboxId, Math.max(lo, minute - 1), minute + 1)
    const s = pair.at(-1)
    if (!s || s.minute !== minute || s.generation !== row.binding?.generation ||
        s.segment !== segmentOf(row) || s.state !== 'running') return null
    return { at: minute * MINUTE, memoryBytes: uint(s.memory_bytes) ? s.memory_bytes : null,
      cpuCores: rates(s, pair.at(-2))?.cores ?? null }
  }

  // Scope is a list of already-authorized historical intervals, not the environment's whole registry.
  function fleetMinute(scopes, minute = slot(clock()) - 1) {
    const end = slot(clock())
    if (!uint(minute) || minute >= end || minute < end - RETAIN) throw new TypeError('minute outside retention')
    let expected = 0
    const memory = { unit: 'bytes', contributors: 0, total: null }
    const cpu = { unit: 'core', contributors: 0, total: null }
    const seen = new Set()
    for (const scope of scopes) {
      const [lo, hi] = lifetime(scope)
      if (minute < lo || minute >= hi || seen.has(scope.sandboxId)) continue
      seen.add(scope.sandboxId)
      expected++
      const samples = range.all(scope.sandboxId, Math.max(lo, minute - 1), minute + 1)
      const cur = samples.at(-1)
      if (cur?.minute !== minute || cur.state !== 'running') continue
      if (uint(cur.memory_bytes)) { memory.total = (memory.total ?? 0) + cur.memory_bytes; memory.contributors++ }
      const rate = rates(cur, samples.at(-2))
      if (rate) { cpu.total = (cpu.total ?? 0) + rate.cores; cpu.contributors++ }
    }
    return { minute: minute * MINUTE, expected, memory, cpu }
  }

  function close() {
    if (closing) return closing
    stopping = true
    clearTimeout(timer)
    closing = Promise.resolve(flight).finally(() => db.close())
    return closing
  }
  return { start, tick, summary, fleetMinute, lastMinute, close, get error() { return lastError } }
}
