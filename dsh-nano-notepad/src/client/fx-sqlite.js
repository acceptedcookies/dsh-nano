/**
 * fx-sqlite.js — sqlite-wasm 管线态 + vfs 视图（§10.3）。
 *
 * sqlite lives in a dedicated module Worker (np-sqlite-worker.mjs installs
 * opfs-sahpool before worker1 API — createSyncAccessHandle is worker-only).
 * DB = pipeline execution state (runs/checkpoints/idempotent_keys/epoch/
 * claim_ledger/lsrag_chunks). vfs view = corpus_nodes virtual TABLE populated
 * from IDB via exec, so pipeline state and corpus join in sqlite.
 *
 * sqlite→s3: `export` → PUT pipeline/sqlite.db.b64 (ifMatch CAS) on the
 * notepad scoped bucket; restore-on-boot rehydrates. s3 为真源，本地副本。
 */

const SDK_BASE = '/nano-notepad/fx/sdk'
const WORKER_URL = `${SDK_BASE}/np-sqlite-worker.mjs`
const S3_ROUTE = '/nano-notepad/pipeline/s3'
const CLAIM_ROUTE = '/nano-notepad/pipeline/claim'
const SQLITE_S3_KEY = 'sqlite/pipeline.db'
const MANIFEST_S3_KEY = 'sqlite/manifest.json'

let promiser = null
let dbId = null
let opfsOk = null

async function loadSqlite() {
  const mod = await import(/* webpackIgnore: true */ `${SDK_BASE}/sqlite3.mjs`)
  return mod.sqlite3Worker1Promiser ?? mod.default?.sqlite3Worker1Promiser
}

async function ensurePromiser() {
  if (promiser) return promiser
  const pf = await loadSqlite()
  promiser = await new Promise((resolve, reject) => {
    const p = pf({
      worker: () => new Worker(WORKER_URL, { type: 'module' }),
      onready: () => resolve(p),
      onerror: reject,
    })
    setTimeout(() => reject(new Error('sqlite-promiser-timeout')), 15000)
  })
  return promiser
}

/**
 * Open the pipeline db. filename uses opfs-sahpool when available, else
 * a :memory: fallback (export/import still works; no OPFS persistence).
 */
export async function openPipeline() {
  const p = await ensurePromiser()
  if (dbId) return dbId
  let open
  try {
    open = await p('open', { filename: 'file:np-pipeline?vfs=opfs-sahpool' })
    opfsOk = true
  } catch {
    open = await p('open', { filename: ':memory:' })
    opfsOk = false
  }
  dbId = open.dbId
  await migrate(p, dbId)
  return dbId
}

export function opfsAvailable() { return opfsOk === true }

async function migrate(p, id) {
  await p('exec', {
    dbId: id,
    sql: `
      CREATE TABLE IF NOT EXISTS runs(
        id TEXT PRIMARY KEY, name TEXT, status TEXT,
        started_at INTEGER, finished_at INTEGER, meta TEXT);
      CREATE TABLE IF NOT EXISTS checkpoints(
        id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT, stage TEXT,
        at INTEGER, state TEXT);
      CREATE TABLE IF NOT EXISTS idempotent_keys(
        key TEXT PRIMARY KEY, run_id TEXT, seen_at INTEGER);
      CREATE TABLE IF NOT EXISTS epoch(
        id INTEGER PRIMARY KEY CHECK(id=1), value INTEGER, at INTEGER);
      CREATE TABLE IF NOT EXISTS claim_ledger(
        id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT, op TEXT,
        writer_id TEXT, heartbeat_rev INTEGER, at INTEGER, detail TEXT);
      CREATE TABLE IF NOT EXISTS lsrag_chunks(
        doc_id TEXT, seq INTEGER, sha TEXT, text TEXT,
        PRIMARY KEY(doc_id, seq));
      CREATE TABLE IF NOT EXISTS corpus_nodes(
        id TEXT PRIMARY KEY, cat TEXT, name TEXT,
        content TEXT, meta TEXT);
      CREATE INDEX IF NOT EXISTS corpus_cat ON corpus_nodes(cat);
    `,
  })
}

/* worker1 response: {type:'exec', result:{resultRows:[...]}} for queries;
   {type:'export', result:{byteArray:Uint8Array}} for export. Errors arrive
   as {type:'error', result:{message,errorClass}}. */
const assertOk = (resp) => {
  if (resp?.type === 'error' || resp?.result?.error !== undefined)
    throw new Error(resp?.result?.message ?? 'sqlite error')
  return resp?.result
}
const exec = async (sql, bind) => assertOk(await promiser('exec', { dbId, sql, bind }))
const queryRows = async (sql, bind) => {
  const result = assertOk(await promiser('exec', { dbId, sql, bind, rowMode: 'object', resultRows: [] }))
  return result?.resultRows ?? []
}
const selectValue = async (sql, bind) => {
  const rows = await queryRows(sql, bind)
  const row = rows[0]
  return row ? row[Object.keys(row)[0]] : undefined
}
export const __probe = async (sql, bind) => promiser('exec', { dbId, sql, bind, rowMode: 'object', resultRows: [] })
export const __exportRaw = () => promiser('export', { dbId })

