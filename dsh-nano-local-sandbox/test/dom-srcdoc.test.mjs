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

test('buildSrcDoc rebases on the REAL page url and keeps one base tag (T-O-66)', () => {
  // One build only: <base> is the page's real address. The retired /res proxy
  // rewriting must never come back — an unstyled local http page is the
  // deterministic price of the static projection, not a bug.
  const built = buildSrcDoc({ url: 'https://example.com/a/b', html: '<html><head><title>t</title></head><body>x</body></html>' })
  assert.equal(built.url, 'https://example.com/a/b')
  assert.equal(built.base, 'https://example.com/a/b')
  assert.equal(built.srcdoc.includes('<base href="https://example.com/a/b">'), true)
  assert.equal((built.srcdoc.match(/<base /g) || []).length, 1)
  assert.equal(built.srcdoc.includes('<title>t</title>'), true)
  assert.equal(built.bytes, built.srcdoc.length)
})

test('buildSrcDoc keeps every subresource on its real address, http included', () => {
  const built = buildSrcDoc({
    url: 'http://192.168.64.1:4321/a/b',
    html: '<html><head><link rel="stylesheet" href="https://fonts.example/css"></head><body><img src="http://192.168.64.1:4321/x.png"></body></html>',
  })
  assert.equal(built.base, 'http://192.168.64.1:4321/a/b')
  assert.equal(built.srcdoc.includes('<base href="http://192.168.64.1:4321/a/b">'), true)
  assert.equal(built.srcdoc.includes('href="https://fonts.example/css"'), true)
  assert.equal(built.srcdoc.includes('src="http://192.168.64.1:4321/x.png"'), true)
  assert.equal(built.srcdoc.includes('/nano-local-sandbox/res'), false)
  assert.equal((built.srcdoc.match(/<base /g) || []).length, 1)
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
  // The real URL goes through attr() escaping, so the hostile characters
  // become entities and never reach the attribute boundary.
  assert.equal(built.srcdoc.includes('<base href="https://e.test/&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;'), false)
  assert.equal(built.srcdoc.includes('&quot;'), true)
  assert.equal(built.srcdoc.includes('alert(1)</script>'), false)
})

test('absolute http(s) subresources are left verbatim; nothing is proxied', () => {
  const built = buildSrcDoc({
    url: 'http://127.0.0.1:3000/',
    html: '<html><head><link rel=stylesheet href="https://cdn.test/x.css"></head>'
      + '<body><img src="/a.png"><img srcset="http://i.test/1.png 1x, /2.png 2x">'
      + '<p>read http://example.com/docs first</p></body></html>',
  })
  assert.equal(built.srcdoc.includes('href="https://cdn.test/x.css"'), true)
  assert.equal(built.srcdoc.includes('srcset="http://i.test/1.png 1x, /2.png 2x"'), true)
  assert.equal(built.srcdoc.includes('src="/a.png"'), true)
  assert.equal(built.srcdoc.includes('read http://example.com/docs first'), true)
  // The retired proxy path must never appear anywhere in the projection.
  assert.equal(built.srcdoc.includes('/nano-local-sandbox/res'), false)
})

test('an empty page degrades to an empty document, not a throw', () => {
  const built = buildSrcDoc({})
  assert.equal(built.url, '')
  assert.equal(typeof built.srcdoc, 'string')
  assert.equal(built.srcdoc.includes('<body>'), true)
})
