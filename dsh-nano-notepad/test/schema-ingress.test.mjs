/**
 * B1-T02 / B1-T04 / B1-T06 — schema wired into the /s3/object consumption
 * point (P2-02) + fetch-mp per-hop redirect re-validation (P2-07).
 *
 * P2-02 is deliberately asymmetric:
 *   - `get` (ingress): a known key (manifest.json / files/<id>.md /
 *     images/<sha256>) whose decoded body fails the schema is rejected —
 *     {ok:false, reason:'schema:<field>'} — never handed to the client.
 *   - `put` (egress): a known key's body is validated BEFORE putObject; a
 *     malformed body is rejected locally and nothing is written. Unknown
 *     keys pass through untouched (T-O-3: no write-capability narrowing).
 *
 * The S3 wire is faked through `globalThis.fetch` (dsh-s3-client takes the
 * ambient fetch at engine build time), so the real signed-proxy path —
 * key layout, base64 envelope, validation — is exercised end to end.
 *
 * P2-07: fetchMpArticle follows redirects manually; every hop is re-checked
 * against `^https://mp\.weixin\.qq\.com/s/` before it is fetched.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSyncEngine } from '../src/host/s3-sync.js'
import { fetchMpArticle } from '../index.js'

const SHA = 'a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447'
const FILE_ID = '0cae2c8a-eaef-445e-b255-7b325157b34a'
const b64 = value => Buffer.from(value).toString('base64')

const GOOD_MANIFEST = {
  rev: 3,
  updatedAt: '2026-11-11T08:14:35.011Z',
  files: {
    [FILE_ID]: {
      name: 'note.md', parentId: null, workspaceId: null,
      sha256: SHA, bytes: 11, updatedAt: 1794384875011,
    },
  },
  images: { [SHA]: { id: 'img-1', mime: 'image/png', byteLength: 4 } },
}
const GOOD_IMAGE = { mime: 'image/png', base64: Buffer.from('PNG!').toString('base64') }

/* ------------------------------------------------------------------ */
/* Fake S3 + engine harness                                            */
/* ------------------------------------------------------------------ */

/** Minimal path-style S3 fake: GET/PUT/DELETE/HEAD on a Map of raw bytes. */
function fakeS3Fetch(bucket) {
  return async (url, init = {}) => {
    const u = new URL(url)
    const marker = '/test-bucket/'
    const at = u.pathname.indexOf(marker)
    const key = decodeURIComponent(u.pathname.slice(at + marker.length))
    if (init.method === 'PUT') {
      bucket.set(key, Buffer.from(init.body ?? ''))
      return new Response(null, { status: 200, headers: { etag: '"e1"' } })
    }
    if (init.method === 'DELETE') {
      bucket.delete(key)
      return new Response(null, { status: 204 })
    }
    if (init.method === 'HEAD') {
      return bucket.has(key)
        ? new Response(null, { status: 200, headers: { etag: '"e1"', 'content-length': '1' } })
        : new Response(null, { status: 404 })
    }
    /* GET (list-objects queries carry list-type=2 and hit the bucket root) */
    if (!bucket.has(key)) {
      return new Response('<Error><Code>NoSuchKey</Code><Message>nf</Message></Error>', { status: 404 })
    }
    return new Response(bucket.get(key), { status: 200, headers: { etag: '"e1"', 'content-type': 'application/octet-stream' } })
  }
}

