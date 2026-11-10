/** Host half. Notes stay in the browser database, so this side only supplies defaults. */

import { readFileSync } from 'node:fs'
import { ensurePerfReviewHost, LIB_VERSION } from './lib/perf-review-host.js'

export const name = 'nano-notepad'
export const inject = ['webServer', 'connection', 'subprocess']

// perf-review: register a host contributor. index.js is unbundled and the dev
// instance copies lib/ but not node_modules, so the helper is a bundled file
// (lib/perf-review-host.js). Disabled path is identity wrappers; DSH_PERF_REVIEW=1
// enables hostSpan timing + the 30 s host.json writer (spec §6.1 / §6.2).
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
const review = ensurePerfReviewHost().hostJoin('nano-notepad', { version, libVersion: LIB_VERSION })

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-notepad',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const number = (key, fallback, min, max) => {
        const candidate = source[key]
        if (candidate === undefined) return fallback
        if (typeof candidate !== 'number' || !Number.isInteger(candidate) || candidate < min || candidate > max) {
          return { issue: `${key} must be an integer from ${min} to ${max}` }
        }
        return candidate
      }
      const fields = {
        saveDelayMs: number('saveDelayMs', 800, 200, 5000),
        commitIntervalSec: number('commitIntervalSec', 60, 15, 3600),
        versionLimit: number('versionLimit', 50, 5, 500),
        imageLimitBytes: number('imageLimitBytes', 5 * 1024 * 1024, 256 * 1024, 20 * 1024 * 1024),
      }
      const issues = Object.entries(fields)
        .filter(([, field]) => field && field.issue)
        .map(([, field]) => ({ message: field.issue }))
      if (issues.length > 0) return { issues }
      const view = source.defaultView ?? 'rendered'
      const theme = source.theme ?? 'system'
      if (view !== 'rendered' && view !== 'source') issues.push({ message: 'defaultView must be rendered or source' })
      if (!['dark', 'light', 'system'].includes(theme)) issues.push({ message: 'theme must be dark, light, or system' })
      if (issues.length > 0) return { issues }
      return {
        value: {
          saveDelayMs: fields.saveDelayMs,
          commitIntervalSec: fields.commitIntervalSec,
          versionLimit: fields.versionLimit,
          imageLimitBytes: fields.imageLimitBytes,
          defaultView: view,
          theme,
        },
      }
    },
  },
}

const SAVE_ROUTE = '/nano-notepad/save'
const READ_ROUTE = '/nano-notepad/read'
const MP_ROUTE = '/nano-notepad/fetch-mp'
const MP_MAX_HTML_BYTES = 8 * 1024 * 1024
const MP_TIMEOUT_MS = 20000
const MP_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.40'
const MAX_READ_BYTES = 2 * 1024 * 1024
const MAX_SAVE_BYTES = 8 * 1024 * 1024
const DIALOG_TIMEOUT_MS = 600000
const MAX_NAME_BYTES = 512

