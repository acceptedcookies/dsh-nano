/**
 * createJsonClient — the JSON consumer facade (CF1115 / P2-01 / T-O-14 / Q8).
 *
 *   createJsonClient({ fetch, resolveUrl })
 *     .call(operation, input, { signal }?) -> Promise<JsonOutcome<T>>
 *
 * `operation` is the唯一 codec + binding record for one call:
 *   {
 *     encode(input) -> { url?, method?, headers?, body? }   // pre-request; may throw
 *     url | path                                          // when encode does not supply it
 *     decode(res)    -> domain | data                       // sees status; reads body once
 *     decodeResponse?({ status, headers, readBody }) -> domain | data  // alt decode
 *   }
 *
 * `resolveUrl(operation, request)` maps the operation to a URL — the ONLY URL
 * authority. It is a sanctioned binding/official transport resolver; the client
 * never guesses a path, never hardcodes a base-url/secret, never appends a
 * business query.
 *
 * Outcome matrix (truth:294-302, F14.3/F14.8 — verbatim, no extra states):
 *   signal already aborted            -> cancelled (fetch never called)
 *   encode/resolve throws pre-request -> protocol  (fetch never called)
 *   fetch rejects / readBody throws    -> transport (keep real httpStatus only
 *                                          if response headers landed)
 *   decode recognizes sanctioned fail  -> domain   (keep domainCode + real status)
 *   non-2xx, not a sanctioned failure  -> http     (keep status)
 *   2xx but illegal structure/decode   -> protocol (NEVER ok:true)
 *   2xx legal success/null/degraded    -> ok:true
 *
 * Boundaries: already-aborted/local rejection never issues a request; response
 * body is read at most once; never auto-retry / swap endpoint / poll /
 * compensate / re-submit writes / invent a timeout.
 */

import { FAILURE_KIND, ok, failure } from '../contracts/jsonOutcome.js'

export class JsonClientError extends Error {
  constructor(reason, detail) {
    super(detail ? `json-client: ${reason} — ${detail}` : `json-client: ${reason}`)
    this.name = 'JsonClientError'
    this.reason = reason
    this.detail = detail
  }
}

const isAbort = (err) => err != null && (err.name === 'AbortError' || err.code === 'ABORT_ERR')

export function createJsonClient({ fetch: fetchImpl, resolveUrl } = {}) {
  if (typeof fetchImpl !== 'function') {
    throw new JsonClientError('missing-fetch', 'createJsonClient requires { fetch }')
  }
  if (typeof resolveUrl !== 'function') {
    throw new JsonClientError('missing-resolveUrl', 'createJsonClient requires { resolveUrl }')
  }

  async function call(operation, input, { signal } = {}) {
    // (1) aborted before we even try — fetch is never invoked.
    if (signal?.aborted) {
      return failure(FAILURE_KIND.CANCELLED, 'cancelled before request')
    }

    // (2) local encode/binding failure — protocol, request never issued.
    let request
    try {
      request = encodeRequest(operation, input)
    } catch (err) {
      return failure(FAILURE_KIND.PROTOCOL, msg(err))
    }
    let url
    try {
      url = resolveUrl(operation, request)
      if (typeof url !== 'string' || url === '') throw new Error('resolveUrl returned no URL')
    } catch (err) {
      return failure(FAILURE_KIND.PROTOCOL, msg(err))
    }

    // (3) issue the request — transport covers network/read failure.
    let res
    try {
      res = await fetchImpl(url, {
        method: request.method ?? 'GET',
        headers: request.headers,
        body: request.body,
        signal,
      })
    } catch (err) {
      return isAbort(err)
        ? failure(FAILURE_KIND.CANCELLED, msg(err))
        : failure(FAILURE_KIND.TRANSPORT, msg(err))
    }

    // Headers landed → we have a real status. Decode reads the body at most once.
    const status = typeof res?.status === 'number' ? res.status : 0
    let decoded
    try {
      decoded = await decodeResponse(operation, res, status)
    } catch (err) {
      if (isAbort(err)) return failure(FAILURE_KIND.CANCELLED, msg(err), { httpStatus: status })
      /* F14.3 非法 2xx → protocol: a decode that throws on a 2xx (e.g. malformed
         JSON body) is a protocol violation, not a transport read failure. Only
         a throw on a NON-2xx (where the body may be an opaque error payload the
         transport itself couldn't surface) is transport. */
      const twoXx = status >= 200 && status < 300
      return failure(twoXx ? FAILURE_KIND.PROTOCOL : FAILURE_KIND.TRANSPORT, msg(err), { httpStatus: status })
    }
    return finalize(decoded, status)
  }

  return { call }
}

