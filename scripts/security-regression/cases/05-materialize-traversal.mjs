/**
 * 05 — nsw-materialize-traversal (PoC: v-mat, audit §4.10)
 *
 * `sessionId` flows from a remote session-meta/listing row verbatim into
 *   S3:   workspaces/{ws}/sessions/{sessionId}/…   (dot-segments collapse)
 *   fs:   $DSH_HOME/sessions/<projectKey(localPath)>/{sessionId}/
 * Pre-hardening, sessionId '../../../mat-escape/deep' wrote the attacker
 * artifact OUTSIDE the session tree, and '../<pk>/<victimSid>' overwrote a
 * victim session in place. localPath was similarly unfenced.
 *
 * Oracle: materializeSession throws SchemaReject for traversal ids and
 * non-absolute/non-normalized localPath — zero S3 hits, zero bytes outside
 * the session tree, the victim artifact byte-identical. A pre-existing
 * symlinked session dir is refused (realpath fence). listRemoteSessions
 * drops a decoy meta whose sessionId carries the traversal.
 *
 * Pure host-function replay — fakeS3 + tmp dirs, no live base.
 */
import { existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { zstdDecompressSync } from 'node:zlib'
import {
  fakeS3, metaOf, seededSessionBucket,
  WS, SID, tmp, projectKey, zframe, isSchemaReject, settle, verdicts,
} from '../lib/nsw-fakes.mjs'
import { materializeSession, listRemoteSessions } from '../../../dsh-nano-shared-workspace/src/host/session-io.js'

export const fingerprint = 'nsw-materialize-traversal'
export const describe =
  'materializeSession with ../ sessionId or outside localPath — SchemaReject, ' +
  'no file written outside the session tree, victim artifact untouched'

export async function run() {
  const v = verdicts()
  const dshHome = tmp()
  const localPath = tmp()
  const outside = tmp()

  /* (a) The exact v-mat payload: '../../../mat-escape/deep' — SchemaReject
   *     at the consumer boundary, no S3 key formed, nothing on disk. */
  {
    const s3 = fakeS3()
    const sid = '../../../mat-escape/deep'
    const r = await settle(() => materializeSession(s3, dshHome, { workspaceId: WS, sessionId: sid, localPath }))
    v.check('dotdot-sessionId-schema-rejected',
      r.threw && isSchemaReject(r.error, 'schema:sessionId'),
      r.threw ? `${r.error?.reason}` : `landed at ${r.value?.path}`)
    v.check('dotdot-sessionId-no-s3', s3.hits.length === 0, `hits=${s3.hits.join(',') || 'none'}`)
    v.check('dotdot-sessionId-no-escape-file',
      !existsSync(join(dshHome, '..', 'mat-escape')) && !existsSync(join(outside, 'deep')))
  }

  /* (b) One '..' overwriting a victim session in a sibling project dir —
   *     v-mat case B. The victim file must stay byte-identical. */
  {
    const victimSid = 'session-victim-0000-0000-0000-000000000000'
    const victimPk = '--victim-proj--'
    const victimDir = join(dshHome, 'sessions', victimPk, victimSid)
    mkdirSync(victimDir, { recursive: true })
    const victimFile = join(victimDir, 'session.v4.jsonl.zstd')
    const honest = zframe(Buffer.from(
      JSON.stringify({ type: 'session', id: victimSid, cwd: '/victim/proj', createdAt: 1 }) + '\n'
      + '{"type":"session/title","data":{"title":"real victim transcript"}}\n'))
    writeFileSync(victimFile, honest)

    const s3 = fakeS3()
    const sidB = `../${victimPk}/${victimSid}`
    const r = await settle(() => materializeSession(s3, dshHome, { workspaceId: WS, sessionId: sidB, localPath }))
    v.check('single-dotdot-rejected',
      r.threw && isSchemaReject(r.error, 'schema:sessionId'),
      r.threw ? `${r.error?.reason}` : `landed at ${r.value?.path}`)
    const after = readFileSync(victimFile)
    v.check('victim-artifact-untouched',
      Buffer.compare(after, honest) === 0
        && zstdDecompressSync(after).toString('utf8').includes('real victim transcript'))
  }

  /* (c) traversal workspaceId — same consumer boundary. */
  {
    const s3 = fakeS3()
    const r = await settle(() => materializeSession(s3, dshHome, { workspaceId: '../ws', sessionId: SID, localPath }))
    v.check('dotdot-workspaceId-rejected',
      r.threw && isSchemaReject(r.error, 'schema:workspaceId'),
      r.threw ? `${r.error?.reason}` : 'returned')
    v.check('dotdot-workspaceId-no-s3', s3.hits.length === 0)
  }

  /* (d) localPath that resolves outside / is not normalized — SchemaReject. */
  for (const [name, lp] of [['relative', 'relative/dir'], ['normalized-away', '/tmp/../tmp']]) {
    const s3 = fakeS3()
    const r = await settle(() => materializeSession(s3, dshHome, { workspaceId: WS, sessionId: SID, localPath: lp }))
    v.check(`localPath-${name}-rejected`,
      r.threw && isSchemaReject(r.error, 'schema:localPath'),
      r.threw ? `${r.error?.reason}` : `landed at ${r.value?.path}`)
    v.check(`localPath-${name}-no-s3`, s3.hits.length === 0)
  }

  /* (e) Pre-existing symlinked session dir — the realpath fence refuses the
   *     unpack target even though sessionId itself is charset-clean. */
  {
    const home = tmp()
    const root = tmp()
    const out = tmp()
    const sessionDir = join(home, 'sessions', projectKey(root), SID)
    mkdirSync(join(home, 'sessions', projectKey(root)), { recursive: true })
    symlinkSync(out, sessionDir, 'dir')
    const s3 = fakeS3()
    seededSessionBucket(s3, WS, SID, '/remote/cwd')
    const r = await settle(() => materializeSession(s3, home, { workspaceId: WS, sessionId: SID, localPath: root }))
    v.check('symlinked-session-dir-refused',
      r.threw && /symlink|realpath fence|escaped the session tree/.test(String(r.error?.message)),
      r.threw ? String(r.error?.message) : `landed at ${r.value?.path}`)
    v.check('symlink-target-not-written', !existsSync(join(out, 'session.v4.jsonl.zstd')))
  }

  /* (f) Decoy listing row: meta.sessionId carries a traversal — the row must
   *     never surface for a click to feed /materialize. */
  {
    const s3 = fakeS3({
      [`workspaces/${WS}/sessions/decoy/meta.json`]:
        metaOf({ sessionId: '../../../mat-escape/deep', title: 'standup notes', committedBytes: 0 }),
    })
    const listed = await listRemoteSessions(s3)
    v.check('decoy-traversal-row-dropped',
      !listed.some(r => typeof r.sessionId === 'string' && r.sessionId.includes('..')),
      `listed=${listed.map(r => r.sessionId).join(',') || 'none'}`)
  }

  /* (g) Control: a valid session materializes INSIDE the session tree. */
  {
    const home = tmp()
    const root = tmp()
    const s3 = fakeS3()
    seededSessionBucket(s3, WS, SID, '/remote/cwd')
    const res = await materializeSession(s3, home, { workspaceId: WS, sessionId: SID, localPath: root })
    const expected = join(home, 'sessions', projectKey(root), SID, 'session.v4.jsonl.zstd')
    v.check('control-materializes-inside-tree',
      res?.path === expected && existsSync(expected) && expected.startsWith(join(home, 'sessions') + '/'),
      `path=${res?.path}`)
  }

  return v.result('schema:sessionId')
}
