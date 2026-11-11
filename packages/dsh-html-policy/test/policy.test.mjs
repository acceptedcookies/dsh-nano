/**
 * B3-T01 (P3-01..03) — dsh-html-policy unit tests.
 *
 * Now that Phase 3 filled the allowlist, the tests assert the implemented
 * contract: the DROP_* sets still form the hard boundary, the ALLOWED_*
 * tables carry the spec's content, sanitizePolicy keeps/drops per decision
 * kind, and — the T-O-9 proof — the battery-dom.txt attack corpus from the
 * v-mpsan recon run is neutralized end to end through sanitizeHtml.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ALLOWED_ELEMENTS,
  ALLOWED_ATTRS,
  ALLOWED_SCHEMES,
  ALLOWED_STYLE_PROPS,
  DROP_ELEMENTS,
  DROP_SCHEMES,
  isDropAttr,
  isDropScheme,
  sanitizePolicy,
  sanitizeHtml,
  sanitizeStyle,
  urlPolicy,
  elementAction,
  attrPolicy,
  POLICY,
} from '../src/index.js'

const HERE = dirname(fileURLToPath(import.meta.url))

/* ------------------------------------------------------------------ *
 * Export surface + table content                                       *
 * ------------------------------------------------------------------ */

test('all expected symbols are exported', () => {
  for (const sym of [ALLOWED_ELEMENTS, ALLOWED_ATTRS, ALLOWED_SCHEMES, ALLOWED_STYLE_PROPS, DROP_ELEMENTS]) {
    assert.ok(sym instanceof Set, 'policy sets are Sets')
  }
  assert.ok(DROP_SCHEMES instanceof Set)
  assert.equal(typeof isDropAttr, 'function')
  assert.equal(typeof isDropScheme, 'function')
  assert.equal(typeof sanitizePolicy, 'function')
  assert.equal(typeof sanitizeHtml, 'function')
  assert.equal(typeof POLICY, 'object')
})

test('DROP_ELEMENTS contains every forced-drop element', () => {
  const required = [
    'script', 'iframe', 'object', 'embed', 'base', 'meta',
    'form', 'input', 'button', 'textarea', 'select', 'link', 'style',
  ]
  for (const el of required) {
    assert.ok(DROP_ELEMENTS.has(el), `DROP_ELEMENTS missing "${el}"`)
  }
})

test('ALLOWED_ELEMENTS carries the spec table (P3-01)', () => {
  const required = [
    'a', 'p', 'br', 'span', 'div', 'section', 'article',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li',
    'blockquote', 'pre', 'code', 'em', 'strong', 'b', 'i', 'u', 's',
    'del', 'ins', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
    'img', 'figure', 'figcaption', 'hr', 'svg', 'g', 'image',
    'animateTransform',
  ]
  for (const el of required) assert.ok(ALLOWED_ELEMENTS.has(el), `missing ${el}`)
  /* Nothing dangerous may sit in the allowlist. */
  for (const bad of ['script', 'iframe', 'form', 'input', 'button', 'foreignObject']) {
    assert.ok(!ALLOWED_ELEMENTS.has(bad), `${bad} must not be allowed`)
  }
})

test('ALLOWED_ATTRS / ALLOWED_SCHEMES carry the spec values', () => {
  for (const a of ['href', 'src', 'alt', 'title', 'colspan', 'rowspan', 'width',
    'height', 'style', 'class', 'referrerpolicy', 'loading', 'decoding',
    'preserveaspectratio', 'xlink:href']) {
    assert.ok(ALLOWED_ATTRS.has(a), `missing attr ${a}`)
  }
  for (const bad of ['id', 'data-src', 'data-w', 'onclick', 'srcdoc', 'formaction', 'target']) {
    assert.ok(!ALLOWED_ATTRS.has(bad), `${bad} must not be allowed`)
  }
  assert.deepEqual([...ALLOWED_SCHEMES].sort(), ['http', 'https'])
  /* The union style props cover both historical whitelists' members. */
  for (const p of ['color', 'font-size', 'font-weight', 'font-style', 'font-family',
    'text-align', 'line-height', 'margin', 'margin-top', 'padding', 'padding-left',
    'background', 'background-color', 'background-image', 'border', 'border-radius',
    'border-top-width', 'letter-spacing', 'text-indent', 'text-decoration',
    'width', 'max-width', 'height', 'display', 'vertical-align', 'box-sizing',
    'overflow', 'white-space', 'word-wrap', 'word-break', 'opacity', 'float', 'clear']) {
    assert.ok(ALLOWED_STYLE_PROPS.has(p), `missing style prop ${p}`)
  }
  assert.ok(!ALLOWED_STYLE_PROPS.has('position'), 'position is forced, not allowed')
})

