/**
 * createMcpToolset — MCP JSON-RPC 2.0 control-plane dispatcher (CF1115 /
 * P3-01 / T14). Domain-agnostic: the plugin hands the canonical OpenRPC-style
 * schema object + a `dispatch(name, args)` table; this module owns only the
 * protocol surface — initialize/ping/tools-list/tools-call, batch handling,
 * the tools/call success (`content`+`structuredContent`) and error
 * (`content`+`isError`+`structuredContent.kind`) envelope, and unknown-method /
 * invalid-request replies.
 *
 * Injection discipline (host出口): `schema` and `dispatch` are injected — this
 * module reads no file and holds no cross-instance global state. The schema
 * stays the plugin's single source (TOOLS is generated from it); the domain
 * dispatch owns real business. Attach/URL honesty is the dispatch's contract:
 * it must return the real `attach.url`, never a guess.
 */

const MCP_NOTIFICATIONS = 'notifications/'

/**
 * @param {object} opts
 * @param {object} opts.schema — the canonical OpenRPC-like schema; reads
 *   `schema.methods` (each {name,description,params}) and `schema['x-events']`.
 * @param {(name:string, args:object)=>Promise<any>} opts.dispatch — one tool
 *   call → result object. Throw `err` (with `.kind`) to surface a domain error.
 * @param {string} [opts.protocolVersion]
 * @param {object} [opts.serverInfo] — {name,version} for initialize.
 * @param {(event:object)=>void} [opts.onCall] — audit hook per admitted call.
 * @returns {{ handleRpc(body), tools }}
 */
export function createMcpToolset({ schema, dispatch, protocolVersion = '2025-06-18', serverInfo = {}, onCall } = {}) {
  if (schema == null || !Array.isArray(schema.methods)) {
    throw new TypeError('createMcpToolset requires a schema with a methods array')
  }
  if (typeof dispatch !== 'function') {
    throw new TypeError('createMcpToolset requires a dispatch(name,args) function')
  }

  /* TOOLS table generated from the canonical schema — never hand-authored. */
  const tools = schema.methods.map(m => ({ name: m.name, description: m.description, inputSchema: m.params }))
  const toolMap = Object.fromEntries(tools.map(t => [t.name, t]))

  function rpcReply(id, result, error) {
    return error ? { jsonrpc: '2.0', id, error } : { jsonrpc: '2.0', id, result }
  }

  /** JSON-RPC dispatcher — supports single calls and batches. */
  async function handleRpc(body) {
    const list = Array.isArray(body) ? body : [body]
    const out = []
    for (const msg of list) {
      if (!msg || msg.jsonrpc !== '2.0') {
        out.push(rpcReply(msg?.id ?? null, null, { code: -32600, message: 'invalid request' }))
        continue
      }
      if (msg.method === 'initialize') {
        out.push(rpcReply(msg.id, {
          protocolVersion,
          capabilities: { tools: {}, 'dnt.events': { types: schema['x-events'] } },
          serverInfo: { name: 'mcp', version: '0.0.0', ...serverInfo },
        }))
        continue
      }
      if (typeof msg.method === 'string' && msg.method.startsWith(MCP_NOTIFICATIONS)) continue
      if (msg.method === 'ping') { out.push(rpcReply(msg.id, {})); continue }
      if (msg.method === 'tools/list') { out.push(rpcReply(msg.id, { tools })); continue }
      if (msg.method === 'tools/call') {
        const { name, arguments: args } = msg.params ?? {}
        if (!toolMap[name]) {
          out.push(rpcReply(msg.id, null, { code: -32602, message: `unknown tool '${name}'` }))
          continue
        }
        onCall?.({ op: 'mcp.call', name })
        try {
          const result = await dispatch(name, args ?? {})
          out.push(rpcReply(msg.id, {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            structuredContent: result,
          }))
        } catch (e) {
          out.push(rpcReply(msg.id, {
            content: [{ type: 'text', text: String(e?.message ?? e) }],
            isError: true,
            /* stable kind travels on structuredContent so callers map errors
               without parsing message text. */
            structuredContent: { kind: e?.kind ?? 'invalid', message: String(e?.message ?? e) },
          }))
        }
        continue
      }
      out.push(rpcReply(msg.id ?? null, null, { code: -32601, message: `unknown method '${msg.method}'` }))
    }
    return Array.isArray(body) ? out : out[0]
  }

  return { handleRpc, tools }
}
