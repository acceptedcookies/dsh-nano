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
