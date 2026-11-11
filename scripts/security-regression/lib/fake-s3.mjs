/**
 * fake-s3 — an in-process S3-compatible stub for replaying remote-data PoCs.
 *
 * SKELETON (P1-09): serves the object shapes the four plugins fetch so a PoC
 * can hand the host a malicious manifest/file/image/marker/session-meta/tree-head
 * without a real bucket. Supports ETag/If-None-Match/If-Match for the nsw
 * claim/renew CAS cases.
 *
 * Usage:
 *   const s3 = await startFakeS3({objects:{key:json|{body,etag,contentType}}})
 *   s3.url          // base URL to point the plugin's S3 endpoint at
 *   s3.set(key, body, {etag}) / s3.get(key) / s3.stop()
 */
import { createServer } from 'node:http'
import { createHash } from 'node:crypto'

const etagOf = body => `"${createHash('md5').update(typeof body === 'string' ? body : JSON.stringify(body)).digest('hex')}"`

/**
 * @param {{objects?: Record<string, unknown>, signedPrefix?: string}} opts
 * @returns {Promise<{url:string, set:Function, get:Function, stop:Function, hits:string[]}>}
 */
export async function startFakeS3({ objects = {}, signedPrefix = '/s3' } = {}) {
  const store = new Map(Object.entries(objects).map(([k, v]) => [k, normalize(v)]))
  const hits = []
  const server = createServer((req, res) => {
    const key = decodeURIComponent((req.url ?? '/').replace(new RegExp(`^${signedPrefix}/?`), '').split('?')[0])
    hits.push(`${req.method} ${key}`)
    const rec = store.get(key)
    const send = (status, body, headers = {}) => {
      const payload = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body)
      res.writeHead(status, { 'content-type': 'application/json', ...headers })
      res.end(payload)
    }
    if (req.method === 'GET' || req.method === 'HEAD') {
      if (rec === undefined) return send(404, { message: 'no such key' })
      if (req.headers['if-none-match'] === rec.etag) return send(304)
      return send(200, rec.body, { etag: rec.etag })
    }
    if (req.method === 'PUT') {
      if (req.headers['if-match'] && rec?.etag !== req.headers['if-match']) return send(412, { message: 'precondition failed' })
      let raw = ''
      req.on('data', c => raw += c)
      req.on('end', () => {
        const body = parseMaybe(raw)
        store.set(key, normalize(body))
        return send(200, { etag: store.get(key).etag }, { etag: store.get(key).etag })
      })
      return
    }
    send(405, { message: 'method' })
  })
  await new Promise(r => server.listen(0, '127.0.0.1', r))
  const url = `http://127.0.0.1:${server.address().port}${signedPrefix}`
  return {
    url,
    hits,
    set: (key, body, { etag } = {}) => store.set(key, { body, etag: etag ?? etagOf(body) }),
    get: key => store.get(key),
    stop: () => new Promise(r => server.close(r)),
  }
}

function normalize(v) { return { body: v, etag: etagOf(v) } }
function parseMaybe(s) { try { return JSON.parse(s) } catch { return s } }
