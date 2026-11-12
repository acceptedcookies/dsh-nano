/** dsh-fx-spike-scaffold — spike-only host plugin for test/spike/notepad-wasm-fx.
 *
 * Proves three seams on the real dsh-dev instance, without touching product
 * code:
 *   1. `ctx.llm` is injectable into a third-party plugin and exposes the same
 *      provider/model registry model-selector reads.
 *   2. `ctx.llm.prepareCall(...).stream(GenerateOptions)` runs on a real
 *      provider (magpie) and yields StreamChunk that a bridge can translate to
 *      OpenAI `chat.completion.chunk` SSE — the only protocol libfx's custom
 *      provider speaks.
 *   3. `fx-core.wasm` can be distributed as a same-origin static asset behind
 *      requestRejection, and the libfx browser ESM surface can be served the
 *      same way for the spike harness.
 *
 * Removed with `dsh plugin --profile web remove dsh-fx-spike-scaffold`.
 */

import { createReadStream, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createS3 } from './lib/spike-s3.js'
import { acquireClaim, renewClaim, readClaim, releaseClaim } from './lib/spike-claim.js'

export const name = 'fx-spike-scaffold'
export const inject = ['webServer', 'connection', 'llm', 'attachments', 'credentials']

const HERE = fileURLToPath(new URL('.', import.meta.url))
const WASM_PATH = join(HERE, 'lib', 'fx-core.wasm')
const FX_LIB_DIR = join(HERE, 'lib', 'fx')

const WASM_ROUTE = '/nano-fx-spike/fx-core.wasm'
const MODELS_ROUTE = '/nano-fx-spike/models'
const CHAT_ROUTE = '/nano-fx-spike/chat/completions'
// ESM surface for the page harness: /nano-fx-spike/sdk/<basename>.js
const SDK_PREFIX = '/nano-fx-spike/sdk'
// V-17/V-18: sqlite-2-s3 round-trip + claim-on-run/artifact-key tests.
// Scratch prefix inside the shared-workspace bucket keeps spike objects isolated.
const S3_ROUTE = '/nano-fx-spike/s3'
const CLAIM_ROUTE = '/nano-fx-spike/claim'
const SPIKE_PREFIX = 'nano-fx-spike'

const MIME = {
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.wasm': 'application/wasm',
  '.json': 'application/json; charset=utf-8',
}

function sendJson(res, status, body) {
  if (res.writableEnded || res.destroyed) return
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(body))
}

function messageOf(value) {
  return value instanceof Error ? value.message : String(value)
}

/** requestRejection fence, mirrors lib/route-guard.js behavior. */
function admit(ctx, req, res) {
  const conn = ctx.get('connection')
  const rejection = conn?.requestRejection?.(req)
  if (rejection !== undefined) {
    res.statusCode = rejection
    res.end()
    return false
  }
  return true
}

/** Bounded JSON body reader. */
async function readBody(req, maxBytes = 1 << 21) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > maxBytes) throw new Error('body-too-large')
    chunks.push(chunk)
  }
  const text = Buffer.concat(chunks).toString('utf8')
  return text === '' ? {} : JSON.parse(text)
}

/* ------------------------------------------------------------------ */
/* GET /nano-fx-spike/fx-core.wasm — static wasm delivery               */
/* ------------------------------------------------------------------ */

function wasmHandler() {
  let cached = null
  return (req, res) => {
    if (req.method === 'HEAD') {
      res.setHeader('content-type', 'application/wasm')
      res.setHeader('content-length', String(statSync(WASM_PATH).size))
      res.end()
      return
    }
    if (cached === null) cached = statSync(WASM_PATH)
    res.statusCode = 200
    res.setHeader('content-type', 'application/wasm')
    res.setHeader('content-length', String(cached.size))
    res.setHeader('cache-control', 'public, max-age=60')
    createReadStream(WASM_PATH).pipe(res)
  }
}