/* ---- internals -------------------------------------------------------- */

function encodeRequest(operation, input) {
  if (operation == null || typeof operation !== 'object') {
    throw new Error('operation must be the codec/binding record')
  }
  if (typeof operation.encode === 'function') {
    const req = operation.encode(input)
    if (req == null || typeof req !== 'object') throw new Error('encode must return a request object')
    return req
  }
  // No encoder → identity request carrying the declared path.
  if (typeof operation.url !== 'string' && typeof operation.path !== 'string') {
    throw new Error('operation needs encode() or a declared url/path')
  }
  return { url: operation.url ?? operation.path, method: operation.method ?? 'POST', body: input }
}

/**
 * Run the operation decoder once. The decoder returns either:
 *   { ok:true, data }                     — a 2xx success (codec-chosen, may be null)
 *   { ok:false, kind:'domain', ...error } — a recognized sanctioned business failure
 *   { ok:false, kind:'protocol' }         — an illegal/undecodable response
 * A decoder may instead return `data`/`domainData` bare for 2xx, or throw —
 * throws are treated as transport/read failures by the caller.
 */
async function decodeResponse(operation, res, status) {
  const readBodyOnce = once(async () => {
    if (typeof res.text === 'function') return res.text()
    if (res.body == null) return ''
    return Buffer.concat(await collect(res.body)).toString('utf8')
  })
  if (typeof operation.decode === 'function') return operation.decode(res, readBodyOnce)
  if (typeof operation.decodeResponse === 'function') {
    return operation.decodeResponse({ status, headers: res?.headers, readBody: readBodyOnce })
  }
  // Default decode: JSON, body read once, empty body → null data.
  const text = await readBodyOnce()
  if (text === '') return { ok: true, data: null }
  try {
    return { ok: true, data: JSON.parse(text) }
  } catch {
    return { ok: false, kind: FAILURE_KIND.PROTOCOL, message: 'illegal JSON body' }
  }
}

/**
 * Fold a decoder verdict + real status into the final JsonOutcome.
 * domain verdicts keep their code + real status; non-2xx non-domain → http;
 * illegal 2xx → protocol; legal 2xx → ok.
 */
function finalize(decoded, status) {
  const twoXx = status >= 200 && status < 300
  if (decoded != null && decoded.ok === false) {
    const kind = decoded.kind
    const err = decoded.error ?? decoded
    if (kind === FAILURE_KIND.DOMAIN) {
      return failure(FAILURE_KIND.DOMAIN, err.message ?? 'domain failure', {
        httpStatus: status,
        domainCode: decoded.domainCode ?? err.domainCode,
        domainData: decoded.domainData ?? err.domainData,
      })
    }
    // Non-2xx: the status is the primary classifier — a malformed/empty error
    // body stays `http`, never silently becomes protocol.
    if (!twoXx) return failure(FAILURE_KIND.HTTP, `HTTP ${status}`, { httpStatus: status })
    if (kind === FAILURE_KIND.PROTOCOL) {
      return failure(FAILURE_KIND.PROTOCOL, err.message ?? 'illegal response', { httpStatus: status })
    }
    return failure(FAILURE_KIND.HTTP, err.message ?? `HTTP ${status}`, { httpStatus: status })
  }
  // Decoder returned a success verdict (data or {ok:true,data}).
  const data = decoded != null && decoded.ok === true ? decoded.data : decoded
  if (!twoXx) {
    // Non-2xx that a decoder did not flag as a sanctioned domain failure → http.
    return failure(FAILURE_KIND.HTTP, `HTTP ${status}`, { httpStatus: status })
  }
  return ok(data)
}

const msg = (e) => (e instanceof Error ? e.message : String(e))

function once(fn) {
  let ran = false, value
  return async () => {
    if (!ran) { ran = true; value = await fn() }
    return value
  }
}

async function collect(stream) {
  const chunks = []
  for await (const c of stream) chunks.push(c)
  return chunks
}
