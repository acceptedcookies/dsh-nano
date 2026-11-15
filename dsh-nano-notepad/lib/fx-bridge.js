// src/host/fx-bridge.js
var FINISH_MAP = {
  "stop": "stop",
  "tool-calls": "tool_calls",
  "max-tokens": "length",
  "aborted": "stop",
  "error": "stop"
};
function messageOf(value) {
  return value instanceof Error ? value.message : String(value);
}
async function contentBlocks(content, attachments) {
  if (content === void 0 || content === null) return [];
  if (typeof content === "string") return content === "" ? [] : [{ type: "text", text: content }];
  if (Array.isArray(content)) {
    const blocks = [];
    for (const part of content) {
      if (part?.type === "text" && typeof part.text === "string") {
        blocks.push({ type: "text", text: part.text });
      } else if (part?.type === "image_url" && part.image_url?.url) {
        blocks.push(await imageBlock(part.image_url.url, attachments));
      }
    }
    return blocks;
  }
  return [];
}
async function imageBlock(url, attachments) {
  let bytes, mediaType;
  if (url.startsWith("data:")) {
    const head = url.slice(5, url.indexOf(","));
    mediaType = head.split(";")[0];
    bytes = Buffer.from(url.slice(url.indexOf(",") + 1), "base64");
  } else {
    const resp = await fetch(url, { signal: AbortSignal.timeout(1e4) });
    if (!resp.ok) throw new Error(`image fetch failed: HTTP ${resp.status}`);
    mediaType = resp.headers.get("content-type")?.split(";")[0] ?? "image/png";
    bytes = Buffer.from(await resp.arrayBuffer());
    if (bytes.length > 20 * 1024 * 1024) throw new Error("image exceeds 20MB");
  }
  if (!attachments?.saveImage) throw new Error("attachments service unavailable");
  const ref = await attachments.saveImage({ data: new Uint8Array(bytes), mediaType });
  return { type: "image", attachment: ref };
}
async function toolResultMessage(m, attachments) {
  return {
    role: "tool",
    content: await contentBlocks(m.content, attachments),
    toolCallId: m.tool_call_id,
    isError: false,
    source: { kind: "tool", callId: m.tool_call_id }
  };
}
async function toRequestMessages(messages, attachments) {
  const out = [];
  for (const m of messages ?? []) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      out.push(await toolResultMessage(m, attachments));
      continue;
    }
    if (m.role === "assistant") {
      const content = await contentBlocks(m.content, attachments);
      for (const call of m.tool_calls ?? []) {
        content.push({ type: "tool-call", id: call.id, name: call.function?.name ?? "", arguments: call.function?.arguments ?? "" });
      }
      out.push({ role: "assistant", content, source: { kind: "model", provider: "bridge", model: "bridge" } });
      continue;
    }
    out.push({ role: "user", content: await contentBlocks(m.content, attachments) });
  }
  return out;
}
function toToolSchemas(tools) {
  return (tools ?? []).map((t) => ({
    name: t.function?.name ?? "",
    description: t.function?.description ?? "",
    parameters: t.function?.parameters ?? { type: "object", properties: {} }
  }));
}
function sse(res, payload) {
  res.write(`data: ${JSON.stringify(payload)}

`);
}
function modelsHandler(ctx) {
  return async (_req, res) => {
    const json = (code, body) => {
      res.statusCode = code;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body));
    };
    try {
      const providers = ctx.llm.listProviders();
      const out = [];
      for (const provider of providers) {
        const models = await ctx.llm.listModels(provider.id);
        for (const model of models) {
          let resolved;
          try {
            resolved = await ctx.llm.resolveModelInfo(provider.id, model.id);
          } catch {
            resolved = void 0;
          }
          out.push({
            key: `${provider.id}~${model.id}`,
            provider: provider.id,
            model: model.id,
            /* DSH LlmResolvedModelInfo 的容量在 context.contextWindow，不是顶层。 */
            contextWindow: resolved?.context?.contextWindow ?? resolved?.contextWindow ?? null
          });
        }
      }
      json(200, { ok: true, models: out });
    } catch (error) {
      json(500, { ok: false, reason: "models", detail: messageOf(error) });
    }
  };
}
function chatHandler(ctx) {
  return async (req, res) => {
    const json = (code, body2) => {
      res.statusCode = code;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify(body2));
    };
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body;
    try {
      body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      body = {};
    }
    const modelField = String(body.model ?? "");
    const tilde = modelField.indexOf("~");
    if (tilde <= 0) {
      json(400, { ok: false, reason: "model-key-format", detail: "model must be <provider>~<model>" });
      return;
    }
    const provider = modelField.slice(0, tilde);
    const model = modelField.slice(tilde + 1);
    const messages = await toRequestMessages(body.messages, ctx.get("attachments"));
    const system = (body.messages ?? []).find((m) => m.role === "system")?.content;
    const tools = toToolSchemas(body.tools);
    const ac = new AbortController();
    const abort = () => {
      if (!ac.signal.aborted) ac.abort();
    };
    req.on("close", abort);
    req.on("aborted", abort);
    res.on("close", abort);
    let prepared;
    try {
      prepared = await ctx.llm.prepareCall({
        provider,
        model,
        ...body.temperature === void 0 ? {} : { temperature: body.temperature },
        ...body.max_tokens === void 0 ? {} : { maxTokens: body.max_tokens },
        ...body.stop === void 0 ? {} : { stop: Array.isArray(body.stop) ? body.stop : [body.stop] }
      }, ac.signal);
    } catch (error) {
      json(502, { ok: false, reason: "prepareCall", detail: messageOf(error), provider, model });
      return;
    }
    res.statusCode = 200;
    res.setHeader("content-type", "text/event-stream; charset=utf-8");
    res.setHeader("cache-control", "no-store");
    res.setHeader("connection", "keep-alive");
    res.setHeader("x-accel-buffering", "no");
    const id = `chatcmpl-np-${Date.now().toString(36)}`;
    const created = Math.floor(Date.now() / 1e3);
    const chunk = (delta, finish2 = null, usage = void 0) => ({
      id,
      object: "chat.completion.chunk",
      created,
      model: modelField,
      choices: [{ index: 0, delta, finish_reason: finish2, logprobs: null }],
      ...usage === void 0 ? {} : { usage }
    });
    sse(res, chunk({ role: "assistant" }));
    const toolCalls = /* @__PURE__ */ new Map();
    const slotOf = /* @__PURE__ */ new Map();
    let nextSlot = 0;
    let ended = false;
    let lastUsage = void 0;
    const finish = (reason) => {
      if (ended) return;
      ended = true;
      sse(res, chunk({}, reason, lastUsage));
      res.write("data: [DONE]\n\n");
      res.end();
    };
    try {
      const stream = prepared.stream({
        ...prepared.config,
        provider,
        model,
        messages,
        ...system === void 0 ? {} : { system: typeof system === "string" ? system : (await contentBlocks(system, ctx.get("attachments"))).filter((b) => b.type === "text").map((b) => b.text).join("\n") },
        ...tools.length === 0 ? {} : { tools },
        signal: ac.signal
      });
      for await (const c of stream) {
        if (ended) break;
        switch (c.type) {
          case "text-delta":
            sse(res, chunk({ content: c.text }));
            break;
          case "reasoning-delta":
            sse(res, chunk({ reasoning_content: c.text }));
            break;
          case "tool-call-delta": {
            let slot = slotOf.get(c.index);
            const fresh = slot === void 0;
            if (fresh) {
              slot = nextSlot++;
              slotOf.set(c.index, slot);
            }
            let tc = toolCalls.get(slot);
            if (tc === void 0) {
              tc = { id: c.id, name: "", arguments: "" };
              toolCalls.set(slot, tc);
            }
            if (c.name !== void 0) tc.name += c.name;
            tc.arguments += c.argumentsDelta ?? "";
            sse(res, chunk({ tool_calls: [{
              index: slot,
              ...fresh ? { id: c.id, type: "function" } : {},
              function: {
                ...c.name !== void 0 ? { name: c.name } : {},
                arguments: c.argumentsDelta ?? ""
              }
            }] }));
            break;
          }
          case "usage":
            lastUsage = {
              prompt_tokens: c.usage.inputTokens,
              completion_tokens: c.usage.outputTokens,
              total_tokens: c.usage.inputTokens + c.usage.outputTokens,
              ...c.usage.reasoningTokens === void 0 ? {} : { completion_tokens_details: { reasoning_tokens: c.usage.reasoningTokens } }
            };
            break;
          case "finish": {
            const kind = c.reason?.kind ?? "stop";
            finish(FINISH_MAP[kind] ?? "stop");
            break;
          }
          default:
            break;
        }
      }
      if (!ended) finish("stop");
    } catch (error) {
      if (!ended) {
        sse(res, { error: { message: messageOf(error), type: "bridge-error" } });
        finish("stop");
      }
    }
  };
}
export {
  chatHandler,
  modelsHandler
};