/* ------------------------------------------------------------------ */
/* GET /nano-fx-spike/sdk/<file> — serve libfx ESM for the page harness */
/* ------------------------------------------------------------------ */

function sdkHandler() {
  return (req, res) => {
    const raw = String(req.url ?? '').split('?')[0]
    const file = basename(raw)
    const path = join(FX_LIB_DIR, file)
    // no path traversal: basename strips directories; must live under lib/fx
    if (!path.startsWith(FX_LIB_DIR)) { sendJson(res, 400, { ok: false, reason: 'bad-path' }); return }
    let st
    try { st = statSync(path) } catch { sendJson(res, 404, { ok: false, reason: 'not-found' }); return }
    if (!st.isFile()) { sendJson(res, 404, { ok: false, reason: 'not-found' }); return }
    res.statusCode = 200
    res.setHeader('content-type', MIME[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream')
    res.setHeader('content-length', String(st.size))
    res.setHeader('cache-control', 'public, max-age=60')
    createReadStream(path).pipe(res)
  }
}

/* ------------------------------------------------------------------ */
/* GET /nano-fx-spike/models — catalog mirror + provider~model keys      */
/* ------------------------------------------------------------------ */

async function buildCatalog(ctx) {
  const providers = ctx.llm.listProviders()
  const settled = await Promise.all(providers.map(async provider => {
    try {
      const models = await ctx.llm.listModels(provider.id)
      if (models.length === 0) return { group: null, failure: null }
      const entries = await Promise.all(models.map(async model => {
        let resolved
        try { resolved = await ctx.llm.resolveModelInfo(provider.id, model.id) } catch { resolved = undefined }
        return {
          id: model.id,
          composite: `${provider.id}~${model.id}`,
          name: model.name,
          ...(resolved?.context?.contextWindow !== undefined ? { contextWindow: resolved.context.contextWindow } : {}),
          ...(resolved?.defaultMaxTokens !== undefined ? { maxTokens: resolved.defaultMaxTokens } : {}),
          ...(resolved?.inputModalities !== undefined ? { inputModalities: [...resolved.inputModalities] } : {}),
          ...(resolved?.reasoning !== undefined ? { reasoning: resolved.reasoning } : {}),
        }
      }))
      return { group: { id: provider.id, name: provider.name, models: entries }, failure: null }
    } catch (error) {
      return { group: null, failure: { id: provider.id, name: provider.name, message: messageOf(error) } }
    }
  }))
  const groups = []
  const failures = []
  for (const r of settled) {
    if (r.group !== null) groups.push(r.group)
    if (r.failure !== null) failures.push(r.failure)
  }
  return { groups, failures }
}

const abortState = { lastAbort: null, reqClose: 0, reqAborted: 0, resClose: 0, resFinish: 0 }

function modelsHandler(ctx) {
  let cache = null
  let inflight = null
  const TTL = 15000
  const build = () => {
    if (inflight === null) inflight = buildCatalog(ctx).finally(() => { inflight = null })
    return inflight
  }
  return async (req, res) => {
    try {
      if (cache === null || Date.now() - cache.at > TTL) cache = { at: Date.now(), payload: await build() }
      sendJson(res, 200, { ...cache.payload, generatedAt: cache.at, lastAbort: abortState.lastAbort ?? null, lifecycle: { reqClose: abortState.reqClose, reqAborted: abortState.reqAborted, resClose: abortState.resClose, resFinish: abortState.resFinish } })
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: messageOf(error) })
    }
  }
}

/* ------------------------------------------------------------------ */
/* POST /nano-fx-spike/chat/completions — OpenAI → GenerateOptions,     */
/* StreamChunk → OpenAI chat.completion.chunk SSE                       */
/* ------------------------------------------------------------------ */

