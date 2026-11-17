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

/* ---------------------- ACE-1117 P2: patch structure (T07) ---------------- */

test('cordis.patch.yml: tools row outside the isolate + base flat row disabled (T07)', async () => {
  const { readFileSync: read } = await import('node:fs')
  const text = read(join(here, '..', 'cordis.patch.yml'), 'utf8')

  // The tools row exists once per preset (anchor + aliases), always at preset
  // TOP level — never inside an `id: compaction` group's `config:` block.
  const toolsRows = text.match(/id: inspect-checkpoint\n\s+name: dsh-nano-model-selector-compaction\/tools/g)
  assert.ok(toolsRows !== null && toolsRows.length === 1, 'tools row must appear once (other presets alias it)')
  const aliases = text.match(/-\s+\*a\d+/g) ?? []
  assert.ok(aliases.length >= 3, `remaining presets must alias the tools row, found ${aliases.length}`)

  // The row must NOT sit inside the isolate group's config block: every
  // inspect-checkpoint occurrence must follow the closing of a `config:` array
  // (i.e. be at `      - ` preset level, not `          - ` isolate level).
  const isolateLevel = text.match(/^\s{10,}- &a\d+\n\s+id: inspect-checkpoint/m)
  assert.equal(isolateLevel, null, 'tools row must never mount inside the isolate group')
  assert.match(text, /^      - &a2\n        id: inspect-checkpoint/m,
    'the anchored tools row must be at preset top level (6-space indent)')

  // Base flat row: a profile-root `- id: compaction-basic` with disabled:true
  // covers the un-isolated base mount (-10⑤).
  assert.match(text, /\n- id: compaction-basic\n  disabled: true\n?/,
    'the base bundle flat compaction-basic row must be pinned disabled')

  // Every preset's isolate still carries our Provider row + disabled basic.
  for (const preset of ['preset-standard', 'preset-ptc', 'preset-minimal', 'preset-cordis']) {
    const start = text.indexOf(`- id: ${preset}`)
    const end = text.indexOf('\n- id: preset-', start + 1)
    const block = text.slice(start, end === -1 ? text.length : end)
    assert.match(block, /id: nano-model-selector-compaction\n\s+name: dsh-nano-model-selector-compaction|^\s+- \*a1$/m, preset)
    assert.match(block, /- id: compaction-basic\n\s+name: "@deepseek-ai\/dsh-compaction-basic"\n\s+disabled: true/, preset)
    assert.match(block, /inspect-checkpoint|^\s+- \*a2$/m, `${preset} must carry the tools row (anchor or alias)`)
  }
})

/* ------------------ ACE-1117 P6: closure & non-target audit (T19) --------- */

test('closure diff touches only :20/:74; non-target paths unchanged vs fb7264d (T19)', () => {
  const repoRoot = join(here, '..', '..')
  const base = 'fb7264d'
  const git = (args) => spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' }).stdout.trim()

  // (a) The closure file's -U0 hunks anchor only near :20 and :74.
  const diff = git(['diff', '-U0', `${base}...HEAD`, '--', 'docs/specs/dsh-nano-model-selector/closure/DNMS01-closure.md'])
  const anchors = [...diff.matchAll(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/gm)].map(m => Number(m[1]))
  assert.ok(anchors.length >= 1, 'the closure file must carry exactly the two scheduled edits')
  for (const a of anchors) {
    assert.ok(a >= 18 && a <= 22 || a >= 72 && a <= 78, `closure hunk anchors at :${a}, only :20/:74 neighbourhoods allowed`)
  }
  assert.equal(anchors.every(a => a >= 15 && a <= 80), true)

  // (b) Non-target paths must be untouched.
  const changed = git(['diff', '--name-only', `${base}...HEAD`]).split('\n').filter(Boolean)
  for (const forbidden of [
    'docs/specs/dsh-nano-model-selector/async-compaction.md',
    'RELEASE.md',
    'docs/specs/dsh-nano-model-selector/qna/DNMS01-qna.md',
    'docs/specs/dsh-nano-model-selector/qna/DNMS01-qna-truth.md',
    'scripts/test-all.mjs',
  ]) {
    assert.equal(changed.includes(forbidden), false, `${forbidden} must have zero diff vs ${base}`)
  }
  // No package's version field may move.
  const pkgNames = changed.filter(f => f.endsWith('package.json'))
  for (const p of pkgNames) {
    const d = git(['diff', `${base}...HEAD`, '--', p])
    assert.equal(/^[+-]\s*"version"/m.test(d), false, `${p}: version must not change`)
  }
  // No new check-ace scripts, nothing from /tmp evidence.
  const status = spawnSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' }).stdout
  // Untracked files are never legitimate deliverables; tracked modifications
  // are development-loop residue caught by the name-only diff above.
  const untracked = status.split('\n').filter(l => l.startsWith('?? '))
  assert.deepEqual(untracked, [], `untracked files present: ${untracked.join(', ')}`)
  assert.equal(/check-ace/i.test(status), false, 'untracked scripts/check-ace* is a failure')
  assert.equal(status.includes('dnms-evidence'), false)
  const scriptDiff = git(['diff', `${base}...HEAD`, '--', 'scripts/test-all.mjs'])
  assert.equal(scriptDiff, '', 'scripts/test-all.mjs must not move')
})
