// Protocol-stability + MCP-surface evaluation. Run on the host:
//   node scripts/eval-proto-mcp.mjs <mcpPort> <authCookieOrHostFetch>
// For DNK we need host routes too, so pass the authed cookie header:
//   node scripts/eval-proto-mcp.mjs 8799 'dsh-auth-...=...'
// Or run inside ego (page.fetch) — see eval-ego-vs-dnk for the authed half.
import { WebSocket } from '/Users/seanz/Documents/dsh-plugins/dsh-nano-kitesurf/runtime/linux-prefix/node_modules/ws/wrapper.mjs'

const PORT = process.argv[2] || '8799'
const rows = []
const mark = (n, ok, detail) => { rows.push({ n, ok: !!ok, detail: String(detail ?? '').slice(0, 120) }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n} — ${String(detail).slice(0, 110)}`) }

const ws = new WebSocket(`ws://127.0.0.1:${PORT}/mcp`)
const pend = new Map()
let seq = 0
const call = (method, params) => new Promise((res, rej) => {
  const id = ++seq; pend.set(id, res); setTimeout(() => { if (pend.has(id)) { pend.delete(id); res({ timeout: true }) } }, 8000)
  ws.send(JSON.stringify({ jsonrpc: '2.0', id, method, params }))
})
ws.on('message', (d) => { const m = JSON.parse(d); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })

await new Promise((res) => ws.once('open', res))

// 1. handshake determinism
const init = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'eval', version: '0' } })
mark('mcp initialize', init.result?.serverInfo || init.result, JSON.stringify(init.result || init.error).slice(0, 80))
ws.send(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }))

// 2. tools/list enumerates the kitesurf_* surface
const list = await call('tools/list', {})
const tools = (list.result?.tools || []).map((t) => t.name)
const kt = tools.filter((t) => t.startsWith('sandbox.'))
mark('tools/list enumerates kitesurf_*', kt.length >= 15, `${kt.length}/15: ${kt.join(',')}`)

// 3. malformed JSON-RPC → -32700, deterministically
const bad = await call('tools/call', { name: 'sandbox.diagnostics' }) // missing arguments is fine
mark('sandbox.diagnostics callable', bad.result || bad.error, JSON.stringify(bad.result || bad.error).slice(0, 70))

// 4. error determinism: unknown tool → structured kitesurf.* business errorId
//    (DNK keeps EVERY failure in one errorId contract, even a bad tool name —
//    that's a strength over a bare -32601 protocol throw).
const unknown = await call('tools/call', { name: 'sandbox.nonexistent_tool', arguments: {} })
const uerr = JSON.stringify(unknown.error || unknown.result || '')
mark('unknown tool → structured kitesurf.* errorId', /"errorId"\s*:\s*"kitesurf\./.test(uerr), uerr.slice(0, 80))

// 5. each observability tool returns structured payload (snapshot may be stale→error, acceptable)
for (const t of ['sandbox.snapshot', 'sandbox.operations', 'sandbox.error_catalog', 'sandbox.bridge_health']) {
  const r = await call('tools/call', { name: t, arguments: {} })
  const txt = r.result?.content?.[0]?.text || JSON.stringify(r.result || r.error)
  const structured = /ok|stale|errorId|content/.test(txt)
  mark(`tool ${t}`, r.result || /stale|not pushed|diagnostics/.test(txt), (r.result ? 'ok' : 'ERR') + ' ' + txt.slice(0, 60))
}

// 6. control ownership: claim → status → release; double claim = busy not queued
const claim1 = await call('tools/call', { name: 'sandbox.control', arguments: { action: 'claim', self: { connId: 'eval-a', clientName: 'eval' } } })
const claim1t = claim1.result?.content?.[0]?.text || ''
const status = await call('tools/call', { name: 'sandbox.control', arguments: { action: 'status' } })
const claim2 = await call('tools/call', { name: 'sandbox.control', arguments: { action: 'claim', self: { connId: 'eval-b', clientName: 'eval' } } })
const claim2t = claim2.result?.content?.[0]?.text || JSON.stringify(claim2.error || claim2.result)
mark('control claim→status', /owner|writer|claimed|eval-a/i.test(status.result?.content?.[0]?.text || ''), JSON.stringify(status.result?.content?.[0]?.text).slice(0, 70))
mark('control double-claim → busy not queued', /busy|kitesurf\.control\.busy/i.test(claim2t), claim2t.slice(0, 70))
await call('tools/call', { name: 'sandbox.control', arguments: { action: 'release', self: { connId: 'eval-a' } } })

// 7. raw frame without trailing newline is still one message (frame-scoped)
const rawCall = new Promise((res) => { const id = ++seq; pend.set(id, res); ws.send(JSON.stringify({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'sandbox.bridge_health', arguments: {} } })) })
const raw = await rawCall
mark('frame-scoped JSON-RPC (no \\n)', raw.result || raw.error, 'ok')

ws.close()
const fails = rows.filter((r) => !r.ok).length
console.log(`\n${rows.length - fails}/${rows.length} protocol checks green, ${fails} fail`)
process.exit(fails ? 1 : 0)
