/**
 * P2-03..P2-06 boundary tests — the remote-cross hardening of the nsw host:
 *   - marker schema + memberId↔localPath binding (audit §4.9/§4.11 PoCs)
 *   - session-meta / parts limits + claim CAS acquire/renew (B1-T05)
 *   - tree HEAD schema + realpath fence + SKIP set
 *   - route + consumer charset boundary (sessionId/workspaceId/localPath)
 *
 * S3 is an in-memory stub with real ETag semantics (`getJson withMeta` →
 * etag, `putJson {ifMatch}`/`{ifNoneMatch:'*'}` → {conflict} on mismatch),
 * per B1-T05's "fake S3 must implement etag/if-match" requirement.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, existsSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { zstdCompressSync, constants } from 'node:zlib'
import { SchemaReject } from 'dsh-remote-data-schema'

import {
  listWorkspaces, joinWorkspace, matchWorkspace, ownMember, instanceId,
} from '../src/host/workspaces.js'
import {
  acquireClaim, renewClaim, fetchTranscript, materializeSession,
  listRemoteSessions, pushSession, syncAll, projectKey,
} from '../src/host/session-io.js'
import { pullWorkspace, pushWorkspace } from '../src/host/tree.js'
import { createRoutes } from '../src/host/routes.js'
import { pinWorkspaceLocalPath } from '../src/host/workspaces.js'

/* Isolate the membership-pin store (review 9012 F1) from the real profile —
 * pinHome() reads process.env.DSH_HOME at call time. */
process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'nsw-boundary-home-'))

/* ------------------------------------------------------------------ *
 * Test scaffolding
 * ------------------------------------------------------------------ */

/** ETag-bearing in-memory S3 stub matching src/host/s3.js's surface. */
function fakeS3(objects = {}) {
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
      if (bytes.length > 0) set(key, bytes)
      else set(key, bytes)
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
        if (rest === '' ) continue
        if (rest.includes('/')) prefixes.add(`${prefix}${rest.slice(0, rest.indexOf('/') + 1)}`)
        else keys.push(key)
      }
      return { keys, prefixes: [...prefixes] }
    },
  }
  return s3
}

/** ctx with an in-memory credentials store (instance id + join identity). */
const INSTANCE = 'deadbeef-1111-2222-3333-444455556666'
const USERNAME = 'seanz-dev'
const MEMBER_ID = `${USERNAME}@${INSTANCE.slice(0, 8)}`

