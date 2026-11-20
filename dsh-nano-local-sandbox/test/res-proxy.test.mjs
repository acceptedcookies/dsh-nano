import assert from 'node:assert/strict'
import test from 'node:test'
import { parseResTarget, proxyBaseFor, RES_PREFIX, serveRes } from '../src/host/res-proxy.js'

/** Minimal ServerResponse stand-in that records what was written. */
function fakeRes() {
  const chunks = []
  return {
    statusCode: 200,
    headers: {},
    writableEnded: false,
    destroyed: false,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value },
    end(body) { if (body) chunks.push(Buffer.from(body)); this.writableEnded = true; this.body = Buffer.concat(chunks) },
    destroy() { this.destroyed = true; this.writableEnded = true },
  }
}

test('parseResTarget maps the path onto the real target, keeping the query', () => {
  assert.deepEqual(parseResTarget('/nano-local-sandbox/res/http/127.0.0.1:3000/css/main.css?v=2'), {
    url: 'http://127.0.0.1:3000/css/main.css?v=2',
  })
  assert.deepEqual(parseResTarget('/nano-local-sandbox/res/https/example.com/'), { url: 'https://example.com/' })
})

test('parseResTarget refuses a scheme that is not a preview', () => {
  for (const bad of ['file', 'data', 'javascript', 'chrome', 'ftp']) {
    assert.throws(() => parseResTarget(`/nano-local-sandbox/res/${bad}/etc/passwd`), (error) => {
      assert.equal(error.status, 400)
      assert.match(error.errorId, /res\.scheme$/)
      return true
    })
  }
})

test('parseResTarget refuses credentials and extra path smuggling in the host slot', () => {
  for (const bad of ['user:pass@host', 'host/../etc', 'host?x=1', 'host\\x']) {
    assert.throws(() => parseResTarget(`/nano-local-sandbox/res/http/${encodeURIComponent(bad)}/a`), (error) => {
      assert.equal(error.status, 400)
      assert.match(error.errorId, /res\.(host|url)$/)
      return true
    })
  }
})

test('parseResTarget needs the full <scheme>/<host>/<path> shape', () => {
  assert.throws(() => parseResTarget('/nano-local-sandbox/res/http'), (error) => {
    assert.match(error.errorId, /res\.path$/)
    return true
  })
})

test('proxyBaseFor mirrors the page directory so relative assets resolve inside the proxy', () => {
  assert.equal(proxyBaseFor('http://127.0.0.1:3000/'), `${RES_PREFIX}/http/127.0.0.1:3000/`)
  assert.equal(proxyBaseFor('http://127.0.0.1:3000/a/b?q=1'), `${RES_PREFIX}/http/127.0.0.1:3000/a/`)
  assert.equal(proxyBaseFor('https://example.com/x.css'), `${RES_PREFIX}/https/example.com/`)
  // Non-http pages have no proxy form; the caller falls back to the raw url.
  assert.equal(proxyBaseFor('about:blank'), '')
  assert.equal(proxyBaseFor(''), '')
})

test('serveRes forwards the body and drops headers that would poison the dsh origin', async () => {
  const res = fakeRes()
  const seen = {}
  await serveRes({ url: '/nano-local-sandbox/res/http/dev.test/app.css', method: 'GET' }, res, {
    fetchImpl: async (url) => {
      seen.url = url
      return new Response('body{color:red}', {
        status: 200,
        headers: {
          'content-type': 'text/css',
          'set-cookie': 'sid=evil',
          'content-security-policy': "default-src 'none'",
          'x-frame-options': 'DENY',
          'content-length': '15',
        },
      })
    },
  })
  assert.equal(seen.url, 'http://dev.test/app.css')
  assert.equal(res.statusCode, 200)
  assert.equal(res.headers['content-type'], 'text/css')
  assert.equal(res.headers['set-cookie'], undefined, 'a proxied asset must not set dsh cookies')
  assert.equal(res.headers['content-security-policy'], undefined)
  assert.equal(res.headers['x-frame-options'], undefined)
  assert.equal(res.headers['cache-control'], 'no-store')
  assert.equal(res.body.toString(), 'body{color:red}')
})

test('serveRes reports an unreachable upstream as res.upstream, not a silent empty 200', async () => {
  const res = fakeRes()
  await serveRes({ url: '/nano-local-sandbox/res/http/dev.test/x.css', method: 'GET' }, res, {
    fetchImpl: async () => { throw new Error('connection refused') },
  })
  assert.equal(res.statusCode, 502)
  const body = JSON.parse(res.body.toString())
  assert.match(body.errorId, /res\.upstream$/)
  assert.equal(body.ok, false)
})

test('serveRes keeps a redirect inside proxy space', async () => {
  const res = fakeRes()
  await serveRes({ url: '/nano-local-sandbox/res/http/dev.test/old.css', method: 'GET' }, res, {
    fetchImpl: async () => new Response(null, { status: 302, headers: { location: '/new.css' } }),
  })
  assert.equal(res.statusCode, 302)
  assert.equal(res.headers.location, '/nano-local-sandbox/res/http/dev.test/new.css')
})

test('serveRes passes an upstream error status through instead of pretending 404 is a proxy bug', async () => {
  const res = fakeRes()
  await serveRes({ url: '/nano-local-sandbox/res/http/dev.test/missing.css', method: 'GET' }, res, {
    fetchImpl: async () => new Response('nope', { status: 404 }),
  })
  assert.equal(res.statusCode, 502)
  const body = JSON.parse(res.body.toString())
  assert.match(body.errorId, /res\.upstream$/)
  assert.equal(body.upstreamStatus, 404)
})

test('serveRes refuses a body over the cap before copying it', async () => {
  const res = fakeRes()
  await serveRes({ url: '/nano-local-sandbox/res/http/dev.test/big.bin', method: 'GET' }, res, {
    fetchImpl: async () => new Response('x', { status: 200, headers: { 'content-length': String(64 * 1024 * 1024) } }),
  })
  assert.equal(res.statusCode, 413)
  assert.match(JSON.parse(res.body.toString()).errorId, /res\.size$/)
})

test('serveRes stamps the shared operations row so /res is not reported as cancelled', async () => {
  const res = fakeRes()
  res.__op = { startedMs: Date.now() - 3, status: null }
  await serveRes({ url: '/nano-local-sandbox/res/http/dev.test/a.css', method: 'GET' }, res, {
    fetchImpl: async () => new Response('x', { status: 200, headers: { 'content-type': 'text/css' } }),
  })
  assert.equal(res.__op.status, 200)
  assert.equal(res.__op.ok, true)
  assert.equal(typeof res.__op.durationMs, 'number')

  const bad = fakeRes()
  bad.__op = { startedMs: Date.now(), status: null }
  await serveRes({ url: '/nano-local-sandbox/res/file/x/y', method: 'GET' }, bad, { fetchImpl: async () => new Response('') })
  assert.equal(bad.__op.status, 400)
  assert.match(bad.__op.errorId, /res\.scheme$/)
})