/** Populate the corpus_nodes vfs view from an IDB snapshot of corpus nodes. */
export async function syncCorpusView(nodes) {
  await exec('DELETE FROM corpus_nodes')
  for (const n of nodes) {
    await exec(
      'INSERT OR REPLACE INTO corpus_nodes(id,cat,name,content,meta) VALUES(?,?,?,?,?)',
      [n.id, n.cat, n.name, n.draft ?? '', JSON.stringify({ supersedes: n.supersedes ?? null, rejectCount: n.rejectCount ?? 0 })]
    )
  }
  return { rows: nodes.length }
}

/** VFS view queries — corpus joined with pipeline state in-sqlite. */
export const vfs = {
  async byCat(cat) { return queryRows('SELECT id,cat,name FROM corpus_nodes WHERE cat=? ORDER BY name', [cat]) },
  async lineageOf(id) { return queryRows('SELECT id,cat,name,meta FROM corpus_nodes WHERE id=?', [id]) },
  async corpusJoinLsrag() {
    return queryRows(`SELECT c.id,c.cat,c.name,COUNT(l.seq) AS chunks
      FROM corpus_nodes c LEFT JOIN lsrag_chunks l ON l.doc_id=c.id
      GROUP BY c.id ORDER BY c.name`)
  },
}

/** Idempotent-key dedup: returns {seen:true} when the key already exists. */
export async function claimIdempotent(key, runId) {
  const rows = await queryRows('SELECT key,run_id,seen_at FROM idempotent_keys WHERE key=?', [key])
  if (rows.length > 0) return { seen: true, runId: rows[0].run_id }
  await exec('INSERT INTO idempotent_keys(key,run_id,seen_at) VALUES(?,?,?)', [key, runId, Date.now()])
  return { seen: false }
}

export async function bumpEpoch() {
  await exec('INSERT INTO epoch(id,value,at) VALUES(1,0,?) ON CONFLICT(id) DO UPDATE SET value=value+1,at=excluded.at', [Date.now()])
  return selectValue('SELECT value FROM epoch WHERE id=1')
}

export async function recordClaim(row) {
  await exec('INSERT INTO claim_ledger(key,op,writer_id,heartbeat_rev,at,detail) VALUES(?,?,?,?,?,?)',
    [row.key, row.op, row.writerId, row.heartbeatRev ?? null, Date.now(), JSON.stringify(row.detail ?? {})])
}

export async function beginRun(id, name, meta = {}) {
  await exec('INSERT OR REPLACE INTO runs(id,name,status,started_at,meta) VALUES(?,?,?,?,?)',
    [id, name, 'running', Date.now(), JSON.stringify(meta)])
}
export async function finishRun(id, status = 'done') {
  await exec('UPDATE runs SET status=?,finished_at=? WHERE id=?', [status, Date.now(), id])
}
export async function checkpoint(runId, stage, state = {}) {
  await exec('INSERT INTO checkpoints(run_id,stage,at,state) VALUES(?,?,?,?)',
    [runId, stage, Date.now(), JSON.stringify(state)])
}

async function pipelineCall(route, body) {
  const res = await fetch(route, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json()
  if (!data.ok) throw new Error(data.message ?? data.reason ?? `HTTP ${res.status}`)
  return data.result
}

/** Export the db bytes → PUT s3 sqlite/pipeline.db (manifest CAS around etag). */
export async function exportToS3() {
  const result = assertOk(await promiser('export', { dbId }))
  const byteArray = result?.byteArray instanceof Uint8Array ? result.byteArray : new Uint8Array(result?.byteArray ?? 0)
  const b64 = btoa(String.fromCharCode(...byteArray))
  const put = await pipelineCall(S3_ROUTE, { op: 'put', key: SQLITE_S3_KEY, bodyB64: b64 })
  const manifest = {
    sha: await sha256Hex(byteArray),
    bytes: byteArray.byteLength,
    at: Date.now(),
    opfs: opfsOk === true,
  }
  const got = await pipelineCall(S3_ROUTE, { op: 'get', key: MANIFEST_S3_KEY, withMeta: true }).catch(() => null)
  const extra = got?.etag ? { ifMatch: got.etag } : { ifNoneMatch: '*' }
  const mres = await pipelineCall(S3_ROUTE, { op: 'put', key: MANIFEST_S3_KEY, body: manifest, ...extra })
  return { dbBytes: byteArray.byteLength, put, manifest, manifestPut: mres }
}

/** Pull sqlite/pipeline.db bytes from s3. Worker1 has no `deserialize` op; the
 *  caller swaps the byte stream into a fresh `open` (OPFS sahpool) db instead. */
export async function restoreFromS3() {
  const got = await pipelineCall(S3_ROUTE, { op: 'get', key: SQLITE_S3_KEY, format: 'bytes' })
  if (!got) return { restored: false }
  return { restored: true, byteArray: Uint8Array.from(atob(got.bodyB64), c => c.charCodeAt(0)) }
}

/** Claim lease ops (host signs; page just sends op+key+writerId). */
export const claim = {
  acquire: (key, writerId = 'notepad-fx') => pipelineCall(CLAIM_ROUTE, { op: 'acquire', key, writerId }),
  renew: (key, writerId = 'notepad-fx') => pipelineCall(CLAIM_ROUTE, { op: 'renew', key, writerId }),
  read: (key) => pipelineCall(CLAIM_ROUTE, { op: 'read', key }),
  release: (key, writerId = 'notepad-fx') => pipelineCall(CLAIM_ROUTE, { op: 'release', key, writerId }),
}

async function sha256Hex(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}
