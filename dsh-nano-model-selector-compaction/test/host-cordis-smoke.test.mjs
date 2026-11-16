/**
 * host-cordis-smoke.test.mjs — run the compaction engine and the DNMS host
 * entry against a REAL cordis Context resolved from the installed host.
 *
 * Why this file exists: the repo's host-side tests drive every engine with a
 * hand-written ctx double. Three shipped regressions lived exactly in the gap
 * between "the ctx we imagined" and the real cordis proxy:
 *   - ctx.webServer property access returned a SHADOW provision (fe63eec)
 *   - ctx.effect semantics differed from the mock (70214e8)
 *   - import('@deepseek-ai/cordis') fails inside the desktop asar domain
 *     (dbc483e), and the lazy Service resolution needed a real ctx shape
 *
 * Resolution order for the real cordis (first hit wins, all optional):
 *   1. $DSH_CORDIS — explicit path to a `node_modules` dir containing
 *      @deepseek-ai/cordis
 *   2. the desktop app asar (/Applications/DeepSeek Harness.app/…)
 *   3. the globally installed `dsh` CLI's node_modules
 *   4. this repo's own node_modules
 * Skips (does NOT fail) when no host cordis is reachable — this is an
 * optional layer, not a release gate.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const here = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = mkdtempSync(join(tmpdir(), 'dnmsc-cordis-smoke-'))
process.env.DSH_DATA_DIR ??= DATA_DIR
test.after(() => rmSync(DATA_DIR, { recursive: true, force: true }))

/* ------------------------- real cordis discovery ------------------------ */

function candidateRequirePaths() {
  const paths = []
  if (process.env.DSH_CORDIS) paths.push(process.env.DSH_CORDIS)
  paths.push(
    // Desktop app: node can read .asar paths as plain directories.
    '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules',
    // Globally installed dsh CLI (npm -g).
    join(homedir(), '.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules'),
    // Repo-local installs.
    join(here, '..', 'node_modules'),
    join(here, '..', '..', 'node_modules'),
  )
  return paths
}

function loadCordis() {
  for (const dir of candidateRequirePaths()) {
    if (!existsSync(join(dir, '@deepseek-ai/cordis'))) continue
    try {
      return createRequire(join(dir, 'index.js'))('@deepseek-ai/cordis')
    } catch { /* next candidate */ }
  }
  return null
}

const cordis = loadCordis()
const haveCordis = cordis !== null && typeof cordis.Context === 'function' && typeof cordis.Service === 'function'

const { HOST_SERVICE_SOURCE } = await import('../lib/host-services.js')
const { default: NanoCompactionEngine } = await import('../lib/host-compaction.js')

/* ------------------------------ service stubs --------------------------- */

function stubServices(Service) {
  // Minimal real-Service subclasses: what the engine's static inject needs.
  class SessionsService extends Service { static provide = 'sessions' }
  class LlmService extends Service { static provide = 'llm' }
  class TokenMeterService extends Service { static provide = 'tokenMeter' }
  return { SessionsService, LlmService, TokenMeterService }
}

/* -------------------------------- tests --------------------------------- */

test('real cordis: engine constructs inside an isolate realm and provides compaction', { skip: !haveCordis }, () => {
  const { Context, Service } = cordis
  const { SessionsService, LlmService, TokenMeterService } = stubServices(Service)
  const root = new Context()
  new SessionsService(root)
  new LlmService(root)
  new TokenMeterService(root)

  // The preset's `id: compaction` isolate group, modeled faithfully.
  const realm = root.extend({
    [Symbol.for('cordis.isolate')]: { compaction: Symbol('compaction') },
    // Channel 2 (ctx.baseUrl require) is what rescues the desktop domain:
    // point it at the very node_modules dir we loaded cordis from.
    baseUrl: join(cordisDirOf(cordis), 'index.js'),
  })

  const engine = new NanoCompactionEngine(realm)
  assert.ok(engine instanceof Service, 'engine must be a real cordis Service instance')
  assert.ok(realm.compaction != null && typeof realm.compaction === 'object',
    'ctx.compaction must resolve to a real service object inside the isolate')
})

test('real cordis: lazy HostService resolves via ctx.baseUrl when import fails', { skip: !haveCordis }, () => {
  // The 1115 desktop regression: import('@deepseek-ai/cordis') threw inside
  // the plugin's domain, so HostService stayed a lazy placeholder and the
  // first construction had to resolve through ctx.baseUrl / service
  // derivation. Constructing on a ctx carrying baseUrl exercises exactly
  // that channel.
  const { Context, Service } = cordis
  const realm = new Context().extend({ baseUrl: join(cordisDirOf(cordis), 'index.js') })
  const engine = new NanoCompactionEngine(realm)
  assert.ok(engine instanceof Service)
  assert.equal(typeof HOST_SERVICE_SOURCE(), 'string')
})

test('real cordis: fail-closed stays closed when nothing resolves', { skip: !haveCordis }, () => {
  // resolveHostService caches after the first success, so the fail-closed
  // path must be proven in a fresh process: a bare Context (no baseUrl, no
  // service instances) must make engine construction throw, never fall back
  // to a shadow Service.
  const script = `
    import { createRequire } from 'node:module'
    const req = createRequire(${JSON.stringify(join(cordisDirOf(cordis), 'index.js'))})
    const { Context } = req('@deepseek-ai/cordis')
    const { default: Engine } = await import(${JSON.stringify(join(here, '..', 'lib', 'host-compaction.js'))})
    try { new Engine(new Context()); console.log('NO-THROW') }
    catch (e) { console.log('THREW', String(e && e.message || e).slice(0, 160)) }
  `
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' })
  const out = `${r.stdout}${r.stderr}`
  assert.match(out, /THREW.*(not resolvable|fail.?closed|cannot run)/s,
    `engine on a bare Context must fail closed; got: ${out.slice(0, 200)}`)
})

function cordisDirOf(mod) {
  // Locate the dir we required cordis from so tests can point baseUrl at it.
  for (const dir of candidateRequirePaths()) {
    if (existsSync(join(dir, '@deepseek-ai/cordis'))) return dir
  }
  return join(here, '..', 'node_modules')
}