test('on* attributes and srcdoc are dropped', () => {
  for (const a of ['onclick', 'onload', 'ONERROR', 'onfocus', 'srcdoc', 'SRCDOC']) {
    assert.equal(isDropAttr(a), true, `expected drop for "${a}"`)
  }
  assert.equal(isDropAttr('href'), false)
  assert.equal(isDropAttr('class'), false)
})

test('active URL schemes are dropped', () => {
  for (const u of [
    'javascript:alert(1)', '  JaVaScRiPt:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=', 'vbscript:msgbox(1)',
    'file:///etc/passwd', 'data:,x',
  ]) {
    assert.equal(isDropScheme(u), true, `expected drop for "${u}"`)
  }
  assert.equal(isDropScheme('data:image/png;base64,iVBORw0KGgo='), false)
  assert.equal(isDropScheme('https://mp.weixin.qq.com/s/abc'), false)
  assert.equal(isDropScheme('/relative/path'), false)
  assert.equal(isDropScheme('#fragment'), false)
})

/* ------------------------------------------------------------------ *
 * sanitizePolicy — the per-decision function                           *
 * ------------------------------------------------------------------ */

test('sanitizePolicy: element decisions drop / keep / unwrap', () => {
  for (const el of ['script', 'IFRAME', 'object', 'embed', 'form', 'meta', 'base']) {
    assert.equal(sanitizePolicy({ kind: 'element', name: el }), 'drop', el)
  }
  for (const el of ['p', 'a', 'img', 'svg', 'animateTransform', 'animatetransform', 'foreignObject']) {
    assert.equal(sanitizePolicy({ kind: 'element', name: el }), 'keep', el)
  }
  for (const el of ['math', 'video', 'noscript', 'mpvoice', 'text', 'unknown-x']) {
    assert.equal(sanitizePolicy({ kind: 'element', name: el }), 'unwrap', el)
  }
})

test('sanitizePolicy: attr and url decisions', () => {
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'a', name: 'href', value: 'https://x/' }), 'keep')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'a', name: 'href', value: 'javascript:x()' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'a', name: 'href', value: '&#106;avascript:x()' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'a', name: 'href', value: 'java\tscript:x()' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'img', name: 'src', value: 'data:image/png;base64,AAAA' }), 'keep')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'a', name: 'href', value: 'data:image/png;base64,AAAA' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'img', name: 'src', value: 'data:text/html,x' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'img', name: 'onerror', value: 'x()' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'img', name: 'data-src', value: 'https://x' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'attr', el: 'td', name: 'colspan', value: '2' }), 'keep')
  assert.equal(sanitizePolicy({ kind: 'url', el: 'a', name: 'href', value: 'vbscript:x' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'style-prop', name: 'position', value: 'fixed' }), 'drop')
  assert.equal(sanitizePolicy({ kind: 'style-prop', name: 'color', value: 'red' }), 'keep')
  assert.equal(sanitizePolicy({ kind: 'style-prop', name: 'z-index', value: '9' }), 'drop')
})

/* ------------------------------------------------------------------ *
 * sanitizeStyle — position forced static, decl-level filtering         *
 * ------------------------------------------------------------------ */

test('sanitizeStyle keeps allowed decls and forces position: static', () => {
  assert.equal(
    sanitizeStyle('color: red; position: fixed; left: 0'),
    'color: red; position: static',
  )
  assert.equal(sanitizeStyle('visibility: hidden'), '')
  assert.equal(sanitizeStyle('color:red;visibility:hidden'), 'color: red; position: static')
  assert.equal(sanitizeStyle(''), '')
  /* value-level escapes */
  assert.equal(sanitizeStyle('background-image: url(javascript:x)'), '')
  assert.equal(sanitizeStyle('width: expression(alert(1))'), '')
  /* entity-protected semicolons stay intact (mp url(&quot;…&quot;) style) */
  assert.equal(
    sanitizeStyle('background-image: url(&quot;https://m/a.png&quot;); color: blue'),
    'background-image: url(\'https://m/a.png\'); color: blue; position: static',
  )
  /* mapDecl dark-remap hook */
  const dark = (name, value) => (/^background(-color)?$/.test(name) && value === '#fff' ? null : value)
  assert.equal(
    sanitizeStyle('background: #fff; color: #111', { mapDecl: dark }),
    'color: #111; position: static',
  )
})

