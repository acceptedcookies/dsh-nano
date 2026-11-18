/** Host-side MCP client over a stdin/stdout child. */

import { CONSTRAINTS } from '../../contracts/workspace-family.js'
import { WorkspaceError } from '../../host/errors.js'
import { HTTP_STATUS_FOR_REASON } from '../../contracts/workspace-family.js'

function fail(reason, message) {
  throw new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 })
}

export function createMcpClient(child, { timeoutMs = CONSTRAINTS.readTimeoutMs } = {}) {
  let nextId = 1
  let buffer = ''
  const pending = new Map()
  child.stdout.setEncoding('utf8')
  child.stdout.on('data', chunk => {
    buffer += chunk
    let idx
    while ((idx = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 1)
      if (!line.trim()) continue
      let message
      try { message = JSON.parse(line) } catch { continue }
      const waiter = pending.get(message.id)
      if (waiter) {
        pending.delete(message.id)
        waiter(message)
      }
    }
  })
  child.on('exit', () => {
    for (const [id, waiter] of pending) {
      pending.delete(id)
      waiter({ error: { message: 'mcp child exited' } })
    }
  })

  const request = (method, params) => new Promise((resolve, reject) => {
    const id = nextId++
    const timer = setTimeout(() => {
      pending.delete(id)
      reject(new WorkspaceError('workspace-unavailable', `${method} timed out`, { httpStatus: 503 }))
    }, timeoutMs)
    pending.set(id, message => {
      clearTimeout(timer)
      if (message.error) reject(new WorkspaceError('workspace-failed', message.error.message, { httpStatus: 502 }))
      else resolve(message.result)
    })
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`)
  })

  const notify = (method, params) => {
    child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`)
  }

  return {
    async initialize() {
      const result = await request('initialize', {
        protocolVersion: CONSTRAINTS.mcpProtocol,
        capabilities: {},
        clientInfo: { name: 'dncs-host', version: '0.1.0' },
      })
      notify('notifications/initialized', {})
      return result
    },
    async listTools() {
      const result = await request('tools/list', {})
      return result.tools ?? []
    },
    async call(name, args) {
      const result = await request('tools/call', { name, arguments: args })
      const inner = result?.structuredContent
      if (!inner || inner.ok !== true) {
        fail(inner?.reason ?? 'workspace-failed', inner?.message ?? 'tool failed')
      }
      return inner.data
    },
    cancel(id) { notify('notifications/cancelled', { requestId: id }) },
    close() {
      try { child.stdin.end() } catch { /* ignore */ }
      try { child.kill('SIGTERM') } catch { /* ignore */ }
    },
  }
}
