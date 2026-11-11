/** JSON usage ledger persisted on the host filesystem.
 *  Counters a plugin can report without a LIST call: object/byte totals,
 *  daily upload bytes, monthly op counts. Writes are atomic
 *  (tmp file + rename) so a crash mid-write keeps the previous ledger. */
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const LEDGER_VERSION = 1

function today(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

function thisMonth(now = new Date()) {
  return now.toISOString().slice(0, 7)
}

/**
 * @param {string} file ledger JSON path (e.g. `<profile>/nano-notepad/s3-ledger.json`).
 */
export function createLedger(file) {
  /** @type {any} */
  let data = { version: LEDGER_VERSION, objects: 0, bytes: 0, ops: {}, dailyUp: {}, monthlyOps: {}, updatedAt: null }
  try {
    const parsed = JSON.parse(readFileSync(file, 'utf8'))
    if (parsed && parsed.version === LEDGER_VERSION) data = { ...data, ...parsed }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }

  let pending = Promise.resolve()
  function persist() {
    data.updatedAt = new Date().toISOString()
    const snapshot = JSON.stringify(data, null, 2)
    pending = pending.then(() => {
      mkdirSync(dirname(file), { recursive: true })
      const tmp = `${file}.tmp`
      writeFileSync(tmp, snapshot, { mode: 0o600 })
      renameSync(tmp, file)
    })
    return pending
  }

  function bump(map, key, delta = 1) {
    map[key] = (map[key] ?? 0) + delta
  }

  return {
    /** Record one API op: 'put' | 'get' | 'delete' | 'list' | 'head' | custom. */
    recordOp(op, { bytes = 0, up = false } = {}) {
      bump(data.ops, op)
      bump(data.monthlyOps, `${thisMonth()}:${op}`)
      if (up && bytes > 0) bump(data.dailyUp, today(), bytes)
      return persist()
    },
    /** Reconcile object totals after a LIST (authoritative bucket view). */
    reconcile({ objects, bytes }) {
      data.objects = objects
      data.bytes = bytes
      return persist()
    },
    /** Read-only snapshot for /status. */
    snapshot() {
      return {
        objects: data.objects,
        bytes: data.bytes,
        ops: { ...data.ops },
        dailyUpBytes: data.dailyUp[today()] ?? 0,
        monthlyOps: { ...data.monthlyOps },
        updatedAt: data.updatedAt,
      }
    },
    file,
  }
}
