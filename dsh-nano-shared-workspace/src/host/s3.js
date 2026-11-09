/**
 * A minimal SigV4 S3 client over global fetch — ListObjectsV2, PUT, GET.
 * Zero dependencies so the host bundle stays self-contained; `packages=external`
 * keeps Node's crypto/http builtins resolvable anyway.
 *
 * The endpoint sits behind Cloudflare: a non-descriptive User-Agent is
 * answered with `error code: 1010`, so every request carries the plugin UA.
 */

import { createHash, createHmac } from 'node:crypto'

const UA = 'dsh-nano-shared-workspace/0.1.0'

const sha256Hex = data => createHash('sha256').update(data).digest('hex')
const hmac = (key, data) => createHmac('sha256', key).update(data).digest()
const hmacHex = (key, data) => createHmac('sha256', key).update(data).digest('hex')

/** RFC3986-encode one path segment (S3 keeps '/' unencoded). */
const encodeSegment = s => encodeURIComponent(s).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

/**
 * Derive the signing pair from the stored identity.
 * Shape: `{token, accessKey}` — `accessKey` present means `token` is the
 * secret key; absent, `token` is `"AccessKey:SecretKey"`.
 */
function signingPair(identity) {
  if (typeof identity?.accessKey === 'string' && identity.accessKey !== '') {
    return { accessKey: identity.accessKey, secretKey: identity.token }
  }
  const token = identity?.token
  if (typeof token === 'string' && token.includes(':')) {
    const at = token.indexOf(':')
    return { accessKey: token.slice(0, at), secretKey: token.slice(at + 1) }
  }
  return undefined
}

/**
 * One signed request. `params` is the raw query map (list-type, prefix, …);
 * `body` is a Buffer/string payload.
 * @returns the fetch Response (caller checks .ok); never throws on HTTP errors.
 */
async function request(config, keys, method, keyPath, params = {}, body = undefined) {
  const url = new URL(config.endpoint.replace(/\/+$/, '') + '/' + keyPath.split('/').map(encodeSegment).join('/'))
  for (const [name, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(name, value)
  }
  const payload = body === undefined ? '' : body
  const payloadHash = sha256Hex(payload)
  const now = new Date()
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const dateStamp = amzDate.slice(0, 8)
  const host = url.host

  const headers = {
    host,
    'user-agent': UA,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  if (typeof config.sessionToken === 'string') headers['x-amz-security-token'] = config.sessionToken

  const signedNames = Object.keys(headers).sort()
  const canonicalHeaders = signedNames.map(n => `${n}:${headers[n]}\n`).join('')
  const signedHeaders = signedNames.join(';')
  const canonicalRequest = [
    method,
    url.pathname,
    // SigV4 wants the query already URL-encoded, key=value, sorted.
    [...url.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&'),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n')

  const scope = `${dateStamp}/${config.region}/s3/aws4_request`
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n')
  const kDate = hmac(`AWS4${keys.secretKey}`, dateStamp)
  const kRegion = hmac(kDate, config.region)
  const kService = hmac(kRegion, 's3')
  const kSigning = hmac(kService, 'aws4_request')
  const signature = hmacHex(kSigning, stringToSign)

  return fetch(url, {
    method,
    headers: {
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      'user-agent': UA,
      authorization: `AWS4-HMAC-SHA256 Credential=${keys.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: payload === '' ? undefined : payload,
  })
}

/** Build the signing pair or throw a settings-facing message. */
function keysOrThrow(identity) {
  const keys = signingPair(identity)
  if (keys === undefined || keys.secretKey === undefined || keys.secretKey === '') {
    throw new Error('token must be "AccessKey:SecretKey" or paired with the accessKey field')
  }
  return keys
}

const bucketPath = config => `${config.bucket}${config.prefix === '' ? '' : `/${config.prefix}`}`

/** Parse the first page of a ListObjectsV2 reply into key names + prefixes. */
function parseListXml(xml) {
  const pickAll = tag => [...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`, 'g'))].map(m => m[1])
  return {
    keys: pickAll('Key'),
    prefixes: pickAll('Prefix'),
    isTruncated: /<IsTruncated>true</.test(xml),
  }
}

export function createS3(config, identity) {
  const keys = keysOrThrow(identity)
  return {
    /** PUT a JSON object under the bucket prefix. */
    async putJson(key, value) {
      const res = await request(config, keys, 'PUT', `${bucketPath(config)}/${key}`, {}, JSON.stringify(value))
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`S3 PUT ${key} failed: HTTP ${res.status} ${body.slice(0, 200)}`)
      }
    },
    /** PUT raw bytes (session artifact slices). */
    async putBytes(key, buf) {
      const res = await request(config, keys, 'PUT', `${bucketPath(config)}/${key}`, {}, buf)
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`S3 PUT ${key} failed: HTTP ${res.status} ${body.slice(0, 200)}`)
      }
    },
    /** GET raw bytes; `undefined` when 404. */
    async getBytes(key) {
      const res = await request(config, keys, 'GET', `${bucketPath(config)}/${key}`)
      if (res.status === 404) return undefined
      if (!res.ok) throw new Error(`S3 GET ${key} failed: HTTP ${res.status}`)
      return Buffer.from(await res.arrayBuffer())
    },
    /** GET one object; `undefined` when 404. */
    async getJson(key) {
      const res = await request(config, keys, 'GET', `${bucketPath(config)}/${key}`)
      if (res.status === 404) return undefined
      if (!res.ok) throw new Error(`S3 GET ${key} failed: HTTP ${res.status}`)
      return res.json()
    },
    /** DELETE one object; 204/404 both mean "gone". */
    async del(key) {
      const res = await request(config, keys, 'DELETE', `${bucketPath(config)}/${key}`)
      if (!res.ok && res.status !== 404) {
        throw new Error(`S3 DELETE ${key} failed: HTTP ${res.status}`)
      }
    },
    /** List object keys and common prefixes under `prefix` (single page, v1 cap). */
    async list(prefix) {
      const res = await request(config, keys, 'GET', `${bucketPath(config)}/`, {
        'list-type': '2',
        delimiter: '/',
        'max-keys': '1000',
        prefix: `${config.prefix === '' ? '' : `${config.prefix}/`}${prefix}`,
      })
      if (!res.ok) {
        const body = await res.text()
        throw new Error(`S3 LIST ${prefix} failed: HTTP ${res.status} ${body.slice(0, 200)}`)
      }
      return parseListXml(await res.text())
    },
  }
}
