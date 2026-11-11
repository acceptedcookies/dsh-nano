/**
 * B1-T01 — dsh-remote-data-schema unit tests (P2-01).
 *
 * Positive samples use the literal wire shapes from test/remote-schema/compat/
 * (real bucket exports). Negative samples cover the remote-cross attack
 * surface: id/key escape, mime escape, deep nesting, size overruns, '..'
 * paths, SKIP rels (allowed per correction — SKIP is a P2-05 boundary),
 * memberId spoofing, formatVersion/part bounds.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  validate, SchemaReject, SUPPORTED_KINDS,
  MAX_FILE_BYTES, MAX_IMAGE_BYTES, MAX_COMMITTED_BYTES, PART_BYTES, MAX_DEPTH,
  SESSION_ID_RE, WORKSPACE_ID_RE,
} from '../src/index.js'

const rejects = (fn, reason) => assert.throws(
  fn,
  e => e instanceof SchemaReject && (reason === undefined || e.reason === reason),
  `expected SchemaReject ${reason}`,
)

const SHA = 'a948904f2f0f479b8f8197694b30184b0d2ed1c1cd2a1ec0fb85d299a192a447'
const SHA2 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
const FILE_ID = '0cae2c8a-eaef-445e-b255-7b325157b34a'
const ISO = '2026-11-11T08:14:35.011Z'

/* ---- literal positive fixtures (from the real bucket) ---- */
const GOOD_MANIFEST = {
  schemaVersion: 1,
  rev: 2,
  updatedAt: ISO,
  files: {
    [FILE_ID]: {
      name: 'untitled.md', parentId: null, workspaceId: null,
      sha256: SHA2, bytes: 0, updatedAt: 1794155860998,
    },
    'cloud-pull-test-0003': {
      name: 'cloud-pull-test-0003.md', parentId: null,
      workspaceId: 'f192bab4-00a7-43ad-bcf8-94d02c1237dd',
      sha256: SHA, bytes: 44, updatedAt: 1794384875011,
    },
  },
  images: {
    [SHA]: { id: 'img-1', mime: 'image/png', byteLength: 1024 },
  },
}
/* The real bucket manifest: no schemaVersion, rev small int. */
const V0_MANIFEST = { rev: 2, updatedAt: ISO, files: GOOD_MANIFEST.files, images: {} }

const GOOD_MARKER = {
  v: 1, workspaceId: '247470eca9084453', title: '111', pathHint: '111',
  createdAt: '2026-11-10T06:12:29.454Z', createdBy: 'seanz-dev@fba3fbd5',
  members: {
    'seanz-dev@fba3fbd5': {
      username: 'seanz-dev', instance: 'fba3fbd5-2b1a-46ec-9144-1b7140642023',
      localPath: '/Users/seanz/123', joinedAt: '2026-11-10T06:12:29.454Z',
    },
  },
}

const GOOD_SESSION_META = {
  v: 1, sessionId: 'session-55cb495c-277b-4bb8-b02e-5de8416ee64f',
  writerId: 'seanz-dev@fba3fbd5', writerName: 'seanz-dev', rev: 266,
  formatVersion: 4, committedBytes: 25786, uncompressedSeqBytes: 0,
  eventCount: 50, title: 'Coral origami fish image',
  projectDir: '--Users-seanz-123--', cwd: '/Users/seanz/123',
  createdAt: '2026-11-10T13:32:49.787Z', mtime: '2026-11-11T01:04:43.558Z',
  deleted: false, attachmentRefs: [],
}

const GOOD_TREE_HEAD = {
  v: 1, generation: 210, parent: 209, writerId: 'seanz-dev@fba3fbd5',
  files: [
    { rel: 'hello.world', sha256: SHA, size: 12 },
    { rel: 'imagine/.grok/auth.json', sha256: SHA, size: 1823 },
    { rel: 'node_modules/x/index.js', sha256: SHA2, size: 0 },
    { rel: '.git/config', sha256: SHA2, size: 40 },
  ],
  conflicts: ['docs/a.md'], at: '2026-11-11T15:50:47.886Z',
}

