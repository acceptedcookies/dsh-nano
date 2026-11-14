/**
 * fx-bridge.js — notepad fx 管线的 ctx.llm 桥（OpenAI 兼容面）。
 *
 * 合同复刻自 test/spike/notepad-wasm-fx/host-scaffold（V-03/V-13 实测面），
 * 语义不变：OpenAI chat.completions 请求 → ctx.llm.prepareCall(...).stream(GenerateOptions)
 * → SSE 翻译回 OpenAI 形态。页面内 libfx fx-core.wasm 把它当 OpenAI provider 消费。
 *
 * §7.3 六条合同：baseUrl 为同源路由；OpenAI→内部消息/工具翻译；StreamChunk→SSE；
 * 取消经 req/res close 传播；usage 补在 finish chunk 上且 total=prompt+completion。
 */

const FINISH_MAP = {
  'stop': 'stop',
  'tool-calls': 'tool_calls',
  'max-tokens': 'length',
  'aborted': 'stop',
  'error': 'stop',
}

function messageOf(value) { return value instanceof Error ? value.message : String(value) }

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

function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

/**
 * GET /nano-notepad/fx/models — provider~model 目录镜像。
 * 页面引擎据此挑档位；模型选择仍归 model-selector（本面只读 ctx.llm 清单）。
 */
export function modelsHandler(ctx) {
  return async (_req, res) => {
    const json = (code, body) => {
      res.statusCode = code
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(body))
    }
    try {
      const providers = ctx.llm.listProviders()
      const out = []
      for (const provider of providers) {
        const models = await ctx.llm.listModels(provider.id)
        for (const model of models) {
          let resolved
          try { resolved = await ctx.llm.resolveModelInfo(provider.id, model.id) } catch { resolved = undefined }
          out.push({
            key: `${provider.id}~${model.id}`,
            provider: provider.id,
            model: model.id,
            contextWindow: resolved?.contextWindow ?? null,
          })
        }
      }
      json(200, { ok: true, models: out })
    } catch (error) {
      json(500, { ok: false, reason: 'models', detail: messageOf(error) })
    }
  }
}

/**
 * POST /nano-notepad/fx/chat/completions — OpenAI → GenerateOptions → SSE。
 */
export function chatHandler(ctx) {
  return async (req, res) => {
    const json = (code, body) => {
      res.statusCode = code
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.end(JSON.stringify(body))
    }
    const chunks = []
    for await (const c of req) chunks.push(c)
    let body
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')) } catch { body = {} }

    const modelField = String(body.model ?? '')
    const tilde = modelField.indexOf('~')
    if (tilde <= 0) { json(400, { ok: false, reason: 'model-key-format', detail: 'model must be <provider>~<model>' }); return }
    const provider = modelField.slice(0, tilde)
    const model = modelField.slice(tilde + 1)
    const messages = await toRequestMessages(body.messages, ctx.get('attachments'))
    const system = (body.messages ?? []).find(m => m.role === 'system')?.content
    const tools = toToolSchemas(body.tools)

    const ac = new AbortController()
    const abort = () => { if (!ac.signal.aborted) ac.abort() }
    req.on('close', abort)
    req.on('aborted', abort)
    res.on('close', abort)

    /** @type {any} */
    let prepared
    try {
      prepared = await ctx.llm.prepareCall({
        provider, model,
        ...(body.temperature === undefined ? {} : { temperature: body.temperature }),
        ...(body.max_tokens === undefined ? {} : { maxTokens: body.max_tokens }),
        ...(body.stop === undefined ? {} : { stop: Array.isArray(body.stop) ? body.stop : [body.stop] }),
      }, ac.signal)
    } catch (error) {
      json(502, { ok: false, reason: 'prepareCall', detail: messageOf(error), provider, model })
      return
    }

    res.statusCode = 200
    res.setHeader('content-type', 'text/event-stream; charset=utf-8')
    res.setHeader('cache-control', 'no-store')
    res.setHeader('connection', 'keep-alive')
    res.setHeader('x-accel-buffering', 'no')

    const id = `chatcmpl-np-${Date.now().toString(36)}`
    const created = Math.floor(Date.now() / 1000)
    const chunk = (delta, finish = null, usage = undefined) => ({
      id, object: 'chat.completion.chunk', created,
      model: modelField,
      choices: [{ index: 0, delta, finish_reason: finish, logprobs: null }],
      ...(usage === undefined ? {} : { usage }),
    })

    sse(res, chunk({ role: 'assistant' }))

    // Per-block tool-call reassembly: ctx.llm's tool-call-delta index is a
    // BLOCK index; OpenAI/fx index is a dense 0-based tool-call ordinal.
    const toolCalls = new Map()
    const slotOf = new Map()
    let nextSlot = 0
    let ended = false
    let lastUsage = undefined
    const finish = (reason) => {
      if (ended) return
      ended = true
      sse(res, chunk({}, reason, lastUsage))
      res.write('data: [DONE]\n\n')
      res.end()
    }

    try {
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
          case 'usage':
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
