/**
 * 07 — schema-v0-discriminant (PoC: review 9012 p1-v0-discriminant-bypass.mjs)
 *
 * An attacker who can write a remote object stamps `v:0` (or
 * `schemaVersion:0`) on it. Because kind-aware defaulting only covered a
 * *missing* discriminant, a *present* `v:0` dispatched EVERY kind to the
 * depth-check-only v0 path → validate returned {ok:true} for a garbage
 * marker / session-meta / tree-head. A forged v0 marker then survived
 * readMarker() → matchWorkspace() and exfiltrated the victim's transcript;
 * a forged v0 session-meta skipped the committedBytes cap.
 *
 * Oracle: v0 is manifest-ONLY. `validate('marker'|'session-meta'|'tree-head'|
 * 'file'|'image', {v:0…})` throws SchemaReject `schema:v`; the consumer
 * readMarker() throws the same (zero S3 side-effects beyond the get); the
 * real v0 manifest backfill still works (compat:'v0-backfill').
 *
 * Pure host-function replay — fakeS3, no live base.
 */
import { fakeS3, WS, SID, isSchemaReject, settle, verdicts } from '../lib/nsw-fakes.mjs'
import { validate, SchemaReject } from '../../../packages/dsh-remote-data-schema/src/index.js'
import { readMarker } from '../../../dsh-nano-shared-workspace/src/host/workspaces.js'

export const fingerprint = 'schema-v0-discriminant'
export const describe =
  'explicit v:0 / schemaVersion:0 on a non-manifest kind — must reach ' +
  'SchemaReject schema:v, never the shapeless v0 pass; manifest v0 backfill still passes'

export async function run() {
  const v = verdicts()

  /* ---- validator level: v:0 must reject on every non-manifest kind ------- */
  const forged = [
    ['marker', { v: 0, members: 'not-even-an-object' }],
    ['marker', { schemaVersion: 0, whatever: true }],
    ['marker', { schemaVersion: '1', v: 0 }],
    ['session-meta', { v: 0, committedBytes: 'huge', sessionId: {} }],
    ['tree-head', { v: 0, files: [{ rel: '../../etc/passwd' }] }],
    ['image', { v: 0, mime: 'text/html', base64: 'PHNjcmlwdD4=' }],
  ]
  for (const [kind, obj] of forged) {
    const r = await settle(() => validate(kind, obj))
    v.check(`validate:${kind}:v0`,
      r.threw && isSchemaReject(r.error, 'schema:'),
      r.threw ? `${r.error?.reason}` : `returned ok=true — BYPASS`)
  }
  /* explicit {v:0} option must also reject for non-manifest kinds */
  const opt = await settle(() => validate('marker', { title: 'x' }, { v: 0 }))
  v.check('validate:marker:{v:0}-opt',
    opt.threw && isSchemaReject(opt.error, 'schema:v'),
    opt.threw ? `${opt.error?.reason}` : 'returned ok — BYPASS')

  /* ---- consumer level: forged v0 marker must not survive readMarker ------
   * readMarker swallows SchemaReject → undefined = the marker is discarded,
   * the host never matches on it (the side-effect oracle: no marker row). */
  const s3 = fakeS3({ [`workspaces/${WS}.json`]: { v: 0, workspaceId: WS, members: {} } })
  const rm = await settle(() => readMarker(s3, `workspaces/${WS}.json`))
  v.check('readMarker:forged-v0-marker',
    !rm.threw && rm.value === undefined,
    rm.threw ? `threw ${rm.error?.reason}` : `returned ${JSON.stringify(rm.value)}`)
  v.check('readMarker:no-s3-side-effect',
    s3.putConds.length === 0,
    `putConds=${s3.putConds.length}`)

  /* ---- control: real v0 manifest backfill still passes (T-O-8) ----------- */
  const m = validate('manifest', { rev: 0, files: {}, images: 0 })
  v.check('control:manifest-v0-backfill', m.compat === 'v0-backfill', `compat=${m.compat}`)

  return v.result('schema:v')
}
