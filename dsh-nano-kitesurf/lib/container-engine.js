/**
 * Local Kitesurf container, started from inside the plugin.
 * A remote httpBase is not this machine, so it is only probed.
 */

import { existsSync } from 'node:fs'
import { createConnection } from 'node:net'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { KitesurfError } from './engine.js'

// A container CLI call can hang (cold apiserver, stuck image pull). Without a
// ceiling the /kite route would block forever and the pane would never get an
// answer. 120s covers a cold image pull; the health poll has its own budget.
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
 * @param {{ checkout: string, hostEnginePort: number, hostMcpPort: number, stateDir: string }} spec
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
    // Durable wrangler state (KV, D1, caches) across container recreation.
    ...(spec.stateDir ? ['--mount', `type=bind,source=${spec.stateDir},target=/var/lib/kitesurf-state`] : []),
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
 */
export function runContainer(args) {
  return Promise.reject(new KitesurfError('kitesurf.kite.container', `this package does not run a container (${args?.[0] || 'command'})`))
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
  void io
  throw new KitesurfError('kitesurf.kite.container', 'this package does not start a container')
}

export async function stopLocalContainer(target, io = {}) {
  void io
  if (!isLoopback(target.httpBase)) return { local: false }
  return { local: true, stopped: false }
}


/** Durable wrangler state directory (KV/D1) — survives container recreation. */
export function statePath(env = process.env) {
  return env.KITESURF_STATE_DIR || join(homedir(), '.dsh-kitesurf-state')
}