/* ------------------------------------------------------------------ *
 * sanitizeHtml — renderer behaviour + battery-dom.txt negative corpus  *
 * ------------------------------------------------------------------ */

test('sanitizeHtml keeps the allowlist and drops the rest', () => {
  assert.equal(sanitizeHtml('<p>hi</p>'), '<p>hi</p>')
  assert.equal(sanitizeHtml('<b>x</b><script>y()</script>'), '<b>x</b>')
  assert.equal(sanitizeHtml('<div><span>a</span></div>'), '<div><span>a</span></div>')
  /* unwrap keeps children */
  assert.equal(sanitizeHtml('<math><a href="https://x">t</a></math>'), '<a href="https://x">t</a>')
  /* data-src promotion stays verbatim */
  assert.equal(
    sanitizeHtml('<img data-src="https://m/i.png" alt="a">'),
    '<img src="https://m/i.png" referrerpolicy="no-referrer" loading="lazy" decoding="async" alt="a">',
  )
  /* visibility sweep survives verbatim */
  assert.equal(
    sanitizeHtml('<p style="visibility:hidden;color:#fff">v</p>'),
    '<p style="color: #fff; position: static">v</p>',
  )
  /* comments are dropped (review 3456 F1): `<!-->`/`--!>` also close a comment,
   * so verbatim re-emit could smuggle an element out in a single-pass consumer */
  assert.equal(sanitizeHtml('<!-- note --><p>x</p>'), '<p>x</p>')
  /* `<!--` …`--!>`…`-->`: our scanner reads to the LAST `-->`, so the whole
   * span drops — the smuggled <img> never reaches the output. */
  assert.equal(sanitizeHtml('<!-- --!><img src=x onerror=mark(1)> -->'), '')
  assert.equal(sanitizeHtml('<!--><img src=x onerror=mark(2)>-->'), '')
})

test('sanitizeHtml: drop elements take their subtree; unclosed swallows to EOF', () => {
  assert.equal(sanitizeHtml('<script>a</script>after'), 'after')
  assert.equal(sanitizeHtml('<script>unclosed rest'), '')
  assert.equal(sanitizeHtml('before<form><input name="x">i</form>after'), 'beforeafter')
  assert.equal(sanitizeHtml('<object data="x">inner</object>ok'), 'ok')
})

test('sanitizeHtml: attr-level hardening', () => {
  assert.equal(sanitizeHtml('<a href="javascript:mark()">x</a>'), '<a>x</a>')
  assert.equal(sanitizeHtml('<a href="&#106;avascript:mark()">x</a>'), '<a>x</a>')
  assert.equal(sanitizeHtml('<img src="x" onerror="pwn()">'), '<img src="x">')
  assert.equal(sanitizeHtml('<img src=x /onerror=y>'), '<img src=x>')
  assert.equal(sanitizeHtml('<iframe srcdoc="<p>x</p>"></iframe>'), '')
  assert.equal(sanitizeHtml('<svg><a xlink:href="javascript:x"><text>t</text></a></svg>'), '<svg><a>t</a></svg>')
  /* promoted data-src goes through the same URL gate */
  assert.equal(sanitizeHtml('<img data-src="javascript:x()">'), '<img>')
  assert.equal(sanitizeHtml('<img data-src="data:text/html,<x>">'), '<img>')
})

/**
 * Parse the payload battery map out of the v-mpsan corpus file. Lines look
 * like `'key': '<js-escaped string>(+'<more>')*',` — concatenated with +
 * (the script payloads hide their tag across two segments).
 */
function batteryPayloads() {
  const file = readFileSync(join(HERE, 'fixtures', 'battery-dom.txt'), 'utf8')
  const start = file.indexOf('const P = {')
  const end = file.indexOf('\n};', start)
  assert.ok(start !== -1 && end !== -1, 'battery payload map not found in corpus')
  const payloads = {}
  for (const line of file.slice(start, end).split('\n')) {
    const m = /^\s*'([a-z0-9-]+)':\s*(.+?),\s*$/.exec(line)
    if (!m) continue
    const segments = [...m[2].matchAll(/'([^'\\]|\\.)*'/g)].map(s =>
      s[0].slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\'))
    payloads[m[1]] = segments.join('')
  }
  return payloads
}

