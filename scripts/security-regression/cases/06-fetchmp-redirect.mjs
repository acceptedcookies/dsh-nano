/**
 * 06 — np-fetchmp-redirect (PoCs: v-mpred + v-npssrf — fetch-mp redirect SSRF)
 *
 * /nano-notepad/fetch-mp fetches an allowlisted mp.weixin.qq.com URL
 * host-side. Pre-hardening the fetch ran with redirect:'follow', so a 302
 * from the allowlisted origin borrowed its authority to reach any target —
 * loopback admin panels, RFC-1918, cloud metadata (v-mpred's repro hit an
 * internal server and returned its body to the caller).
 *
 * Oracle (P2-07): redirects are followed manually and EVERY hop re-validates
 * against ^https://mp\.weixin\.qq\.com/s/ — a 302 to loopback, an http
 * downgrade, a //off-host target or javascript: all return
 * {ok:false, reason:'not-mp-url'} and the escape target is NEVER fetched.
 *
 * Replay uses the notepad test's scripted fake-fetch (schema-ingress.test.mjs
 * P2-07); globalThis.fetch is stubbed per sub-check and restored in finally.
 * No live base, no undici MockAgent needed.
 */
import { fetchMpArticle } from '../../../dsh-nano-notepad/index.js'
import { verdicts } from '../lib/nsw-fakes.mjs'

export const fingerprint = 'np-fetchmp-redirect'
export const describe =
  'fetchMpArticle 302 → loopback/downgrade/off-host/javascript — ' +
  '{ok:false,reason:not-mp-url}, the internal target is never fetched'

const MP_ARTICLE =
  '<html><body><h1 id="activity-name">T</h1><div id="js_content"><p>hello</p></div></body></html>'
const MP = 'https://mp.weixin.qq.com/s/abc123'

/**
 * Run one fetchMpArticle call under a scripted fetch stub.
 * @param script - [{status, body?, location?}] replayed per call
 * @returns {Promise<{result, calls}>} — calls = every URL the stub served
 */
async function withScriptedFetch(script, invoke) {
  const previous = globalThis.fetch
  const calls = []
  globalThis.fetch = async url => {
    calls.push(String(url))
    const step = script[Math.min(calls.length - 1, script.length - 1)]
    return new Response(step.body ?? null, {
      status: step.status,
      headers: step.location ? { location: step.location } : {},
    })
  }
  try {
    return { result: await invoke(), calls }
  } finally {
    globalThis.fetch = previous
  }
}

export async function run() {
  const v = verdicts()
  const INTERNAL = 'http://127.0.0.1:8399/internal/admin'

  /* (a) v-mpred's exact repro: allowlisted URL 302s to an internal target. */
  {
    const { result, calls } = await withScriptedFetch([
      { status: 302, location: INTERNAL },
      { status: 200, body: MP_ARTICLE }, // would-be internal response; must never serve
    ], () => fetchMpArticle(MP))
    v.check('loopback-redirect-not-mp-url',
      result?.ok === false && result?.reason === 'not-mp-url',
      `result=${JSON.stringify(result)}`)
    v.check('loopback-never-fetched',
      calls.length === 1 && calls[0] === MP && !calls.includes(INTERNAL),
      `calls=${calls.join(',')}`)
  }

  /* (b) https→http downgrade on the allowlisted host itself. */
  {
    const { result, calls } = await withScriptedFetch([
      { status: 302, location: 'http://mp.weixin.qq.com/s/abc123' },
      { status: 200, body: MP_ARTICLE },
    ], () => fetchMpArticle(MP))
    v.check('downgrade-not-mp-url', result?.reason === 'not-mp-url', `result=${JSON.stringify(result)}`)
    v.check('downgrade-hop-never-fetched', calls.length === 1)
  }

  /* (c) Protocol-relative escape to cloud metadata //169.254.169.254. */
  {
    const { result, calls } = await withScriptedFetch([
      { status: 302, location: '//169.254.169.254/latest/meta-data' },
    ], () => fetchMpArticle(MP))
    v.check('protocol-relative-not-mp-url', result?.reason === 'not-mp-url', `result=${JSON.stringify(result)}`)
    v.check('metadata-never-fetched',
      calls.length === 1 && !calls.some(u => u.includes('169.254.169.254')))
  }

  /* (d) javascript: Location. */
  {
    const { result, calls } = await withScriptedFetch([
      { status: 302, location: 'javascript:alert(1)' },
    ], () => fetchMpArticle(MP))
    v.check('javascript-location-rejected',
      result?.ok === false && (result?.reason === 'not-mp-url' || result?.reason === 'fetch-failed'),
      `result=${JSON.stringify(result)}`)
    v.check('javascript-never-fetched', calls.length === 1)
  }

  /* (e) Off-host lookalike mp.weixin.qq.com.evil.com. */
  {
    const { result, calls } = await withScriptedFetch([
      { status: 302, location: 'https://mp.weixin.qq.com.evil.com/s/x' },
      { status: 200, body: MP_ARTICLE },
    ], () => fetchMpArticle(MP))
    v.check('lookalike-host-not-mp-url', result?.reason === 'not-mp-url', `result=${JSON.stringify(result)}`)
    v.check('lookalike-never-fetched', calls.length === 1)
  }

  /* (f) Direct non-mp initial URL — refused before ANY request. */
  {
    const { result, calls } = await withScriptedFetch([
      { status: 200, body: MP_ARTICLE },
    ], () => fetchMpArticle(INTERNAL))
    v.check('initial-internal-not-mp-url', result?.reason === 'not-mp-url', `result=${JSON.stringify(result)}`)
    v.check('initial-url-zero-fetch', calls.length === 0)
  }

  /* (g) Controls: a direct article succeeds; an mp→mp redirect chain works. */
  {
    const { result, calls } = await withScriptedFetch([
      { status: 200, body: MP_ARTICLE },
    ], () => fetchMpArticle(MP))
    v.check('control-direct-article-ok', result?.ok === true && calls.length === 1,
      `ok=${result?.ok} calls=${calls.length}`)
  }
  {
    const next = 'https://mp.weixin.qq.com/s/def456'
    const { result, calls } = await withScriptedFetch([
      { status: 302, location: next },
      { status: 200, body: MP_ARTICLE },
    ], () => fetchMpArticle(MP))
    v.check('control-mp-hop-followed',
      result?.ok === true && calls.length === 2 && calls[1] === next,
      `ok=${result?.ok} calls=${calls.join(',')}`)
  }

  return v.result('not-mp-url')
}
