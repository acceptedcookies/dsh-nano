import { test } from 'node:test'
import assert from 'node:assert/strict'

import { Context } from '@deepseek-ai/cordis'

import { apply, Config, inject, name } from '../lib/host.js'
import { BINDING_TABLE, PREFIX } from '../lib/bindings.js'

/**
 * Drives the DEPLOYED artifact (`lib/host.js`) through a real cordis Context —
 * not a mocked ctx. The two CF1115 host regressions (2026-11-16) only exist
 * under real cordis semantics:
 *
 *   1. `ctx.effect(() => disposeAll(), ...)` invoked the batch disposer the
 *      moment registration finished → every route unregistered in the same
 *      tick → all plugin routes 404 on live hosts (fixed in 70214e8).
 *   2. Registering on a ctx-derived object instead of `ctx.get('webServer')`
 *      resolves a shadow provision → match() hits a table the listener never
 *      serves (fixed in fe63eec/7efe14e).
 *
 * Mock ctx tests cannot see either failure: their effect() may run eagerly,
 * but nothing asserts teardown did NOT happen, and their fake webServer
 * disposer never actually removes the route. A real Context has a real fiber
 * lifecycle and real service resolution — both regressions reproduce here.
 *
 * Optional test (node --test); not a release gate.
 */

/** Minimal webServer honoring the real contract (kind/path register, match). */
function stubWebServer() {
  const routes = new Map() // `${kind}:${path}` → route
  return {
    routes,
    register(route) {
      const key = `${route.kind}:${route.path}`
      if (routes.has(key)) throw new Error(`duplicate ${route.kind} route ${route.path}`)
      routes.set(key, route)
      return () => routes.delete(key)
    },
    registerUpgrade(route) {
      const key = `upgrade:${route.path}`
      if (routes.has(key)) throw new Error(`duplicate upgrade route ${route.path}`)
      routes.set(key, route)
      return () => routes.delete(key)
    },
    // exact hit, else longest prefix, else nothing — mirrors the real matcher
    match(pathname) {
      const exact = routes.get(`exact:${pathname}`)
      if (exact) return exact
      let best
      for (const [key, route] of routes) {
        if (!key.startsWith('prefix:')) continue
        if (pathname.startsWith(route.path) && (best === undefined || route.path.length > best.path.length)) {
          best = route
        }
      }
      return best
    },
  }
}

/** connection service: reject unauthenticated probes with 401 like the real fence. */
const stubConnection = { requestRejection: (req) => (req?.headers?.authorization ? undefined : 401) }

// apply() touches these only lazily inside handlers; providing inert stubs is
// enough for the inject gate to pass without running handler logic.
const INERT = Object.freeze({})
const STUBS = {
  fs: INERT,
  sessions: INERT,
  webServer: undefined, // filled per-test
  subprocess: INERT,
  sandbox: INERT,
  sandboxPolicy: INERT,
  connection: stubConnection,
  sessionPersistence: INERT,
}

function fakeRes() {
  return {
    statusCode: 0,
    headers: {},
    setHeader(k, v) { this.headers[k.toLowerCase()] = v },
    end() { this.ended = true },
  }
}

test('lib apply() mounts every BINDING_TABLE route and keeps them alive on the serving webServer', async () => {
  const ctx = new Context()
  const webServer = stubWebServer()
  for (const [service, impl] of Object.entries({ ...STUBS, webServer })) {
    ctx.provide(service, impl)
  }

  await ctx.plugin({ apply, Config, inject, name }, {})

  const paths = BINDING_TABLE.map((row) => `${row.match === 'prefix' ? 'prefix' : 'exact'}:${row.path}`)
  assert.equal(webServer.routes.size, BINDING_TABLE.length, 'every binding produced a registration')
  for (const key of paths) {
    assert.ok(webServer.routes.has(key), `missing route ${key} — registered then torn down early?`)
  }
  for (const row of BINDING_TABLE) {
    assert.ok(webServer.match(row.path), `match(${row.path}) found no live route`)
  }

  // The serving instance must actually answer: probe one route through the
  // registered handler. requestRejection 401s an unauthenticated probe —
  // proving the fence + handler wiring, not just a map entry.
  const route = webServer.match(`${PREFIX}/status`)
  const res = fakeRes()
  await route.handler({ url: '/x', method: 'GET', headers: {} }, res)
  assert.equal(res.statusCode, 401, 'guard must reject unauthenticated probe, not 404 or crash')
})

test('fiber disposal unregisters the whole batch — teardown semantics are real, not immediate', async () => {
  const ctx = new Context()
  const webServer = stubWebServer()
  for (const [service, impl] of Object.entries({ ...STUBS, webServer })) {
    ctx.provide(service, impl)
  }

  const fiber = await ctx.plugin({ apply, Config, inject, name }, {})
  assert.equal(webServer.routes.size, BINDING_TABLE.length)

  await fiber.dispose()
  // Disposal may complete on a later microtask; give the async teardown a turn.
  await new Promise((resolve) => setTimeout(resolve, 0))
  assert.equal(webServer.routes.size, 0, 'routes must be removed exactly at fiber teardown')
})