/** One private DSH_HOME + profile store + fetch stub per test. */
async function withEngine(bucket, run) {
  const dir = mkdtempSync(join(tmpdir(), 'np-schema-ingress-'))
  const file = join(dir, 'profiles.json')
  writeFileSync(file, JSON.stringify({
    version: 1, activeId: 't', pending: null,
    profiles: [{
      id: 't', label: 'T', endpoint: 'https://s3.test.local', region: 'us-east-1',
      bucket: 'test-bucket', prefix: 'np/', pathStyle: true,
      accessKeyId: 'AK', secretAccessKey: 'SK', sessionToken: '',
    }],
  }))
  const env = ['DSH_HOME', 'DSH_NP_S3_PROFILES', 'S3_NOTEPAD_ACCESS_KEY']
  const previous = Object.fromEntries(env.map(key => [key, process.env[key]]))
  const previousFetch = globalThis.fetch
  process.env.DSH_HOME = dir
  process.env.DSH_NP_S3_PROFILES = file
  delete process.env.S3_NOTEPAD_ACCESS_KEY
  globalThis.fetch = fakeS3Fetch(bucket)
  try {
    return await run(createSyncEngine())
  } finally {
    for (const key of env) {
      if (previous[key] === undefined) delete process.env[key]
      else process.env[key] = previous[key]
    }
    globalThis.fetch = previousFetch
    rmSync(dir, { recursive: true, force: true })
  }
}

const seed = entries => new Map(Object.entries(entries).map(([k, v]) => [`np/${k}`, Buffer.isBuffer(v) ? v : Buffer.from(v)]))

/* ------------------------------------------------------------------ */
/* P2-02 — get (ingress)                                               */
/* ------------------------------------------------------------------ */

test('get manifest: a malicious remote manifest is rejected, never delivered', () =>
  /* schemaVersion:1 routes the object through the v1 whitelist (a
     discriminant-less object is historical v0 — lenient read by design). */
  withEngine(seed({ 'manifest.json': JSON.stringify({ schemaVersion: 1, rev: 'x', files: { 'a/b': {} }, images: {} }) }), async engine => {
    const got = await engine.object({ op: 'get', key: 'manifest.json' })
    assert.equal(got.ok, false)
    assert.match(got.reason, /^schema:/)
    assert.equal('bodyB64' in got, false, 'the bad object must not reach the client')
  }))

test('get manifest: pathological nesting is rejected even without a version discriminant', () =>
  withEngine(seed({ 'manifest.json': '{"a":'.repeat(40) + '1' + '}'.repeat(40) }), async engine => {
    const got = await engine.object({ op: 'get', key: 'manifest.json' })
    assert.equal(got.ok, false)
    assert.equal(got.reason, 'schema:depth')
  }))

test('get manifest: non-JSON body is rejected as schema:manifest', () =>
  withEngine(seed({ 'manifest.json': 'not json {' }), async engine => {
    const got = await engine.object({ op: 'get', key: 'manifest.json' })
    assert.deepEqual(got, { ok: false, reason: 'schema:manifest' })
  }))

test('get manifest: a v0 (no schemaVersion) manifest stays readable', () =>
  withEngine(seed({ 'manifest.json': JSON.stringify(GOOD_MANIFEST) }), async engine => {
    const got = await engine.object({ op: 'get', key: 'manifest.json' })
    assert.equal(got.ok, undefined)
    assert.equal(JSON.parse(Buffer.from(got.bodyB64, 'base64').toString('utf8')).rev, 3)
  }))

test('get manifest: schemaVersion:1 is accepted, schemaVersion:9 rejects', () =>
  withEngine(seed({
    'manifest.json': JSON.stringify({ schemaVersion: 9, ...GOOD_MANIFEST }),
  }), async engine => {
    const got = await engine.object({ op: 'get', key: 'manifest.json' })
    assert.equal(got.ok, false)
    assert.equal(got.reason, 'schema:unknown-version')
  }))

test('get file: non-UTF-8 remote bytes are rejected, never delivered', () =>
  withEngine(seed({ [`files/${FILE_ID}.md`]: Buffer.from([0xff, 0xfe, 0x00, 0x01]) }), async engine => {
    const got = await engine.object({ op: 'get', key: `files/${FILE_ID}.md` })
    assert.equal(got.ok, false)
    assert.equal(got.reason, 'schema:content')
    assert.equal('bodyB64' in got, false)
  }))

