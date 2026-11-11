/** AWS Signature Version 4 signing — self-contained, no SDK.
 *  Supports the subset S3 needs: Authorization-header signing with
 *  x-amz-content-sha256 payload hashing, optional session token, and
 *  query params (used by ListObjectsV2). Tested against the canonical
 *  algorithm shape; payload hash comes from the caller so streaming
 *  bodies can reuse `UNSIGNED-PAYLOAD` semantics if ever needed. */
import { createHmac, createHash } from 'node:crypto'

const encoder = new TextEncoder()

/** @param {Uint8Array|string} data @returns {string} lowercase hex sha256 */
export function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex')
}

const EMPTY_PAYLOAD = sha256Hex('')

/** URI-encode per SigV4 (unreserved chars only). Path segments keep '/'. */
function uriEncode(input, encodeSlash) {
  let out = ''
  for (const byte of encoder.encode(input)) {
    const c = String.fromCharCode(byte)
    if (/[A-Za-z0-9\-._~]/.test(c) || (c === '/' && !encodeSlash)) out += c
    else out += '%' + byte.toString(16).toUpperCase().padStart(2, '0')
  }
  return out
}

/** Canonical query string: sorted by encoded key then encoded value. */
function canonicalQuery(params) {
  if (!params) return ''
  return Object.entries(params)
    .flatMap(([key, value]) => (Array.isArray(value) ? value : [value]).map(v => [uriEncode(String(key), true), uriEncode(String(v ?? ''), true)]))
    .sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0) : a[0] < b[0] ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join('&')
}

function hmac(key, data) {
  return createHmac('sha256', key).update(data).digest()
}

/**
 * Sign one request.
 * @param {object} args
 * @param {string} args.method HTTP method.
 * @param {string} args.path canonical URI path, already unencoded ('/'-separated segments are encoded individually, slashes kept).
 * @param {Record<string, string|string[]|undefined>} [args.query] query parameters.
 * @param {string} args.host Host header value.
 * @param {Record<string, string>} [args.headers] extra signed headers (content-type etc.); x-amz-date and x-amz-content-sha256 are added here.
 * @param {Uint8Array|string} [args.payload] body for hashing (default empty).
 * @param {string} args.region
 * @param {string} args.service e.g. 's3'.
 * @param {string} args.accessKeyId
 * @param {string} args.secretAccessKey
 * @param {string} [args.sessionToken]
 * @param {boolean} [args.includePayloadHash] emit x-amz-content-sha256 as a signed header (default true; S3 requires it, other services like IAM must omit it).
 * @param {Date} [args.now] signing time (defaults to new Date()).
 * @returns {{ headers: Record<string,string>, signedHeaders: string }}
 */
export function signRequest({ method, path, query, host, headers = {}, payload, region, service, accessKeyId, secretAccessKey, sessionToken, includePayloadHash = true, now = new Date() }) {
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const payloadHash = payload === undefined ? EMPTY_PAYLOAD : sha256Hex(payload)

  const signed = new Map()
  for (const [name, value] of Object.entries(headers)) signed.set(name.toLowerCase().trim(), String(value).trim())
  signed.set('host', host)
  signed.set('x-amz-date', amzDate)
  if (includePayloadHash) signed.set('x-amz-content-sha256', payloadHash)
  if (sessionToken) signed.set('x-amz-security-token', sessionToken)

  const names = [...signed.keys()].sort()
  const canonicalHeaders = names.map(n => `${n}:${signed.get(n).replace(/\s+/g, ' ')}\n`).join('')
  const signedHeaders = names.join(';')

  const canonicalRequest = [
    method.toUpperCase(),
    uriEncode(path.startsWith('/') ? path : `/${path}`, false),
    canonicalQuery(query),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${dateStamp}/${region}/${service}/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n')

  const kDate = hmac(`AWS4${secretAccessKey}`, dateStamp)
  const kRegion = hmac(kDate, region)
  const kService = hmac(kRegion, service)
  const kSigning = hmac(kService, 'aws4_request')
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex')

  const out = {}
  for (const [name, value] of Object.entries(headers)) out[name] = value
  out['x-amz-date'] = amzDate
  if (includePayloadHash) out['x-amz-content-sha256'] = payloadHash
  if (sessionToken) out['x-amz-security-token'] = sessionToken
  out['authorization'] = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  return { headers: out, signedHeaders }
}
