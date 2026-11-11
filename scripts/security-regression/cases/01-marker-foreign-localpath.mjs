/**
 * 01 — nsw-marker-foreign-localpath (PoC: v-memberlp, audit §4.9/§4.11)
 *
 * A co-tenant of the shared bucket plants a workspace marker whose member
 * rows point `localPath` at victim directories:
 *   (a) foreign member row `mallory@…` with localPath '/Users' — previously
 *       every local session under /Users matched and was pushed;
 *   (b) a squatter row keyed by OUR memberId (username@instance8) but with
 *       the wrong full `instance` and an attacker-chosen localPath —
 *       previously the memberId row was honored on key alone.
 *
 * Oracle: matchWorkspace never matches on a foreign/squatted localPath,
 * ownMember returns undefined for the squatter row, joinWorkspace mutates
 * ONLY our row, and an end-to-end syncAll uploads nothing
 * (`skip:not-shared`, no meta.json on the bucket). The attacker path must
 * never become our replica root.
 *
 * Pure host-function replay — no live base needed (fakeS3 + fakeCtx).
 */
import {
  fakeS3, fakeCtx, markerOf, memberRow, seedSession,
  INSTANCE, USERNAME, MEMBER_ID, WS, SID,
  tmp, projectKey, verdicts,
} from '../lib/nsw-fakes.mjs'
import { listWorkspaces, joinWorkspace, matchWorkspace, ownMember, pinWorkspaceLocalPath } from '../../../dsh-nano-shared-workspace/src/host/workspaces.js'
import { syncAll } from '../../../dsh-nano-shared-workspace/src/host/session-io.js'
import { join } from 'node:path'

export const fingerprint = 'nsw-marker-foreign-localpath'
export const describe =
  'remote marker with foreign/squatted member.localPath — matchWorkspace/ownMember ' +
  'must not honor it; syncAll must upload nothing into a planted replica root'

export async function run() {
  const v = verdicts()
  const identity = { username: USERNAME }

  /* (a) Foreign member row claims /Users as ITS localPath — the §4.9 plant. */
  const markerA = markerOf({
    members: {
      'mallory@ccccdddd': memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', '/Users'),
    },
  })
  const hitA = await matchWorkspace('/Users/seanz/secret-project', [markerA], { identity, me: INSTANCE })
  v.check('foreign-localpath-not-honored', hitA === null, `match=${JSON.stringify(hitA?.workspaceId ?? null)}`)

  /* (b) Squatter row: our memberId key, attacker instance + localPath. */
  const markerB = markerOf({
    members: { [MEMBER_ID]: memberRow(USERNAME, 'attacker-instance', '/tmp/evil') },
  })
  v.check('squatter-ownMember-undefined', ownMember(markerB, identity, INSTANCE) === undefined)
  const hitB = await matchWorkspace('/tmp/evil/sub', [markerB], { identity, me: INSTANCE })
  v.check('squatter-match-null', hitB === null, `match=${JSON.stringify(hitB?.workspaceId ?? null)}`)

  /* (c) joinWorkspace writes ONLY our row — foreign localPath untouched. */
  {
    const foreign = memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', '/attacker/path')
    const s3 = fakeS3({
      [`workspaces/${WS}.json`]: markerOf({ workspaceId: WS, members: { 'mallory@ccccdddd': foreign } }),
    })
    const localPath = tmp()
    await joinWorkspace(s3, fakeCtx(), identity, { workspaceId: WS, localPath })
    const stored = s3.raw(`workspaces/${WS}.json`)
    v.check('join-keeps-foreign-row', stored?.members?.['mallory@ccccdddd']?.localPath === '/attacker/path',
      `foreign.localPath=${stored?.members?.['mallory@ccccdddd']?.localPath}`)
    v.check('join-writes-our-row', stored?.members?.[MEMBER_ID]?.localPath === localPath
      && stored?.members?.[MEMBER_ID]?.instance === INSTANCE)
  }

  /* (d) Control: our OWN member row still matches inside our replica. */
  {
    const root = tmp()
    const marker = markerOf({
      members: {
        'mallory@ccccdddd': memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', '/nonexistent'),
        [MEMBER_ID]: memberRow(USERNAME, INSTANCE, root),
      },
    })
    pinWorkspaceLocalPath(marker.workspaceId, root) // F1: membership needs the pin
    const hit = await matchWorkspace(join(root, 'sub', 'dir'), [marker], { identity, me: INSTANCE })
    v.check('own-row-still-matches', hit?.workspaceId === marker.workspaceId, `match=${hit?.workspaceId}`)
  }

  /* (e) End-to-end: marker surfacing through listWorkspaces + syncAll —
   *     the exact §4.9 exfil path. A foreign row claims our session's cwd as
   *     its replica root; the session must NOT be uploaded. */
  {
    const dshHome = tmp()
    const cwd = tmp()
    seedSession(dshHome, cwd, SID)
    const s3 = fakeS3({
      [`workspaces/${WS}.json`]: markerOf({
        workspaceId: WS,
        members: { 'mallory@ccccdddd': memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', cwd) },
      }),
    })
    const markers = await listWorkspaces(s3)
    v.check('marker-listed-but-read-only', markers.length === 1, `listed=${markers.length}`)
    const results = await syncAll(s3, fakeCtx(), identity, dshHome, { bySession: new Map() })
    const outcome = results.find(r => r.sessionId === SID)?.outcome
    v.check('sync-skips-not-shared', outcome === 'skip:not-shared', `outcome=${outcome}`)
    v.check('nothing-uploaded', s3.raw(`workspaces/${WS}/sessions/${SID}/meta.json`) === undefined
      && s3.hits.every(h => !h.startsWith('PUTB')), `hits=${s3.hits.join(',') || 'none'}`)
  }

  return v.result('schema:localPath')
}