/**
 * Executable surface of a sanitized string: tag markup with every attribute
 * VALUE blanked. An oracle string (`mark(...)`, `onerror=`) that only
 * survives inside an escaped attribute value — e.g. `title="&lt;img src=x
 * /onerror=mark('x')&gt;"` — is inert text, not code, so it does not count
 * as survival.
 */
const execSurface = out => out
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/="[^"]*"|='[^']*'/g, '=')

test('battery-dom.txt: every attack payload is neutralized (0 execution)', () => {
  const payloads = batteryPayloads()
  assert.ok(Object.keys(payloads).length >= 20, 'corpus parsed')
  /* Every payload carries mark(...) as its side-effect oracle; if it
     survived in a live context it would appear in the exec surface. */
  const joined = Object.entries(payloads).map(([k, v]) => `<!--${k}-->${v}`).join('\n')
  const out = sanitizeHtml(joined)
  const surface = execSurface(out)
  assert.ok(!surface.includes('mark('), 'no mark() oracle may survive sanitization')
  for (const sig of ['<script', '<iframe', '<object', '<embed', '<form',
    '<input', '<button', '<base', '<link', '<style', '<meta', 'srcdoc',
    'javascript:', 'vbscript:', 'data:text', 'onerror=', 'onload=', 'onclick=']) {
    assert.ok(!surface.toLowerCase().includes(sig), `${sig} survived`)
  }
})

test('battery-dom.txt: per-payload verdicts', () => {
  const payloads = batteryPayloads()
  const gone = [
    'a-js', 'a-js-entity', 'svg-a-js', 'svg-xlink-js', 'math-a-js',
    'formaction-js', 'form-action-js', 'object-js', 'embed-js', 'img-src-js',
    'base-href', 'style-block', 'form-ext', 'link-css', 'iframe-srcdoc',
    'img-onerror', 'svg-onload', 'svg-nospace-on',
    'script-inline', 'script-unclosed',
  ]
  for (const k of gone) {
    const surface = execSurface(sanitizeHtml(payloads[k]))
    assert.ok(!surface.includes('mark('), `${k}: oracle survived in ${JSON.stringify(surface)}`)
    assert.ok(!/javascript:|srcdoc|<script|<form|<object|<embed|<base|<style|<link|<iframe/i.test(surface), `${k}: active surface survived`)
  }
  /* noscript-mxss: the only residue is the mxss spell escaped inside a
     title attribute — no live <img> and no live onerror. */
  const mxss = sanitizeHtml(payloads['noscript-mxss'])
  assert.ok(!/<img/i.test(mxss), 'mxss img must not materialize')
  assert.ok(!execSurface(mxss).includes('onerror'), 'mxss onerror must not materialize')
  /* a-data: data:text href dropped; the link text itself is harmless. */
  const aData = sanitizeHtml(payloads['a-data'])
  assert.ok(!/href=|data:text/.test(aData), 'a-data href must go')
  /* video-ext: not in the allowlist → unwrapped to nothing (src attr gone). */
  assert.equal(sanitizeHtml(payloads['video-ext']), '')
  /* input-isindex: unwrap of a void-ish element → nothing. */
  assert.equal(sanitizeHtml(payloads['input-isindex']), '')
})

test('battery-dom.txt: allowed set survives the same pass', () => {
  const ok = '<p class="mp">text <a href="https://mp.weixin.qq.com/s/x">l</a> ' +
    '<img src="https://m/i.png" alt="a"> <code>c()</code></p>' +
    '<table><thead><tr><th>h</th></tr></thead><tbody><tr><td colspan="2">d</td></tr></tbody></table>' +
    '<svg><g><image href="https://m/i.png"></image></g></svg>'
  const out = sanitizeHtml(ok)
  for (const frag of ['<p class="mp">', '<a href="https://mp.weixin.qq.com/s/x">',
    '<img src="https://m/i.png"', '<code>', '<table>', '<th>', '<td colspan="2">',
    '<svg>', '<g>', '<image href="https://m/i.png">']) {
    assert.ok(out.includes(frag), `allowed fragment ${frag} dropped`)
  }
})
