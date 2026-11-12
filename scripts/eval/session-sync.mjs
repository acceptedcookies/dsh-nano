/**
 * T-F01..T-F05: session-artifact sync across the two real clients.
 * Covers push (local log → chunk family), remote listing on both nodes,
 * transcript replay, materialize (cwd rewrite + full multi-frame copy), and
 * the foreign-writer gate. Requires a shared session whose cwd is inside a
 * member replica; `prepare` mode prints the UI steps when none exists.
 * Run: node scripts/eval/session-sync.mjs
 */
import { readFileSync, existsSync, rmSync, utimesSync } from 'node:fs'
import { zstdDecompressSync } from 'node:zlib'
import { devNsw, desktopNsw, post, check } from './clients.mjs'
import { env, clientFor } from './lib.mjs'

const WS = process.env.DASW_WS ?? '9167ab8d56346228'
const SID = process.env.DASW_SID ?? 'session-135daa5d-f30a-4b89-8fe2-aef020f84943'
const B_ARTIFACT = `/Users/seanz/.dsh-desktop/sessions/--Users-seanz-dasw-1112-mu-b--/${SID}/session.v4.jsonl.zstd`
const { s3 } = clientFor(env(), 'DASWA')
const frameCount = buf => {
  let n = 0
  for (let i = 0; i + 3 < buf.length; i += 1) if (buf[i] === 0x28 && buf[i + 1] === 0xb5 && buf[i + 2] === 0x2f && buf[i + 3] === 0xfd) n += 1
  return n
}

// ---- T-F01: push the local artifact ----
const sync = await post(devNsw, '/sync')
const outcome = (sync.body?.outcomes ?? []).find(row => row.sessionId === SID)
check('A /sync reports this session', outcome !== undefined, JSON.stringify(outcome ?? sync.body).slice(0, 200))
check('outcome is a real push outcome or a deliberate skip',
  outcome === undefined || /^(pushed|fresh|unchanged|skip:not-shared|skip:lease-held-by-|skip:foreign-writer)/.test(outcome.outcome ?? ''),
  JSON.stringify(outcome))

const meta = await s3.getJson(`workspaces/${WS}/sessions/${SID}/meta.json`)
check('remote meta exists and is bound to the session id', meta?.sessionId === SID, JSON.stringify(meta).slice(0, 160))
const parts = (await s3.list(`workspaces/${WS}/sessions/${SID}/body/`)).keys
check('body part family present', parts.length >= 1, parts.join(','))
const partBytes = (await s3.getBytes(parts[0])).length
check('part size matches committedBytes for a single-part body', meta.committedBytes <= 64 * 1024 ? partBytes === meta.committedBytes : true,
  `part=${partBytes} committed=${meta.committedBytes}`)

// ---- T-F02: both clients list the remote session ----
for (const [name, fn] of [['A', devNsw], ['B', desktopNsw]]) {
  const r = await fn('/sessions')
  const row = (r.body?.sessions ?? []).find(x => x.sessionId === SID)
  check(`${name} lists the remote session`, row !== undefined, JSON.stringify(row ?? {}).slice(0, 160))
}

// ---- T-F03: transcript replay is complete on BOTH runtimes ----
let aCount = 0
for (const [name, fn] of [['A', devNsw], ['B', desktopNsw]]) {
  const r = await post(fn, '/transcript', { workspaceId: WS, sessionId: SID })
  const events = r.body?.events ?? []
  const types = new Set(events.map(e => e?.type))
  if (name === 'A') aCount = events.length
  check(`${name} transcript equals meta.eventCount`, events.length === r.body?.meta?.eventCount,
    `events=${events.length} meta=${r.body?.meta?.eventCount} types=${types.size}`)
  if (name === 'B') check('B transcript matches A (multi-frame decode, F-22)', events.length === aCount, `${events.length} vs ${aCount}`)
}

// ---- T-F04: materialize lands a complete artifact on B ----
rmSync(B_ARTIFACT, { force: true })
const mat = await post(desktopNsw, '/materialize', { workspaceId: WS, sessionId: SID })
check('B materialize succeeds', mat.body?.ok === true, JSON.stringify(mat.body).slice(0, 200))
check('materialized file exists', existsSync(B_ARTIFACT), B_ARTIFACT)
if (existsSync(B_ARTIFACT)) {
  const buf = readFileSync(B_ARTIFACT)
  const text = zstdDecompressSync(buf).toString('utf8')
  const lines = text.split('\n').filter(Boolean)
  check('materialized copy is complete, not just the header', lines.length === meta.eventCount, `${lines.length} of ${meta.eventCount}`)
  check('header cwd rewritten to B replica', JSON.parse(lines[0]).cwd === '/Users/seanz/dasw-1112-mu-b', JSON.parse(lines[0]).cwd)
  check('materialized artifact keeps a valid frame layout', frameCount(buf) >= 1, `frames=${frameCount(buf)}`)
}

// ---- T-F05: foreign writer is refused ----
// The unchanged-fingerprint fast path would answer before the writer gate, so
// bump the local mtime to force a real push attempt.
const localArtifact = `/Users/seanz/.dsh-dev/sessions/--Users-seanz-dasw-1112-mu-a--/${SID}/session.v4.jsonl.zstd`
const bumped = new Date(Date.now() + 1000)
utimesSync(localArtifact, bumped, bumped)
const foreign = { ...meta, writerId: 'dasw-x@deadbeef', rev: meta.rev + 5, committedBytes: 10 }
await s3.putJson(`workspaces/${WS}/sessions/${SID}/meta.json`, foreign)
const blocked = await post(devNsw, '/sync')
const foreignOutcome = (blocked.body?.outcomes ?? []).find(row => row.sessionId === SID)
check('A refuses to push over a foreign writer', String(foreignOutcome?.outcome ?? '').includes('foreign-writer'), JSON.stringify(foreignOutcome))
await s3.putJson(`workspaces/${WS}/sessions/${SID}/meta.json`, meta)
console.log('restored meta rev', meta.rev)