test('get file: valid UTF-8 draft passes through', () =>
  withEngine(seed({ [`files/${FILE_ID}.md`]: '# 你好 world' }), async engine => {
    const got = await engine.object({ op: 'get', key: `files/${FILE_ID}.md` })
    assert.equal(got.ok, undefined)
    assert.equal(Buffer.from(got.bodyB64, 'base64').toString('utf8'), '# 你好 world')
  }))

test('get image: unsupported mime in the remote object is rejected', () =>
  withEngine(seed({ [`images/${SHA}`]: JSON.stringify({ mime: 'image/svg+xml', base64: GOOD_IMAGE.base64 }) }), async engine => {
    const got = await engine.object({ op: 'get', key: `images/${SHA}` })
    assert.equal(got.ok, false)
    assert.equal(got.reason, 'schema:mime')
  }))

test('get image: non-JSON remote body is rejected', () =>
  withEngine(seed({ [`images/${SHA}`]: '<svg onload=alert(1)>' }), async engine => {
    const got = await engine.object({ op: 'get', key: `images/${SHA}` })
    assert.deepEqual(got, { ok: false, reason: 'schema:image' })
  }))

test('get image: a well-formed {mime,base64} object passes', () =>
  withEngine(seed({ [`images/${SHA}`]: JSON.stringify(GOOD_IMAGE) }), async engine => {
    const got = await engine.object({ op: 'get', key: `images/${SHA}` })
    assert.equal(got.ok, undefined)
    assert.equal(JSON.parse(Buffer.from(got.bodyB64, 'base64').toString('utf8')).mime, 'image/png')
  }))

test('get: unknown keys pass through with arbitrary bytes', () =>
  withEngine(seed({ 'notes/freeform.txt': 'anything', 'files/draft.txt': Buffer.from([0xff, 0x00]) }), async engine => {
    const a = await engine.object({ op: 'get', key: 'notes/freeform.txt' })
    assert.equal(Buffer.from(a.bodyB64, 'base64').toString('utf8'), 'anything')
    const b = await engine.object({ op: 'get', key: 'files/draft.txt' })
    assert.deepEqual([...Buffer.from(b.bodyB64, 'base64')], [0xff, 0x00])
  }))

/* ------------------------------------------------------------------ */
/* P2-02 — put (egress): asymmetric — validate known keys, pass others  */
/* ------------------------------------------------------------------ */

test('put manifest: invalid JSON for a known key is rejected before upload', () =>
  withEngine(seed({}), async engine => {
    const out = await engine.object({ op: 'put', key: 'manifest.json', bodyB64: b64('{broken') })
    assert.deepEqual(out, { ok: false, reason: 'schema:manifest' })
    const reread = await engine.object({ op: 'get', key: 'manifest.json' })
    assert.equal(reread, null, 'nothing was written')
  }))

test('put manifest: a field-level schema violation is rejected before upload', () =>
  withEngine(seed({}), async engine => {
    const bad = { ...GOOD_MANIFEST, files: { 'a/b/c': GOOD_MANIFEST.files[FILE_ID] } }
    const out = await engine.object({ op: 'put', key: 'manifest.json', bodyB64: b64(JSON.stringify(bad)) })
    assert.equal(out.ok, false)
    assert.match(out.reason, /^schema:/)
    assert.equal(await engine.object({ op: 'get', key: 'manifest.json' }), null)
  }))

test('put manifest: a v0-shaped (discriminant-less) valid manifest still writes', () =>
  withEngine(seed({}), async engine => {
    const out = await engine.object({ op: 'put', key: 'manifest.json', bodyB64: b64(JSON.stringify(GOOD_MANIFEST)) })
    assert.equal(out.ok, undefined)
    assert.equal(typeof out.etag, 'string')
    const reread = await engine.object({ op: 'get', key: 'manifest.json' })
    assert.equal(JSON.parse(Buffer.from(reread.bodyB64, 'base64').toString('utf8')).rev, 3)
  }))

