/**
 * B3-T02/T03 + B3-T08 — host `sanitizeMpHtml` (P3-03).
 *
 * The host renderer is the shared dsh-html-policy string serializer: same
 * ALLOWED/DROP tables the client's DOM walk consumes. These tests pin:
 *   - 0-execution on the v-mpsan battery-dom corpus (negative);
 *   - byte-parity with the legacy regex sanitizer on the committed mp
 *     article fixture (positive 排版零回退 snapshot);
 *   - the verbatim transforms (data-src promotion, visibility sweep).
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sanitizeMpHtml } from '../src/host/mp-sanitize.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..', '..')

/* ------------------------------------------------------------------ *
 * The legacy regex pass, verbatim (baseline 90ac6b6 == shipped index.js *
 * before P3-03). Snapshot parity is proven against THIS function, not a *
 * transcription: it is the exact code being replaced.                  *
 * ------------------------------------------------------------------ */
const MP_STYLE_ALLOW = /^(color|font-size|font-weight|font-style|font-family|text-align|line-height|margin(-(top|right|bottom|left))?|padding(-(top|right|bottom|left))?|background(-color|-image|-size|-position|-repeat)?|border(-(top|right|bottom|left)(-(width|style|color))?)?|border-radius|letter-spacing|text-indent|text-decoration(-line)?|width|max-width|height|display|vertical-align|box-sizing|overflow(-x|-y)?|white-space|word-(wrap|break)|opacity|float|clear)\s*$/i

function mpStyleSplit(value) {
  const out = []
  let buf = ''
  for (let i = 0; i < value.length; i++) {
    const ch = value[i]
    if (ch === ';') {
      const entity = /&[a-zA-Z#\d]*$/.test(buf)
      if (!entity) { if (buf.trim()) out.push(buf.trim()); buf = ''; continue }
    }
    buf += ch
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

function sanitizeMpHtmlLegacy(html) {
  let out = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<iframe\b[\s\S]*?(<\/iframe\s*>|\/?>)/gi, '')
    .replace(/<\/?mpvoice\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(<img\b[^>]*?)\sdata-src\s*=\s*"([^"]*)"/gi, `$1 src="$2" referrerpolicy="no-referrer" loading="lazy" decoding="async"`)
    .replace(/(<img\b[^>]*?)\sdata-src\s*=\s*'([^']*)'/gi, `$1 src='$2' referrerpolicy="no-referrer" loading="lazy" decoding="async"`)
    .replace(/\sdata-src\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/\sstyle\s*=\s*"([^"]*)"/gi, (all, value) => {
      const kept = mpStyleSplit(value).filter(d => MP_STYLE_ALLOW.test(d.split(':')[0])).join('; ')
      return kept ? ` style="${kept}; position: static"` : ''
    })
    .replace(/\sstyle\s*=\s*'([^']*)'/gi, (all, value) => {
      const kept = mpStyleSplit(value).filter(d => MP_STYLE_ALLOW.test(d.split(':')[0])).join('; ')
      return kept ? ` style='${kept}; position: static'` : ''
    })
    .replace(/visibility\s*:\s*hidden/gi, 'visibility: visible')
  return out
}

/* ------------------------------------------------------------------ *
 * Helpers                                                            *
 * ------------------------------------------------------------------ */

/** Slice the js_content body like fetchMpArticle does (mpContent regex). */
function jsContentBody(pageHtml) {
  const html = String(pageHtml)
  const start = html.indexOf('id="js_content"')
  assert.ok(start !== -1, 'fixture has no js_content')
  const bodyStart = html.indexOf('>', start) + 1
  let depth = 1
  let end = -1
  const re = /<\/?div\b[^>]*>/g
  re.lastIndex = bodyStart
  let m
  while ((m = re.exec(html)) !== null) {
    depth += m[0].startsWith('</') ? -1 : 1
    if (depth === 0) { end = m.index; break }
  }
  assert.ok(end !== -1, 'fixture js_content not closed')
  return html.slice(bodyStart, end)
}

/** Parse the payload map out of the copied battery corpus (same parser as
    the policy package's test). */
function batteryPayloads(file) {
  const text = readFileSync(file, 'utf8')
  const start = text.indexOf('const P = {')
  const end = text.indexOf('\n};', start)
  assert.ok(start !== -1 && end !== -1, 'battery payload map not found')
  const payloads = {}
  for (const line of text.slice(start, end).split('\n')) {
    const m = /^\s*'([a-z0-9-]+)':\s*(.+?),\s*$/.exec(line)
    if (!m) continue
    const segments = [...m[2].matchAll(/'([^'\\]|\\.)*'/g)].map(s =>
      s[0].slice(1, -1).replace(/\\'/g, "'").replace(/\\\\/g, '\\'))
    payloads[m[1]] = segments.join('')
  }
  return payloads
}

/** Live markup with comments and attribute values blanked — an oracle
    inside an escaped attribute value is inert text, not execution. */
const execSurface = out => out
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/="[^"]*"|='[^']*'/g, '=')

