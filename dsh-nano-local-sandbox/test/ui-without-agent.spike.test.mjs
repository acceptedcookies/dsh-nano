import assert from 'node:assert/strict'
import test from 'node:test'
import { registerRoutes } from '../lib/route-guard.js'
import { ROUTE_TABLE } from '../lib/route-table.js'
import { routeSpecs } from '../src/host/routes.js'
import { ERROR_CATALOG } from '../src/host/error-catalog.js'

function host(rejection) {
  const registered = []
  return {
    registered,
    ctx: {
      get(name) {
        if (name !== 'connection') return null
        return { requestRejection: rejection }
      },
      webServer: {
        register(route) {
          registered.push(route)
          return () => {}
        },
      },
    },
  }
}

test('a shot with no agent is not 200, and rejection runs before the handler', async () => {
  const denied = host(() => 401)
  registerRoutes(denied.ctx, routeSpecs(), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  const shot = denied.registered.find((route) => route.path === '/nano-local-sandbox/shot')
  let deniedBody
  const res = { statusCode: 0, end(payload) { deniedBody = payload } }
  await shot.handler({ method: 'POST' }, res)
  assert.equal(res.statusCode, 401)
  assert.equal(deniedBody, undefined)

  const open = host(() => undefined)
  registerRoutes(open.ctx, routeSpecs({ mcpConnections: 0 }), { table: ROUTE_TABLE, plugin: 'dsh-nano-local-sandbox' })
  const live = open.registered.find((route) => route.path === '/nano-local-sandbox/shot')
  let body = ''
  const okRes = {
    statusCode: 0,
    end(payload) { body = payload },
  }
  await live.handler({ method: 'POST' }, okRes)
  assert.notEqual(okRes.statusCode, 200)
  const parsed = JSON.parse(body)
  assert.equal(ERROR_CATALOG.some((row) => row.example === parsed.errorId || new RegExp(row.match).test(parsed.errorId)), true)
})