async function jsonBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_SAVE_BYTES) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  if (total === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function messageOf(value) { return value instanceof Error ? value.message : String(value) }

/**
 * The AppleScript program the save dialog runs. The proposed filename is passed
 * as `argv` item 1 — never interpolated into the source — so a hostile name is
 * inert text instead of a string-literal breakout (review-01 R2).
 */
const SAVE_SCRIPT = [
  'on run argv',
  'try',
  'set dflt to item 1 of argv',
  'set loc to ""',
  'if (count of argv) > 1 then set loc to item 2 of argv',
  'if loc is not "" then',
  'set f to choose file name with prompt "存储为" default name dflt default location (POSIX file loc)',
  'else',
  'set f to choose file name with prompt "存储为" default name dflt',
  'end if',
  'POSIX path of f',
  'on error',
  '"__cancelled__"',
  'end try',
  'end run',
].join('\n')

/** The name the dialog proposes: extension stripped, empty/oversized refused. */
function dialogBase(name) {
  if (typeof name !== 'string') throw new Error('name must be a string')
  const trimmed = name.endsWith('.md') ? name.slice(0, -3) : name
  if (trimmed === '' || trimmed.length > MAX_NAME_BYTES) throw new Error('name must be 1..512 characters')
  return trimmed
}

/**
 * Ask Finder for a target path, then write the note there. `osascript` runs the
 * static {@link SAVE_SCRIPT} with the name on argv, so nothing the caller sends
 * is ever compiled as AppleScript.
 */
/** Directories the dialog accepts as its start point: absolute, exists, is a dir. */
async function validStartDir(dir) {
  if (typeof dir !== 'string' || !dir.startsWith('/') || dir.includes('\0')) return ''
  try {
    const fs = await import('node:fs/promises')
    return (await fs.stat(dir)).isDirectory() ? dir : ''
  } catch { return '' }
}

function nativeSave(ctx, { name, content, dir }) {
  return new Promise(async resolve => {
    if (process.platform !== 'darwin') { resolve({ ok: false, reason: 'unsupported' }); return }
    const base = dialogBase(name)
    const startDir = await validStartDir(dir)
    const finish = async (err, stdout) => {
      const out = String(stdout || '').trim()
      if (err && !out) { resolve({ ok: false, reason: 'failed', message: messageOf(err).slice(0, 200) }); return }
      if (!out || out === '__cancelled__' || /user canceled|已取消/i.test(messageOf(err ?? ''))) {
        resolve({ ok: false, reason: 'cancelled' })
        return
      }
      try {
        // The path is user-chosen via the native dialog, so it may lie outside the
        // workspace; `ctx.fs` would fence it, so the write stays on the platform
        // file seam the dialog itself authorizes.
        const fs = await import('node:fs/promises')
        const target = out.endsWith('.md') ? out : `${out}.md`
        await fs.writeFile(target, content, 'utf8')
        resolve({ ok: true, path: target })
      } catch (werr) {
        resolve({ ok: false, reason: 'failed', message: messageOf(werr).slice(0, 200) })
      }
    }
    const subprocess = ctx.get('subprocess')
    if (subprocess !== undefined && subprocess !== null) {
      void runViaSubprocess(subprocess, base, startDir).then(
        ({ stdout }) => finish(null, stdout),
        error => finish(error, ''),
      )
      return
    }
    void import('node:child_process').then(({ execFile }) => {
      execFile('/usr/bin/osascript', ['-e', SAVE_SCRIPT, base, startDir], { timeout: DIALOG_TIMEOUT_MS, maxBuffer: 64 * 1024 },
        (err, stdout) => { void finish(err, stdout) })
    })
  })
}

/**
 * Run the dialog through the managed subprocess seam (byte caps, graceful
 * terminate, abort) instead of a raw `execFile`.
 */
async function runViaSubprocess(subprocess, base, startDir) {
  const program = await subprocess.resolveExecutable('osascript', undefined, undefined)
  const child = subprocess.spawn({
    argv: [program, '-e', SAVE_SCRIPT, base, startDir],
    cwd: process.env.HOME ?? '/',
    env: {},
    graceMs: 5000,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: 64 * 1024 },
      stderr: { maxBytes: 16 * 1024 },
    },
  })
  try {
    const outcome = await child.done
    const stdout = child.collected.stdout.readFrom(0).text
    const stderr = child.collected.stderr.readFrom(0).text
    if (outcome.exitCode !== 0 && stdout.trim() === '') {
      throw new Error(stderr.split(/\r?\n/u).find(line => line.trim() !== '') ?? `osascript exited ${outcome.exitCode}`)
    }
    return { stdout }
  } finally {
    child.terminate()
    await child.waitForExit().catch(() => {})
  }
}