/* ================================================================== */
test('exports the API surface', () => {
  assert.equal(typeof validate, 'function')
  assert.ok(SchemaReject.prototype instanceof Error)
  assert.deepEqual([...SUPPORTED_KINDS], ['manifest', 'file', 'image', 'marker', 'session-meta', 'tree-head'])
  assert.equal(MAX_FILE_BYTES, 2 * 1024 * 1024)
  assert.equal(MAX_IMAGE_BYTES, 5 * 1024 * 1024)
  assert.equal(MAX_COMMITTED_BYTES, 2 * 1024 * 1024 * 1024)
  assert.equal(PART_BYTES, 64 * 1024)
  assert.equal(MAX_DEPTH, 32)
  assert.ok(SESSION_ID_RE.test('session-55cb495c-277b-4bb8-b02e-5de8416ee64f'))
  assert.ok(WORKSPACE_ID_RE.test('247470eca9084453'))
})

test('SchemaReject carries `reason` and extends Error', () => {
  const e = new SchemaReject('schema:name', 'has control char')
  assert.ok(e instanceof Error && e instanceof SchemaReject)
  assert.equal(e.reason, 'schema:name')
  assert.match(e.message, /control char/)
})

/* ================================================================== */
test('manifest: literal real shape passes v1 (explicit and implicit)', () => {
  assert.deepEqual(validate('manifest', GOOD_MANIFEST), { ok: true, v: 1 })
  const implicit = { ...GOOD_MANIFEST }
  delete implicit.schemaVersion
  assert.deepEqual(validate('manifest', implicit, { v: 1 }), { ok: true, v: 1 })
  /* rev 0 tolerated (first-push edge). */
  assert.equal(validate('manifest', { ...implicit, rev: 0 }, { v: 1 }).ok, true)
})

test('manifest rejects bad shape and field attacks', () => {
  rejects(() => validate('manifest', { schemaVersion: 2, rev: 1, updatedAt: ISO, files: {}, images: {} }), 'schema:unknown-version')
  rejects(() => validate('manifest', { rev: 1, updatedAt: ISO, files: {}, images: {}, extra: 1 }, { v: 1 }), 'schema:manifest')
  rejects(() => validate('manifest', { rev: -1, updatedAt: ISO, files: {}, images: {} }, { v: 1 }), 'schema:rev')
  rejects(() => validate('manifest', { rev: 'x', updatedAt: ISO, files: {}, images: {} }, { v: 1 }), 'schema:rev')
})

test('manifest rejects file-id escape and entry attacks', () => {
  const base = { rev: 1, updatedAt: ISO, files: {}, images: {} }
  rejects(() => validate('manifest', { ...base, files: { '../evil': { name: 'e', sha256: SHA, bytes: 1, updatedAt: 1 } } }, { v: 1 }), 'schema:files')
  rejects(() => validate('manifest', { ...base, files: { 'a/b': { name: 'e', sha256: SHA, bytes: 1, updatedAt: 1 } } }, { v: 1 }), 'schema:files')
  rejects(() => validate('manifest', { ...base, files: { x: { name: 'a/b', sha256: SHA, bytes: 1, updatedAt: 1 } } }, { v: 1 }), 'schema:name')
  rejects(() => validate('manifest', { ...base, files: { x: { name: 'a', sha256: 'zzz', bytes: 1, updatedAt: 1 } } }, { v: 1 }), 'schema:sha256')
  rejects(() => validate('manifest', { ...base, files: { x: { name: 'a', sha256: SHA, bytes: -1, updatedAt: 1 } } }, { v: 1 }), 'schema:bytes')
  rejects(() => validate('manifest', { ...base, files: { x: { name: 'a', sha256: SHA, bytes: 1, updatedAt: 1, evil: true } } }, { v: 1 }), 'schema:files')
})

test('manifest rejects bad image entries', () => {
  const base = { rev: 1, updatedAt: ISO, files: {}, images: {} }
  rejects(() => validate('manifest', { ...base, images: { notasha: { id: 'i', mime: 'image/png', byteLength: 1 } } }, { v: 1 }), 'schema:images')
  rejects(() => validate('manifest', { ...base, images: { [SHA]: { id: 'i', mime: 'image/svg+xml', byteLength: 1 } } }, { v: 1 }), 'schema:mime')
  rejects(() => validate('manifest', { ...base, images: { [SHA]: { id: 'i', mime: 'image/png', byteLength: MAX_IMAGE_BYTES + 1 } } }, { v: 1 }), 'schema:byteLength')
})

/* ================================================================== */
test('file: raw UTF-8 body passes (string, Buffer, wrapped)', () => {
  assert.deepEqual(validate('file', '# hello\n', { v: 1 }), { ok: true, v: 1 })
  assert.equal(validate('file', Buffer.from('中文 UTF-8', 'utf8'), { v: 1 }).ok, true)
  assert.equal(validate('file', { content: 'body', key: `files/${FILE_ID}.md` }, { v: 1 }).ok, true)
  assert.equal(validate('file', '', { v: 1 }).ok, true)
})

