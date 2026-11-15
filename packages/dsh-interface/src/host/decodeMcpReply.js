/**
 * decodeMcpReply — three-layer MCP tools/call reply decode (CF1115 / P3-01 /
 * T14). Pure decode, no transport: the caller owns the fetch/ws and hands the
 * parsed JSON-RPC body. Layers, in priority order:
 *
 *   1. rpc      — `body.error` (JSON-RPC error) → {ok:false, kind:'rpc'}
 *   2. tool     — `body.result.isError` + `structuredContent` → domain error
 *   3. result   — `body.result.structuredContent` → {ok:true, data}
 *
 * Protocol violations (non-object body, missing result/error, a result with no
 * decodable content) → {ok:false, kind:'protocol'}. A result whose
 * structuredContent is absent but whose content[0].text parses as JSON yields
 * {ok:true,data} as a tolerated legacy path (commented, never fabricated).
 *
 * `attach` honesty is NOT verified here — the decoder reports exactly what the
 * reply carried; the lane's own `attach.url` presence/absence check stays in
 * the caller.
 */

/**
 * @param {any} body — the parsed JSON-RPC reply body.
 * @returns {{ok:true,data:unknown} | {ok:false,kind:'rpc'|'tool'|'protocol',message:string,error?:object}}
 */
export function decodeMcpReply(body) {
  if (body === null || typeof body !== 'object') {
    return { ok: false, kind: 'protocol', message: 'non-object JSON-RPC reply' }
  }
  // Layer 1 — rpc error.
  if (body.error != null) {
    const e = body.error
    const message = e && typeof e === 'object' ? String(e.message ?? e) : String(e)
    return { ok: false, kind: 'rpc', message, error: e }
  }
  const result = body.result
  if (result === null || typeof result !== 'object') {
    return { ok: false, kind: 'protocol', message: 'reply has neither error nor result object' }
  }
  // Layer 2 — tool/domain error.
  if (result.isError === true) {
    const sc = result.structuredContent
    const message = (sc && typeof sc === 'object' && sc.message) ?? result.content?.[0]?.text ?? 'tool error'
    return { ok: false, kind: 'tool', message: String(message), error: sc }
  }
  // Layer 3 — success payload.
  if (result.structuredContent !== undefined) {
    return { ok: true, data: result.structuredContent }
  }
  /* Tolerated legacy path: some servers put the payload only in content[].text.
     Parse it; if it isn't JSON the caller still gets a protocol violation. */
  const text = result.content?.[0]?.text
  if (typeof text === 'string' && text.length > 0) {
    try { return { ok: true, data: JSON.parse(text) } } catch { /* fall through */ }
  }
  return { ok: false, kind: 'protocol', message: 'result carries no decodable content' }
}
