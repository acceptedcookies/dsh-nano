/** Browser-side JSON client (CF1115 / P2-04 / T13): the single JsonOutcome
 * codec for this package's host JSON faces. Old per-call fetch+parse wrappers
 * are retired — every consumer goes through createJsonClient so cancelled/
 * transport/http/protocol/domain classification is uniform and the legacy
 * `error.code`/`reason` guessing is gone. */
import { createJsonClient } from 'dsh-interface/host'
import { BROWSER_BINDINGS } from '../../lib/browser-bindings.js'

const BINDING_IDS = new Map(BROWSER_BINDINGS.map(row => [row.path, row.id]))

const client = createJsonClient({
  fetch: (url, init) => fetch(url, { credentials: 'same-origin', ...init }),
  resolveUrl: (_op, req) => req.url,
  plugin: 'dsh-nano-model-selector',
  observe: event => globalThis[Symbol.for('dsh.perfReview.v2')]?.observe?.(event),
})

/** A JSON-operation codec: encode input → request, decode res → ok/domain. */
export function jsonOp({ method = 'GET', url, encode, decode } = {}) {
  return {
    url,
    method,
    bindingId: BINDING_IDS.get(url) ?? null,
    encode: encode ?? ((body) => ({
      url,
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })),
    decode: decode ?? (async (res, readBody) => {
      const text = await readBody()
      if (res.status < 200 || res.status >= 300) return { ok: false, kind: 'http' }
      let data = null
      if (text !== '') { try { data = JSON.parse(text) } catch { return { ok: false, kind: 'protocol', message: 'illegal JSON' } } }
      /* Sanctioned business failure: the `{ok:false,error:{reason,code}}` envelope
         the host writes is the recognized domain shape (F14.5 structural). */
      if (data && data.ok === false && data.error != null) {
        return { ok: false, kind: 'domain', domainCode: data.error.code, domainData: data.error, message: data.error.reason ?? 'failed' }
      }
      return { ok: true, data }
    }),
  }
}

/** Call one operation; unwrap JsonOutcome to (data | throws Error w/ .code). */
export async function call(op, input) {
  const out = await client.call(op, input)
  if (out.ok) return out.data
  const error = new Error(out.error.message ?? `request failed (${out.error.kind})`)
  error.kind = out.error.kind
  if (out.error.domainCode !== undefined) error.code = out.error.domainCode
  if (out.error.httpStatus !== undefined) error.httpStatus = out.error.httpStatus
  if (out.error.domainData !== undefined) error.domain = out.error.domainData
  throw error
}
