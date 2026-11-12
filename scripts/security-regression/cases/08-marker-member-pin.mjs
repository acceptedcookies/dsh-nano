/**
 * 08 — nsw-marker-member-pin (PoCs: review 9012 F1 p2 + F7 p7)
 *
 * `member.instance` is PUBLISHED in the marker, so the strict memberId check
 * is not a secret: a co-tenant copies our row verbatim, rewrites `localPath`,
 * and — until now — pull wrote remote blobs into an attacker-chosen root
 * (e.g. ~/.ssh), push exfiltrated from it, and matchWorkspace claimed
 * sessions under it (F1). A planted marker that hash-matched our project
 * basename also claimed sessions with no localPath at all (F7).
 *
 * Oracle: the LOCAL PIN (dshHome/nsw-pins/<ws>.json, written at create/join)
 * is the only proof of membership —
 *   - no pin  ⇒ trustedMember/matchWorkspace return nothing; pull/push/match
 *     cannot be steered by the remote row regardless of its content;
 *   - pin set ⇒ the PINNED localPath, not the remote claim, is the replica
 *     root; a remote `localPath` divergence is ignored;
 *   - legacy hash-match requires the pin too.
 *
 * Pure host-function replay — fakeS3 + fakeCtx, isolated DSH_HOME (fakes).
 */
import {
  fakeS3, fakeCtx, markerOf, memberRow, seedSession,
  INSTANCE, USERNAME, MEMBER_ID, WS, SID,
  tmp, settle, verdicts,
} from '../lib/nsw-fakes.mjs'
import { readMarker, matchWorkspace, trustedMember, ownMember, pinWorkspaceLocalPath } from '../../../deprecated/dsh-nano-shared-workspace/src/host/workspaces.js'
import { join } from 'node:path'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'

export const fingerprint = 'nsw-marker-member-pin'
export const describe =
  'co-tenant rewrites our member.localPath — the LOCAL PIN (not the remote ' +
  'row) is the replica root; no pin ⇒ member row cannot drive pull/push/match'

export async function run() {
  /* Fresh pin home for THIS case (inside run() — top-level env assignments
   * all collapse into one home once the runner has imported every case). */
  process.env.DSH_HOME = mkdtempSync(join(tmpdir(), 'nsw-pin-case08-'))
  const v = verdicts()
  const identity = { username: USERNAME }

  const ours = tmp()           // the localPath WE chose at join
  const attacker = tmp()       // attacker-repointed root

  /* ---------- no pin: a planted/claimed member row must not be trusted ---- */
  const planted = markerOf({
    workspaceId: WS,
    members: { [MEMBER_ID]: memberRow(USERNAME, INSTANCE, attacker) },
  })
  /* ownMember (read-only) still surfaces the row; trustedMember must not. */
  v.check('ownMember:row-readable',
    ownMember(planted, identity, INSTANCE)?.member.localPath === attacker)
  v.check('trustedMember:no-pin-refuses',
    trustedMember(planted, identity, INSTANCE) === undefined)
  const hitNoPin = await matchWorkspace(join(attacker, 'proj'), [planted], { identity, me: INSTANCE })
  v.check('matchWorkspace:no-pin-no-claim', hitNoPin === null, `matched=${hitNoPin?.workspaceId}`)

  /* ---------- pin set: remote repoint is ignored, pin wins ---------------- */
  pinWorkspaceLocalPath(WS, ours)
  const repointed = markerOf({
    workspaceId: WS,
    members: { [MEMBER_ID]: memberRow(USERNAME, INSTANCE, attacker) },
  })
  const tm = trustedMember(repointed, identity, INSTANCE)
  v.check('trustedMember:pin-wins', tm?.member.localPath === ours, `localPath=${tm?.member.localPath}`)
  /* matchWorkspace uses the pinned root, not the attacker path. */
  const hitOurs = await matchWorkspace(join(ours, 'proj'), [repointed], { identity, me: INSTANCE })
  const hitAtk = await matchWorkspace(join(attacker, 'proj'), [repointed], { identity, me: INSTANCE })
  v.check('matchWorkspace:claims-pinned-root', hitOurs?.workspaceId === WS)
  v.check('matchWorkspace:rejects-repointed-root', hitAtk === null, `matched=${hitAtk?.workspaceId}`)

  /* ---------- F7: legacy hash-match requires the pin ---------------------- */
  /* With the pin set, a marker whose workspaceId equals the hash STILL claims
   * only because we pinned it; a different (unpinned) ws id never claims. */
  const otherWs = 'ffffffffffffffff'
  const planted2 = markerOf({
    workspaceId: otherWs,
    members: { [MEMBER_ID]: memberRow(USERNAME, INSTANCE, ours) },
  })
  const hitOther = await matchWorkspace(join(ours, 'proj'), [planted2], { identity, me: INSTANCE })
  v.check('matchWorkspace:unpinned-ws-no-claim', hitOther === null, `matched=${hitOther?.workspaceId}`)

  /* ---------- join persists the pin (so membership survives restart) ------ */
  const { joinWorkspace } = await import('../../../deprecated/dsh-nano-shared-workspace/src/host/workspaces.js')
  const ws2 = 'aaaaaaaaaaaaaaaa'
  const s3 = fakeS3({ [`workspaces/${ws2}.json`]: markerOf({
    workspaceId: ws2,
    members: { 'mallory@ccccdddd': memberRow('mallory', 'e7e7e7e7-0000-0000-0000-000000000000', '/other') },
  }) })
  const joinPath = tmp()
  await joinWorkspace(s3, fakeCtx(), identity, { workspaceId: ws2, localPath: joinPath })
  const reRead = markerOf({ workspaceId: ws2, members: { [MEMBER_ID]: memberRow(USERNAME, INSTANCE, '/hostile') } })
  v.check('join-writes-pin:trustedMember-uses-pin',
    trustedMember(reRead, identity, INSTANCE)?.member.localPath === joinPath)

  return v.result('schema:localPath')
}
