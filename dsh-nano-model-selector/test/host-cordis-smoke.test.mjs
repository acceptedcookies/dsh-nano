/**
 * host-cordis-smoke.test.mjs — drive the DNMS host entry `apply(ctx)` on a
 * REAL cordis Context resolved from the installed host.
 *
 * Why: the repo's host tests hand every plugin a hand-made ctx double whose
 * semantics we invented. The fe63eec/70214e8 regressions lived exactly in
 * the gap — `ctx.webServer` property access through cordis's Proxy returned
 * a SHADOW provision (every POST 405'd while match() claimed a hit), and the
 * mock's ctx.effect did not have cordis's run-effect-immediately semantics.
 * Only a real Context reproduces the proxy/get/effect contract the code
 * actually runs under.
 *
 * Skips when no host cordis is reachable — optional layer, not a gate.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = mkdtempSync(join(tmpdir(), 'dnms-cordis-smoke-'))
process.env.DSH_DATA_DIR ??= DATA_DIR
test.after(() => rmSync(DATA_DIR, { recursive: true, force: true }))

function candidateRequirePaths() {
  const paths = []
  if (process.env.DSH_CORDIS) paths.push(process.env.DSH_CORDIS)
  paths.push(
    '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules',
    join(homedir(), '.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules'),
    join(here, '..', 'node_modules'),
    join(here, '..', '..', 'node_modules'),
  )
  return paths
}
function loadCordis() {
  for (const dir of candidateRequirePaths()) {
    if (!existsSync(join(dir, '@deepseek-ai/cordis'))) continue
    try { return createRequire(join(dir, 'index.js'))('@deepseek-ai/cordis') } catch { /* next */ }
  }
  return null
}
const cordis = loadCordis()
const haveCordis = cordis !== null && typeof cordis.Context === 'function' && typeof cordis.Service === 'function'

/* ------------------------ stub services on a real ctx -------------------- */

function installStubs(ctx, Service) {
  const registered = []
  const effects = []
  class WebServerService extends Service {
    static provide = 'webServer'
    register(spec) { registered.push(spec); return () => {} }
    match() { return undefined }
  }
  class ConnectionService extends Service {
    static provide = 'connection'
    requestRejection() { return undefined }
  }
  class SkillsService extends Service {
    static provide = 'skills'
    register() { return { dispose: () => {} } }
  }
  class LlmService extends Service {
    static provide = 'llm'
    listProviders() { return [] }
    async listModels() { return [] }
  }
  new WebServerService(ctx)
  new ConnectionService(ctx)
  new SkillsService(ctx)
  new LlmService(ctx)
  return { registered, effects }
}

/* -------------------------------- tests --------------------------------- */

test('real cordis: apply() registers every route-table path through ctx.get("webServer")', { skip: !haveCordis }, async () => {
  const { Context, Service } = cordis
  const ctx = new Context()
  const { registered } = installStubs(ctx, Service)
  const { apply } = await import('../index.js')
  const { ROUTE_TABLE } = await import('../lib/route-table.js')

  assert.doesNotThrow(() => apply(ctx))
  // fe63eec fingerprint: registration went through the real proxy into our
  // webServer stub — NOT a shadow provision that silently ate the calls.
  const paths = new Set(registered.map(r => r.path))
  for (const row of ROUTE_TABLE) {
    assert.ok(paths.has(row.path), `route ${row.path} must reach webServer.register`)
  }
  assert.ok(registered.length >= ROUTE_TABLE.length, 'at least one register call per table row')
})

test('real cordis: route registration runs as a cordis effect (runs immediately)', { skip: !haveCordis }, async () => {
  // 70214e8 fingerprint: the guard wraps register() in ctx.effect(...); on a
  // real Context that executes the effect body at once. If apply() returned
  // without any registered route, the effect body was disposed instead of run.
  const { Context, Service } = cordis
  const ctx = new Context()
  const { registered } = installStubs(ctx, Service)
  const { apply } = await import('../index.js')
  apply(ctx)
  assert.ok(registered.length > 0, 'ctx.effect must run the register body, not queue it')
})

test('real cordis: fail-closed without connection service', { skip: !haveCordis }, async () => {
  // The guard refuses to register routes when ctx.get('connection') has no
  // requestRejection — verify the refusal surfaces on a real Context too.
  const { Context, Service } = cordis
  const ctx = new Context()
  class WebServerService extends Service { static provide = 'webServer'; register() { return () => {} } }
  class SkillsService extends Service { static provide = 'skills'; register() { return { dispose() {} } } }
  class LlmService extends Service { static provide = 'llm'; listProviders() { return [] } async listModels() { return [] } }
  new WebServerService(ctx); new SkillsService(ctx); new LlmService(ctx)
  const { apply } = await import('../index.js')
  assert.throws(() => apply(ctx), /no-connection|no-request-rejection/)
})

test('real cordis: GET async-compact?sessionId= serves the companion ledger as `history`', { skip: !haveCordis }, async () => {
  // End-to-end through the real guard + handler: the ledger reader is only
  // useful if the query parameter actually reaches it and the field lands in
  // the JSON body the dialog parses.
  const { Context, Service } = cordis
  const ctx = new Context()
  const { registered } = installStubs(ctx, Service)
  const { apply } = await import('../index.js')
  apply(ctx)

  const route = registered.find(r => r.path === '/nano-model-selector/async-compact')
  assert.ok(route !== undefined, 'async-compact route must be registered')

  // Seed a ledger through the documented location only.
  const { mkdirSync, writeFileSync } = await import('node:fs')
  const dir = join(process.env.DSH_DATA_DIR, 'plugins/nano-model-selector/async-history')
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'session-route.jsonl'), [
    { at: '2026-11-16T03:00:00.000Z', kind: 'arm', fill: 0.71, window: 262000, retain: 39300 },
    { at: '2026-11-16T03:00:02.000Z', kind: 'commit', compactionId: 'c-1', tokens: 862, records: 5 },
  ].map(r => `${JSON.stringify(r)}\n`).join(''))

  const invoke = async url => {
    let body = null
    const res = {
      statusCode: 0,
      headers: {},
      setHeader(name, value) { this.headers[name] = value },
      end(text) { body = text },
      writeHead(code) { this.statusCode = code; return this },
      write() {},
    }
    await route.handler({ method: 'GET', url, headers: { host: 'localhost' } }, res)
    return body === null ? null : JSON.parse(body)
  }

  const withHistory = await invoke('/nano-model-selector/async-compact?sessionId=session-route')
  assert.equal(withHistory.ok, true)
  assert.ok(withHistory.history !== undefined, 'history must be present when sessionId is given')
  assert.equal(withHistory.history.records.length, 2)
  assert.equal(withHistory.history.summary.arm, 1)
  assert.equal(withHistory.history.summary.commit, 1)
  assert.equal(withHistory.history.degraded, null)

  // Without the parameter the response keeps its original shape.
  const withoutHistory = await invoke('/nano-model-selector/async-compact')
  assert.equal(withoutHistory.ok, true)
  assert.equal(withoutHistory.history, undefined, 'history must stay opt-in')

  // An unknown session is an empty timeline, not an error.
  const unknown = await invoke('/nano-model-selector/async-compact?sessionId=session-absent')
  assert.deepEqual(unknown.history.records, [])
  assert.equal(unknown.history.degraded, null)
})
