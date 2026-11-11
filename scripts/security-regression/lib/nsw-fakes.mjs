/**
 * nsw-fakes — host-function fixtures for the remote-cross PoC cases.
 *
 * Lifted verbatim from dsh-nano-shared-workspace/test/boundary.test.mjs
 * (P2-03..P2-06 proven oracles): the in-memory fakeS3 with etag/CAS
 * semantics, the credentials fake ctx, the schema-valid marker/meta/head
 * builders, and the session seeder. The host functions under test take an
 * `s3` object surface — no HTTP, no bucket, no token required.
 *
 * Re-exports SchemaReject via the real package so `error.reason` checks and
 * instanceof behave exactly as they do inside the host bundle.
 */
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Readable } from 'node:stream'
import { createHash } from 'node:crypto'
import { zstdCompressSync, constants } from 'node:zlib'
import { SchemaReject } from '../../../packages/dsh-remote-data-schema/src/index.js'
import { projectKey } from '../../../dsh-nano-shared-workspace/src/host/session-io.js'

export { SchemaReject, projectKey }

/** True when `error` is a SchemaReject whose reason starts with `prefix`. */
export const isSchemaReject = (error, prefix = 'schema:') =>
  (error instanceof SchemaReject || error?.name === 'SchemaReject')
  && typeof error?.reason === 'string' && error.reason.startsWith(prefix)

/** Run `fn`, returning {threw:true,error} on throw / {threw:false,value} otherwise. */
export async function settle(fn) {
  try { return { threw: false, value: await fn() } }
  catch (error) { return { threw: true, error } }
}

/** A fresh private directory per fixture. */
export const tmp = () => mkdtempSync(join(tmpdir(), 'nsw-poc-'))

/* ------------------------------------------------------------------ *
 * Identity fixtures (same values boundary.test.mjs uses)
 * ------------------------------------------------------------------ */
export const INSTANCE = 'deadbeef-1111-2222-3333-444455556666'
export const USERNAME = 'seanz-dev'
export const MEMBER_ID = `${USERNAME}@${INSTANCE.slice(0, 8)}`
export const WS = '0123456789abcdef'
export const SID = 'session-00000000-1111-2222-3333-444455556666'

/** ETag-bearing in-memory S3 stub matching src/host/s3.js's surface. */
export function fakeS3(objects = {}) {
  const store = new Map() // key → {value, etag}
  const hits = []
  const putConds = [] // {key, ifMatch?, ifNoneMatch?} — CAS proof
  let etagCounter = 0
  const set = (key, value) => { etagCounter += 1; store.set(key, { value, etag: `etag-${etagCounter}` }) }
  for (const [k, v] of Object.entries(objects)) set(k, v)
  const s3 = {
    hits,
    putConds,
    set,
    raw: key => store.get(key)?.value,
    /** One-shot hook fired inside putJson before the precondition check (race injection). */
    beforePut: undefined,
    async getJson(key, opts) {
      hits.push(`GET ${key}`)
      const rec = store.get(key)
      if (rec === undefined) return undefined
      return opts?.withMeta === true ? { value: rec.value, etag: rec.etag } : rec.value
    },
    async putJson(key, value, cond) {
      putConds.push({ key, ifMatch: cond?.ifMatch, ifNoneMatch: cond?.ifNoneMatch })
      s3.beforePut?.(key, value, cond)
      const rec = store.get(key)
      if (cond?.ifNoneMatch === '*' && rec !== undefined) return { conflict: true }
      if (cond?.ifMatch !== undefined && rec?.etag !== cond.ifMatch) return { conflict: true }
      set(key, value)
      return {}
    },
    async putBytes(key, bytes) {
      hits.push(`PUTB ${key}`)
      s3.beforePut?.(key, bytes, undefined)
      set(key, bytes)
      return {}
    },
    async getBytes(key) {
      hits.push(`GETB ${key}`)
      const rec = store.get(key)
      return rec === undefined ? undefined : Buffer.isBuffer(rec.value) ? rec.value : Buffer.from(String(rec.value))
    },
    async list(prefix) {
      const keys = []
      const prefixes = new Set()
      for (const key of store.keys()) {
        if (!key.startsWith(prefix)) continue
        const rest = key.slice(prefix.length)
        if (rest === '') continue
        if (rest.includes('/')) prefixes.add(`${prefix}${rest.slice(0, rest.indexOf('/') + 1)}`)
        else keys.push(key)
      }
      return { keys, prefixes: [...prefixes] }
    },
  }
  return s3
}

