/**
 * Local Kitesurf container, started from inside the plugin.
 * A remote httpBase is not this machine, so it is only probed.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { createConnection } from 'node:net'
import { join } from 'node:path'
import { KitesurfError } from './engine.js'

// A container CLI call can hang (cold apiserver, stuck image pull). Without a
// ceiling the /kite route would block forever and the pane would never get an
// answer. 120s covers a cold image pull; the health poll has its own budget.
const CLI_TIMEOUT_MS = Number(process.env.KITESURF_CLI_TIMEOUT_MS || 120_000)

export const CONTAINER_NAME = 'kitesurf'
export const ENGINE_IMAGE = 'kitesurf-engine:latest'

export function isLoopback(httpBase) {
  const host = new URL(httpBase).hostname
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

export function hostPort(httpBase) {
  const url = new URL(httpBase)
  if (url.port) return Number(url.port)
  return url.protocol === 'https:' ? 443 : 80
}

/**
 * The plugin never publishes onto a network interface: both published ports
 * bind host loopback so the engine and the MCP bridge stay off the LAN.
 * The checkout bind-mount is read-only; wrangler persists to /tmp instead.
 * @param {{ checkout: string, hostEnginePort: number, hostMcpPort: number }} spec
 */
export function createArgs(spec) {
  return [
    'run', '-d', '--name', CONTAINER_NAME, '-c', '4', '-m', '4G',
    '-p', `127.0.0.1:${spec.hostEnginePort}:8787`,
    '-p', `127.0.0.1:${spec.hostMcpPort}:8791`,
    '--mount', `type=bind,source=${spec.checkout},target=/opt/kitesurf,readonly`,
    // The checkout stays read-only, but wrangler still needs a scratch dir:
    // it mkdtemp's under .wrangler/ even when --persist-to moves durable
    // state elsewhere. A tmpfs gives it a writable, container-lifetime dir.
    '--tmpfs', '/opt/kitesurf/packages/engine/.wrangler',
    ENGINE_IMAGE,
  ]
}

/**
 * The checkout is environment/config, never a compiled-in private path.
 * KITESURF_CHECKOUT env wins; the plugin may also forward its own config
 * field through `io.checkout`.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function checkoutPath(env = process.env) {
  const configured = env.KITESURF_CHECKOUT || ''
  if (!configured) {
    throw new KitesurfError('kitesurf.kite.checkout', '没有 KITESURF_CHECKOUT。把它或 config.checkout 指到一个已构建的 Kitesurf 源码目录')
  }
  if (!existsSync(configured)) {
    throw new KitesurfError('kitesurf.kite.checkout', `Kitesurf 源码目录不存在：${configured}`)
  }
  // A stale/unbuilt checkout (or an unmounted external volume) only surfaces
  // after a 20s warmup poll as a blank engine. Detect it up front instead.
  if (!existsSync(join(configured, 'packages/engine/wrangler.jsonc'))) {
    throw new KitesurfError('kitesurf.kite.checkout', `Kitesurf 源码目录缺少 packages/engine/wrangler.jsonc（卷是否已挂载/是否已构建）：${configured}`)
  }
  return configured
}

/** Strip host paths out of stderr before it reaches the route response. */
function scrubPaths(text) {
  return String(text).replace(/(?:\/[\w.@+-]+){2,}/g, '<path>')
}

/**
 * @param {string[]} args
 * @param {{ spawn?: typeof spawn }} [io]
 */
export function runContainer(args, io = {}) {
  const spawnFn = io.spawn || spawn
  return new Promise((resolve, reject) => {
    const child = spawnFn('container', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      try { child.kill('SIGKILL') } catch { /* gone */ }
      reject(new KitesurfError('kitesurf.kite.container', `container ${args[0]} timed out after ${Math.round(CLI_TIMEOUT_MS / 1000)}s`))
    }, CLI_TIMEOUT_MS)
    const finish = (fn) => (...params) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      fn(...params)
    }
    child.stdout?.on('data', (chunk) => { stdout += chunk })
    child.stderr?.on('data', (chunk) => { stderr += chunk })
    child.on('error', finish(reject))
    child.on('close', finish((code) => {
      if (code === 0) {
        resolve({ stdout, stderr })
      } else {
        // Progress lines (fetching/unpacking/starting) go to stdout; the real
        // failure line often lands there too (e.g. "failed to bootstrap").
        // Include the last meaningful lines from both so the pane shows the
        // actual cause, not just the CLI's debug-build warning.
        const detail = `${stderr.trim()}\n${stdout.trim()}`
        const lines = detail.split('\n').map((line) => line.trim()).filter((line) => line && !/^warning/i.test(line))
        const tail = lines.slice(-3).join(' | ') || `container ${args[0]} failed`
        reject(new KitesurfError('kitesurf.kite.container', scrubPaths(tail).slice(0, 300)))
      }
    }))
  })
}