function fakeCtx() {
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

const fakeReq = body => Readable.from([Buffer.from(JSON.stringify(body ?? {}))])
const tmp = () => mkdtempSync(join(tmpdir(), 'nsw-boundary-'))

/** A schema-valid marker (the on-disk v1 shape). */
function markerOf({ workspaceId = '0123456789abcdef', createdBy = 'other@aaaabbbb', members } = {}) {
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
function memberRow(username, instance, localPath) {
  return { username, instance, localPath, joinedAt: '2026-11-10T00:00:00.000Z' }
}
/** A schema-valid session-meta (the on-disk v1 shape). */
function metaOf(over = {}) {
  return {
    v: 1,
    sessionId: 'session-00000000-1111-2222-3333-444455556666',
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
const zframe = bytes => zstdCompressSync(bytes, { params: { [constants.ZSTD_c_checksumFlag]: 1 } })

import { createHash } from 'node:crypto'
const sha256hex = buf => createHash('sha256').update(buf).digest('hex')

/** Write a local session artifact `<dshHome>/sessions/<pk>/<sid>/session.v4.jsonl.zstd`. */
function seedSession(dshHome, cwd, sessionId, lines = []) {
  const dir = join(dshHome, 'sessions', projectKey(cwd), sessionId)
  mkdirSync(dir, { recursive: true })
  const head = JSON.stringify({ type: 'session', id: sessionId, cwd, createdAt: 1 })
  const body = [head, ...lines.map(l => typeof l === 'string' ? l : JSON.stringify(l))].join('\n') + '\n'
  const filePath = join(dir, 'session.v4.jsonl.zstd')
  writeFileSync(filePath, zframe(Buffer.from(body)))
  return filePath
}

/* ------------------------------------------------------------------ *
 * P2-03 — marker validation + memberId↔localPath binding
 * ------------------------------------------------------------------ */

test('P2-03: schema-invalid marker is skipped by listWorkspaces and join', async () => {
  const bad = markerOf({ workspaceId: '0123456789abcdef' })
  bad.members['x@y'] = memberRow('x', 'i', 'relative/not-absolute') // schema:localPath
  const s3 = fakeS3({ 'workspaces/0123456789abcdef.json': bad })
  assert.deepEqual(await listWorkspaces(s3), [])
  await assert.rejects(
    joinWorkspace(s3, fakeCtx(), { username: USERNAME }, { workspaceId: '0123456789abcdef', localPath: '/tmp/x' }),
    /shared workspace not found/,
  )
})

test('P2-03: key↔object binding — marker id must equal its key', async () => {
  const s3 = fakeS3({ 'workspaces/aaaaaaaaaaaaaaaa.json': markerOf({ workspaceId: 'bbbbbbbbbbbbbbbb' }) })
  assert.deepEqual(await listWorkspaces(s3), [])
})

test('P2-03: matchWorkspace never honors a foreign member localPath (exfil PoC)', async () => {
  // Audit §4.9: a co-tenant plants members[other].localPath='/Users' → every
  // local session matched and pushed. Now foreign rows are read-only data.
  const marker = markerOf({
    members: { 'mallory@ccccdddd': memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', '/Users') },
  })
  const hit = await matchWorkspace('/Users/seanz/secret-project', [marker], {
    identity: { username: USERNAME }, me: INSTANCE,
  })
  assert.equal(hit, null)
})

test('P2-03: squatter row with our memberId but wrong instance is not ours', async () => {
  const marker = markerOf({
    members: { [MEMBER_ID]: memberRow(USERNAME, 'attacker-instance', '/tmp/evil') },
  })
  assert.equal(ownMember(marker, { username: USERNAME }, INSTANCE), undefined)
  const hit = await matchWorkspace('/tmp/evil/sub', [marker], { identity: { username: USERNAME }, me: INSTANCE })
  assert.equal(hit, null)
})

test('P2-03: our own member row still matches (legit sync preserved)', async () => {
  const root = tmp()
  const marker = markerOf({
    members: {
      'mallory@ccccdddd': memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', '/nonexistent'),
      [MEMBER_ID]: memberRow(USERNAME, INSTANCE, root),
    },
  })
  /* Local pin (F1): membership requires the pin we wrote at join. */
  pinWorkspaceLocalPath(marker.workspaceId, root)
  const hit = await matchWorkspace(join(root, 'sub', 'dir'), [marker], { identity: { username: USERNAME }, me: INSTANCE })
  assert.equal(hit?.workspaceId, marker.workspaceId)
})

test('P2-03: join writes ONLY our member row — foreign localPath untouched', async () => {
  const wsId = '0123456789abcdef'
  const foreign = memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', '/attacker/path')
  const s3 = fakeS3({
    [`workspaces/${wsId}.json`]: markerOf({ workspaceId: wsId, members: { 'mallory@ccccdddd': foreign } }),
  })
  const localPath = tmp()
  await joinWorkspace(s3, fakeCtx(), { username: USERNAME }, { workspaceId: wsId, localPath })
  const stored = s3.raw(`workspaces/${wsId}.json`)
  assert.equal(stored.members['mallory@ccccdddd'].localPath, '/attacker/path')
  assert.equal(stored.members[MEMBER_ID].localPath, localPath)
  assert.equal(stored.members[MEMBER_ID].instance, INSTANCE)
})

test('P2-03/P2-06: joinWorkspace consumer layer rejects a traversal workspaceId', async () => {
  const s3 = fakeS3()
  await assert.rejects(
    joinWorkspace(s3, fakeCtx(), { username: USERNAME }, { workspaceId: '../../x', localPath: '/tmp/x' }),
    SchemaReject,
  )
  assert.equal(s3.hits.length, 0) // never reached S3
})

/* ------------------------------------------------------------------ *
 * P2-04 — claim validation + CAS + meta/parts limits
 * ------------------------------------------------------------------ */

test('P2-04: acquireClaim creates a lease via If-None-Match:* CAS', async () => {
  const s3 = fakeS3()
  const res = await acquireClaim(s3, fakeCtx(), 'session-a', 'w@deadbeef', 1)
  assert.equal(res.acquired, true)
  const conds = s3.putConds.filter(c => c.key === 'claims/session-a.json')
  assert.equal(conds.length, 1)
  assert.equal(conds[0].ifNoneMatch, '*')
  assert.equal(s3.raw('claims/session-a.json').writerId, 'w@deadbeef')
})

test('P2-04: acquireClaim CAS conflict does not overwrite a racing claim', async () => {
  const s3 = fakeS3()
  const foreign = { writerId: 'mallory@ccccdddd', acquiredAt: new Date().toISOString(), expiresAt: Date.now() + 60_000, heartbeatRev: 7 }
  let armed = true
  s3.beforePut = key => {
    if (armed && key === 'claims/session-a.json') { armed = false; s3.set(key, foreign) }
  }
  const res = await acquireClaim(s3, fakeCtx(), 'session-a', 'w@deadbeef', 1)
  assert.equal(res.acquired, false)
  assert.equal(res.holder, 'mallory@ccccdddd')
  assert.equal(s3.raw('claims/session-a.json').writerId, 'mallory@ccccdddd') // never clobbered
})

test('P2-04: foreign live claim refuses acquire; expired foreign claim is taken', async () => {
  const live = { writerId: 'mallory@ccccdddd', acquiredAt: new Date().toISOString(), expiresAt: Date.now() + 60_000, heartbeatRev: 2 }
  const s3a = fakeS3({ 'claims/session-a.json': live })
  assert.equal((await acquireClaim(s3a, fakeCtx(), 'session-a', 'w@deadbeef', 1)).acquired, false)
  const stale = { ...live, expiresAt: Date.now() - 1_000 }
  const s3b = fakeS3({ 'claims/session-a.json': stale })
  const res = await acquireClaim(s3b, fakeCtx(), 'session-a', 'w@deadbeef', 1)
  assert.equal(res.acquired, true)
  const conds = s3b.putConds.filter(c => c.key === 'claims/session-a.json')
  assert.ok(conds.every(c => typeof c.ifMatch === 'string')) // CAS'd against the read etag
})

test('P2-04: renewClaim CAS — renewal writes under the read etag', async () => {
  const s3 = fakeS3({
    'claims/session-a.json': { writerId: 'w@deadbeef', acquiredAt: new Date().toISOString(), expiresAt: Date.now() + 60_000, heartbeatRev: 2 },
  })
  const res = await renewClaim(s3, 'session-a', 'w@deadbeef')
  assert.equal(res.renewed, true)
  assert.equal(s3.raw('claims/session-a.json').heartbeatRev, 3)
  const conds = s3.putConds.filter(c => c.key === 'claims/session-a.json')
  assert.equal(conds.length, 1)
  assert.ok(typeof conds[0].ifMatch === 'string')
})

test('P2-04: renewClaim retries on mid-flight conflict, no mixed write', async () => {
  const claim = { writerId: 'w@deadbeef', acquiredAt: new Date().toISOString(), expiresAt: Date.now() + 60_000, heartbeatRev: 2 }
  const s3 = fakeS3({ 'claims/session-a.json': claim })
  let armed = true
  s3.beforePut = key => {
    if (armed && key === 'claims/session-a.json') {
      armed = false
      s3.set(key, { ...claim, heartbeatRev: 50 }) // concurrent writer bumps rev → new etag
    }
  }
  const res = await renewClaim(s3, 'session-a', 'w@deadbeef')
  assert.equal(res.renewed, true)
  // Second attempt re-read the bumped rev and renewed it (no silent merge):
  assert.equal(s3.raw('claims/session-a.json').heartbeatRev, 51)
})

test('P2-04: renewClaim never resurrects foreign or expired claims', async () => {
  const foreign = { writerId: 'mallory@ccccdddd', acquiredAt: new Date().toISOString(), expiresAt: Date.now() + 60_000, heartbeatRev: 1 }
  const s3a = fakeS3({ 'claims/session-a.json': foreign })
  assert.equal((await renewClaim(s3a, 'session-a', 'w@deadbeef')).renewed, false)
  assert.equal(s3a.raw('claims/session-a.json').heartbeatRev, 1)

  const expired = { ...foreign, expiresAt: Date.now() - 100 }
  const s3b = fakeS3({ 'claims/session-a.json': expired })
  assert.equal((await renewClaim(s3b, 'session-a', 'w@deadbeef')).renewed, false)
  assert.equal(s3b.raw('claims/session-a.json').expiresAt < Date.now(), true)

  // Absent claim: no put at all.
  const s3c = fakeS3()
  assert.equal((await renewClaim(s3c, 'session-a', 'w@deadbeef')).renewed, false)
  assert.equal(s3c.putConds.length, 0)

  // Malformed claim shape is not a lease: no renewal.
  const s3d = fakeS3({ 'claims/session-a.json': { writerId: 42, expiresAt: 'never' } })
  assert.equal((await renewClaim(s3d, 'session-a', 'w@deadbeef')).renewed, false)
})

test('P2-04: session-meta committedBytes over limit is rejected', async () => {
  const wsId = '0123456789abcdef'
  const sid = 'session-00000000-1111-2222-3333-444455556666'
  const meta = metaOf({ sessionId: sid, committedBytes: 3 * 1024 * 1024 * 1024 }) // > 2 GiB
  const s3 = fakeS3({ [`workspaces/${wsId}/sessions/${sid}/meta.json`]: meta })
  await assert.rejects(fetchTranscript(s3, wsId, sid), SchemaReject)
  assert.deepEqual(await listRemoteSessions(s3), [])
})

test('P2-04: body part over 64KiB is rejected on read', async () => {
  const wsId = '0123456789abcdef'
  const sid = 'session-00000000-1111-2222-3333-444455556666'
  const s3 = fakeS3({
    [`workspaces/${wsId}/sessions/${sid}/meta.json`]: metaOf({ sessionId: sid, committedBytes: 70_000 }),
    [`workspaces/${wsId}/sessions/${sid}/body/0.part`]: Buffer.alloc(70_000, 1), // one part must be ≤64KiB
    [`workspaces/${wsId}/sessions/${sid}/body/1.part`]: Buffer.alloc(4_312, 2),
  })
  await assert.rejects(fetchTranscript(s3, wsId, sid), SchemaReject)
})

test('P2-04: meta sessionId must match the key it was fetched from', async () => {
  const wsId = '0123456789abcdef'
  const s3 = fakeS3({
    [`workspaces/${wsId}/sessions/session-a/meta.json`]: metaOf({ sessionId: 'session-b' }),
  })
  await assert.rejects(fetchTranscript(s3, wsId, 'session-a'), SchemaReject)
  assert.deepEqual(await listRemoteSessions(s3), [])
})

test('P2-04: pushSession skips a schema-poisoned remote meta', async () => {
  const dshHome = tmp()
  const cwd = tmp()
  const sid = 'session-00000000-1111-2222-3333-444455556666'
  seedSession(dshHome, cwd, sid)
  const wsId = '0123456789abcdef'
  const marker = markerOf({
    workspaceId: wsId,
    members: { [MEMBER_ID]: memberRow(USERNAME, INSTANCE, cwd) },
  })
  const poisoned = metaOf({ sessionId: sid, committedBytes: Number.MAX_SAFE_INTEGER })
  const s3 = fakeS3({
    [`workspaces/${wsId}/sessions/${sid}/meta.json`]: poisoned,
  })
  pinWorkspaceLocalPath(wsId, cwd)
  const res = await pushSession(s3, fakeCtx(), { username: USERNAME },
    { sessionId: sid, filePath: join(dshHome, 'sessions', projectKey(cwd), sid, 'session.v4.jsonl.zstd') },
    [marker], { bySession: new Map() })
  assert.match(res.outcome, /^skip:schema:/)
})

test('P2-03/P2-04 end-to-end: syncAll never exfiltrates into a foreign localPath marker', async () => {
  const dshHome = tmp()
  const cwd = tmp()
  const sid = 'session-00000000-1111-2222-3333-444455556666'
  seedSession(dshHome, cwd, sid)
  // The exact §4.9 plant: foreign member claims cwd as ITS replica path.
  const wsId = '0123456789abcdef'
  const s3 = fakeS3({
    [`workspaces/${wsId}.json`]: markerOf({
      workspaceId: wsId,
      members: { 'mallory@ccccdddd': memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', cwd) },
    }),
  })
  const results = await syncAll(s3, fakeCtx(), { username: USERNAME }, dshHome, { bySession: new Map() })
  assert.deepEqual(results, [{ sessionId: sid, outcome: 'skip:not-shared' }])
  assert.equal(s3.raw(`workspaces/${wsId}/sessions/${sid}/meta.json`), undefined) // nothing uploaded
})

/* ------------------------------------------------------------------ *
 * P2-05 — tree HEAD validation + realpath fence + SKIP
 * ------------------------------------------------------------------ */

function headOf(workspaceId, files, over = {}) {
  return { v: 1, generation: 5, parent: 4, writerId: 'other@aaaabbbb', files, conflicts: [], at: '2026-11-10T00:00:00.000Z', ...over }
}

test('P2-05: pull writes safe files but never the SKIP set', async () => {
  const wsId = '0123456789abcdef'
  const root = tmp()
  const ok = Buffer.from('hello')
  const creds = Buffer.from('{"token":"AKIA…"}')
  const files = [
    { rel: 'src/ok.txt', sha256: sha256hex(ok), size: ok.length },
    { rel: 'imagine/.grok/auth.json', sha256: sha256hex(creds), size: creds.length },
    { rel: '.git/config', sha256: sha256hex(creds), size: creds.length },
  ]
  const s3 = fakeS3({
    [`workspaces/${wsId}/tree/HEAD.json`]: headOf(wsId, files),
    [`workspaces/${wsId}/tree/blobs/${files[0].sha256}`]: ok,
    [`workspaces/${wsId}/tree/blobs/${files[1].sha256}`]: creds,
    [`workspaces/${wsId}/tree/blobs/${files[2].sha256}`]: creds,
  })
  const res = await pullWorkspace(s3, tmp(), wsId, root)
  assert.equal(res.ok, true)
  assert.equal(readFileSync(join(root, 'src/ok.txt'), 'utf8'), 'hello')
  assert.equal(existsSync(join(root, 'imagine')), false)
  assert.equal(existsSync(join(root, '.git')), false)
})

test('P2-05: pull fence blocks symlink escape and `..` rels', async () => {
  const wsId = '0123456789abcdef'
  const root = tmp()
  const outside = tmp()
  symlinkSync(outside, join(root, 'link'), 'dir')
  const buf = Buffer.from('pwned')
  const sha = sha256hex(buf)
  const s3 = fakeS3({
    [`workspaces/${wsId}/tree/HEAD.json`]: headOf(wsId, [{ rel: 'link/evil.txt', sha256: sha, size: 5 }]),
    [`workspaces/${wsId}/tree/blobs/${sha}`]: buf,
  })
  const res = await pullWorkspace(s3, tmp(), wsId, root)
  assert.equal(res.ok, true)
  assert.equal(existsSync(join(outside, 'evil.txt')), false)

  // `..` rels never validate — the whole HEAD is rejected before any write.
  const s3b = fakeS3({ [`workspaces/${wsId}/tree/HEAD.json`]: headOf(wsId, [{ rel: '../escape', sha256: sha, size: 5 }]) })
  await assert.rejects(pullWorkspace(s3b, tmp(), wsId, root), SchemaReject)

  // absolute rel — same whole-object reject.
  const s3c = fakeS3({ [`workspaces/${wsId}/tree/HEAD.json`]: headOf(wsId, [{ rel: '/etc/passwd', sha256: sha, size: 5 }]) })
  await assert.rejects(pullWorkspace(s3c, tmp(), wsId, root), SchemaReject)
})

test('P2-05: stale-delete respects the fence (symlink untouched)', async () => {
  const wsId = '0123456789abcdef'
  const root = tmp()
  const outside = tmp()
  writeFileSync(join(outside, 'victim.txt'), 'precious')
  writeFileSync(join(root, 'gone.txt'), 'old')
  symlinkSync(join(outside, 'victim.txt'), join(root, 'link.txt'))
  const dshHome = tmp()
  mkdirSync(join(dshHome, 'nsw'), { recursive: true })
  writeFileSync(join(dshHome, 'nsw', `${wsId}.json`), JSON.stringify({
    generation: 4,
    files: [{ rel: 'gone.txt', sha256: 'a'.repeat(64), size: 3 }, { rel: 'link.txt', sha256: 'b'.repeat(64), size: 3 }],
  }))
  const s3 = fakeS3({ [`workspaces/${wsId}/tree/HEAD.json`]: headOf(wsId, []) })
  await pullWorkspace(s3, dshHome, wsId, root)
  assert.equal(existsSync(join(root, 'gone.txt')), false)  // stale regular file removed
  assert.equal(existsSync(join(root, 'link.txt')), true)   // symlink SKIPPED, target safe
  assert.equal(readFileSync(join(outside, 'victim.txt'), 'utf8'), 'precious')
})

test('P2-05: push skips the SKIP set and symlinks when enumerating', async () => {
  const wsId = '0123456789abcdef'
  const root = tmp()
  mkdirSync(join(root, 'imagine/.grok'), { recursive: true })
  writeFileSync(join(root, 'imagine/.grok/auth.json'), 'creds')
  mkdirSync(join(root, '.git'), { recursive: true })
  writeFileSync(join(root, '.git/config'), 'gitconfig')
  writeFileSync(join(root, 'src.txt'), 'shareable')
  const outside = tmp()
  writeFileSync(join(outside, 'secret'), 's3cr3t')
  symlinkSync(join(outside, 'secret'), join(root, 'leak.txt'))
  const s3 = fakeS3({
    [`workspaces/${wsId}/tree/HEAD.json`]: headOf(wsId, [], { generation: 1, parent: 0 }),
  })
  const res = await pushWorkspace(s3, tmp(), wsId, root, 'w@deadbeef')
  assert.equal(res.ok, true)
  const head = s3.raw(`workspaces/${wsId}/tree/HEAD.json`)
  const rels = head.files.map(f => f.rel).sort()
  assert.deepEqual(rels, ['src.txt'])
  const blobKeys = s3.putConds.map(c => c.key).concat(s3.hits.filter(h => h.startsWith('PUTB')).map(h => h.slice(5)))
  assert.ok(blobKeys.every(k => !k.includes('imagine') && !k.includes('.git') && !k.includes('secret')))
})

test('P2-05: pushWorkspace rejects a poisoned remote HEAD wholesale', async () => {
  const wsId = '0123456789abcdef'
  const s3 = fakeS3({
    [`workspaces/${wsId}/tree/HEAD.json`]: { v: 1, generation: 9, parent: 8, writerId: 'x@y', files: [{ rel: 'a/../b', sha256: 'c'.repeat(64), size: 1 }], conflicts: [], at: '2026-11-10T00:00:00.000Z' },
  })
  await assert.rejects(pushWorkspace(s3, tmp(), wsId, tmp(), 'w@deadbeef'), SchemaReject)
})

test('P2-05: replica root must be absolute and non-symlink', async () => {
  const wsId = '0123456789abcdef'
  const s3 = fakeS3({ [`workspaces/${wsId}/tree/HEAD.json`]: headOf(wsId, []) })
  await assert.rejects(pullWorkspace(s3, tmp(), wsId, 'relative/path'), SchemaReject)
  const realDir = tmp()
  const linkDir = join(tmp(), 'link')
  symlinkSync(realDir, linkDir, 'dir')
  await assert.rejects(pullWorkspace(s3, tmp(), wsId, linkDir), SchemaReject)
})

/* ------------------------------------------------------------------ *
 * P2-06 — materialize + route boundary charset (two layers)
 * ------------------------------------------------------------------ */

const WS = '0123456789abcdef'
const SID = 'session-00000000-1111-2222-3333-444455556666'

function seededSessionBucket(s3, wsId, sid, cwd) {
  const head = JSON.stringify({ type: 'session', id: sid, cwd, createdAt: 1 })
  const lines = [head, JSON.stringify({ type: 'x', n: 1 })].join('\n') + '\n'
  const buf = zframe(Buffer.from(lines))
  s3.set(`workspaces/${wsId}/sessions/${sid}/meta.json`, metaOf({ sessionId: sid, committedBytes: buf.length }))
  s3.set(`workspaces/${wsId}/sessions/${sid}/body/0.part`, buf)
}

test('P2-06: materialize happy path lands inside the session tree', async () => {
  const dshHome = tmp()
  const root = tmp()
  const s3 = fakeS3()
  seededSessionBucket(s3, WS, SID, '/remote/cwd')
  const res = await materializeSession(s3, dshHome, { workspaceId: WS, sessionId: SID, localPath: root })
  assert.equal(res.cwd, root)
  const expected = join(dshHome, 'sessions', projectKey(root), SID, 'session.v4.jsonl.zstd')
  assert.equal(res.path, expected)
  assert.equal(existsSync(expected), true)
  assert.ok(expected.startsWith(join(dshHome, 'sessions') + '/'))
})

test('P2-06: materialize rejects traversal ids and non-fenced localPath', async () => {
  const s3 = fakeS3()
  await assert.rejects(
    materializeSession(s3, tmp(), { workspaceId: WS, sessionId: '../../escape/deep', localPath: '/tmp/x' }),
    SchemaReject,
  )
  await assert.rejects(
    materializeSession(s3, tmp(), { workspaceId: '../ws', sessionId: SID, localPath: '/tmp/x' }),
    SchemaReject,
  )
  await assert.rejects(
    materializeSession(s3, tmp(), { workspaceId: WS, sessionId: SID, localPath: 'relative/dir' }),
    SchemaReject,
  )
  await assert.rejects(
    materializeSession(s3, tmp(), { workspaceId: WS, sessionId: SID, localPath: '/tmp/../tmp' }),
    SchemaReject,
  )
  assert.equal(s3.hits.length, 0) // every reject fired before S3
})

test('P2-06: materialize refuses a pre-existing symlinked session dir', async () => {
  const dshHome = tmp()
  const root = tmp()
  const outside = tmp()
  const sessionDir = join(dshHome, 'sessions', projectKey(root), SID)
  mkdirSync(join(dshHome, 'sessions', projectKey(root)), { recursive: true })
  symlinkSync(outside, sessionDir, 'dir')
  const s3 = fakeS3()
  seededSessionBucket(s3, WS, SID, '/remote/cwd')
  await assert.rejects(
    materializeSession(s3, dshHome, { workspaceId: WS, sessionId: SID, localPath: root }),
    /symlink|realpath fence|escaped the session tree/,
  )
  assert.equal(existsSync(join(outside, 'session.v4.jsonl.zstd')), false)
})

test('P2-06: route layer rejects bad sessionId/workspaceId charset (400-equivalent)', async () => {
  const routes = createRoutes(fakeCtx(), { endpoint: 'http://127.0.0.1:1', bucket: 'b', region: 'us-east-1', prefix: '' })
  // /sessions/lease: assertSessionId fires before the S3 key is formed.
  await assert.rejects(routes['/sessions/lease'].run(fakeReq({ sessionId: '../victim' })), /sessionId has an invalid charset/)
  // /sessions/claim: both ids checked.
  await assert.rejects(routes['/sessions/claim'].run(fakeReq({ workspaceId: 'x'.repeat(17), sessionId: 'session-a' })), /workspaceId has an invalid charset/)
  await assert.rejects(routes['/sessions/claim'].run(fakeReq({ workspaceId: WS, sessionId: 'a/b' })), /sessionId has an invalid charset/)
  // /workspaces/join: audit #12 traversal — `..` id must not reach S3.
  await assert.rejects(routes['/workspaces/join'].run(fakeReq({ workspaceId: '../../etc', localPath: '/tmp/x' })), /workspaceId has an invalid charset/)
  // /materialize: audit §4.10 — sessionId '..' traversal rejected at layer 1.
  await assert.rejects(routes['/materialize'].run(fakeReq({ workspaceId: WS, sessionId: '../deep' })), /sessionId has an invalid charset/)
  await assert.rejects(routes['/materialize'].run(fakeReq({ workspaceId: 'not-hex!!', sessionId: SID })), /workspaceId has an invalid charset/)
  // /tree/pull + /transcript: same boundary.
  await assert.rejects(routes['/tree/pull'].run(fakeReq({ workspaceId: '../ws' })), /workspaceId has an invalid charset/)
  await assert.rejects(routes['/transcript'].run(fakeReq({ workspaceId: WS, sessionId: 'bad id!' })), /sessionId has an invalid charset/)
  // join/create localPath must be absolute + normalized.
  await assert.rejects(routes['/workspaces/join'].run(fakeReq({ workspaceId: WS, localPath: 'relative/dir' })), /localPath must be an absolute/)
  // /sessions/bind: sessionId charset + absolute path.
  await assert.rejects(routes['/sessions/bind'].run(fakeReq({ path: '/tmp/x', sessionId: '..' })), /sessionId has an invalid charset/)
})

test('P2-06: claim/lease consumer layer double-checks the charset', async () => {
  const s3 = fakeS3()
  await assert.rejects(acquireClaim(s3, fakeCtx(), '../x', 'w@deadbeef', 1), SchemaReject)
  await assert.rejects(renewClaim(s3, 'a/b', 'w@deadbeef'), SchemaReject)
  assert.equal(s3.hits.length, 0)
})
