/**
 * Browser-side JSON client (CF1115 / P2-04 / T13): the single JsonOutcome
 * codec for every `/nano-explorer-extra` face. Both the workspace store's and
 * the body's per-call fetch+parse helpers are retired — consumers funnel
 * through `request`, which decodes the sanctioned `{ok,error}` wire shape and
 * normalizes failures to `{ok:false, message}` exactly as before so no caller
 * surface changes.
 */
import { createJsonClient } from 'dsh-interface/host'

const PREFIX = '/nano-explorer-extra'

const client = createJsonClient({
  fetch: (url, init) => fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init }),
  resolveUrl: (_op, req) => req.url,
})

/** One suffix-face codec: encode → POST(JSON body)|GET, decode → {ok,data}|domain. */
function opFor(path) {
  return {
    encode: (body) => body === undefined
      ? { url: `${PREFIX}${path}`, method: 'GET' }
      : { url: `${PREFIX}${path}`, method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) },
    decode: async (res, readBody) => {
      const text = await readBody()
      let payload = null
      if (text !== '') { try { payload = JSON.parse(text) } catch { payload = null } }
      /* Sanctioned domain failure: the host writes {ok:false,error:{reason}}. */
      if (payload && payload.ok === false && payload.error != null) {
        return { ok: false, kind: 'domain', domainData: payload.error, message: payload.error.reason ?? 'failed' }
      }
      if (res.status < 200 || res.status >= 300) return { ok: false, kind: 'http' }
      if (payload && payload.ok === true) return { ok: true, data: payload.data }
      /* Legacy/other 2xx shape: treat the payload itself as data. */
      if (payload !== null && payload !== undefined) return { ok: true, data: payload }
      return { ok: false, kind: 'protocol', message: 'illegal or empty response' }
    },
  }
}

/**
 * Fetch one plugin route and normalize the answer.
 * @param path - route suffix under `/nano-explorer-extra`.
 * @param body - optional JSON body; a GET is sent when absent.
 * @returns `{ ok, ...payload }`; failures surface as `{ ok: false, message }`.
 */
export async function request(path, body) {
  try {
    const out = await client.call(opFor(path), body)
    if (out.ok) return { ok: true, ...(out.data ?? {}) }
    const error = out.error
    const message = error.kind === 'domain' || error.kind === 'transport'
      ? (error.domainData?.reason ?? error.message ?? 'request failed')
      : (error.domainData?.reason ?? `HTTP ${error.httpStatus ?? error.kind}`)
    return { ok: false, message }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}
