import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dnprDefine } from '../../scripts/dnpr-define.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(root, 'package.json'))

function bakeBindings() {
  const repoRoot = join(root, '..')
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const result = spawnSync(process.execPath, [join(repoRoot, 'scripts/bake-plugin-bindings.mjs'), '--plugin', pkg.name], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
  const decl = spawnSync(process.execPath, [join(repoRoot, 'scripts/bake-declaration.mjs'), '--plugin', pkg.name], { stdio: 'inherit' })
  if (decl.status !== 0) process.exit(decl.status ?? 1)
}

bakeBindings()

const esbuild = require('esbuild')
const body = join(root, 'lib/client.body.js')

esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['src/host/route-guard-entry.js'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outfile: join(root, 'lib/route-guard.js'),
})

esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['src/host/perf.js'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  define: dnprDefine,
  outfile: join(root, 'lib/perf-host.js'),
})

const { version: pkgVersion } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['src/client/index.js'],
  bundle: true,
  format: 'iife',
  globalName: '__kitesurfExport',
  platform: 'browser',
  external: ['react', 'react-dom', 'react-dom/client', '@deepseek-ai/dsh-client-ui-primitives'],
  // Bake the package version so perf.join never reports a stale literal (S3-2).
  define: { __NKS_VERSION__: JSON.stringify(pkgVersion), ...dnprDefine },
  outfile: body,
})

const source = readFileSync(body, 'utf8').trim()
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
	id: "dsh-nano-kitesurf",
	factory: (require) => {
${source}
		return __kitesurfExport;
	}
});
`)
rmSync(body)

// skills/<name>/SKILL.md are GENERATED from lib/skill.js — one body, two
// consumers (runtime registration + filesystem discovery). Never edit
// the SKILL.md files by hand; they drifted that way before (R18).
// P0-6: kitesurf-cdp is a DIRECTORY skill — the entry is a ≤90-line index and
// the topic bodies come from src/skill/kitesurf-cdp/{references,templates}.
const { SKILL_BODIES } = await import(join(root, 'lib', 'skill.js'))
const pkgMeta = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const FRONTMATTER = {
  'kitesurf-cdp': 'Collaborate on a frontend through the Kitesurf CDP endpoint. Use when the user points at a page, or asks to inspect or change what Kitesurf is rendering. Do not launch Chrome.',
  'nano-kite': 'Start, resume, suspend, or restart the Kitesurf engine through the sandbox host. Use when the user types /nano-kite.',
}
const buildDate = new Date().toISOString().slice(0, 10)
for (const [name, text] of Object.entries(SKILL_BODIES)) {
  const dir = join(root, 'skills', name)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'SKILL.md'),
    `---\nname: ${name}\ndescription: ${FRONTMATTER[name]}\nversion: ${pkgMeta.version}\ndate: ${buildDate}\nuser-invocable: true\n---\n\n${text}\n`)
}

// ── Directory skill: copy authored references/templates + reconcile the
// routes this plugin owns. The error catalogue is DNLS's; the skill points at
// the runtime document instead of shipping a copy.
const skillSrc = join(root, 'src', 'skill', 'kitesurf-cdp')
const skillDst = join(root, 'skills', 'kitesurf-cdp')
import { cpSync, readdirSync } from 'node:fs'
cpSync(join(skillSrc, 'references'), join(skillDst, 'references'), { recursive: true })
cpSync(join(skillSrc, 'templates'), join(skillDst, 'templates'), { recursive: true })

// Coverage reconciliation: every route this plugin owns must appear in the
// generated skill tree, or the interface drifted from what the skill documents.
// DNK owns no routes today; the check stays so a re-added route cannot ship
// undocumented.
const { BINDING_TABLE } = await import(join(root, 'lib', 'bindings.js'))
const allMd = readdirSync(join(skillDst, 'references')).filter((f) => f.endsWith('.md'))
  .map((f) => readFileSync(join(skillDst, 'references', f), 'utf8'))
allMd.push(readFileSync(join(skillDst, 'SKILL.md'), 'utf8'))
const treeText = allMd.join('\n')
const missingRoutes = BINDING_TABLE.filter((r) => !treeText.includes(r.path)).map((r) => r.path)
if (missingRoutes.length) {
  console.error(`skill coverage drift: missing routes ${JSON.stringify(missingRoutes)}`)
  process.exit(1)
}

// Deliverable check (R1): every relative ./lib/ import in index.js must
// appear in package.json "files", or a packed install crashes on
// MODULE_NOT_FOUND at load.
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const indexSrc = readFileSync(join(root, 'index.js'), 'utf8')
const missing = []
for (const m of indexSrc.matchAll(/from\s+['"](\.\/?lib\/[^'"]+)['"]/g)) {
  const rel = m[1].replace(/^\.\//, '')
  if (!pkg.files.includes(rel)) missing.push(rel)
}
if (missing.length) {
  console.error(`files check: index.js imports missing from package.json "files": ${missing.join(', ')}`)
  process.exit(1)
}
console.log(`build ok: lib/bindings.js lib/route-guard.js lib/perf-host.js lib/client.js skills/*/SKILL.md + ${allMd.length - 1} references (coverage ${BINDING_TABLE.length} routes); files check passed`)
