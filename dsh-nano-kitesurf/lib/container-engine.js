/**
 * Local Kitesurf container, started from inside the plugin.
 * A remote httpBase is not this machine, so it is only probed.
 */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { KitesurfError } from './engine.js'

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
    child.stdout?.on('data', (chunk) => { stdout += chunk })
    child.stderr?.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => reject(error))
    child.on('close', (code) => {
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
    })
  })
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
  const inspectText = await inspect(CONTAINER_NAME)
  let exists = inspectText != null
  if (exists) {
    const ports = publishedPortsOf(inspectText)
    if (ports !== null) {
      // Match means the same host ports AND loopback-bound: an old container
      // published on 0.0.0.0 must be rebuilt, not reused (S2-5).
      const loop = (p) => p?.hostAddress === '127.0.0.1' || p?.hostAddress === '::1'
      const match = ports.some((p) => Number(p?.containerPort) === 8787 && Number(p?.hostPort) === enginePort && loop(p))
        && ports.some((p) => Number(p?.containerPort) === 8791 && Number(p?.hostPort) === target.mcpPort && loop(p))
      if (!match) {
        await run(['delete', '--force', CONTAINER_NAME])
        exists = false
      }
    }
  }
  if (!exists) {
    // Resolve the checkout BEFORE touching the subsystem: a missing
    // KITESURF_CHECKOUT is a config fault (400), not a container failure.
    const checkout = io.checkout || checkoutPath()
    // The `container` CLI's inline bootstrap ("failed to bootstrap") is
    // broken on debug builds when the apiserver is cold. Prime it explicitly
    // — idempotent and cheap when the daemon is already warm.
    try {
      await run(['system', 'start'])
    } catch (error) {
      throw new KitesurfError('kitesurf.kite.container',
        `container system start failed: ${scrubPaths((error instanceof Error ? error.message : String(error)).slice(0, 200))}`)
    }
    await run(createArgs({
      checkout,
      hostEnginePort: enginePort,
      hostMcpPort: target.mcpPort,
    }))
    return { local: true, created: true }
  }
  try {
    await run(['start', CONTAINER_NAME])
  } catch (error) {
    if (!/already|running/i.test(error instanceof Error ? error.message : '')) throw error
  }
  return { local: true, created: false }
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