/**
 * Is a host port free on loopback? Used before deleting a working container
 * for a port remap: if the NEW port is already taken (Cursor owns 8787 on the
 * owner's machine), the old container must survive — recreating would destroy
 * the only working engine and still fail.
 * @param {number} port
 * @returns {Promise<boolean>}
 */
export function hostPortFree(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: '127.0.0.1', port })
    const done = (free) => { try { socket.destroy() } catch { /* gone */ } resolve(free) }
    socket.setTimeout(700)
    socket.once('connect', () => done(false))
    socket.once('timeout', () => done(true))
    socket.once('error', () => done(true))
  })
}

/**
 * First free loopback port at or after `start`, stepping by 10 so a repaired
 * engine never lands next to a busy neighbour. Bounded — never scans forever.
 * @param {number} start
 * @param {(port: number) => Promise<boolean>} probe
 */
export async function firstFreePort(start, probe) {
  for (let i = 0; i < 12; i += 1) {
    const port = start + i * 10
    if (port > 65535) break
    if (await probe(port)) return port
  }
  return null
}

/** Read `configuration.publishedPorts[]` out of `container inspect` JSON. */
function publishedPortsOf(text) {
  try {
    const parsed = JSON.parse(text)
    const ports = parsed?.[0]?.configuration?.publishedPorts
    if (!Array.isArray(ports)) return null
    return ports
  } catch {
    return null
  }
}

/**
 * An existing container is only reused when its published ports still match
 * what the current settings need (host loopback + the configured ports);
 * otherwise it is removed and recreated so a stale mapping never silently
 * republishes the engine or bridge somewhere else.
 * @param {{ httpBase: string, mcpPort: number }} target
 * @param {{ run?: typeof runContainer, inspect?: (name: string) => Promise<string|null>, checkout?: string }} [io]
 */
