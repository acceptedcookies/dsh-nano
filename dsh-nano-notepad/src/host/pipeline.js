/**
 * pipeline.js — notepad fx 管线的 s3/claim 签名面。
 *
 * 语义无共享桶直读（A3）：管线态独桶操作，客户端只发 op+key，
 * 签名与凭证全留宿主（不侧载）。claim 语义复刻 dsh-nano-shared-workspace
 * session-io 的 acquireClaim/renewClaim（pipeline-claim.js）。
 *
 * 目标桶解析顺序：
 *   1. 请求级 `target` 覆盖 {endpoint,region,bucket,prefix,token|accessKey}（测试面）
 *   2. process.env 的 S3_NOTEPAD_*（同 .env.s3 种子面）
 *   3. ${DSH_HOME}/nano-notepad.env 的 S3_NOTEPAD_*（同 s3-sync 的种子文件面）
 * 三者均无 → not-configured。
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { createS3 } from './pipeline-s3.js'
import { acquireClaim, renewClaim, releaseClaim, readClaim } from './pipeline-claim.js'

const DEFAULT_PREFIX = 'pipeline'

function messageOf(value) { return value instanceof Error ? value.message : String(value) }

function parseEnvFile(text) {
  const out = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return out
}

/** Load S3_NOTEPAD_* from process.env, else ${DSH_HOME}/nano-notepad.env (s3-sync 同种子). */
function notepadEnvTarget() {
  let source = process.env
  if (!source.S3_NOTEPAD_ACCESS_KEY && !source.S3_NOTEPAD_TOKEN) {
    try {
      const file = join(process.env.DSH_HOME || process.env.HOME || '.', 'nano-notepad.env')
      source = parseEnvFile(readFileSync(file, 'utf8'))
    } catch {
      return null
    }
  }
  const endpoint = source.S3_NOTEPAD_ENDPOINT
  const bucket = source.S3_NOTEPAD_BUCKET
  const token = source.S3_NOTEPAD_TOKEN
  const accessKey = source.S3_NOTEPAD_ACCESS_KEY
  const secretKey = source.S3_NOTEPAD_SECRET_KEY
  if (!endpoint || !bucket || (!token && !accessKey)) return null
  const identity = accessKey
    ? { accessKey, token: secretKey }
    : { token }
  return {
    config: {
      endpoint,
      region: source.S3_NOTEPAD_REGION || 'shv1',
      bucket,
      prefix: source.S3_NOTEPAD_PIPELINE_PREFIX || DEFAULT_PREFIX,
    },
    identity,
  }
}

/** Build the pipeline s3 client off a request override or the notepad env seed. */
async function s3Target(ctx, override) {
  if (override && typeof override === 'object') {
    const { endpoint, region = 'shv1', bucket, prefix = DEFAULT_PREFIX, token, accessKey } = override
    if (!endpoint || !bucket || (!token && !accessKey)) throw new Error('target requires endpoint/bucket + token or accessKey')
    const identity = accessKey ? { accessKey, token } : { token }
    return createS3({ endpoint, region, bucket, prefix }, identity)
  }
  const env = notepadEnvTarget()
  if (env) return createS3(env.config, env.identity)
  // Last resort: DSH_NSW_IDENTITY against the notepad scoped vhost is NOT
  // substituted — the notepad bucket has its own scoped account. Missing
  // seed → not-configured rather than cross-credentialing (不侧载).
  const credentials = ctx.get('credentials')
  if (credentials) {
    const resolved = await credentials.resolve('DSH_NP_PIPELINE_IDENTITY')
    if (resolved !== undefined) {
      const raw = typeof resolved === 'object' && 'value' in resolved ? resolved.value : resolved
      const identity = typeof raw === 'string' ? JSON.parse(raw) : raw
      return createS3({ endpoint: 'https://nano-notepad.saobao.com', region: 'shv1', bucket: 'dsh-nano-notepad-test', prefix: DEFAULT_PREFIX }, identity)
    }
  }
  throw new Error('pipeline s3 is not configured (S3_NOTEPAD_* / DSH_NP_PIPELINE_IDENTITY)')
}

function sendJson(res, code, body) {
  res.statusCode = code
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.end(JSON.stringify(body))
}

async function readJsonBody(req, limit) {
  const chunks = []
  let size = 0
  for await (const c of req) {
    size += c.length
    if (limit !== undefined && size > limit) throw new Error('request body too large')
    chunks.push(c)
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { return {} }
}

/**
 * POST /nano-notepad/pipeline/s3 — {op, key?, under?, body?|bodyB64?, ifMatch?, ifNoneMatch?, target?}
 * `body` is JSON (putJson), `bodyB64` is base64 bytes (putBytes) for sqlite export.
 */
export function pipelineS3Handler(ctx) {
  return async (req, res, route) => {
    try {
      const body = await readJsonBody(req, route?.bodyLimit)
      const s3 = await s3Target(ctx, body.target)
      const op = String(body.op ?? '')
      const key = typeof body.key === 'string' ? body.key : undefined
      const out = {}
      switch (op) {
        case 'put': {
          if (key === undefined) throw new Error('put requires key')
          const extra = {}
          if (typeof body.ifMatch === 'string') extra.ifMatch = body.ifMatch
          if (typeof body.ifNoneMatch === 'string') extra.ifNoneMatch = body.ifNoneMatch
          if (body.bodyB64 !== undefined) {
            out.result = await s3.putBytes(key, Buffer.from(body.bodyB64, 'base64'), extra)
          } else {
            out.result = await s3.putJson(key, body.body ?? {}, extra)
          }
          break
        }
        case 'get': {
          if (key === undefined) throw new Error('get requires key')
          if (body.format === 'bytes') {
            const bytes = await s3.getBytes(key)
            out.result = bytes === undefined ? null : { bodyB64: bytes.toString('base64') }
          } else {
            const meta = body.withMeta === true
            const value = await s3.getJson(key, { withMeta: meta })
            out.result = value === undefined ? null : value
          }
          break
        }
        case 'del': {
          if (key === undefined) throw new Error('del requires key')
          await s3.del(key)
          out.result = { ok: true }
          break
        }
        case 'list': {
          out.result = await s3.list(String(body.under ?? ''))
          break
        }
        case 'head': {
          // getJson-with-meta stands in: etag is the CAS token the pipeline needs.
          if (key === undefined) throw new Error('head requires key')
          const got = await s3.getJson(key, { withMeta: true })
          out.result = got === undefined ? null : { etag: got.etag }
          break
        }
        default: throw new Error(`unknown pipeline op: ${op}`)
      }
      sendJson(res, 200, { ok: true, ...out })
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 200) })
    }
  }
}

