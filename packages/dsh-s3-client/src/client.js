/** Host-side S3 client: SigV4-signed fetch, token-bucket throttling, op ledger.
 *  No AWS SDK; every request goes through `createRateLimiter().acquire` and is
 *  recorded via `createLedger().recordOp`. The surface is deliberately the
 *  shared denominator of AWS S3 / Cloudflare R2 / MinIO — ListObjectsV2,
 *  ETag/If-Match on PUT, path-style fallback — nothing plugin-specific lives
 *  here (manifests, tombstones, and key layouts stay in the caller). */
import { signRequest, sha256Hex } from './sign.js'
import { createRateLimiter } from './rate.js'
import { createLedger } from './ledger.js'

/** Minimal XML text getter for S3's flat ListObjectsV2 shape. */
function xmlTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`))
  return match ? decodeXml(match[1]) : undefined
}

function xmlAll(xml, tag) {
  return [...xml.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map(m => decodeXml(m[1]))
}

function decodeXml(text) {
  /* MinIO emits ETag quotes as &#34; (numeric), not &quot;. Decode numeric
     entities first so a list result's etag is usable as an If-Match value. */
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
}

function encodeXml(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}

/* MinIO may answer with a weak ETag (W/"…"). If-Match requires a strong
   entity-tag, so strip both the W/ prefix and the quotes before a caller can
   use a returned etag for conditional writes. */
function cleanEtag(value) {
  return typeof value === 'string' ? value.replace(/^W\//, '').replaceAll('"', '') : null
}

export class S3Error extends Error {
  /** @param {string} op @param {number} status @param {string} body */
  constructor(op, status, body) {
    const code = xmlTag(body, 'Code') ?? `HTTP ${status}`
    const message = xmlTag(body, 'Message') ?? body.slice(0, 200)
    super(`s3 ${op} failed: ${code} ${message}`)
    this.name = 'S3Error'
    this.op = op
    this.status = status
    this.code = code
  }
}

/**
 * @param {object} config
 * @param {string} config.endpoint e.g. 'https://s3.us-east-1.amazonaws.com' or 'https://<acct>.r2.cloudflarestorage.com'.
 * @param {string} config.region signing region (R2 uses 'auto').
 * @param {string} config.bucket
 * @param {string} [config.prefix] key prefix applied by `key()` helper (no leading slash).
 * @param {string} config.accessKeyId
 * @param {string} config.secretAccessKey
 * @param {string} [config.sessionToken]
 * @param {boolean} [config.pathStyle] force `endpoint/bucket/key` instead of `bucket.endpoint/key` (MinIO, OSS).
 * @param {number} [config.requestTimeoutMs] per-request timeout (default 30s).
 * @param {Parameters<typeof createRateLimiter>[0]} [config.limits]
 * @param {string} [config.ledgerFile] enables the JSON ledger when set.
 * @param {typeof fetch} [config.fetchImpl] injectable for tests.
 * @param {(ms:number)=>Promise<void>} [config.sleep] injectable for tests.
 */
export function createS3Client(config) {
  const {
    endpoint, region, bucket, prefix = '', accessKeyId, secretAccessKey, sessionToken,
    pathStyle = false, requestTimeoutMs = 30000, limits = {}, ledgerFile,
    fetchImpl = globalThis.fetch?.bind(globalThis), sleep = ms => new Promise(r => setTimeout(r, ms)),
  } = config
  if (!endpoint || !region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('s3 client requires endpoint, region, bucket, accessKeyId, secretAccessKey')
  }
  if (!fetchImpl) throw new Error('s3 client needs a fetch implementation (Node >= 18)')
  const base = endpoint.replace(/\/+$/, '')
  const limiter = createRateLimiter(limits)
  const ledger = ledgerFile ? createLedger(ledgerFile) : null

  /** Joins an object key with the configured prefix. */
  const key = name => (prefix ? `${prefix.replace(/\/+$/, '')}/${name}` : name)

  /** Resolves the request URL and signing host for virtual-host vs path style. */
  function locate(objectKey) {
    if (pathStyle) return { url: `${base}/${bucket}/${objectKey}`, host: new URL(base).host, path: `/${bucket}/${objectKey}` }
    const host = `${bucket}.${new URL(base).host}`
    return { url: `https://${host}/${objectKey}`, host, path: `/${objectKey}` }
  }

  /**
   * Signed, throttled, ledgered request. Returns the fetch Response when the
   * status is < 300; throws S3Error with the parsed body otherwise.
   */
  async function request(op, method, objectKey, { query, headers = {}, body, unsignedOk = [] } = {}) {
    await limiter.acquire()
    try {
      const { url, host, path } = locate(objectKey)
      const signed = signRequest({
        method, path, query, host, headers,
        payload: body ?? new Uint8Array(0),
        region, service: 's3', accessKeyId, secretAccessKey, sessionToken,
      })
      const qs = query ? '?' + Object.entries(query).flatMap(([k, v]) => (Array.isArray(v) ? v : [v]).map(v => `${encodeURIComponent(k)}=${encodeURIComponent(v ?? '')}`)).join('&') : ''
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), requestTimeoutMs)
      let res
      try {
        res = await fetchImpl(url + qs, { method, headers: { host, ...headers, ...signed.headers }, body, signal: controller.signal })
      } finally {
        clearTimeout(timer)
      }
      ledger?.recordOp(op, { bytes: body?.byteLength ?? 0, up: method === 'PUT' })
      if (res.status >= 300) {
        if (unsignedOk.includes(res.status)) return res
        throw new S3Error(op, res.status, await res.text().catch(() => ''))
      }
      return res
    } finally {
      limiter.done()
      if (body?.byteLength) {
        const wait = limiter.chargeUpload(body.byteLength)
        if (wait > 0) await sleep(wait)
      }
    }
  }

  return {
    key,
    limiter,
    ledger,

    /** PUT one object. `ifMatch` carries an ETag for conditional writes (manifest CAS). */
    async putObject(name, body, { contentType = 'application/octet-stream', ifMatch, metadata } = {}) {
      const objectKey = key(name)
      const headers = { 'content-type': contentType, ...(ifMatch ? { 'if-match': ifMatch } : {}) }
      if (metadata) for (const [k, v] of Object.entries(metadata)) headers[`x-amz-meta-${k}`] = String(v)
      const res = await request('put', 'PUT', objectKey, { headers, body })
      return { etag: cleanEtag(res.headers.get('etag')), sha256: sha256Hex(body) }
    },

    /** GET one object; returns null on 404. */
    async getObject(name) {
      const res = await request('get', 'GET', key(name), { unsignedOk: [404] })
      if (res.status === 404) return null
      return { body: new Uint8Array(await res.arrayBuffer()), etag: cleanEtag(res.headers.get('etag')), contentType: res.headers.get('content-type') ?? 'application/octet-stream' }
    },

    /** HEAD one object; returns null on 404. */
    async headObject(name) {
      const res = await request('head', 'HEAD', key(name), { unsignedOk: [404] })
      if (res.status === 404) return null
      return { etag: cleanEtag(res.headers.get('etag')), bytes: Number(res.headers.get('content-length') ?? 0), contentType: res.headers.get('content-type') ?? 'application/octet-stream' }
    },

    async deleteObject(name) {
      await request('delete', 'DELETE', key(name))
    },

    /**
     * ListObjectsV2 under the configured prefix; paginates automatically.
     * @returns {Promise<{objects: Array<{key:string, bytes:number, etag:string, updatedAt:string}>, truncated:boolean}>}
     */
    async listObjects({ maxKeys = 1000, under } = {}) {
      const objects = []
      let truncated = false
      let token
      do {
        const query = { 'list-type': '2', 'max-keys': String(maxKeys), prefix: key(under ?? '') }
        if (token) query['continuation-token'] = token
        const res = await request('list', 'GET', '', { query })
        const xml = await res.text()
        for (const block of xmlAll(xml, 'Contents')) {
          const raw = xmlTag(block, 'Key')
          objects.push({ key: raw, bytes: Number(xmlTag(block, 'Size') ?? 0), etag: cleanEtag(xmlTag(block, 'ETag')) ?? '', updatedAt: xmlTag(block, 'LastModified') ?? '' })
        }
        truncated = xmlTag(xml, 'IsTruncated') === 'true'
        token = xmlTag(xml, 'NextContinuationToken')
      } while (truncated && token)
      return { objects, truncated }
    },

    /** Connectivity probe: write/delete a tiny object. Names are unprefixed —
     *  putObject/deleteObject apply `key()` themselves, so pre-keying here
     *  would double the prefix and leave the probe behind on failure. */
    async test() {
      const t0 = Date.now()
      const probe = `_probe-${t0}.txt`
      const put = await this.putObject(probe, new TextEncoder().encode('dsh-s3-probe'), { contentType: 'text/plain' })
      await this.deleteObject(probe)
      return { ok: true, latencyMs: Date.now() - t0, etag: put.etag }
    },

    /** Status payload for a /status route. */
    status() {
      return { bucket, endpoint, prefix, limits: limiter.stats(), ledger: ledger?.snapshot() ?? null }
    },
  }
}
