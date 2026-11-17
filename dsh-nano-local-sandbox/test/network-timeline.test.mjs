import assert from 'node:assert/strict'
import test from 'node:test'
import { ensureClient } from '../src/host/cdp-elements.js'

function clientWithListener() {
  let listener = null
  return {
    client: {
      alive: true,
      probedAt: Date.now(),
      send: async () => ({}),
      listen(fn) { listener = fn; return () => {} },
      close() {},
    },
    emit(message) { listener?.(message) },
  }
}

test('network lifecycle records resource type, transfer size, duration and cached state', async () => {
  const fixture = clientWithListener()
  const session = {}
  await ensureClient(session, 'http://fixture.invalid', async () => fixture.client)
  fixture.emit({ method: 'Network.requestWillBeSent', params: {
    requestId: 'r1', type: 'Script', wallTime: 1_700_000_000.25, timestamp: 100,
    request: { url: 'https://example.com/app.js', method: 'GET' },
  } })
  fixture.emit({ method: 'Network.responseReceived', params: {
    requestId: 'r1', type: 'Script', timestamp: 100.1,
    response: { status: 200, mimeType: 'text/javascript', fromDiskCache: true },
  } })
  fixture.emit({ method: 'Network.loadingFinished', params: { requestId: 'r1', timestamp: 100.35, encodedDataLength: 4096 } })
  const row = session.network.find((item) => item.id === 'r1')
  assert.equal(row.type, 'Script')
  assert.equal(row.status, 200)
  assert.equal(row.mimeType, 'text/javascript')
  assert.equal(row.size, 4096)
  assert.equal(row.durationMs, 350)
  assert.equal(row.cached, true)
  assert.equal(row.startedAt, 1_700_000_000_250)
})

test('redirects keep one row with the final request while preserving redirect evidence', async () => {
  const fixture = clientWithListener()
  const session = {}
  await ensureClient(session, 'http://fixture.invalid', async () => fixture.client)
  fixture.emit({ method: 'Network.requestWillBeSent', params: {
    requestId: 'r2', type: 'Document', wallTime: 1_700_000_100, timestamp: 200,
    request: { url: 'http://example.com/', method: 'GET' },
  } })
  fixture.emit({ method: 'Network.requestWillBeSent', params: {
    requestId: 'r2', type: 'Document', wallTime: 1_700_000_101, timestamp: 201,
    redirectResponse: { status: 301, mimeType: 'text/html' },
    request: { url: 'https://example.com/', method: 'GET' },
  } })
  fixture.emit({ method: 'Network.loadingFinished', params: { requestId: 'r2', timestamp: 201.2, encodedDataLength: 512 } })
  const rows = session.network.filter((item) => item.id === 'r2')
  assert.equal(rows.length, 1)
  assert.equal(rows[0].url, 'https://example.com/')
  assert.equal(rows[0].redirectCount, 1)
  assert.equal(rows[0].durationMs, 200)
  assert.equal(rows[0].size, 512)
})

test('failed requests keep the error and duration rather than pretending to finish', async () => {
  const fixture = clientWithListener()
  const session = {}
  await ensureClient(session, 'http://fixture.invalid', async () => fixture.client)
  fixture.emit({ method: 'Network.requestWillBeSent', params: {
    requestId: 'r3', type: 'Fetch', wallTime: 1_700_000_200, timestamp: 300,
    request: { url: 'https://example.com/api', method: 'POST' },
  } })
  fixture.emit({ method: 'Network.loadingFailed', params: { requestId: 'r3', timestamp: 300.12, errorText: 'net::ERR_FAILED' } })
  const row = session.network.find((item) => item.id === 'r3')
  assert.equal(row.failed, true)
  assert.equal(row.error, 'net::ERR_FAILED')
  assert.equal(row.durationMs, 120)
  assert.equal(row.size, null)
})

test('request details retain request/response headers, payload and status metadata', async () => {
  const fixture = clientWithListener()
  const session = {}
  await ensureClient(session, 'http://fixture.invalid', async () => fixture.client)
  fixture.emit({ method: 'Network.requestWillBeSent', params: {
    requestId: 'r4', type: 'Fetch', wallTime: 1_700_000_300, timestamp: 400,
    request: {
      url: 'https://example.com/api/login', method: 'POST', mimeType: 'application/json',
      headers: { 'Content-Type': 'application/json', 'X-Trace': 'abc' },
      postData: '{"user":"demo"}', hasPostData: true,
    },
  } })
  fixture.emit({ method: 'Network.requestWillBeSentExtraInfo', params: {
    requestId: 'r4', headers: { 'X-Extra': 'request-extra' },
  } })
  fixture.emit({ method: 'Network.responseReceived', params: {
    requestId: 'r4', type: 'Fetch', timestamp: 400.2,
    response: {
      status: 201, statusText: 'Created', mimeType: 'application/json',
      headers: { 'Content-Type': 'application/json', 'X-Resp': 'ok' },
      protocol: 'h2', remoteIPAddress: '93.184.216.34', remotePort: 443,
    },
  } })
  fixture.emit({ method: 'Network.responseReceivedExtraInfo', params: {
    requestId: 'r4', statusCode: 201, headers: { 'X-Extra': 'response-extra' },
  } })
  const row = session.network.find((item) => item.id === 'r4')
  assert.equal(row.postData, '{"user":"demo"}')
  assert.equal(row.hasPostData, true)
  assert.equal(row.requestMimeType, 'application/json')
  assert.deepEqual(row.requestHeaders, { 'Content-Type': 'application/json', 'X-Trace': 'abc', 'X-Extra': 'request-extra' })
  assert.deepEqual(row.responseHeaders, { 'Content-Type': 'application/json', 'X-Resp': 'ok', 'X-Extra': 'response-extra' })
  assert.equal(row.statusText, 'Created')
  assert.equal(row.protocol, 'h2')
  assert.equal(row.remoteAddress, '93.184.216.34:443')
})