export async function ensureLocalContainer(target, io = {}) {
  if (!isLoopback(target.httpBase)) return { local: false }
  const run = io.run || runContainer
  const inspect = io.inspect || (async (name) => {
    try {
      const { stdout } = await runContainer(['inspect', name])
      return stdout
    } catch {
      return null
    }
  })
  const enginePort = hostPort(target.httpBase)

  // The `container` CLI's inline bootstrap ("failed to bootstrap") is broken
  // on debug builds when the apiserver is cold. Prime it BEFORE any inspect,
  // run or start — a stopped container hitting `container start` needs the
  // same priming as a cold create. Idempotent and cheap when warm.
  const prime = async () => {
    try {
      await run(['system', 'start'])
    } catch (error) {
      throw new KitesurfError('kitesurf.kite.container',
        `container system start failed: ${scrubPaths((error instanceof Error ? error.message : String(error)).slice(0, 200))}`)
    }
  }
  // One bounded retry for transient CLI faults (cold apiserver, stuck pull,
  // name collision). Deterministic input errors must NOT be retried.
  const runOnce = async (args) => {
    try {
      return await run(args)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (/timed out|bootstrap|internalError|unavailable|not found|no such/i.test(message)) {
        await new Promise((resolve) => setTimeout(resolve, 600))
        return run(args)
      }
      throw error
    }
  }
  // Resolve the checkout BEFORE touching the subsystem: a missing
  // KITESURF_CHECKOUT is a config fault (400), not a container failure.
  // Deferred until we know a create is actually needed so a warm start never
  // demands a checkout it does not use.
  await prime()
  let inspectText = await inspect(CONTAINER_NAME)
  let exists = inspectText != null
  /** Set when a port-conflicted config adopts the container's real port. */
  let adopted = null
  if (exists) {
    const ports = publishedPortsOf(inspectText)
    if (ports !== null) {
      // Match means the same host ports AND loopback-bound: an old container
      // published on 0.0.0.0 must be rebuilt, not reused (S2-5).
      const loop = (p) => p?.hostAddress === '127.0.0.1' || p?.hostAddress === '::1'
      const engineRow = ports.find((p) => Number(p?.containerPort) === 8787 && loop(p))
      const mcpRow = ports.find((p) => Number(p?.containerPort) === 8791 && loop(p))
      const match = engineRow && Number(engineRow.hostPort) === enginePort
        && mcpRow && Number(mcpRow.hostPort) === target.mcpPort
      if (!match) {
        // A remap must not destroy a healthy engine. If the requested engine
        // port is already held by another process (Cursor owns 8787 here),
        // recreating would delete the working container AND fail to bind.
        const probe = io.portFree || hostPortFree
        const desiredFree = await probe(enginePort)
        if (!desiredFree) {
          const currentEnginePort = engineRow ? Number(engineRow.hostPort) : null
          const currentMcpPort = mcpRow ? Number(mcpRow.hostPort) : null
          // Resilience: the container's OWN ports are still free (it is the
          // one holding them). Adopt it instead of destroying it, and let the
          // host rewrite its effective httpBase/mcpPort to match. A wrong
          // config must never cost the operator a working engine.
          if (currentEnginePort && await probe(currentEnginePort)) {
            // Remember the adoption but DO NOT return here: a stopped
            // container still needs its `container start` below.
            adopted = {
              adopted: true,
              hostEnginePort: currentEnginePort,
              mcpPort: currentMcpPort || target.mcpPort,
              requestedEnginePort: enginePort,
            }
            exists = true
          } else {
            throw new KitesurfError('kitesurf.kite.portbusy',
              `端口 ${enginePort} 已被其他程序占用，且现有容器的端口也无法确认空闲；现有容器保持不变。请把 config.httpBase 指到空闲端口（本机引擎通常用 8798）`)
          }
        }
        if (!adopted) {
          await run(['delete', '--force', CONTAINER_NAME])
          exists = false
        }
      }
    }
  }
  if (!exists && !adopted) {
    const checkout = io.checkout || checkoutPath()
    // Resilience for a fresh create: if the preferred port is occupied, move
    // to the next free one instead of failing the whole bring-up.
    let createEnginePort = enginePort
    let createMcpPort = target.mcpPort
    const probe = io.portFree || hostPortFree
    if (!(await probe(createEnginePort))) {
      const free = await firstFreePort(enginePort + 10, probe)
      if (!free) {
        throw new KitesurfError('kitesurf.kite.portbusy',
          `端口 ${enginePort} 及其后候选端口都被占用，无法创建引擎容器`)
      }
      createEnginePort = free
      if (!(await probe(createMcpPort))) createMcpPort = free + 1
    }
    await runOnce(createArgs({
      checkout,
      hostEnginePort: createEnginePort,
      hostMcpPort: createMcpPort,
    }))
    return {
      local: true,
      created: true,
      hostEnginePort: createEnginePort,
      mcpPort: createMcpPort,
      ...(createEnginePort !== enginePort ? { requestedEnginePort: enginePort, repaired: true } : {}),
    }
  }
  try {
    await runOnce(['start', CONTAINER_NAME])
  } catch (error) {
    if (!/already|running/i.test(error instanceof Error ? error.message : '')) throw error
  }
  return adopted
    ? { local: true, created: false, ...adopted }
    : { local: true, created: false }
}

/**
 * A missing container is already stopped — that is the desired end state, not
 * a failure. Real stop errors still propagate so suspend keeps its phase.
 */
export async function stopLocalContainer(target, io = {}) {
  if (!isLoopback(target.httpBase)) return { local: false }
  const run = io.run || runContainer
  try {
    await run(['stop', CONTAINER_NAME])
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (!/no such|not found|does not exist/i.test(message)) throw error
  }
  return { local: true }
}