const BATTERY = join(REPO, 'packages', 'dsh-html-policy', 'test', 'fixtures', 'battery-dom.txt')

/* ------------------------------------------------------------------ *
 * Negative: battery-dom through the HOST renderer — 0 execution        *
 * ------------------------------------------------------------------ */

test('battery-dom corpus through sanitizeMpHtml: no oracle survives', () => {
  const payloads = batteryPayloads(BATTERY)
  assert.ok(Object.keys(payloads).length >= 20, 'corpus parsed')
  const joined = Object.entries(payloads).map(([k, v]) => `<!--${k}-->${v}`).join('\n')
  const surface = execSurface(sanitizeMpHtml(joined))
  assert.ok(!surface.includes('mark('), 'mark() oracle survived host pass')
  for (const sig of ['<script', '<iframe', '<object', '<embed', '<form',
    '<input', '<button', '<base', '<link', '<style', '<meta', 'srcdoc',
    'javascript:', 'vbscript:', 'data:text', 'onerror=', 'onload=', 'onclick=']) {
    assert.ok(!surface.toLowerCase().includes(sig), `${sig} survived host pass`)
  }
})

test('sanitizeMpHtml: legacy parity regressions from the battery', () => {
  /* Things the OLD pass already handled must stay handled. */
  assert.equal(sanitizeMpHtml('<script>x()</script>ok'), 'ok')
  assert.equal(sanitizeMpHtml('<img src="x" onerror="pwn()">'), '<img src="x">')
  assert.equal(sanitizeMpHtml('<mpvoice>x</mpvoice>y'), 'xy')
  assert.equal(
    sanitizeMpHtml('<img data-src="https://m/i.png">'),
    '<img src="https://m/i.png" referrerpolicy="no-referrer" loading="lazy" decoding="async">',
  )
  assert.equal(
    sanitizeMpHtml(`<img data-src='https://m/i.png'>`),
    `<img src='https://m/i.png' referrerpolicy="no-referrer" loading="lazy" decoding="async">`,
  )
  assert.equal(
    sanitizeMpHtml('<p style="visibility:hidden;color:#fff">v</p>'),
    '<p style="color: #fff; position: static">v</p>',
  )
  /* The new pass is strictly tighter on entities: the old pass let an
     entity-encoded javascript: through unchanged. */
  assert.equal(sanitizeMpHtml('<a href="&#106;avascript:mark()">x</a>'), '<a>x</a>')
  /* …and on the mXSS title escape — the oracle must stay escaped data. */
  const mxss = sanitizeMpHtml('<noscript><p title="</noscript><img src=x /onerror=mark(1)>"></noscript>')
  assert.ok(!/<img/i.test(mxss), 'mXSS img materialized')
  assert.ok(!execSurface(mxss).includes('onerror'), 'mXSS onerror materialized')
})

/* ------------------------------------------------------------------ *
 * Positive: mp-article fixture — snapshot == legacy output (B3-T08)    *
 * ------------------------------------------------------------------ */

test('mp-article snapshot: new renderer output == legacy output == committed snapshot', () => {
  const fixture = readFileSync(join(REPO, 'test', 'spike', 'security-fix', 'fixtures', 'mp-article.html'), 'utf8')
  const snapshot = readFileSync(join(REPO, 'test', 'spike', 'security-fix', 'fixtures', 'mp-article.expected.html'), 'utf8')
  const frag = jsContentBody(fixture)
  const legacy = sanitizeMpHtmlLegacy(frag)
  const fresh = sanitizeMpHtml(frag)
  /* 排版零回退: the rewritten renderer produces byte-identical output to the
     legacy regex pass on the article fixture, and that output is pinned. */
  assert.equal(fresh, legacy, 'new renderer drifted from legacy output')
  assert.equal(fresh, snapshot, 'renderer output drifted from committed snapshot')
  /* The transforms actually ran. */
  for (const want of [
    'src="https://mmbiz.qpic.cn/mmbiz_png/abcDEF/640?wx_fmt=png" referrerpolicy="no-referrer" loading="lazy" decoding="async"',
    '<foreignObject', '<animateTransform>', 'visibility: visible',
    'position: static', '<table', '<pre', '<code>', '站内链接',
  ]) {
    assert.ok(fresh.includes(want), `expected output missing ${want}`)
  }
})
