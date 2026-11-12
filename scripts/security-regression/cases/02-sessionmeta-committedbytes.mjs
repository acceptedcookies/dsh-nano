/**
 * 02 — nsw-sessionmeta-overflow (remote-meta unbounded fetch/decompress)
 *
 * A co-tenant writes a session-meta whose `committedBytes` claims > 2 GiB of
 * body parts (or inflates a single `.part` past the 64 KiB slice limit, or
 * forges a sessionId that doesn't match its key). Pre-hardening the host
 * fetched every part the meta pointed at — unbounded download + zstd.
 *
 * Oracle: readSessionMeta/readBodyParts (via fetchTranscript) throw
 * SchemaReject('schema:committedBytes' | 'schema:parts' | 'schema:sessionId'),
 * listRemoteSessions silently drops the poisoned meta, and pushSession
 * refuses to treat it as a writer/byte hint (`skip:schema:*`, nothing PUT).
 *
 * Pure host-function replay — fakeS3 + fakeCtx, no live base.
 */
import {
  fakeS3, fakeCtx, markerOf, memberRow, metaOf, seedSession,
  INSTANCE, USERNAME, MEMBER_ID, WS, SID,
  tmp, projectKey, isSchemaReject, settle, verdicts,
} from '../lib/nsw-fakes.mjs'
import { fetchTranscript, listRemoteSessions, pushSession } from '../../../deprecated/dsh-nano-shared-workspace/src/host/session-io.js'
import { pinWorkspaceLocalPath } from '../../../deprecated/dsh-nano-shared-workspace/src/host/workspaces.js'
import { join } from 'node:path'

export const fingerprint = 'nsw-sessionmeta-overflow'
export const describe =
  'session-meta committedBytes >2GiB / part >64KiB / sessionId-key mismatch — ' +
  'schema reject on read, skip on push, drop on list'

export async function run() {
  const v = verdicts()
  const identity = { username: USERNAME }
  const metaKey = `workspaces/${WS}/sessions/${SID}/meta.json`

  /* (a) committedBytes = 3 GiB — over MAX_COMMITTED_BYTES (2 GiB). */
  {
    const s3 = fakeS3({ [metaKey]: metaOf({ sessionId: SID, committedBytes: 3 * 1024 * 1024 * 1024 }) })
    const r = await settle(() => fetchTranscript(s3, WS, SID))
    v.check('committedBytes-3gib-rejected',
      r.threw && isSchemaReject(r.error, 'schema:committedBytes'),
      r.threw ? `${r.error?.reason}` : `returned ${JSON.stringify(r.value)}`)
    v.check('poisoned-meta-not-listed', (await listRemoteSessions(s3)).length === 0)
  }

  /* (b) committedBytes = MAX_SAFE_INTEGER — absurd claim, still schema:committedBytes. */
  {
    const s3 = fakeS3({ [metaKey]: metaOf({ sessionId: SID, committedBytes: Number.MAX_SAFE_INTEGER }) })
    const r = await settle(() => fetchTranscript(s3, WS, SID))
    v.check('committedBytes-maxsafe-rejected',
      r.threw && isSchemaReject(r.error, 'schema:committedBytes'),
      r.threw ? `${r.error?.reason}` : 'fetched')
  }

  /* (c) One body part over the 64 KiB slice limit. */
  {
    const s3 = fakeS3({
      [metaKey]: metaOf({ sessionId: SID, committedBytes: 70_000 }),
      [`workspaces/${WS}/sessions/${SID}/body/0.part`]: Buffer.alloc(70_000, 1), // > PART_BYTES
      [`workspaces/${WS}/sessions/${SID}/body/1.part`]: Buffer.alloc(4_312, 2),
    })
    const r = await settle(() => fetchTranscript(s3, WS, SID))
    v.check('part-over-64kib-rejected',
      r.threw && isSchemaReject(r.error, 'schema:parts'),
      r.threw ? `${r.error?.reason}` : 'fetched')
  }

  /* (d) Key↔object binding: meta fetched under sid-a carries sessionId sid-b. */
  {
    const s3 = fakeS3({
      [`workspaces/${WS}/sessions/session-a/meta.json`]: metaOf({ sessionId: 'session-b' }),
    })
    const r = await settle(() => fetchTranscript(s3, WS, 'session-a'))
    v.check('sessionId-key-mismatch-rejected',
      r.threw && isSchemaReject(r.error, 'schema:sessionId'),
      r.threw ? `${r.error?.reason}` : 'fetched')
    v.check('mismatch-not-listed', (await listRemoteSessions(s3)).length === 0)
  }

  /* (e) pushSession: a poisoned remote meta is skipped, never read as a
   *     writer/byte hint — and nothing is uploaded over it. */
  {
    const dshHome = tmp()
    const cwd = tmp()
    seedSession(dshHome, cwd, SID)
    const marker = markerOf({
      workspaceId: WS,
      members: { [MEMBER_ID]: memberRow(USERNAME, INSTANCE, cwd) },
    })
    pinWorkspaceLocalPath(WS, cwd) // F1: membership needs the local pin
    const s3 = fakeS3({ [metaKey]: metaOf({ sessionId: SID, committedBytes: Number.MAX_SAFE_INTEGER }) })
    const res = await pushSession(s3, fakeCtx(), identity,
      { sessionId: SID, filePath: join(dshHome, 'sessions', projectKey(cwd), SID, 'session.v4.jsonl.zstd') },
      [marker], { bySession: new Map() })
    v.check('pushSession-skips-poisoned-meta',
      typeof res?.outcome === 'string' && res.outcome.startsWith('skip:schema:'),
      `outcome=${res?.outcome}`)
    v.check('pushSession-no-overwrite',
      s3.putConds.every(c => c.key !== metaKey) && s3.hits.every(h => !h.startsWith('PUTB')),
      `putConds=${s3.putConds.map(c => c.key).join(',') || 'none'}`)
  }

  /* (f) Control: a well-formed meta+part still fetches. */
  {
    const ok = metaOf({ sessionId: SID, committedBytes: 10 })
    const s3 = fakeS3({
      [metaKey]: ok,
      [`workspaces/${WS}/sessions/${SID}/body/0.part`]: Buffer.alloc(10, 0x41),
    })
    const r = await settle(() => fetchTranscript(s3, WS, SID))
    // Part bytes are not a zstd stream → 'artifact failed to decode' (plain
    // Error), which still proves the meta+parts LIMIT path did not reject.
    v.check('valid-meta-not-schema-rejected',
      r.threw === false || !isSchemaReject(r.error),
      r.threw ? `threw ${r.error?.reason ?? r.error?.message}` : 'fetched')
  }

  return v.result('schema:committedBytes')
}
