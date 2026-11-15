/** Browser-side JSON codec for /nano-notepad faces (CF1115 / P2-04 / T13). */
import { createJsonClient } from 'dsh-interface/host'

const client = createJsonClient({
  fetch: (url, init) => fetch(url, { credentials: 'same-origin', cache: 'no-store', ...init }),
  resolveUrl: (_op, req) => req.url,
})

/* The host writes {ok:true,…} on success and {ok:false,reason,message} on a
 * sanctioned business failure. Decode that envelope through JsonOutcome. */
function jsonOp(url, method = 'POST') {
  return {
    encode: (body) => body === undefined && method === 'GET'
      ? { url, method: 'GET' }
      : { url, method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body ?? {}) },
    decode: async (res, readBody) => {
      const text = await readBody()
      let data = null
      if (text !== '') { try { data = JSON.parse(text) } catch { data = null } }
      if (res.status < 200 || res.status >= 300) {
        /* Non-2xx carrying the sanctioned {ok:false} envelope → domain;
           anything else on a non-2xx → http. */
        if (data && data.ok === false) {
          return { ok: false, kind: 'domain', domainData: data, message: data.message ?? data.reason ?? 'failed' }
        }
        return { ok: false, kind: 'http' }
      }
      /* 2xx {ok:false} is a business RESULT the producer sent deliberately
         (s3 status/test switch verdicts) — the caller branches on .ok. */
      return { ok: true, data }
    },
  }
}

/** Call one face; resolve JsonOutcome → data | throws Error(.message). */
async function run(op, body) {
  const out = await client.call(op, body)
  if (out.ok) return out.data
  throw new Error(out.error.message ?? `HTTP ${out.error.httpStatus ?? out.error.kind}`)
}

/* s3Work faces return their own {ok,…} payload inside the envelope — the
 * producer object IS the result, so callers keep receiving the old shape. */
export function rpc(route, body) {
  return run(jsonOp(route), body)
}

/* Pipeline RPC faces answer {ok,result}; `call` unwraps both layers. */
export async function pipelineCall(route, body) {
  const data = await run(jsonOp(route), body)
  return data?.result
}

/** POST helper keeping the raw {ok,…} envelope (save/fetch-mp/read callers
 * branch on `out.ok` / `out.reason` themselves). */
export function post(route, body) {
  return rpc(route, body)
}

/** GET helper returning the decoded payload (fx/models). */
export function get(route) {
  return run(jsonOp(route, 'GET'), undefined)
}
