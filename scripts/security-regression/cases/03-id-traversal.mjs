/**
 * 03 — nsw-id-traversal (PoCs: v-wsid workspaceId, v-claim claim-key, v-mat route)
 *
 * sessionId / workspaceId carrying `..`, '/', or non-charset bytes previously
 * flowed straight into S3 keys (`workspaces/{ws}/sessions/{sid}/…`,
 * `claims/{sid}.json`) and host paths — WHATWG URL dot-segment collapse
 * turned them into cross-key reads/writes (v-mat) and claim clobber (v-claim).
 *
 * Oracle — two enforced layers (P2-06):
 *   layer 1 route boundary: createRoutes handlers throw the 400-equivalent
 *     ("<param> has an invalid charset" / "localPath must be an absolute")
 *     before an S3 client is ever exercised;
 *   layer 2 consumers: joinWorkspace/acquireClaim/renewClaim/pullWorkspace/
 *     pushWorkspace/fetchTranscript/materializeSession throw SchemaReject and
 *     perform ZERO S3 operations.
 *
 * Pure host-function replay — fakeS3 + fakeCtx, no live base.
 */
import {
  fakeS3, fakeCtx, fakeReq,
  WS, SID, tmp, isSchemaReject, settle, verdicts,
} from '../lib/nsw-fakes.mjs'
import { joinWorkspace } from '../../../dsh-nano-shared-workspace/src/host/workspaces.js'
import { acquireClaim, renewClaim, fetchTranscript } from '../../../dsh-nano-shared-workspace/src/host/session-io.js'
import { pullWorkspace, pushWorkspace } from '../../../dsh-nano-shared-workspace/src/host/tree.js'
import { createRoutes } from '../../../dsh-nano-shared-workspace/src/host/routes.js'

export const fingerprint = 'nsw-id-traversal'
export const describe =
  'sessionId/workspaceId traversal — route assert* helpers (400-equivalent) AND ' +
  'consumer-layer SchemaReject with zero S3 hits'

export async function run() {
  const v = verdicts()
  const identity = { username: 'seanz-dev' }
  // Endpoint is intentionally dead: if any route reached the bucket the case
  // must fail anyway — charset checks fire before the first request.
  const routes = createRoutes(fakeCtx(), { endpoint: 'http://127.0.0.1:1', bucket: 'b', region: 'us-east-1', prefix: '' })

  /* ---- layer 1: route boundary ----------------------------------------- */
  const routeCases = [
    ['/sessions/lease', { sessionId: '../victim' }, /sessionId has an invalid charset/],
    ['/sessions/lease', { sessionId: 'a/b' }, /sessionId has an invalid charset/],
    ['/sessions/claim', { workspaceId: 'x'.repeat(17), sessionId: 'session-a' }, /workspaceId has an invalid charset/],
    ['/sessions/claim', { workspaceId: WS, sessionId: 'a/b' }, /sessionId has an invalid charset/],
    ['/workspaces/join', { workspaceId: '../../etc', localPath: '/tmp/x' }, /workspaceId has an invalid charset/],
    ['/workspaces/join', { workspaceId: WS, localPath: 'relative/dir' }, /localPath must be an absolute/],
    ['/materialize', { workspaceId: WS, sessionId: '../deep' }, /sessionId has an invalid charset/],
    ['/materialize', { workspaceId: 'not-hex!!', sessionId: SID }, /workspaceId has an invalid charset/],
    ['/tree/pull', { workspaceId: '../ws' }, /workspaceId has an invalid charset/],
    ['/transcript', { workspaceId: WS, sessionId: 'bad id!' }, /sessionId has an invalid charset/],
    ['/sessions/bind', { path: '/tmp/x', sessionId: '..' }, /sessionId has an invalid charset/],
  ]
  for (const [route, body, pattern] of routeCases) {
    const r = await settle(() => routes[route].run(fakeReq(body)))
    v.check(`route:${route}`,
      r.threw && pattern.test(r.error?.message ?? ''),
      r.threw ? String(r.error?.message) : `returned ${JSON.stringify(r.value)}`)
  }

  /* ---- layer 2: consumers double-check, zero S3 ops ---------------------- */
  const consumerCases = [
    ['joinWorkspace', s3 => joinWorkspace(s3, fakeCtx(), identity, { workspaceId: '../../x', localPath: '/tmp/x' }), 'schema:workspaceId'],
    ['acquireClaim', s3 => acquireClaim(s3, fakeCtx(), '../x', 'w@deadbeef', 1), 'schema:sessionId'],
    ['renewClaim', s3 => renewClaim(s3, 'a/b', 'w@deadbeef'), 'schema:sessionId'],
    ['pullWorkspace', s3 => pullWorkspace(s3, tmp(), '../ws', tmp()), 'schema:workspaceId'],
    ['pushWorkspace', s3 => pushWorkspace(s3, tmp(), 'ws/../x', tmp(), 'w@deadbeef'), 'schema:workspaceId'],
    ['fetchTranscript:ws', s3 => fetchTranscript(s3, '../ws', SID), 'schema:workspaceId'],
    ['fetchTranscript:sid', s3 => fetchTranscript(s3, WS, '../../escape'), 'schema:sessionId'],
  ]
  for (const [name, fn, prefix] of consumerCases) {
    const s3 = fakeS3()
    const r = await settle(() => fn(s3))
    v.check(`consumer:${name}`,
      r.threw && isSchemaReject(r.error, prefix),
      r.threw ? `${r.error?.reason ?? r.error?.message}` : `returned ${JSON.stringify(r.value)}`)
    v.check(`consumer:${name}:no-s3`, s3.hits.length === 0 && s3.putConds.length === 0,
      `hits=${s3.hits.join(',') || 'none'}`)
  }

  /* ---- control: charset-valid ids pass both layers ------------------------ */
  {
    const s3 = fakeS3()
    const claim = await acquireClaim(s3, fakeCtx(), 'session-a', 'w@deadbeef', 1)
    v.check('control:valid-claim-acquired', claim.acquired === true)
    const r = await settle(() => routes['/sessions/lease'].run(fakeReq({ sessionId: 'session-a' })))
    // Route passes the boundary and reaches S3 — on the dead endpoint it
    // throws a network error, which is fine: the oracle is 'not a charset
    // reject', i.e. the boundary did not fire.
    v.check('control:route-boundary-passed',
      !r.threw || !/invalid charset/.test(r.error?.message ?? ''),
      r.threw ? String(r.error?.message) : 'returned')
  }

  return v.result('schema:sessionId')
}