test('file: key id must match charset and manifest membership', () => {
  const ctx = { context: { key: `files/${FILE_ID}.md`, manifest: GOOD_MANIFEST } }
  assert.equal(validate('file', 'x', { v: 1, ...ctx }).ok, true)
  rejects(() => validate('file', 'x', { v: 1, context: { key: 'files/../evil.md' } }), 'schema:key')
  rejects(() => validate('file', 'x', { v: 1, context: { key: 'files/a/b.md' } }), 'schema:key')
  rejects(() => validate('file', 'x', { v: 1, context: { key: 'files/evil.md/../x.md' } }), 'schema:key')
  rejects(() => validate('file', 'x', { v: 1, context: { key: `files/${FILE_ID}.md`, manifest: { files: {} } } }), 'schema:id')
  rejects(() => validate('file', 'x', { v: 1, context: { id: 'a/b' } }), 'schema:id')
})

test('file: non-UTF8 and oversized bodies reject', () => {
  rejects(() => validate('file', Buffer.from([0xff, 0xfe, 0xfd]), { v: 1 }), 'schema:content')
  rejects(() => validate('file', 'x'.repeat(MAX_FILE_BYTES + 1), { v: 1 }), 'schema:content')
  rejects(() => validate('file', 42, { v: 1 }), 'schema:content')
  rejects(() => validate('file', { content: 'x', evil: 1 }, { v: 1 }), 'schema:file')
})

/* ================================================================== */
test('image: {mime,base64} passes', () => {
  const b64 = Buffer.from('PNGDATA').toString('base64')
  for (const mime of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
    assert.equal(validate('image', { mime, base64: b64 }, { v: 1 }).ok, true)
  }
})

test('image: mime escape, bad base64, oversize reject', () => {
  const b64 = Buffer.from('x').toString('base64')
  rejects(() => validate('image', { mime: 'image/svg+xml', base64: b64 }, { v: 1 }), 'schema:mime')
  rejects(() => validate('image', { mime: 'text/html', base64: b64 }, { v: 1 }), 'schema:mime')
  rejects(() => validate('image', { mime: 'image/png', base64: '%%%not-base64%%%' }, { v: 1 }), 'schema:base64')
  rejects(() => validate('image', { mime: 'image/png', base64: 'ABC' }, { v: 1 }), 'schema:base64')
  rejects(() => validate('image', { mime: 'image/png', base64: Buffer.from('x'.repeat(MAX_IMAGE_BYTES + 1)).toString('base64') }, { v: 1 }), 'schema:base64')
  rejects(() => validate('image', { mime: 'image/png', base64: b64, extra: 1 }, { v: 1 }), 'schema:image')
})

test('file/image have no v0: whitelist runs even without {v} passed', () => {
  /* no discriminant on these kinds → default v1, never silent backfill */
  rejects(() => validate('image', { mime: 'image/svg+xml', base64: 'QUFB' }), 'schema:mime')
  assert.equal(validate('image', { mime: 'image/png', base64: 'QUFB' }).v, 1)
  rejects(() => validate('file', Buffer.from([0xff, 0xfe])), 'schema:content')
  assert.equal(validate('file', 'plain text').v, 1)
})

/* ================================================================== */
test('marker: literal real shape passes', () => {
  assert.deepEqual(validate('marker', GOOD_MARKER), { ok: true, v: 1 })
})

test('marker: identity fields required, workspaceId charset enforced', () => {
  rejects(() => validate('marker', { ...GOOD_MARKER, createdBy: undefined }), 'schema:createdBy')
  rejects(() => validate('marker', { ...GOOD_MARKER, workspaceId: 'not16hex!' }), 'schema:workspaceId')
  rejects(() => validate('marker', { ...GOOD_MARKER, workspaceId: 'abc' }), 'schema:workspaceId')
  rejects(() => validate('marker', { ...GOOD_MARKER, v: 2 }), 'schema:unknown-version')
  rejects(() => validate('marker', { ...GOOD_MARKER, members: {} }), 'schema:members')
  rejects(() => validate('marker', { ...GOOD_MARKER, members: { 'noatsign': { username: 'u', instance: 'i', localPath: '/a', joinedAt: ISO } } }), 'schema:members')
})