/** OpenAI content → ContentBlock[]. Image parts need ctx.attachments (V-13). */
async function contentBlocks(content, attachments) {
  if (content === undefined || content === null) return []
  if (typeof content === 'string') return content === '' ? [] : [{ type: 'text', text: content }]
  if (Array.isArray(content)) {
    const blocks = []
    for (const part of content) {
      if (part?.type === 'text' && typeof part.text === 'string') {
        blocks.push({ type: 'text', text: part.text })
      } else if (part?.type === 'image_url' && part.image_url?.url) {
        blocks.push(await imageBlock(part.image_url.url, attachments))
      }
      // file parts: deferred
    }
    return blocks
  }
  return []
}

/** OpenAI image_url → {type:'image', attachment:ImageAttachmentRef} via ctx.attachments. */
async function imageBlock(url, attachments) {
  let bytes, mediaType
  if (url.startsWith('data:')) {
    const head = url.slice(5, url.indexOf(','))
    mediaType = head.split(';')[0]
    bytes = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64')
  } else {
    // Remote fetch — same-origin / declared targets only; spike is dev-local.
    const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })
    if (!resp.ok) throw new Error(`image fetch failed: HTTP ${resp.status}`)
    mediaType = resp.headers.get('content-type')?.split(';')[0] ?? 'image/png'
    bytes = Buffer.from(await resp.arrayBuffer())
    if (bytes.length > 20 * 1024 * 1024) throw new Error('image exceeds 20MB')
  }
  if (!attachments?.saveImage) throw new Error('attachments service unavailable')
  const ref = await attachments.saveImage({ data: new Uint8Array(bytes), mediaType })
  return { type: 'image', attachment: ref }
}

/** OpenAI tool message → tool-role Message. */
async function toolResultMessage(m, attachments) {
  return {
    role: 'tool',
    content: await contentBlocks(m.content, attachments),
    toolCallId: m.tool_call_id,
    isError: false,
    source: { kind: 'tool', callId: m.tool_call_id },
  }
}

/** OpenAI messages[] → RequestMessage[] (+ leading system → options.system). */
async function toRequestMessages(messages, attachments) {
  const out = []
  for (const m of messages ?? []) {
    if (m.role === 'system') continue // folded into options.system
    if (m.role === 'tool') { out.push(await toolResultMessage(m, attachments)); continue }
    if (m.role === 'assistant') {
      const content = await contentBlocks(m.content, attachments)
      for (const call of m.tool_calls ?? []) {
        content.push({ type: 'tool-call', id: call.id, name: call.function?.name ?? '', arguments: call.function?.arguments ?? '' })
      }
      out.push({ role: 'assistant', content, source: { kind: 'model', provider: 'bridge', model: 'bridge' } })
      continue
    }
    // user / anything else: identity-free RequestUserInput
    out.push({ role: 'user', content: await contentBlocks(m.content, attachments) })
  }
  return out
}

/** OpenAI tools[] → ToolSchema[]. */
function toToolSchemas(tools) {
  return (tools ?? []).map(t => ({
    name: t.function?.name ?? '',
    description: t.function?.description ?? '',
    parameters: t.function?.parameters ?? { type: 'object', properties: {} },
  }))
}

const FINISH_MAP = {
  'stop': 'stop',
  'tool-calls': 'tool_calls',
  'max-tokens': 'length',
  'aborted': 'stop',
  'error': 'stop',
}

function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

