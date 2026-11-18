/** Remote process table. argv-only spawn; handles are connection-local. */

import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { realpathSync } from 'node:fs'
import { join } from 'node:path'
import { resolveUnderRoot } from './path-policy.js'

export function createProcessTable(rootInput, { maxProcesses = 4, maxPage = 64 * 1024 } = {}) {
  const rootReal = realpathSync(rootInput)
  const table = new Map()

  const get = (handle) => {
    const rec = table.get(handle)
    if (!rec) {
      const error = new Error('unknown processHandle')
      error.reason = 'workspace-not-found'
      throw error
    }
    return rec
  }

  return {
    reset() {
      for (const rec of table.values()) {
        try { rec.child.kill('SIGKILL') } catch { /* ignore */ }
      }
      table.clear()
    },
    start({ argv, cwd, envPatch }) {
      if (table.size >= maxProcesses) {
        const error = new Error('process limit')
        error.reason = 'workspace-limit'
        throw error
      }
      const resolved = resolveUnderRoot(rootReal, cwd ?? '.')
      const cwdReal = resolved.real ?? resolved.joined
      const handle = `p-${randomBytes(12).toString('hex')}`
      const stdout = []
      const stderr = []
      let stdoutBytes = 0
      let stderrBytes = 0
      const env = { PATH: process.env.PATH, HOME: process.env.HOME, LANG: process.env.LANG }
      for (const [key, value] of Object.entries(envPatch ?? {})) {
        if (key === 'SSH_AUTH_SOCK' || key.startsWith('DSH_') || /TOKEN|SECRET|KEY/.test(key)) continue
        if (typeof value === 'string') env[key] = value
      }
      const child = spawn(argv[0], argv.slice(1), {
        cwd: cwdReal,
        env,
        shell: false,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      const rec = {
        handle, child, argv, cwd: cwdReal,
        stdout, stderr, stdoutBytes, stderrBytes,
        exit: null, unknown: false,
      }
      child.stdout.on('data', chunk => {
        stdout.push(Buffer.from(chunk))
        rec.stdoutBytes += chunk.length
      })
      child.stderr.on('data', chunk => {
        stderr.push(Buffer.from(chunk))
        rec.stderrBytes += chunk.length
      })
      child.on('close', (code, signal) => {
        rec.exit = { code, signal: signal ?? null }
      })
      child.on('error', () => { rec.unknown = true })
      table.set(handle, rec)
      return { processHandle: handle }
    },
    read({ processHandle, stdoutOffset = 0, stderrOffset = 0, limit = maxPage }) {
      const rec = get(processHandle)
      const out = Buffer.concat(rec.stdout)
      const err = Buffer.concat(rec.stderr)
      const stdoutChunk = out.subarray(stdoutOffset, stdoutOffset + limit)
      const stderrChunk = err.subarray(stderrOffset, stderrOffset + limit)
      const stdoutTruncated = rec.stdoutBytes > stdoutOffset + stdoutChunk.length && stdoutChunk.length === limit
      return {
        stdout: stdoutChunk.toString('base64'),
        stderr: stderrChunk.toString('base64'),
        stdoutNext: stdoutOffset + stdoutChunk.length,
        stderrNext: stderrOffset + stderrChunk.length,
        truncated: stdoutTruncated || rec.stderrBytes > stderrOffset + stderrChunk.length,
        exit: rec.exit,
        unknown: rec.unknown,
      }
    },
    wait({ processHandle, timeoutMs = 0 }) {
      const rec = get(processHandle)
      if (rec.exit) return { running: false, exit: rec.exit }
      if (!timeoutMs) return { running: true }
      return new Promise(resolve => {
        const timer = setTimeout(() => resolve({ running: true }), timeoutMs)
        rec.child.once('close', (code, signal) => {
          clearTimeout(timer)
          rec.exit = { code, signal: signal ?? null }
          resolve({ running: false, exit: rec.exit })
        })
      })
    },
    terminate({ processHandle }) {
      const rec = get(processHandle)
      try {
        rec.child.kill('SIGTERM')
        return { stop: 'signaled' }
      } catch {
        rec.unknown = true
        return { stop: 'unknown' }
      }
    },
    join(path) { return join(rootReal, path) },
  }
}
