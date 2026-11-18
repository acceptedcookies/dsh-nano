/** MCP 2025-06-18 newline-delimited JSON-RPC over stdio. */

import { CONSTRAINTS, RESOURCE_CODECS, RESOURCE_OPERATION_IDS, mcpToolsList } from '../contracts/workspace-family.js'
import { resourceFail, resourceOk } from '../contracts/codec-util.js'

const PROTOCOL = CONSTRAINTS.mcpProtocol
const MAX_FRAME = CONSTRAINTS.maxFrameBytes

function send(stream, message) {
  stream.write(`${JSON.stringify(message)}\n`)
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result }
}

export function createMcpServer({ fs, processes, inspectFacts, stdin = process.stdin, stdout = process.stdout, stderr = process.stderr }) {
  let initialized = false
  let generation = 0
  const cancelled = new Set()
  const inFlight = new Map()
  let buffer = ''

  const tools = new Set(RESOURCE_OPERATION_IDS)

  async function callTool(name, args, id) {
    if (!tools.has(name)) {
      return { isError: true, structuredContent: resourceFail('invalid-request', `unknown tool ${name}`) }
    }
    const codec = RESOURCE_CODECS[name]
    const decoded = codec.decode(args ?? {})
    if (cancelled.has(id)) {
      return { isError: true, structuredContent: resourceFail('workspace-failed', 'cancelled') }
    }
    if (name === 'workspace.inspect') {
      return { structuredContent: resourceOk({ ...inspectFacts(), generation }) }
    }
    if (name.startsWith('fs.')) {
      const method = name.slice(3)
      const data = await fs[method](decoded)
      return { structuredContent: resourceOk(data) }
    }
    if (name.startsWith('process.')) {
      const method = name.slice(8)
      const data = await processes[method](decoded)
      return { structuredContent: resourceOk(data) }
    }
    return { isError: true, structuredContent: resourceFail('invalid-request', `unhandled ${name}`) }
  }

  async function handle(message) {
    if (message === null || typeof message !== 'object' || message.jsonrpc !== '2.0') {
      send(stdout, rpcError(message?.id ?? null, -32600, 'invalid jsonrpc'))
      return
    }
    if (message.method === undefined && message.id !== undefined) return
    const { id, method, params } = message
    if (method === 'notifications/cancelled') {
      cancelled.add(params?.requestId)
      return
    }
    if (method === 'notifications/initialized') {
      return
    }
    if (method === 'ping') {
      send(stdout, rpcResult(id, {}))
      return
    }
    if (method === 'initialize') {
      generation += 1
      processes.reset?.()
      initialized = true
      send(stdout, rpcResult(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: {} },
        serverInfo: { name: 'dncs-devin-workspace', version: '0.1.0' },
      }))
      return
    }
    if (!initialized) {
      send(stdout, rpcError(id, -32002, 'not initialized'))
      return
    }
    if (method === 'tools/list') {
      send(stdout, rpcResult(id, { tools: mcpToolsList() }))
      return
    }
    if (method === 'tools/call') {
      if (inFlight.size >= CONSTRAINTS.maxInFlight) {
        send(stdout, rpcResult(id, { isError: true, structuredContent: resourceFail('workspace-limit', 'too many in-flight requests') }))
        return
      }
      const name = params?.name
      const args = params?.arguments ?? {}
      const work = (async () => {
        try {
          const result = await callTool(name, args, id)
          send(stdout, rpcResult(id, result))
        } catch (error) {
          const reason = error?.reason ?? 'workspace-failed'
          send(stdout, rpcResult(id, { isError: true, structuredContent: resourceFail(reason, error?.message ?? reason) }))
        } finally {
          inFlight.delete(id)
        }
      })()
      inFlight.set(id, work)
      return
    }
    send(stdout, rpcError(id, -32601, `unknown method ${method}`))
  }

  stdin.setEncoding('utf8')
  stdin.on('data', chunk => {
    if (chunk.length > MAX_FRAME) {
      stderr.write('frame too large\n')
      return
    }
    buffer += chunk
    if (buffer.length > MAX_FRAME * 2) {
      buffer = ''
      stderr.write('buffer overflow\n')
      return
    }
    let idx
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 1)
      if (line.trim() === '') continue
      if (Buffer.byteLength(line) > MAX_FRAME) {
        stderr.write('line too large\n')
        continue
      }
      let message
      try { message = JSON.parse(line) } catch {
        send(stdout, rpcError(null, -32700, 'parse error'))
        continue
      }
      void handle(message)
    }
  })

  return { handle }
}
