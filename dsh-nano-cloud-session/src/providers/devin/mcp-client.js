/** Host-side MCP client over a stdin/stdout child.
 *  Transport failures settle every pending request exactly once: reads report
 *  unavailable, calls already sent for mutating tools report outcome-unknown
 *  (never replayed). */

import { CONSTRAINTS } from '../../contracts/workspace-family.js'
import { WorkspaceError } from '../../host/errors.js'
import { HTTP_STATUS_FOR_REASON } from '../../contracts/workspace-family.js'

function fail(reason, message) {
  throw new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 })
}

const MUTATING_TOOLS = new Set(['fs.write', 'fs.mkdir', 'fs.rename', 'fs.remove', 'process.start', 'process.terminate'])

export function createMcpClient(child, { timeoutMs = CONSTRAINTS.readTimeoutMs } = {}) {
  let nextId = 1
  let buffer = ''
  let closed = false
  let closedPromise = null
  const pending = new Map()

  const settleAll = (reason, message) => {
    for (const [id, waiter] of pending) {
      pending.delete(id)
      waiter(new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 }))
    }
  }

  const onData = chunk => {
    buffer += chunk
    if (buffer.length > CONSTRAINTS.maxFrameBytes) {
      buffer = ''
      try { child.kill?.('SIGKILL') } catch { /* gone */ }
      settleAll('workspace-unavailable', 'mcp frame exceeds the size cap')
      return
    }
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
        waiter(null, message)
      }
    }
  }
  const onExit = () => {
    if (pending.size === 0) return
    /* Mutating calls may have reached the bridge before the transport died;
     * their outcome cannot be proven, so they settle as unknown. Reads are
     * simply unavailable. */
    for (const [id, waiter] of pending) {
      pending.delete(id)
      waiter(new WorkspaceError(
        waiter.mutating ? 'workspace-outcome-unknown' : 'workspace-unavailable',
        'mcp transport ended before the call settled',
        { httpStatus: 502 }))
    }
  }
  const onStdinError = () => settleAll('workspace-unavailable', 'mcp stdin write failed')

  child.stdout.setEncoding('utf8')
  child.stdout.on('data', onData)
  child.stderr?.resume?.()
  child.stderr?.on?.('data', () => { /* drained: never parsed, never trusted */ })
  child.on('exit', onExit)
  child.on('error', onExit)
  child.stdin?.on?.('error', onStdinError)

  const request = (method, params, { mutating = false } = {}) => new Promise((resolve, reject) => {
    if (closed || child.exitCode != null || child.killed === true) {
      reject(new WorkspaceError('workspace-unavailable', 'mcp transport is closed', { httpStatus: 503 }))
      return
    }
    if (pending.size >= CONSTRAINTS.maxInFlight) {
      reject(new WorkspaceError('workspace-limit', 'too many pending mcp calls', { httpStatus: 413 }))
      return
    }
    const id = nextId++
    const timer = setTimeout(() => {
      const waiter = pending.get(id)
      if (!waiter) return
      pending.delete(id)
      reject(new WorkspaceError(
        waiter.mutating ? 'workspace-outcome-unknown' : 'workspace-unavailable',
        `${method} timed out`,
        { httpStatus: waiter.mutating ? 502 : 503 }))
    }, timeoutMs)
    pending.set(id, (error, message) => {
      clearTimeout(timer)
      if (error) { reject(error); return }
      if (message.error) reject(new WorkspaceError('workspace-failed', message.error.message, { httpStatus: 502 }))
      else resolve(message.result)
    })
    pending.get(id).mutating = mutating
    try {
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`, error => {
        if (error) {
          const waiter = pending.get(id)
          if (waiter) {
            pending.delete(id)
            clearTimeout(timer)
            reject(new WorkspaceError('workspace-unavailable', 'mcp stdin write failed', { httpStatus: 503 }))
          }
        }
      })
    } catch {
      pending.delete(id)
      clearTimeout(timer)
      reject(new WorkspaceError('workspace-unavailable', 'mcp stdin write failed', { httpStatus: 503 }))
    }
  })

  const notify = (method, params) => {
    try { child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method, params })}\n`) } catch { /* transport already down */ }
  }

  return {
    async initialize() {
      const result = await request('initialize', {
        protocolVersion: CONSTRAINTS.mcpProtocol,
        capabilities: {},
        clientInfo: { name: 'dncs-host', version: '0.1.0' },
      })
      if (result?.protocolVersion !== CONSTRAINTS.mcpProtocol) {
        fail('workspace-failed', `mcp protocol ${result?.protocolVersion ?? 'missing'}`)
      }
      notify('notifications/initialized', {})
      return result
    },
    async listTools() {
      const result = await request('tools/list', {})
      return result.tools ?? []
    },
    async call(name, args) {
      const result = await request('tools/call', { name, arguments: args }, { mutating: MUTATING_TOOLS.has(name) })
      const inner = result?.structuredContent
      if (!inner || inner.ok !== true) {
        fail(inner?.reason ?? 'workspace-failed', inner?.message ?? 'tool failed')
      }
      return inner.data
    },
    cancel(id) { notify('notifications/cancelled', { requestId: id }) },
    /* Resolves only after the child has actually exited (bounded): callers
     * that drain a scope can rely on the remote process being gone, and the
     * exit/error listeners stay armed until that observation lands. */
    close() {
      if (closed) return closedPromise ?? Promise.resolve()
      closed = true
      settleAll('workspace-unavailable', 'mcp transport closed')
      child.stdout?.off?.('data', onData)
      closedPromise = new Promise(resolve => {
        let done = false
        const finish = () => {
          if (done) return
          done = true
          clearTimeout(timer)
          child.off?.('exit', onExit)
          child.off?.('error', onExit)
          child.stdin?.off?.('error', onStdinError)
          resolve()
        }
        const timer = setTimeout(() => {
          try { child.kill('SIGKILL') } catch { /* already gone */ }
          finish()
        }, 3000)
        child.once?.('close', finish)
        child.once?.('exit', finish)
        child.on?.('error', finish)
        /* exitCode alone is a pre-death signal; `killed` only marks that a
         * signal was sent — the SIGTERM below would satisfy it instantly and
         * skip the wait for the actual exit. */
        try { child.stdin.end() } catch { /* already closed */ }
        try { child.kill('SIGTERM') } catch { /* already gone */ }
        if (child.exitCode != null) finish()
      })
      return closedPromise
    },
  }
}