/** Read one markdown file the chat card already named. Authenticated page only. */
async function readMarkdown(filePath) {
  if (typeof filePath !== 'string' || filePath.includes('\0')) throw new Error('path is not a markdown file')
  const path = await import('node:path')
  const fs = await import('node:fs/promises')
  const resolved = path.resolve(filePath)
  if (!/\.(md|markdown)$/i.test(resolved)) throw new Error('path is not a markdown file')
  const real = await fs.realpath(resolved)
  if (!/\.(md|markdown)$/i.test(real)) throw new Error('path is not a markdown file')
  const stat = await fs.stat(real)
  if (!stat.isFile() || stat.size > MAX_READ_BYTES) throw new Error('markdown file is missing or too large')
  return { name: path.basename(real), content: await fs.readFile(real, 'utf8') }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: READ_ROUTE,
    handler: async (req, res) => {
      const rejection = ctx.get('connection')?.requestRejection(req)
      if (rejection !== undefined) { res.statusCode = rejection; res.end(); return }
      if (req.method !== 'POST') { res.setHeader('allow', 'POST'); sendJson(res, 405, { ok: false, reason: 'method' }); return }
      try {
        const body = await jsonBody(req)
        // perf-review: time the read route's actual work (§6.7 hostSpan read).
        const file = await review.hostSpan('read', () => readMarkdown(body.path))
        sendJson(res, 200, { ok: true, ...file })
      } catch (error) {
        sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 200) })
      }
    },
  }), 'nano-notepad: read markdown')
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: SAVE_ROUTE,
    handler: async (req, res) => {
      // Every write-capable route sits behind the connection's request admission
      // (Host/Origin fence + authenticated Peer); without it any web page or LAN
      // client could drive the native save dialog (review-01 R1).
      const rejection = ctx.get('connection')?.requestRejection(req)
      if (rejection !== undefined) { res.statusCode = rejection; res.end(); return }
      if (req.method !== 'POST') { res.setHeader('allow', 'POST'); sendJson(res, 405, { ok: false, reason: 'method' }); return }
      const type = String(req.headers['content-type'] ?? '')
      if (!type.toLowerCase().startsWith('application/json')) { sendJson(res, 415, { ok: false, reason: 'content-type' }); return }
      try {
        const body = await jsonBody(req)
        // perf-review: time the save route's actual work (§6.7 hostSpan save).
        const result = await review.hostSpan('save', () => nativeSave(ctx, { name: body.name, content: body.content, dir: body.dir }))
        sendJson(res, result.ok ? 200 : result.reason === 'cancelled' ? 200 : 500, result)
      } catch (error) {
        sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 200) })
      }
    },
  }), 'nano-notepad: save route')

  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: MP_ROUTE,
    handler: async (req, res) => {
      const rejection = ctx.get('connection')?.requestRejection(req)
      if (rejection !== undefined) { res.statusCode = rejection; res.end(); return }
      if (req.method !== 'POST') { res.setHeader('allow', 'POST'); sendJson(res, 405, { ok: false, reason: 'method' }); return }
      const type = String(req.headers['content-type'] ?? '')
      if (!type.toLowerCase().startsWith('application/json')) { sendJson(res, 415, { ok: false, reason: 'content-type' }); return }
      try {
        const body = await jsonBody(req)
        const result = await fetchMpArticle(body.url)
        sendJson(res, result.ok ? 200 : 422, result)
      } catch (error) {
        sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 200) })
      }
    },
  }), 'nano-notepad: fetch-mp route')
}

/* ---------- WeChat MP article fetch ---------- */

/**
 * A pasted mp.weixin.qq.com link can't be fetched from the page (CORS), so the
 * host pulls it. A desktop/WeChat-less UA gets the anti-scrape verify page
 * (~18KB, no js_content); the iPhone+MicroMessenger UA gets the full article.
 * Non-article or verify-page responses surface as `reason:'not-article'`.
 */
async function fetchMpArticle(url) {
  if (typeof url !== 'string' || !/^https:\/\/mp\.weixin\.qq\.com\/s\//.test(url.trim())) {
    return { ok: false, reason: 'not-mp-url' }
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), MP_TIMEOUT_MS)
  let html = ''
  try {
    const response = await fetch(url.trim(), {
      headers: { 'user-agent': MP_UA, 'accept': 'text/html,application/xhtml+xml' },
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!response.ok) return { ok: false, reason: 'fetch-failed', status: response.status }
    html = await response.text()
  } catch (error) {
    return { ok: false, reason: 'fetch-failed', message: messageOf(error).slice(0, 200) }
  } finally {
    clearTimeout(timer)
  }
  if (html.length > MP_MAX_HTML_BYTES) return { ok: false, reason: 'too-large' }
  const meta = mpMeta(html)
  const content = mpContent(html)
  if (content === null) return { ok: false, reason: 'not-article' }
  const sanitized = sanitizeMpHtml(content)
  const name = (meta.title || 'wechat-article').replace(/[\\/:*?"<>|\x00-\x1f]/g, '').trim().slice(0, 80) || 'wechat-article'
  return { ok: true, name: `${name}.html`, content: sanitized, meta }
}

/** Pull the article's own metadata from the full page. */
function mpMeta(html) {
  const pick = (re) => { const m = html.match(re); return m ? m[1].trim() : '' }
  return {
    title: pick(/id="activity-name"[^>]*>([\s\S]*?)<\/h1>/).replace(/<[^>]+>/g, '').trim()
        || pick(/var msg_title = '([^']*)'/),
    account: pick(/id="js_name"[^>]*>([\s\S]*?)<\//).replace(/<[^>]+>/g, '').trim()
          || pick(/var nickname = '([^']*)'/),
    author: pick(/var author = '([^']*)'/) || pick(/id="js_author_name"[^>]*>([\s\S]*?)<\//).replace(/<[^>]+>/g, '').trim(),
    publishedAt: (() => { const ct = pick(/var ct = '(\d+)'/); return ct ? new Date(Number(ct) * 1000).toISOString() : '' })(),
    coverUrl: pick(/var msg_cdn_url = '([^']*)'/),
  }
}

