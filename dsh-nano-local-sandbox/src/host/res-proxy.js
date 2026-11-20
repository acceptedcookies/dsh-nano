/**
 * Same-origin resource proxy for the pane's native-HTML preview.
 *
 * WHY THIS EXISTS
 * The pane renders inside the host's https page. Its native-HTML surface is an
 * iframe srcdoc, and a srcdoc document inherits THAT origin — so every http:
 * subresource a local dev server serves (stylesheets, images, fonts) is mixed
 * content and Chrome drops it silently. The observable symptom is an unstyled
 * skeleton while the engine itself (which loads the page in its own container)
 * renders perfectly. The old workarounds all pushed the cost onto the user:
 * give the dev server a TLS certificate, or expose it through a public tunnel
 * (which also leaves the deployment's topology entirely). Neither is this
 * plugin's call to make.
 *
 * This route keeps everything inside the deployment: the browser only ever
 * talks to the dsh origin over https, and the host performs the http fetch.
 * No certificate, no trust-store install, no tunnel, no user action.
 *
 * PATH SHAPE — deliberately path-based, not ?u=
 *   /nano-local-sandbox/res/<scheme>/<host[:port]>/<path…>
 * Mirroring the real path makes RELATIVE references resolve correctly for
 * free: a stylesheet at .../css/main.css that references url(font.woff) and
 * an anchored page at .../a/b that references ../c both land on the right
 * proxy path without any rewriting. A query-based proxy cannot do this — the
 * relative base would collapse to the route path and lose the target.
 *
 * WHAT IS REFUSED, AND WHY IT IS AN ERROR NOT A SILENT NO
 * - scheme outside http/https (file:, data:, javascript:, chrome:, …) —
 *   fetching those host-side is an escalation, not a preview;
 * - credentials in the URL — the proxy must never borrow an identity;
 * - oversized responses — a preview surface is not a download manager.
 * Each refusal carries a named errorId from the shared catalog, so a caller
 * can tell "you asked for something forbidden" from "the upstream was down".
 */

import { errorCode } from './error-catalog.js'

const RES_PREFIX = '/nano-local-sandbox/res'
/** Only these two schemes are a preview. Anything else is a host-side fetch. */
const ALLOWED_SCHEMES = new Set(['http', 'https'])
/** A preview never needs more than this; larger bodies are refused, not truncated. */
const MAX_BYTES = 24 * 1024 * 1024
const TIMEOUT_MS = 15000

/** Headers that must not be copied from upstream to a same-origin response. */
const DROP_RESPONSE_HEADERS = new Set([
  // Cookies would be written for the dsh origin — a proxied page must never
  // gain the ability to set them.
  'set-cookie',
  'set-cookie2',
  // fetch() already decoded the body; forwarding these would desync the browser.
  'content-encoding',
  'content-length',
  'transfer-encoding',
  // Upstream framing/security policy describes the ORIGIN, not the proxy;
  // forwarded as-is it would refuse to render inside the pane.
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'strict-transport-security',
  'alt-svc',
])

/**
 * Stamp the shared operations row. The proxy writes raw bodies (not the JSON
 * envelope send() builds), so the generic wrapper never sees the outcome —
 * without this every /res row would stay status:null and be reported as
 * 'cancelled' even though the resource was served.
 */
function stampOp(res, status, errorId = null, errorText = null) {
  const op = res?.__op
  if (!op) return
  op.status = status
  op.ok = status < 400
  op.errorId = errorId
  if (errorText) op.error = String(errorText).slice(0, 240)
  op.durationMs = Date.now() - op.startedMs
}

/** Error with an HTTP status and a catalog-shaped errorId. */
function refuse(status, errorId, message) {
  return Object.assign(new Error(message), { status, errorId })
}

/**
 * Split "host", "host:port", "[v6]" or "[v6]:port" without trusting URL parser
 * quirks around bare IPv6 in a path segment.
 * @param {string} raw
 * @returns {string|null} authority suitable for a URL, or null when malformed
 */
function normalizeAuthority(raw) {
  const text = String(raw || '').trim()
  if (!text) return null
  // Anything that could smuggle credentials or a second host.
  if (text.includes('@') || text.includes('/') || text.includes('\\') || text.includes('?')) return null
  if (text.startsWith('[')) {
    const close = text.indexOf(']')
    if (close < 0) return null
    const tail = text.slice(close + 1)
    if (tail !== '' && !/^:\d{1,5}$/.test(tail)) return null
    return text
  }
  if (text.split(':').length > 2) return null
  if (!/^[A-Za-z0-9._-]+(:\d{1,5})?$/.test(text)) return null
  return text
}

/**
 * Parse the trailing part of the route into a target URL.
 * @param {string} pathAndQuery the request URL as received (path + search)
 * @returns {{ url: string }}
 * @throws an error carrying status + errorId
 */
export function parseResTarget(pathAndQuery) {
  const raw = String(pathAndQuery || '')
  const afterPrefix = raw.startsWith(RES_PREFIX) ? raw.slice(RES_PREFIX.length) : raw
  const [pathPart, ...queryParts] = afterPrefix.split('?')
  const query = queryParts.length ? `?${queryParts.join('?')}` : ''
  const segments = pathPart.replace(/^\/+/, '').split('/')
  if (segments.length < 2 || !segments[0] || !segments[1]) {
    throw refuse(400, errorCode('res.path'), `resource path must be ${RES_PREFIX}/<http|https>/<host>/<path>`)
  }
  const scheme = segments[0].toLowerCase()
  if (!ALLOWED_SCHEMES.has(scheme)) {
    throw refuse(400, errorCode('res.scheme'), `scheme "${segments[0]}" is not allowed; only http and https can be previewed`)
  }
  const authority = normalizeAuthority(decodeURIComponent(segments[1]))
  if (!authority) {
    throw refuse(400, errorCode('res.host'), `"${segments[1]}" is not a usable host (credentials and extra path segments are refused)`)
  }
  const rest = segments.slice(2).map((part) => encodeURIComponent(decodeURIComponent(part))).join('/')
  let url
  try {
    url = new URL(`${scheme}://${authority}/${rest}${query}`)
  } catch {
    throw refuse(400, errorCode('res.url'), `cannot form a request URL for ${scheme}://${authority}/`)
  }
  if (url.username || url.password) {
    throw refuse(400, errorCode('res.host'), 'credentials in the target URL are refused')
  }
  return { url: url.toString() }
}