function chatHandler(ctx) {
  return async (req, res) => {
    const body = await readBody(req)
    const modelField = String(body.model ?? '')
    const tilde = modelField.indexOf('~')
    if (tilde <= 0) { sendJson(res, 400, { ok: false, reason: 'model-key-format', detail: 'model must be <provider>~<model>' }); return }
    const provider = modelField.slice(0, tilde)
    const model = modelField.slice(tilde + 1)
    const messages = await toRequestMessages(body.messages, ctx.get('attachments'))
    const system = (body.messages ?? []).find(m => m.role === 'system')?.content
    const tools = toToolSchemas(body.tools)

    const ac = new AbortController()
    const abort = () => { if (!ac.signal.aborted) { abortState.lastAbort = { at: new Date().toISOString(), model: `${provider}~${model}` }; ac.abort() } }
    req.on('close', () => { abortState.reqClose++; abort() })
    req.on('aborted', () => { abortState.reqAborted++; abort() })
    res.on('close', () => { abortState.resClose++; abort() })
    res.on('finish', () => { abortState.resFinish++ })

    /** @type {any} */
    let prepared
    try {
      // Call-config scalars live in prepareCall, not stream(): stream(options)
      // must restate the exact prepared config or it throws
      // INVALID_PREPARED_CALL. Sampling values come from the OpenAI body.
      prepared = await ctx.llm.prepareCall({
        provider, model,
        ...(body.temperature === undefined ? {} : { temperature: body.temperature }),
        ...(body.max_tokens === undefined ? {} : { maxTokens: body.max_tokens }),
        ...(body.stop === undefined ? {} : { stop: Array.isArray(body.stop) ? body.stop : [body.stop] }),
      }, ac.signal)
    } catch (error) {
      sendJson(res, 502, { ok: false, reason: 'prepareCall', detail: messageOf(error), provider, model })
      return
    }

    res.statusCode = 200
    res.setHeader('content-type', 'text/event-stream; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.setHeader('connection', 'keep-alive')
    res.setHeader('x-accel-buffering', 'no')

    const id = `chatcmpl-spike-${Date.now().toString(36)}`
    const created = Math.floor(Date.now() / 1000)
    const chunk = (delta, finish = null, usage = undefined) => ({
      id, object: 'chat.completion.chunk', created,
      model: modelField,
      choices: [{ index: 0, delta, finish_reason: finish, logprobs: null }],
      ...(usage === undefined ? {} : { usage }),
    })

    sse(res, chunk({ role: 'assistant' }))

    // Per-block tool-call reassembly. ctx.llm's tool-call-delta index is a
    // BLOCK index (1 when reasoning precedes); OpenAI/fx index is a dense
    // 0-based tool-call ordinal, so remap through a slot table.
    const toolCalls = new Map()
    const slotOf = new Map() // blockIndex → dense tool_call index
    let nextSlot = 0
    let firstDelta = true
    let ended = false
    let lastUsage = undefined
    const finish = (reason) => {
      if (ended) return
      ended = true
      // finish chunk: finish_reason only (OpenAI semantics). fx treats
      // id/name/arguments as append-only, so resending them here would
      // double-append. Usage rides this final chunk so fx marks it final.
      sse(res, chunk({}, reason, lastUsage))
      res.write('data: [DONE]\n\n')
      res.end()
      // listeners stay (they only bump counters / call a once-guarded abort)
    }

    try {
      // stream(options) is callConfigEquals-compared against prepared.config:
      // adapter-resolved defaults (reasoningEffort, maxTokens) must be restated,
      // so spread the resolved config and let body-derived fields ride along.
      const stream = prepared.stream({
        ...prepared.config,
        provider, model,
        messages,
        ...(system === undefined ? {} : { system: typeof system === 'string' ? system : (await contentBlocks(system, ctx.get('attachments'))).filter(b => b.type === 'text').map(b => b.text).join('\n') }),
        ...(tools.length === 0 ? {} : { tools }),
        signal: ac.signal,
      })
      for await (const c of stream) {
        if (ended) break
        switch (c.type) {
          case 'block-start':
            if (firstDelta) { firstDelta = false }
            break
          case 'text-delta':
            sse(res, chunk({ content: c.text }))
            break
          case 'reasoning-delta':
            sse(res, chunk({ reasoning_content: c.text }))
            break
          case 'tool-call-delta': {
            let slot = slotOf.get(c.index)
            const fresh = slot === undefined
            if (fresh) { slot = nextSlot++; slotOf.set(c.index, slot) }
            let tc = toolCalls.get(slot)
            if (tc === undefined) { tc = { id: c.id, name: '', arguments: '' }; toolCalls.set(slot, tc) }
            if (c.name !== undefined) tc.name += c.name
            tc.arguments += c.argumentsDelta ?? ''
            // fx's parser APPENDS id/name/arguments across deltas: identity
            // fields go on the first delta of a call only, exactly like OpenAI.
            sse(res, chunk({ tool_calls: [{
              index: slot,
              ...(fresh ? { id: c.id, type: 'function' } : {}),
              function: {
                ...(c.name !== undefined ? { name: c.name } : {}),
                arguments: c.argumentsDelta ?? '',
              },
            }] }))
            break
          }
          case 'block-end':
            // block content already streamed as deltas; nothing extra
            break
          case 'usage':
            // fx marks usage fields final only when they ride the finish
            // chunk, so buffer the last usage and emit it there.
            // fx's accept_usage REQUIRES total == prompt + completion. Some
            // providers count reasoning separately (deepseek: 333 ≠ 166+39),
            // so emit the exact-sum total, not the provider's number.
            lastUsage = {
              prompt_tokens: c.usage.inputTokens,
              completion_tokens: c.usage.outputTokens,
              total_tokens: c.usage.inputTokens + c.usage.outputTokens,
              ...(c.usage.reasoningTokens === undefined ? {} : { completion_tokens_details: { reasoning_tokens: c.usage.reasoningTokens } }),
            }
            break
          case 'finish': {
            const kind = c.reason?.kind ?? 'stop'
            finish(FINISH_MAP[kind] ?? 'stop')
            break
          }
          default:
            break
        }
      }
      if (!ended) finish('stop')
    } catch (error) {
      if (!ended) {
        sse(res, { error: { message: messageOf(error), type: 'bridge-error' } })
        finish('stop')
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* V-17/V-18: s3 manifest + claim routes                                */
/* ------------------------------------------------------------------ */

/** Lazily build the mini s3 client off the dev instance's DSH_NSW_IDENTITY.
 *  `override` (optional, request-scoped): {endpoint,region,bucket,prefix,token}
 *  lets a spike target a different bucket — e.g. the scoped notepad test
 *  bucket dsh-nano-notepad-test on vhost nano-notepad.saobao.com (path-style
 *  by construction: bucket rides the URL path). */
function s3Client(ctx) {
  return async (override) => {
    if (override && typeof override === 'object') {
      const { endpoint, region = 'shv1', bucket, prefix = SPIKE_PREFIX, token, accessKey } = override
      if (!endpoint || !bucket || (!token && !accessKey)) throw new Error('s3 override requires endpoint/bucket + token or accessKey')
      const keys = accessKey ? { accessKey, token } : { token }
      return createS3({ endpoint, region, bucket, prefix }, keys)
    }
    const credentials = ctx.get('credentials')
    if (!credentials) throw new Error('credentials service unavailable')
    const resolved = await credentials.resolve('DSH_NSW_IDENTITY')
    if (resolved === undefined) throw new Error('DSH_NSW_IDENTITY not in credential store')
    const raw = typeof resolved === 'object' && 'value' in resolved ? resolved.value : resolved
    const identity = typeof raw === 'string' ? JSON.parse(raw) : raw
    return createS3({ endpoint: 'https://nano-shared-workspace.saobao.com', region: 'shv1', bucket: 'dasw-1112-shared', prefix: SPIKE_PREFIX }, identity)
  }
}

async function readJsonBody(req) {
  const chunks = []
  for await (const c of req) chunks.push(c)
  const raw = Buffer.concat(chunks).toString('utf8')
  try { return JSON.parse(raw) } catch { return {} }
}

/** POST /nano-fx-spike/s3 — {op:'put'|'get'|'del'|'list', key, body?, ifMatch?, ifNoneMatch?} */
function s3Handler(ctx) {
  const client = s3Client(ctx)
  return async (req, res) => {
    const body = await readJsonBody(req)
    try {
      const s3 = await client(body.config)
      const op = body.op
      if (op === 'put') {
        const extra = {}
        if (typeof body.ifMatch === 'string') extra.ifMatch = body.ifMatch
        if (typeof body.ifNoneMatch === 'string') extra.ifNoneMatch = body.ifNoneMatch
        const bytes = Buffer.from(body.body ?? '', 'base64')
        const r = await s3.putBytes(body.key, bytes, extra)
        sendJson(res, 200, { ok: true, ...r })
      } else if (op === 'get') {
        const b = await s3.getBytes(body.key)
        sendJson(res, 200, { ok: true, found: b !== undefined, body: b ? b.toString('base64') : undefined })
      } else if (op === 'del') {
        await s3.del(body.key)
        sendJson(res, 200, { ok: true })
      } else if (op === 'list') {
        const r = await s3.list(body.key ?? '')
        sendJson(res, 200, { ok: true, ...r })
      } else if (op === 'getJson') {
        const r = await s3.getJson(body.key, body.withMeta ? { withMeta: true } : undefined)
        sendJson(res, 200, { ok: true, found: r !== undefined, value: r?.value ?? r, etag: r?.etag })
      } else if (op === 'putJson') {
        const extra = {}
        if (typeof body.ifMatch === 'string') extra.ifMatch = body.ifMatch
        if (typeof body.ifNoneMatch === 'string') extra.ifNoneMatch = body.ifNoneMatch
        const r = await s3.putJson(body.key, body.value, extra)
        sendJson(res, 200, { ok: true, ...r })
      } else {
        sendJson(res, 400, { ok: false, reason: 'bad-op', op })
      }
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: 's3-error', message: messageOf(error) })
    }
  }
}

/** POST /nano-fx-spike/claim — {op:'acquire'|'renew'|'read'|'release', key, writerId} */
function claimHandler(ctx) {
  const client = s3Client(ctx)
  return async (req, res) => {
    const body = await readJsonBody(req)
    try {
      const s3 = await client(body.config)
      const op = body.op
      if (op === 'acquire') sendJson(res, 200, await acquireClaim(s3, body.key, body.writerId ?? 'spike-a'))
      else if (op === 'renew') sendJson(res, 200, await renewClaim(s3, body.key, body.writerId ?? 'spike-a'))
      else if (op === 'read') sendJson(res, 200, await readClaim(s3, body.key))
      else if (op === 'release') { await releaseClaim(s3, body.key); sendJson(res, 200, { ok: true }) }
      else sendJson(res, 400, { ok: false, reason: 'bad-op', op })
    } catch (error) {
      sendJson(res, 500, { ok: false, reason: 'claim-error', message: messageOf(error) })
    }
  }
}

/* ------------------------------------------------------------------ */

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  const conn = ctx.get('connection')
  if (!conn) throw new Error('fx-spike-scaffold: no connection service (route fence required)')

  const routes = [
    { path: WASM_ROUTE, methods: ['GET', 'HEAD'], handler: wasmHandler() },
    { path: MODELS_ROUTE, methods: ['GET'], handler: modelsHandler(ctx) },
    { path: CHAT_ROUTE, methods: ['POST'], handler: chatHandler(ctx) },
    { path: SDK_PREFIX, methods: ['GET'], handler: sdkHandler(), prefix: true },
    { path: S3_ROUTE, methods: ['POST'], handler: s3Handler(ctx) },
    { path: CLAIM_ROUTE, methods: ['POST'], handler: claimHandler(ctx) },
  ]
  for (const { path, methods, handler, prefix } of routes) {
    const wrapped = async (req, res) => {
      if (!admit(ctx, req, res)) return
      if (!methods.includes(String(req.method ?? '').toUpperCase())) {
        res.statusCode = 405
        res.end(JSON.stringify({ ok: false, reason: 'method-not-allowed' }))
        return
      }
      try { await handler(req, res) } catch (error) {
        sendJson(res, 500, { ok: false, reason: 'failed', detail: messageOf(error) })
      }
    }
    ctx.effect(() => ctx.webServer.register({
      kind: prefix ? 'prefix' : 'exact',
      path, handler: wrapped,
    }), `fx-spike-scaffold: ${path}`)
  }
}