/** ctx with an in-memory credentials store (instance id + join identity). */
export function fakeCtx() {
  const creds = new Map([
    ['DSH_NSW_INSTANCE_ID', INSTANCE],
    ['DSH_NSW_IDENTITY', JSON.stringify({ username: USERNAME, token: 'AK:SK' })],
  ])
  return {
    get(name) {
      if (name !== 'credentials') return undefined
      return {
        async resolve(ref) { return creds.has(ref) ? { value: creds.get(ref), source: 'test' } : undefined },
        async set(ref, value) { creds.set(ref, value) },
        async unset(ref) { creds.delete(ref) },
      }
    },
  }
}

export const fakeReq = body => Readable.from([Buffer.from(JSON.stringify(body ?? {}))])

/** A schema-valid marker (the on-disk v1 shape). */
export function markerOf({ workspaceId = WS, createdBy = 'other@aaaabbbb', members } = {}) {
  return {
    v: 1,
    workspaceId,
    title: 'ws',
    pathHint: 'ws',
    createdAt: '2026-11-10T00:00:00.000Z',
    createdBy,
    members: members ?? {},
  }
}
export function memberRow(username, instance, localPath) {
  return { username, instance, localPath, joinedAt: '2026-11-10T00:00:00.000Z' }
}

/** A schema-valid session-meta (the on-disk v1 shape). */
export function metaOf(over = {}) {
  return {
    v: 1,
    sessionId: SID,
    writerId: 'other@aaaabbbb',
    writerName: 'other',
    rev: 3,
    formatVersion: 4,
    committedBytes: 10,
    uncompressedSeqBytes: 0,
    eventCount: 1,
    title: 't',
    projectDir: '--tmp--',
    cwd: '/tmp/x',
    createdAt: '2026-11-10T00:00:00.000Z',
    mtime: '2026-11-10T00:00:00.000Z',
    deleted: false,
    attachmentRefs: [],
    ...over,
  }
}

/** A schema-valid tree HEAD. */
export function headOf(workspaceId, files, over = {}) {
  return { v: 1, generation: 5, parent: 4, writerId: 'other@aaaabbbb', files, conflicts: [], at: '2026-11-10T00:00:00.000Z', ...over }
}

export const zframe = bytes => zstdCompressSync(bytes, { params: { [constants.ZSTD_c_checksumFlag]: 1 } })
export const sha256hex = buf => createHash('sha256').update(buf).digest('hex')

/** Write a local session artifact `<dshHome>/sessions/<pk>/<sid>/session.v4.jsonl.zstd`. */
export function seedSession(dshHome, cwd, sessionId, lines = []) {
  const dir = join(dshHome, 'sessions', projectKey(cwd), sessionId)
  mkdirSync(dir, { recursive: true })
  const head = JSON.stringify({ type: 'session', id: sessionId, cwd, createdAt: 1 })
  const body = [head, ...lines.map(l => typeof l === 'string' ? l : JSON.stringify(l))].join('\n') + '\n'
  const filePath = join(dir, 'session.v4.jsonl.zstd')
  writeFileSync(filePath, zframe(Buffer.from(body)))
  return filePath
}

/** Seed a pullable remote session: meta.json + body/0.part committed by the meta. */
export function seededSessionBucket(s3, wsId, sid, cwd) {
  const head = JSON.stringify({ type: 'session', id: sid, cwd, createdAt: 1 })
  const lines = [head, JSON.stringify({ type: 'x', n: 1 })].join('\n') + '\n'
  const buf = zframe(Buffer.from(lines))
  s3.set(`workspaces/${wsId}/sessions/${sid}/meta.json`, metaOf({ sessionId: sid, committedBytes: buf.length }))
  s3.set(`workspaces/${wsId}/sessions/${sid}/body/0.part`, buf)
}

/* ------------------------------------------------------------------ *
 * Result helper: accumulate named checks → {rejected, reason, detail}.
 * ------------------------------------------------------------------ */
export function verdicts() {
  const checks = []
  return {
    checks,
    check(name, pass, detail = '') {
      checks.push({ name, pass, detail })
      return pass
    },
    result(primaryReason) {
      const failed = checks.filter(c => !c.pass)
      return {
        rejected: failed.length === 0,
        reason: failed.length === 0 ? primaryReason : `not-rejected:${failed[0].name}`,
        detail: checks.map(c => `${c.pass ? 'ok' : 'FAIL'} ${c.name}${c.detail ? ` (${c.detail})` : ''}`).join(' | '),
      }
    },
  }
}
