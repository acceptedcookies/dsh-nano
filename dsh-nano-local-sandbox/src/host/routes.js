export const STATUS_ROUTE = '/nano-local-sandbox/status'
export const OPEN_ROUTE = '/nano-local-sandbox/open'
export const SHOT_ROUTE = '/nano-local-sandbox/shot'
export const HISTORY_ROUTE = '/nano-local-sandbox/history'
export const PICK_ROUTE = '/nano-local-sandbox/pick'
export const EDIT_ROUTE = '/nano-local-sandbox/edit'
export const SETTINGS_ROUTE = '/nano-local-sandbox/settings'
export const PERF_REVIEW_HOST_ROUTE = '/nano-local-sandbox/perf-review/host'
export const PERF_REPORT_ROUTE = '/nano-local-sandbox/perf-report'
export const KITE_ROUTE = '/nano-local-sandbox/kite'
export const CONSOLE_ROUTE = '/nano-local-sandbox/console'
export const OPERATIONS_ROUTE = '/nano-local-sandbox/operations'
export const DIAGNOSTICS_ROUTE = '/nano-local-sandbox/diagnostics'
export const PORTS_ROUTE = '/nano-local-sandbox/ports'
export const RECOVER_ROUTE = '/nano-local-sandbox/recover'
export const DOM_ROUTE = '/nano-local-sandbox/dom'
export const SELFTEST_ROUTE = '/nano-local-sandbox/selftest'
export const ELEMENTS_ROUTE = '/nano-local-sandbox/elements'
export const BROWSE_HISTORY_ROUTE = '/nano-local-sandbox/browse-history'
export const NETWORK_ROUTE = '/nano-local-sandbox/network'
export const TARGETS_ROUTE = '/nano-local-sandbox/targets'
export const EVALUATE_ROUTE = '/nano-local-sandbox/evaluate'
export const WAIT_ROUTE = '/nano-local-sandbox/wait'

import { ROUTE_TABLE } from '../../lib/route-table.js'
import { createCdpKeeper } from './cdp-keeper.js'

const keeper = createCdpKeeper()

export function routeSpecs(deps = {}) {
  return ROUTE_TABLE.map((row) => ({
    path: row.path,
    methods: [...row.methods],
    sessionBinding: true,
    bodyLimit: row.bodyLimit,
    async handler(req, res) {
      if (row.path.endsWith('/evaluate')) {
        const expression = deps.expression ?? ''
        const result = await keeper.evaluate(deps.instanceId, expression, deps.execute)
        res.statusCode = result.status
        res.end(JSON.stringify({ ok: result.ok, errorId: result.errorId ?? null, dom: result.dom }))
        return
      }
      res.statusCode = 200
      res.end(JSON.stringify({ ok: true, path: row.path }))
    },
  }))
}

/** WebSocket upgrade: rejection runs before any handshake. */
export function acceptUpgrade(req, socket, requestRejection, onHandshake) {
  const denied = requestRejection(req)
  if (denied !== undefined) {
    socket.statusCode = denied
    return { handshake: false, handled: false }
  }
  onHandshake(req, socket)
  return { handshake: true, handled: true }
}

export { keeper }
