/**
 * fx-runtime.js — notepad 页面内 fx 引擎承载（one-shot，会话即弃）。
 *
 * - createFxEngine 常驻于本模块单例；每个 one-shot 一个 turn，turn 结束不续聊
 *   （V-14 语义；引擎单 turn 互斥，并发活各起一个引擎实例）。
 * - provider：同源路由 /nano-notepad/fx/chat/completions（OpenAI 桥 → ctx.llm）。
 * - wasm：/nano-notepad/fx-core.wasm；libfx ESM：/nano-notepad/fx/sdk/。
 */

const WASM_URL = '/nano-notepad/fx-core.wasm'
const SDK_BASE = '/nano-notepad/fx/sdk'
const CHAT_URL = '/nano-notepad/fx/chat/completions'

let fxModule = null
const engines = new Set()

export const DEFAULT_MODEL = 'deepseek-official~deepseek-flash'
export const DEFAULT_INSTRUCTIONS =
  'You are the notepad pipeline engine inside dsh-nano-notepad. ' +
  'Prefer a note_* tool call when the task asks for stored note data. ' +
  'When emitting markdown content, follow the system instructions exactly.'

async function loadFx() {
  if (fxModule) return fxModule
  fxModule = await import(/* webpackIgnore: true */ `${SDK_BASE}/browser-agent.js`)
  return fxModule
}

/**
 * Spawn a fresh one-shot engine (per-call). `tools`/`toolContext` carry the
 * note_* host-tool set + corpus handle.
 * @param {{ model?: string, instructions?: string, tools?: object, toolContext?: any, maxTokens?: number }} opts
 */
export async function spawnEngine({ model = DEFAULT_MODEL, instructions = DEFAULT_INSTRUCTIONS, tools, toolContext } = {}) {
  const fx = await loadFx()
  const engine = await fx.createFxEngine({
    wasm: WASM_URL,
    provider: {
      name: 'dsh-nano-notepad',
      baseUrl: new URL('/nano-notepad/fx', location.origin).href,
      models: { [model]: { contextWindow: 131072 } },
    },
    model,
    instructions,
    ...(tools === undefined ? {} : { tools }),
    ...(toolContext === undefined ? {} : { toolContext }),
  })
  engines.add(engine)
  const done = () => { engines.delete(engine); try { engine.close?.() } catch {} }
  return { engine, done }
}

/**
 * One-shot prompt: spawn → consume turn events → await result → close.
 * Returns {text, stopReason, usage, toolCalls: [{name, args, ok}]}.
 * toolCalls collected from `tool_call`/`tool_call_update` turn events when
 * the engine emits them; note_* executors also record via corpus.
 */
export async function runOneShot(promptText, opts = {}) {
  const { engine, done } = await spawnEngine(opts)
  const onEvent = typeof opts.onEvent === 'function' ? opts.onEvent : null
  let text = ''
  const toolCalls = []
  try {
    const turn = engine.prompt(promptText, { signal: opts.signal })
    for await (const e of turn) {
      onEvent?.(e)
      if (e.type === 'text_delta') text += e.delta
      else if (e.type === 'tool_start' || e.type === 'tool_call' || e.type === 'tool_call_update' || e.type === 'fx_host_tool_call' || e.type === 'tool_end') {
        toolCalls.push({ raw: e.type, name: e.name ?? e.toolName ?? null, args: e.input ?? e.args ?? null, result: e.content ?? e.output ?? e.result ?? null, isError: e.isError })
      }
    }
    const res = await turn.result
    return { text, stopReason: res?.stopReason ?? null, usage: res?.usage ?? null, toolCalls }
  } finally {
    done()
  }
}

/** Fetch the provider~model catalog the bridge mirrors from ctx.llm. */
export async function fetchModels() {
  const res = await fetch('/nano-notepad/fx/models')
  const data = await res.json()
  return data.ok ? data.models : []
}
