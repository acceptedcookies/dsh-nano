/**
 * page-fetch — minimal helpers for hitting a dsh-dev route from the harness.
 *
 * The guard rejects unauthenticated requests before a case's body is ever
 * evaluated; real PoC replay therefore needs the Harness page's authenticated
 * fetch. Two modes:
 *   - `fetchAsPage(base, token, path, init)` — a token-bearing fetch against the
 *     instance's web server (works for routes that only need a session token).
 *   - `fetchInPage(page, path, init)` — run `fetch` inside an already-open,
 *     already-authenticated browser page (ego-browser handle) for routes that
 *     also require the Peer connection (e.g. `connection.requestRejection`
 *     returns a Peer-dependent status).
 *
 * SKELETON (P1-09): fetchAsPage implemented; fetchInPage is a thin adapter the
 * spike scripts pass their browser `page` into.
 */
export async function fetchAsPage(base, token, path, init = {}) {
  const url = new URL(path, base)
  if (token && !url.searchParams.has('token')) url.searchParams.set('token', token)
  const headers = { 'content-type': 'application/json', ...(init.headers ?? {}) }
  const res = await fetch(url, { ...init, headers })
  let body = null
  try { body = await res.json() } catch { body = await res.text().catch(() => null) }
  return { status: res.status, headers: res.headers, body }
}

/**
 * Run a fetch inside an authenticated page context.
 * @param {object} page — an ego-browser / puppeteer-like page with evaluate()
 * @param {string} path — the route path
 * @param {RequestInit} init
 */
export async function fetchInPage(page, path, init = {}) {
  const json = await page.evaluate(async (p, i) => {
    const res = await fetch(p, i)
    let body = null
    try { body = await res.json() } catch { body = await res.text().catch(() => null) }
    return { status: res.status, body }
  }, path, init)
  return json
}