/**
 * Map a real page URL onto its proxy path. Used for the srcdoc <base>, so the
 * preview's relative references resolve inside the proxy space.
 * @param {string} pageUrl
 * @returns {string} e.g. /nano-local-sandbox/res/http/127.0.0.1:3000/ (no trailing slash when the page has no directory)
 */
export function proxyBaseFor(pageUrl) {
  let parsed
  try {
    parsed = new URL(String(pageUrl || ''))
  } catch {
    return ''
  }
  if (!ALLOWED_SCHEMES.has(parsed.protocol.replace(':', ''))) return ''
  const dir = parsed.pathname.replace(/[^/]*$/, '') || '/'
  return `${RES_PREFIX}/${parsed.protocol.replace(':', '')}/${parsed.host}${dir}`
}

/**
 * Serve one proxied resource. Writes the response; never throws to the caller.
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {{ fetchImpl?: typeof fetch }} [deps]
 */
export async function serveRes(req, res, deps = {}) {
  const doFetch = deps.fetchImpl || fetch
  const send = (status, body, headers = {}) => {
    if (res.writableEnded) return
    stampOp(res, status, body?.errorId ?? null, body?.error ?? null)
    res.statusCode = status
    res.setHeader('content-type', 'application/json; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    for (const [k, v] of Object.entries(headers)) res.setHeader(k, v)
    res.end(JSON.stringify(body))
  }
  let target
  try {
    target = parseResTarget(req.url)
  } catch (error) {
    send(error.status || 400, { ok: false, errorId: error.errorId || errorCode('res.path'), error: error.message })
    return
  }
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  timer.unref?.()
  try {
    const upstream = await doFetch(target.url, {
      method: req.method === 'HEAD' ? 'HEAD' : 'GET',
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        // Ask for identity so the body is comparable to the size cap and the
        // browser never sees a Content-Encoding we decoded.
        'accept-encoding': 'identity',
        accept: '*/*',
      },
    })
    // A redirect is mapped back into proxy space so following it stays proxied
    // instead of silently leaving for another origin.
    if (upstream.status >= 300 && upstream.status < 400) {
      const location = upstream.headers.get('location')
      if (location) {
        let mapped = null
        try {
          const abs = new URL(location, target.url)
          if (ALLOWED_SCHEMES.has(abs.protocol.replace(':', ''))) {
            mapped = `${RES_PREFIX}/${abs.protocol.replace(':', '')}/${abs.host}${abs.pathname}${abs.search}`
          }
        } catch { mapped = null }
        if (mapped) {
          stampOp(res, 302)
          res.statusCode = 302
          res.setHeader('location', mapped)
          res.setHeader('cache-control', 'no-store')
          res.end()
          return
        }
      }
      send(502, { ok: false, errorId: errorCode('res.redirect'), error: `upstream redirect is not a previewable target: ${location || '(no location)'}` })
      return
    }
    const declared = Number(upstream.headers.get('content-length') || 0)
    if (Number.isFinite(declared) && declared > MAX_BYTES) {
      send(413, { ok: false, errorId: errorCode('res.size'), error: `upstream body is ${declared} bytes, over the ${MAX_BYTES} byte preview cap` })
      return
    }
    if (!upstream.ok) {
      // Upstream refusal is reported as a proxy-level 502 with the upstream
      // status preserved in the body — the pane must not mistake an upstream
      // 404 for a proxy bug.
      send(502, { ok: false, errorId: errorCode('res.upstream'), error: `upstream answered ${upstream.status}`, upstreamStatus: upstream.status })
      return
    }
    res.statusCode = 200
    for (const [key, value] of upstream.headers.entries()) {
      if (DROP_RESPONSE_HEADERS.has(key.toLowerCase())) continue
      try { res.setHeader(key, value) } catch { /* hop-by-hop or invalid */ }
    }
    res.setHeader('cache-control', 'no-store')
    stampOp(res, 200)
    // The pane loads this under the dsh origin; never let a proxied asset be
    // treated as a same-origin script/document boundary by accident.
    res.setHeader('x-content-type-options', 'nosniff')
    if (req.method === 'HEAD') { res.end(); return }
    const buffered = Buffer.from(await upstream.arrayBuffer())
    if (buffered.byteLength > MAX_BYTES) {
      // Headers are already sent; nothing left but to cut the connection.
      res.destroy()
      return
    }
    res.end(buffered)
  } catch (error) {
    const aborted = error?.name === 'AbortError'
    send(aborted ? 504 : 502, {
      ok: false,
      errorId: aborted ? errorCode('res.timeout') : errorCode('res.upstream'),
      error: aborted ? `upstream did not answer within ${TIMEOUT_MS}ms` : `upstream fetch failed: ${error?.message || String(error)}`,
    })
  } finally {
    clearTimeout(timer)
  }
}

export { RES_PREFIX, MAX_BYTES, ALLOWED_SCHEMES }