test('marker: localPath attacks reject', () => {
  const member = p => ({ members: { 'u@abcdef12': { username: 'u', instance: 'abcdef12', localPath: p, joinedAt: ISO } } })
  rejects(() => validate('marker', { ...GOOD_MARKER, ...member('../etc/passwd') }), 'schema:localPath')
  rejects(() => validate('marker', { ...GOOD_MARKER, ...member('/a/../../b') }), 'schema:localPath')
  rejects(() => validate('marker', { ...GOOD_MARKER, ...member('/a/./b') }), 'schema:localPath')
  rejects(() => validate('marker', { ...GOOD_MARKER, ...member('relative/path') }), 'schema:localPath')
  rejects(() => validate('marker', { ...GOOD_MARKER, ...member('/a//b') }), 'schema:localPath')
  rejects(() => validate('marker', { ...GOOD_MARKER, ...member(`/${'x'.repeat(4097)}`) }), 'schema:localPath')
  /* legit posix + windows absolute paths pass */
  assert.equal(validate('marker', { ...GOOD_MARKER, ...member('/Users/a/b') }).ok, true)
  assert.equal(validate('marker', { ...GOOD_MARKER, ...member('C:\\Users\\a') }).ok, true)
})

/* ================================================================== */
test('session-meta: literal real shape passes', () => {
  assert.deepEqual(validate('session-meta', GOOD_SESSION_META), { ok: true, v: 1 })
})

test('session-meta: sessionId / formatVersion / committedBytes bounds', () => {
  rejects(() => validate('session-meta', { ...GOOD_SESSION_META, sessionId: '..' }), 'schema:sessionId')
  rejects(() => validate('session-meta', { ...GOOD_SESSION_META, sessionId: 'a/b' }), 'schema:sessionId')
  for (const fv of [0, 5, 99, 'x']) {
    rejects(() => validate('session-meta', { ...GOOD_SESSION_META, formatVersion: fv }), fv === 'x' ? 'schema:formatVersion' : 'schema:formatVersion')
  }
  rejects(() => validate('session-meta', { ...GOOD_SESSION_META, committedBytes: MAX_COMMITTED_BYTES + 1 }), 'schema:committedBytes')
  rejects(() => validate('session-meta', { ...GOOD_SESSION_META, committedBytes: -1 }), 'schema:committedBytes')
  rejects(() => validate('session-meta', { ...GOOD_SESSION_META, deleted: 'no' }), 'schema:deleted')
  rejects(() => validate('session-meta', { ...GOOD_SESSION_META, projectDir: 'plain-dir' }), 'schema:projectDir')
})

test('session-meta: parts ≤64KiB each and count ≤ ceil(committed/PART)', () => {
  const meta = { ...GOOD_SESSION_META, committedBytes: 3 * PART_BYTES }
  assert.equal(validate('session-meta', meta, { v: 1, context: { parts: [PART_BYTES, PART_BYTES, 1] } }).ok, true)
  rejects(() => validate('session-meta', meta, { v: 1, context: { parts: [PART_BYTES + 1] } }), 'schema:parts')
  rejects(() => validate('session-meta', meta, { v: 1, context: { parts: [1, 1, 1, 1] } }), 'schema:parts')
  /* optional inline parts array (writers do not emit it; consumers may) */
  rejects(() => validate('session-meta', { ...meta, parts: [PART_BYTES + 1] }), 'schema:parts')
  assert.equal(validate('session-meta', { ...meta, parts: [PART_BYTES, PART_BYTES, 2] }).ok, true)
})

/* ================================================================== */
test('tree-head: literal real wrapper passes, SKIP rels allowed', () => {
  assert.deepEqual(validate('tree-head', GOOD_TREE_HEAD), { ok: true, v: 1 })
  /* SKIP segments are NOT schema rejections (P2-05 enforces the fence). */
  const skipful = { ...GOOD_TREE_HEAD, files: GOOD_TREE_HEAD.files }
  assert.equal(validate('tree-head', skipful).ok, true)
  /* minimal real shape without optional wrappers also passes */
  assert.equal(validate('tree-head', {
    v: 1, generation: 1, parent: null, writerId: 'a@b1234567',
    files: [], conflicts: [], at: ISO,
  }).ok, true)
})