/** Slice `#js_content`'s inner HTML out of the page (it's a div; walk the tag depth). */
function mpContent(html) {
  const start = html.indexOf('id="js_content"')
  if (start === -1) return null
  const bodyStart = html.indexOf('>', start) + 1
  let depth = 1, end = -1
  const re = /<\/?div\b[^>]*>/g
  re.lastIndex = bodyStart
  let m
  while ((m = re.exec(html)) !== null) {
    depth += m[0].startsWith('</') ? -1 : 1
    if (depth === 0) { end = m.index; break }
  }
  return end === -1 ? null : html.slice(bodyStart, end)
}

/**
 * Host-side regex sanitizer for the WeChat rich-text body: drop scripts,
 * iframes, event handlers, mpvoice, and every `style` declaration that isn't
 * in the layout whitelist; neutralize positioning. The client re-sanitizes in
 * DOM space before render, so this only has to be a solid first pass.
 */
const MP_STYLE_ALLOW = /^(color|font-size|font-weight|font-style|font-family|text-align|line-height|margin(-(top|right|bottom|left))?|padding(-(top|right|bottom|left))?|background(-color|-image|-size|-position|-repeat)?|border(-(top|right|bottom|left)(-(width|style|color))?)?|border-radius|letter-spacing|text-indent|text-decoration(-line)?|width|max-width|height|display|vertical-align|box-sizing|overflow(-x|-y)?|white-space|word-(wrap|break)|opacity|float|clear)\s*$/i

/* Splitting a style on ';' must not cut inside an entity like `&quot;`:
   WeChat writes `url(&quot;…&quot;)` into inline styles, and a naive split(';')
   truncates the URL at the entity's own semicolon. Mask entities, split,
   restore. */
function mpStyleSplit(value) {
  /* Match declarations as `name: value` where value ends at a `;` that is NOT
     part of an entity: an entity's `;` is preceded only by `&` + word chars. */
  const parts = String(value).match(/[^;]+(?:;(?!\w*&) [^;]*)*/g)
  if (!parts) return []
  /* The lookahead trick above is unreliable; do the explicit scan instead. */
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

function sanitizeMpHtml(html) {
  let out = html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<iframe\b[\s\S]*?(<\/iframe\s*>|\/?>)/gi, '')
    .replace(/<\/?mpvoice\b[^>]*>/gi, '')
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    /* Promote data-src only on <img>: WeChat also sticks junk data-src values
       (e.g. "position:static") on video/decoration nodes, and promoting those
       turns them into resource URLs — ERR_UNKNOWN_URL_SCHEME noise. */
    .replace(/(<img\b[^>]*?)\sdata-src\s*=\s*"([^"]*)"/gi, `$1 src="$2" referrerpolicy="no-referrer" loading="lazy" decoding="async"`)
    .replace(/(<img\b[^>]*?)\sdata-src\s*=\s*'([^']*)'/gi, `$1 src='$2' referrerpolicy="no-referrer" loading="lazy" decoding="async"`)
    .replace(/\sdata-src\s*=\s*("[^"]*"|'[^']*')/gi, '')
    .replace(/\sstyle\s*=\s*"([^"]*)"/gi, (all, value) => {
      const kept = mpStyleSplit(value)
        .filter(d => MP_STYLE_ALLOW.test(d.split(':')[0]))
        .join('; ')
      return kept ? ` style="${kept}; position: static"` : ''
    })
    .replace(/\sstyle\s*=\s*'([^']*)'/gi, (all, value) => {
      const kept = mpStyleSplit(value)
        .filter(d => MP_STYLE_ALLOW.test(d.split(':')[0]))
        .join('; ')
      return kept ? ` style='${kept}; position: static'` : ''
    })
    // Visibility tricks the original page uses for lazy reveal must not hide
    // the whole body in our pane.
    .replace(/visibility\s*:\s*hidden/gi, 'visibility: visible')
  return out
}