test('put file: non-UTF-8 body for files/<id>.md is rejected before upload', () =>
  withEngine(seed({}), async engine => {
    const out = await engine.object({ op: 'put', key: `files/${FILE_ID}.md`, bodyB64: Buffer.from([0xff, 0xfe]).toString('base64') })
    assert.equal(out.ok, false)
    assert.equal(out.reason, 'schema:content')
    assert.equal(await engine.object({ op: 'get', key: `files/${FILE_ID}.md` }), null)
  }))

test('put file: a draft exceeding MAX_FILE_BYTES is rejected before upload', () =>
  withEngine(seed({}), async engine => {
    const out = await engine.object({ op: 'put', key: `files/${FILE_ID}.md`, bodyB64: Buffer.alloc(2 * 1024 * 1024 + 1, 0x61).toString('base64') })
    assert.equal(out.ok, false)
    assert.equal(out.reason, 'schema:content')
    assert.equal(await engine.object({ op: 'get', key: `files/${FILE_ID}.md` }), null)
  }))

test('put image: bad mime and bad base64 are both rejected before upload', () =>
  withEngine(seed({}), async engine => {
    const mime = await engine.object({ op: 'put', key: `images/${SHA}`, bodyB64: b64(JSON.stringify({ mime: 'image/svg+xml', base64: GOOD_IMAGE.base64 })) })
    assert.equal(mime.reason, 'schema:mime')
    const b64bad = await engine.object({ op: 'put', key: `images/${SHA}`, bodyB64: b64(JSON.stringify({ mime: 'image/png', base64: '!!!' })) })
    assert.equal(b64bad.reason, 'schema:base64')
    assert.equal(await engine.object({ op: 'get', key: `images/${SHA}` }), null)
  }))

test('put: unknown keys write arbitrary bytes (write capability not narrowed)', () =>
  withEngine(seed({}), async engine => {
    for (const key of ['notes/blob.bin', 'files/draft.txt', 'archive/2024/x']) {
      const out = await engine.object({ op: 'put', key, bodyB64: Buffer.from([0xff, 0x00, 0x7b]).toString('base64') })
      assert.equal(out.ok, undefined, `${key} must write freely`)
      assert.equal(typeof out.etag, 'string')
      const got = await engine.object({ op: 'get', key })
      assert.deepEqual([...Buffer.from(got.bodyB64, 'base64')], [0xff, 0x00, 0x7b])
    }
  }))

test('put: well-formed image and file bodies still write and read back', () =>
  withEngine(seed({}), async engine => {
    const img = await engine.object({ op: 'put', key: `images/${SHA}`, bodyB64: b64(JSON.stringify(GOOD_IMAGE)), contentType: 'application/json' })
    assert.equal(typeof img.etag, 'string')
    const file = await engine.object({ op: 'put', key: `files/${FILE_ID}.md`, bodyB64: b64('# draft'), contentType: 'text/plain; charset=utf-8' })
    assert.equal(typeof file.etag, 'string')
    const got = await engine.object({ op: 'get', key: `files/${FILE_ID}.md` })
    assert.equal(Buffer.from(got.bodyB64, 'base64').toString('utf8'), '# draft')
  }))

test('config probe: a schema-rejected remote manifest surfaces as corrupt, not empty', () =>
  withEngine(seed({ 'manifest.json': '{"rev":[]' }), async engine => {
    const probe = await engine.config({ action: 'probe', id: 't' })
    assert.equal(probe.ok, true)
    assert.equal(probe.manifest?.corrupt, true)
    assert.match(probe.manifest?.reason ?? '', /^schema:/)
  }))

/* ------------------------------------------------------------------ */
/* P2-07 — fetch-mp per-hop redirect re-validation                     */
/* ------------------------------------------------------------------ */