test('tree-head: rel escape, bad sha, oversize reject', () => {
  const head = f => ({ v: 1, generation: 1, parent: null, writerId: 'a@b1234567', files: [f], conflicts: [], at: ISO })
  rejects(() => validate('tree-head', head({ rel: '../x', sha256: SHA, size: 1 })), 'schema:rel')
  rejects(() => validate('tree-head', head({ rel: 'a/../../b', sha256: SHA, size: 1 })), 'schema:rel')
  rejects(() => validate('tree-head', head({ rel: '/abs/path', sha256: SHA, size: 1 })), 'schema:rel')
  rejects(() => validate('tree-head', head({ rel: 'C:/win', sha256: SHA, size: 1 })), 'schema:rel')
  rejects(() => validate('tree-head', head({ rel: 'a//b', sha256: SHA, size: 1 })), 'schema:rel')
  rejects(() => validate('tree-head', head({ rel: 'a', sha256: 'zz', size: 1 })), 'schema:sha256')
  rejects(() => validate('tree-head', head({ rel: 'a', sha256: SHA, size: MAX_FILE_BYTES + 1 })), 'schema:size')
  rejects(() => validate('tree-head', head({ rel: 'a', sha256: SHA, size: 1, evil: 1 })), 'schema:files')
})

/* ================================================================== */
test('depth guard: >MAX_DEPTH nesting rejects schema:depth on every kind', () => {
  let deep = { leaf: 1 }
  for (let i = 0; i < MAX_DEPTH; i++) deep = { a: deep }
  rejects(() => validate('manifest', deep, { v: 1 }), 'schema:depth')
  rejects(() => validate('marker', deep, { v: 1 }), 'schema:depth')
  /* v0 pass-through is depth-guarded too */
  rejects(() => validate('manifest', deep), 'schema:depth')
  /* exactly MAX_DEPTH-1 levels passes the guard and fails on shape, not depth */
  let shallow = {}
  for (let i = 0; i < MAX_DEPTH - 1; i++) shallow = { a: shallow }
  assert.throws(
    () => validate('manifest', shallow, { v: 1 }),
    e => e instanceof SchemaReject && e.reason !== 'schema:depth',
  )
})

test('v0 backfill: no discriminant → read-only pass + compat tag (manifest only)', () => {
  assert.deepEqual(validate('manifest', V0_MANIFEST), { ok: true, v: 0, compat: 'v0-backfill' })
  /* v0 is manifest-ONLY: an explicit v:0 on a versioned kind is attacker input
   * that must NOT reach the depth-only v0 path (review 9012 P1). */
  rejects(() => validate('marker', { v: 0, members: 'garbage' }), 'schema:v')
  rejects(() => validate('marker', { schemaVersion: 0 }), 'schema:v')
  rejects(() => validate('session-meta', { v: 0, committedBytes: 'x' }), 'schema:v')
  rejects(() => validate('tree-head', { v: 0, files: [{ rel: '../../etc/passwd' }] }), 'schema:v')
  rejects(() => validate('marker', { title: 'old' }, { v: 0 }), 'schema:v')
  /* v0 is never auto-upgraded: a v0-looking object never returns v:1. */
  assert.equal(validate('manifest', { anything: 1 }).v, 0)
  /* versioned kinds without `v` fail closed inside v1, not v0 pass */
  rejects(() => validate('marker', { title: 'forged' }), 'schema:v')
  rejects(() => validate('tree-head', { files: [] }), 'schema:v')
})

test('unknown kind and unknown version reject', () => {
  rejects(() => validate('nope', {}), 'schema:kind')
  rejects(() => validate('manifest', { schemaVersion: 99 }), 'schema:unknown-version')
  rejects(() => validate('marker', { v: 9 }), 'schema:unknown-version')
  rejects(() => validate('session-meta', GOOD_SESSION_META, { v: 7 }), 'schema:unknown-version')
})

/* ================================================================== */
test('compat corpus (P2-08 pre-gate): literal bucket objects validate', () => {
  /* manifest = live bucket manifest.json (no schemaVersion → v0 backfill) */
  assert.equal(validate('manifest', V0_MANIFEST).compat, 'v0-backfill')
  /* marker / session-meta / tree-head = verbatim real objects → v1 */
  assert.equal(validate('marker', GOOD_MARKER).v, 1)
  assert.equal(validate('session-meta', GOOD_SESSION_META).v, 1)
  assert.equal(validate('tree-head', GOOD_TREE_HEAD).v, 1)
  /* a real .md file body is raw bytes, not JSON */
  assert.equal(validate('file', '# 先回暖升温！\n', { v: 1, context: { key: `files/${FILE_ID}.md`, manifest: GOOD_MANIFEST } }).ok, true)
})