/**
 * POST /nano-notepad/rpc — A3 跨插件读面（内部 MCP/RPC）。
 * 只读、白名单方法；语料真源是独桶的发布面（pipeline.db / manifest / kb-* /
 * corpus-manifest），不是页面 IDB（宿主够不到、也不该够到——单一真源）。
 * 签名/凭证全留宿主；调用方只给 method+params，不碰 s3 键之外的任何面。
 *
 * 白名单方法（read-only）：
 *   manifest.get        → {manifest}  管线发布清单（etag/sha256/updatedAt）
 *   corpus.list         → [{key,size,etag?}]  corpus-manifest + kb-* 键清单
 *   corpus.read         → {key,bodyB64|body}  拉一个已发布键（kb-*、art-*、sqlite 前缀）
 *   lsrag.manifest      → {manifest}  同 manifest.get（语义别名，分层检索入口）
 *   claim.read          → {value,etag}  claim 租约读（不持锁、只观察）
 */
const RPC_METHODS = new Set(['manifest.get', 'corpus.list', 'corpus.read', 'lsrag.manifest', 'claim.read'])
const RPC_READ_KEYS = /^(kb-|art-|sqlite\/|claims\/|corpus-manifest|pipeline-manifest)[A-Za-z0-9._/-]*$/

export function pipelineRpcHandler(ctx) {
  return async (req, res, route) => {
    try {
      const body = await readJsonBody(req, route?.bodyLimit)
      const s3 = await s3Target(ctx, body.target)
      const method = String(body.method ?? '')
      const params = body.params && typeof body.params === 'object' ? body.params : {}
      if (!RPC_METHODS.has(method)) {
        sendJson(res, 200, { ok: false, reason: 'unknown-method', method })
        return
      }
      let result
      switch (method) {
        case 'manifest.get':
        case 'lsrag.manifest': {
          const got = await s3.getJson('sqlite/manifest.json', { withMeta: true }).catch(() => undefined)
          result = got === undefined ? null : { value: got.value, etag: got.etag }
          break
        }
        case 'corpus.list': {
          const under = typeof params.under === 'string' ? params.under : ''
          /* 空桶 LIST 返回 NoSuchKey 404——对读面是「无已发布键」，非错误。 */
          result = await s3.list(under).catch(error => /HTTP 404|NoSuchKey/.test(messageOf(error)) ? [] : Promise.reject(error))
          break
        }
        case 'corpus.read': {
          const key = String(params.key ?? '')
          if (!RPC_READ_KEYS.test(key)) { result = { denied: `key outside read allowlist: ${key}` }; break }
          if (params.format === 'bytes') {
            const bytes = await s3.getBytes(key)
            result = bytes === undefined ? null : { key, bodyB64: bytes.toString('base64') }
          } else {
            const meta = params.withMeta === true
            result = await s3.getJson(key, { withMeta: meta }) ?? null
          }
          break
        }
        case 'claim.read': {
          const key = String(params.key ?? '')
          if (!SESSION_ID_RE_RPC.test(key)) { result = { denied: 'schema:badKey' }; break }
          result = await readClaim(s3, key) ?? null
          break
        }
      }
      sendJson(res, 200, { ok: true, result })
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 200) })
    }
  }
}
const SESSION_ID_RE_RPC = /^[A-Za-z0-9_-]{1,128}$/

/** POST /nano-notepad/pipeline/claim — {op:'acquire'|'renew'|'read'|'release', key, writerId} */
export function pipelineClaimHandler(ctx) {
  return async (req, res, route) => {
    try {
      const body = await readJsonBody(req, route?.bodyLimit)
      const s3 = await s3Target(ctx, body.target)
      const op = String(body.op ?? '')
      const key = String(body.key ?? '')
      const writerId = String(body.writerId ?? 'notepad-fx')
      let result
      switch (op) {
        case 'acquire': result = await acquireClaim(s3, key, writerId); break
        case 'renew': result = await renewClaim(s3, key, writerId); break
        case 'read': result = await readClaim(s3, key); break
        case 'release': result = await releaseClaim(s3, key, writerId); break
        default: throw new Error(`unknown claim op: ${op}`)
      }
      sendJson(res, 200, { ok: true, result })
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 200) })
    }
  }
}