const MP_ARTICLE = '<html><body><h1 id="activity-name">T</h1><div id="js_content"><p>hello</p></div></body></html>'

/** fetch stub: `script` is a list of {status, body?, location?} replayed per call. */
function withScriptedFetch(script, run) {
  const previous = globalThis.fetch
  const calls = []
  globalThis.fetch = async url => {
    calls.push(url)
    const step = script[Math.min(calls.length - 1, script.length - 1)]
    return new Response(step.body ?? null, { status: step.status, headers: step.location ? { location: step.location } : {} })
  }
  return Promise.resolve(run(calls)).finally(() => { globalThis.fetch = previous })
}

test('fetch-mp: a non-mp initial URL is refused before any request', () =>
  withScriptedFetch([{ status: 200, body: MP_ARTICLE }], async calls => {
    const result = await fetchMpArticle('https://evil.example/s/x')
    assert.equal(result.reason, 'not-mp-url')
    assert.equal(calls.length, 0)
  }))

test('fetch-mp: a direct mp article still works', () =>
  withScriptedFetch([{ status: 200, body: MP_ARTICLE }], async calls => {
    const result = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.equal(result.ok, true)
    assert.equal(calls.length, 1)
    assert.match(result.content, /<p>hello<\/p>/)
  }))

test('fetch-mp: 302 to a loopback/internal target is rejected at the hop', () =>
  withScriptedFetch([
    { status: 302, location: 'http://127.0.0.1:8399/internal/admin' },
    { status: 200, body: MP_ARTICLE },
  ], async calls => {
    const result = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.deepEqual(result, { ok: false, reason: 'not-mp-url' })
    assert.equal(calls.length, 1, 'the escape hop must never be fetched')
  }))

test('fetch-mp: 302 to another mp article is followed and succeeds', () =>
  withScriptedFetch([
    { status: 302, location: 'https://mp.weixin.qq.com/s/def456' },
    { status: 200, body: MP_ARTICLE },
  ], async calls => {
    const result = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.equal(result.ok, true)
    assert.deepEqual(calls, ['https://mp.weixin.qq.com/s/abc123', 'https://mp.weixin.qq.com/s/def456'])
  }))

test('fetch-mp: https→http downgrade on the allowlisted host is rejected', () =>
  withScriptedFetch([
    { status: 302, location: 'http://mp.weixin.qq.com/s/abc123' },
    { status: 200, body: MP_ARTICLE },
  ], async calls => {
    const result = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.equal(result.reason, 'not-mp-url')
    assert.equal(calls.length, 1)
  }))

test('fetch-mp: protocol-relative, javascript: and off-host hops are all rejected', () =>
  withScriptedFetch([{ status: 302, location: '//169.254.169.254/latest/meta-data' }], async calls => {
    const r1 = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.equal(r1.reason, 'not-mp-url')
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'javascript:alert(1)' } })
    const r2 = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.equal(r2.reason, 'not-mp-url')
    globalThis.fetch = async () => new Response(null, { status: 302, headers: { location: 'https://mp.weixin.qq.com.evil.com/s/x' } })
    const r3 = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.equal(r3.reason, 'not-mp-url')
  }))

test('fetch-mp: a redirect chain of mp hops is bounded by the hop cap', () =>
  withScriptedFetch(Array.from({ length: 10 }, () => ({ status: 302, location: 'https://mp.weixin.qq.com/s/next' })), async calls => {
    const result = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.equal(result.reason, 'too-many-redirects')
    assert.equal(calls.length, 6, 'initial + 5 redirects, then the cap stops it')
  }))

test('fetch-mp: a 30x without Location fails closed', () =>
  withScriptedFetch([{ status: 302 }], async calls => {
    const result = await fetchMpArticle('https://mp.weixin.qq.com/s/abc123')
    assert.equal(result.reason, 'fetch-failed')
    assert.equal(calls.length, 1)
  }))
