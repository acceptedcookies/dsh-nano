import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createS3Client, S3Error } from '../src/client.js'

function stub(overrides = {}) {
  const calls = []
  const responses = overrides.responses ?? [() => new Response('OK', { status: 200 })]
  let i = 0
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, headers: init.headers })
    return responses[Math.min(i++, responses.length - 1)]()
  }
  const client = createS3Client({
    endpoint: 'https://s3.us-east-1.amazonaws.com', region: 'us-east-1',
    bucket: 'my-bucket', prefix: 'np/', accessKeyId: 'AK', secretAccessKey: 'SK',
    fetchImpl, sleep: async () => {}, limits: { rps: 1000, kbps: 100000, concurrency: 10 },
    ledgerFile: overrides.ledgerFile,
  })
  return { client, calls }
}

test('virtual-host URL + prefix join', async () => {
  const { client, calls } = stub()
  await client.putObject('a/b.md', new Uint8Array([104, 105]))
  assert.equal(calls[0].url, 'https://my-bucket.s3.us-east-1.amazonaws.com/np/a/b.md')
  assert.ok(calls[0].headers.authorization.startsWith('AWS4-HMAC-SHA256 Credential=AK/'))
})

test('path-style URL when configured (MinIO)', async () => {
  const dir = mkdtempSync(join(tmpdir(), 's3-c-'))
  try {
    const calls = []
    const client = createS3Client({
      endpoint: 'http://localhost:9000', region: 'us-east-1', bucket: 'b',
      accessKeyId: 'AK', secretAccessKey: 'SK', pathStyle: true,
      fetchImpl: async (u, i) => { calls.push(u); return new Response('', { status: 200 }) },
      limits: { rps: 1000, kbps: 100000, concurrency: 10 },
    })
    await client.getObject('x.txt')
    assert.ok(calls[0].startsWith('http://localhost:9000/b/x.txt'))
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('getObject returns null on 404, S3Error on 500', async () => {
  const { client } = stub({ responses: [
    () => new Response('<Error><Code>NoSuchKey</Code></Error>', { status: 404 }),
    () => new Response('<Error><Code>InternalError</Code><Message>boom</Message></Error>', { status: 500 }),
  ] })
  assert.equal(await client.getObject('missing'), null)
  await assert.rejects(() => client.getObject('x'), S3Error)
  try { await client.getObject('x') } catch (e) { assert.equal(e.code, 'InternalError'); assert.equal(e.status, 500) }
})

test('listObjects paginates and strips etag quotes', async () => {
  const page1 = `<?xml?><ListBucketResult><Contents><Key>np/a.md</Key><Size>10</Size><ETag>&#34;abc&#34;</ETag><LastModified>2026-01-01T00:00:00Z</LastModified></Contents><IsTruncated>true</IsTruncated><NextContinuationToken>NEXT</NextContinuationToken></ListBucketResult>`
  const page2 = `<?xml?><ListBucketResult><Contents><Key>np/b.md</Key><Size>5</Size><ETag>"def"</ETag><LastModified>2026-01-02T00:00:00Z</LastModified></Contents><IsTruncated>false</IsTruncated></ListBucketResult>`
  const { client } = stub({ responses: [() => new Response(page1), () => new Response(page2)] })
  const { objects, truncated } = await client.listObjects()
  assert.equal(objects.length, 2)
  assert.equal(objects[0].etag, 'abc')
  assert.equal(objects[1].key, 'np/b.md')
  assert.equal(truncated, false)
})

test('ifMatch sends If-Match header; ledger records op', async () => {
  const dir = mkdtempSync(join(tmpdir(), 's3-l-'))
  try {
    const ledgerFile = join(dir, 'led.json')
    const calls = []
    const client = createS3Client({
      endpoint: 'https://s3.us-east-1.amazonaws.com', region: 'us-east-1', bucket: 'b',
      accessKeyId: 'AK', secretAccessKey: 'SK', ledgerFile,
      fetchImpl: async (u, i) => { calls.push(i); return new Response('', { status: 200, headers: { etag: '"e1"' } }) },
      limits: { rps: 1000, kbps: 100000, concurrency: 10 },
    })
    const out = await client.putObject('manifest.json', new TextEncoder().encode('{}'), { ifMatch: 'prev-etag', contentType: 'application/json' })
    assert.equal(calls[0].headers['if-match'], 'prev-etag')
    assert.equal(out.etag, 'e1')
    const snap = client.ledger.snapshot()
    assert.equal(snap.ops.put, 1)
    assert.equal(snap.dailyUpBytes, 2)
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('weak ETags are normalised for If-Match', async () => {
  const client = createS3Client({
    endpoint: 'https://s3.example.com', region: 'r', bucket: 'b',
    accessKeyId: 'AK', secretAccessKey: 'SK',
    fetchImpl: async () => new Response('', { status: 200, headers: { etag: 'W/"weak-123"' } }),
    limits: { rps: 1000, kbps: 100000, concurrency: 10 },
  })
  assert.equal((await client.putObject('x', new Uint8Array())).etag, 'weak-123')
  assert.equal((await client.headObject('x')).etag, 'weak-123')
  assert.equal((await client.getObject('x')).etag, 'weak-123')
})

test('status exposes limiter + ledger shape', async () => {
  const { client } = stub()
  const s = client.status()
  assert.equal(s.bucket, 'my-bucket')
  assert.equal(s.prefix, 'np/')
  assert.ok('inFlight' in s.limits)
  assert.equal(s.ledger, null)
})

test('test() puts and deletes one probe under a single prefix', async () => {
  const calls = []
  const client = createS3Client({
    endpoint: 'https://s3.example.com', region: 'r', bucket: 'b', prefix: 'np/',
    accessKeyId: 'AK', secretAccessKey: 'SK', pathStyle: true,
    fetchImpl: async (url, init) => { calls.push({ url, method: init.method }); return new Response('', { status: 200 }) },
    limits: { rps: 1000, kbps: 100000, concurrency: 10 },
  })
  const result = await client.test()
  assert.equal(result.ok, true)
  assert.deepEqual(calls.map(c => c.method), ['PUT', 'DELETE'])
  assert.ok(calls[0].url.includes('/b/np/_probe-'))
  assert.ok(!calls[0].url.includes('/np/np/'), 'prefix must not be applied twice')
  assert.equal(new URL(calls[0].url).pathname, new URL(calls[1].url).pathname)
})
