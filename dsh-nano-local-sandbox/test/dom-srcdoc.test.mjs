import assert from 'node:assert/strict'
import test from 'node:test'
import { buildSrcDoc, sanitizeHtml } from '../src/host/dom-srcdoc.js'

test('sanitizeHtml strips scripts, base, meta-refresh, handlers and javascript: urls', () => {
  const html = [
    '<html><head><base href="https://evil.example/">',
    '<meta http-equiv="refresh" content="0;url=https://evil.example/">',
    '<script>window.x=1</script></head>',
    '<body onload="steal()"><a href="javascript:alert(1)">a</a>',
    '<img src="javascript:alert(2)"><p onclick="x()">text</p></body></html>',
  ].join('')
  const { html: clean, stripped } = sanitizeHtml(html)
  assert.equal(clean.includes('<script'), false)
  assert.equal(clean.includes('<base'), false)
  assert.equal(clean.includes('http-equiv'), false)
  assert.equal(clean.includes('onload'), false)
  assert.equal(clean.includes('onclick'), false)
  assert.equal(clean.includes('javascript:'), false)
  assert.equal(clean.includes('text'), true)
  assert.equal(stripped.scripts, 1)
  assert.equal(stripped.base, 1)
  assert.equal(stripped.metaRefresh, 1)
  assert.equal(stripped.handlers, 2)
  assert.equal(stripped.jsUrls, 2)
})

test('buildSrcDoc rebases on the PROXY form of the url and keeps one base tag', () => {
  // The pane is an https page, so a direct http: base would make every relative
  // asset mixed content. The base must therefore point into the same-origin
  // proxy, whose path mirrors the real path so relatives still resolve.
  const built = buildSrcDoc({ url: 'https://example.com/a/b', html: '<html><head><title>t</title></head><body>x</body></html>' })
  assert.equal(built.url, 'https://example.com/a/b')
  assert.equal(built.base, '/nano-local-sandbox/res/https/example.com/a/')
  assert.equal(built.srcdoc.includes('<base href="/nano-local-sandbox/res/https/example.com/a/">'), true)
  assert.equal((built.srcdoc.match(/<base /g) || []).length, 1)
  assert.equal(built.srcdoc.includes('<title>t</title>'), true)
  assert.equal(built.bytes, built.srcdoc.length)
})

test('buildSrcDoc wraps a fragment that has no head', () => {
  const built = buildSrcDoc({ url: 'https://example.com/', html: '<p>hi</p>' })
  assert.equal(built.srcdoc.startsWith('<!doctype html>'), true)
  assert.equal(built.srcdoc.includes('<body><p>hi</p></body>'), true)
})

test('buildSrcDoc never injects a picker script (the pane binds its own)', () => {
  const built = buildSrcDoc({ url: 'https://example.com/', html: '<html><head></head><body>x</body></html>' })
  assert.equal(built.srcdoc.includes('<script'), false)
})

test('buildSrcDoc escapes the url so it cannot break out of the attribute', () => {
  const built = buildSrcDoc({ url: 'https://e.test/"><script>alert(1)</script>', html: '<html><head></head><body>x</body></html>' })
  assert.equal(built.srcdoc.includes('"><script>'), false)
  assert.equal(built.srcdoc.includes('<script'), false)
  // The proxy path percent-encodes the hostile characters, so the attribute
  // cannot even reach the escaping branch — a stronger guarantee than before.
  assert.equal(built.base.includes('%22%3E'), true)
  assert.equal(built.base.includes('alert(1)</'), false)
})

test('absolute http(s) subresources are rewritten onto the proxy; text is untouched', () => {
  const built = buildSrcDoc({
    url: 'http://127.0.0.1:3000/',
    html: '<html><head><link rel=stylesheet href="https://cdn.test/x.css"></head>'
      + '<body><img src="/a.png"><img srcset="http://i.test/1.png 1x, /2.png 2x">'
      + '<p>read http://example.com/docs first</p></body></html>',
  })
  assert.equal(built.srcdoc.includes('href="/nano-local-sandbox/res/https/cdn.test/x.css"'), true)
  assert.equal(built.srcdoc.includes('srcset="/nano-local-sandbox/res/http/i.test/1.png 1x, /2.png 2x"'), true)
  // A relative src stays relative: <base> already resolves it inside the proxy.
  assert.equal(built.srcdoc.includes('src="/a.png"'), true)
  // Prose that merely mentions a URL must not be rewritten.
  assert.equal(built.srcdoc.includes('read http://example.com/docs first'), true)
})

test('an empty page degrades to an empty document, not a throw', () => {
  const built = buildSrcDoc({})
  assert.equal(built.url, '')
  assert.equal(typeof built.srcdoc, 'string')
  assert.equal(built.srcdoc.includes('<body>'), true)
})
