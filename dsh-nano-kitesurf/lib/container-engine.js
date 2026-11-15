/**
 * Loopback engine endpoint helpers (P3-04 container-era retirement).
 *
 * This file used to own the local-container lifecycle (`createArgs`,
 * `checkoutPath`, `runContainer`, `ensureLocalContainer`, `stopLocalContainer`,
 * `publishedPortsOf`, `firstFreePort`, `statePath`, `CONTAINER_NAME`,
 * `ENGINE_IMAGE`, `scrubPaths`). Those are gone: the package does not run a
 * container (runContainer was already a fail-closed stub before this pass) —
 * container lifecycle now lives in `dsh-nano-local-sandbox`, the only sandbox
 * owner. What remains here is the endpoint/port truth the pane and self-test
 * actually read: loopback detection + host-port probing. A remote httpBase is
 * not this machine, so it is only ever probed, never managed.
 */

import { createConnection } from 'node:net'

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
 * Is a host port free on loopback? Used to report who holds the engine/MCP
 * port (this-container / other / free) in the pane's port truth — a probe, not
 * a manage call.
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
