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
let promiserInFlight = null
let openPipelineInFlight = null
let dbId = null
let opfsOk = null
/** A5 启动门：cas-probe 结果（null=未跑 / pass=true|false）。fail 时共享写
 * 面关闭——export/claim/manifest CAS 拒服务并报 `cas-probe:fail`；本地
 * sqlite/IDB 读写不受影响（A5 裁决）。 */
let casGate = { ran: false, pass: true, reason: 'cas-probe:pending' }

export function casGateState() { return { ...casGate } }
/* Dev/test only: force the gate so the closed-write path is verifiable without
   taking the real bucket down. Never called from production flow. */
export function __setCasGateForTest(pass) {
  casGate = { ran: true, pass, reason: pass ? 'cas-probe:ok' : 'cas-probe:fail', detail: { forced: true } }
  return casGateState()
}
function assertSharedWrite(op) {
  if (casGate.ran && casGate.pass === false) {
    throw new Error(`cas-probe:fail — shared write surface closed (${op})`)
  }
}

async function loadSqlite() {
  const mod = await import(/* webpackIgnore: true */ `${SDK_BASE}/sqlite3.mjs`)
  return mod.sqlite3Worker1Promiser ?? mod.default?.sqlite3Worker1Promiser
}

function ensurePromiser() {
  /* 并发保护：两个调用方同时 ensurePromiser 会各建一个 worker + promiser，
     后者覆盖前者，被覆盖的 worker 再收到消息时报 unhandled worker message。
     缓存 in-flight promise 使 worker 只建一次。 */
  if (promiser) return Promise.resolve(promiser)
  if (promiserInFlight) return promiserInFlight
  promiserInFlight = (async () => {
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
  })().finally(() => { promiserInFlight = null })
  return promiserInFlight
}

/**
 * Open the pipeline db. filename uses opfs-sahpool when available, else
 * a :memory: fallback (export/import still works; no OPFS persistence).
 */
export function openPipeline() {
  /* 并发保护：两个调用方同时 open 会向同一 worker 发两次 open（sqlite worker
     报 unhandled message）。缓存 in-flight promise 使 open 只发一次。 */
  if (openPipelineInFlight) return openPipelineInFlight
  openPipelineInFlight = (async () => {
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
  })().finally(() => { openPipelineInFlight = null })
  return openPipelineInFlight
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
      CREATE TABLE IF NOT EXISTS pipeline_defs(
        id TEXT PRIMARY KEY, name TEXT, spec_json TEXT, created_at INTEGER);
    `,
  })
}

/* ── L4 pipeline 定义面：stage 链 spec 入 sqlite，与管线执行态同域。
   CRUD 先 openPipeline()——promiser 未初始化时 exec 会空调（之前 rt bug）。 ── */
const withDb = async (fn) => { await openPipeline(); return fn() }
export async function definePipeline(name, spec) {
  return withDb(async () => {
    const id = `def-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
    await exec('INSERT OR REPLACE INTO pipeline_defs(id,name,spec_json,created_at) VALUES(?,?,?,?)',
      [id, String(name), JSON.stringify(spec), Date.now()])
    return { id, name }
  })
}
export async function listPipelines() {
  return withDb(async () => {
    const rows = await queryRows('SELECT id,name,spec_json,created_at FROM pipeline_defs ORDER BY created_at DESC', [])
    return rows.map(r => ({ id: r.id, name: r.name, spec: safeJson(r.spec_json), createdAt: r.created_at }))
  })
}
export async function getPipeline(id) {
  return withDb(async () => {
    const r = await queryRows('SELECT id,name,spec_json,created_at FROM pipeline_defs WHERE id=?', [id])
    const row = r[0]
    return row ? { id: row.id, name: row.name, spec: safeJson(row.spec_json), createdAt: row.created_at } : null
  })
}
export async function deletePipeline(id) { return withDb(async () => { await exec('DELETE FROM pipeline_defs WHERE id=?', [id]) }) }
const safeJson = s => { try { return JSON.parse(s) } catch { return null } }

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
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { /* non-JSON body */ }
  if (!res.ok || data === null) throw new Error(data?.message ?? data?.reason ?? `HTTP ${res.status}`)
  if (!data.ok) throw new Error(data.message ?? data.reason ?? `HTTP ${res.status}`)
  return data.result
}

/** Export the db bytes → PUT s3 sqlite/pipeline.db (manifest CAS around etag). */
export async function exportToS3() {
  assertSharedWrite('exportToS3')
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
  acquire: (key, writerId = 'notepad-fx') => { assertSharedWrite('claim.acquire'); return pipelineCall(CLAIM_ROUTE, { op: 'acquire', key, writerId }) },
  renew: (key, writerId = 'notepad-fx') => { assertSharedWrite('claim.renew'); return pipelineCall(CLAIM_ROUTE, { op: 'renew', key, writerId }) },
  read: (key) => pipelineCall(CLAIM_ROUTE, { op: 'read', key }),
  release: (key, writerId = 'notepad-fx') => { assertSharedWrite('claim.release'); return pipelineCall(CLAIM_ROUTE, { op: 'release', key, writerId }) },
}

/** A5 硬门槛：V-17b 三用例启动探针。返回 {pass, detail}；不过则调用方
 * 应关共享写面并上报 `cas-probe:fail`（本地读写不受影响）。 */
export async function casProbe() {
  const key = `cas-probe-${Date.now().toString(36)}`
  const put = (body, extra) => pipelineCall(S3_ROUTE, { op: 'put', key, body, ...extra })
  const detail = {}
  try {
    detail.create1 = (await put({ v: 1 }, { ifNoneMatch: '*' })).conflict
    detail.create2 = (await put({ v: 2 }, { ifNoneMatch: '*' })).conflict
    const head = await pipelineCall(S3_ROUTE, { op: 'head', key })
    detail.ifMatchBogus = (await put({ v: 3 }, { ifMatch: '"bogus"' })).conflict
    detail.ifMatchReal = (await put({ v: 4 }, { ifMatch: head?.etag })).conflict
  } catch (e) {
    detail.error = String(e)
  } finally {
    try { await pipelineCall(S3_ROUTE, { op: 'del', key }) } catch { /* best-effort */ }
  }
  const pass = detail.create1 === false && detail.create2 === true &&
               detail.ifMatchBogus === true && detail.ifMatchReal === false
  casGate = { ran: true, pass, reason: pass ? 'cas-probe:ok' : 'cas-probe:fail', detail }
  return { pass, detail, reason: casGate.reason }
}

async function sha256Hex(buf) {
  const d = await crypto.subtle.digest('SHA-256', buf)
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}
