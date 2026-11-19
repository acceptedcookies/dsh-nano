#!/usr/bin/env node
/**
 * deploy-local.mjs — deploy repo plugins into a local dsh home, on any OS.
 *
 * What `dsh plugin add` does NOT cover: the Electron desktop profile and any
 * local file-copy install. This script performs the same layout our manual
 * deploys use, portably:
 *
 *   <dshHome>/plugins/<pkg>/            runtime files (from package.json `files`)
 *   <dshHome>/profiles/<profile>/package.json   file: dep + bundles entry
 *   <dshHome>/profiles/<profile>/node_modules/<pkg>  symlink → ../../plugins/<pkg>
 *
 * Deployed package.json is rewritten: `dependencies` and `devDependencies`
 * are emptied (build-time `file:` deps are already bundled into lib/ and the
 * relative paths would not resolve inside the dsh home).
 *
 * Usage:
 *   node scripts/deploy-local.mjs --home <dshHome> [--profile <name>]
 *                                 [--plugins a,b] [--no-build] [--dry-run]
 *
 * Defaults: --home = $DSH_HOME || ~/.dsh; --profile = the single existing
 * profile, else "web"; --plugins = every directory that has package.json +
 * cordis.patch.yml; build runs `node scripts/build-client.mjs` per plugin
 * (requires `npm ci` to have been run in each plugin first).
 *
 * The build writes `lib/` (and other generated files) in the source tree so
 * the copy below can read them. When that plugin's own sources and the shared
 * `packages/` inputs were clean, those generated writes are restored after the
 * copy. A desktop deploy must not leave a git diff that is only esbuild
 * re-emitting a committed bundle. A real source edit is left in place so it
 * can be committed with its bundle.
 *
 * After deploying, restart the host that serves the profile — plugin code is
 * loaded at host start. On Windows no admin rights are needed: node_modules
 * links are created as junctions.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import {
  cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  realpathSync, rmSync, statSync, symlinkSync, writeFileSync,
} from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const isWin = process.platform === 'win32'
const repoGitSha = (() => {
  const r = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' })
  return r.status === 0 ? r.stdout.trim() : 'dev'
})()

function fail(msg) { console.error(`[deploy] ${msg}`); process.exit(1) }
function log(msg) { console.log(`[deploy] ${msg}`) }

/** Repo-relative paths a plugin build may rewrite without an author edit.
 *  `lib/` is the runtime bundle, `src/host/route-table.js` is baked from the
 *  route ledger, and kitesurf `skills/**.md` is generated from `lib/skill.js`. */
function isGeneratedPath(rel) {
  const norm = rel.replaceAll('\\', '/')
  if (norm.includes('/lib/')) return true
  if (norm.endsWith('/src/host/route-table.js')) return true
  if (/\/skills\/.+\.md$/.test(norm)) return true
  return false
}

function gitPaths(args) {
  const result = spawnSync('git', args, { cwd: repoRoot, encoding: 'utf8' })
  if (result.status !== 0) return null
  return result.stdout.split('\0').filter(Boolean)
}

/** Differences from HEAD, plus untracked files, under `scope`. Null when git cannot say. */
function snapshot(scope) {
  const tracked = gitPaths(['diff', 'HEAD', '--name-only', '-z', '--', scope])
  const untracked = gitPaths(['ls-files', '--others', '--exclude-standard', '-z', '--', scope])
  if (tracked === null || untracked === null) return null
  return { tracked: new Set(tracked), untracked: new Set(untracked) }
}

function scopeDirty(snap) {
  return snap !== null && (snap.tracked.size > 0 || snap.untracked.size > 0)
}

/** True when this plugin has an author edit outside generated bundles. */
function ownSourceDirty(name, snap) {
  if (snap === null) return true
  for (const rel of [...snap.tracked, ...snap.untracked]) {
    if (!rel.startsWith(`${name}/`)) continue
    if (!isGeneratedPath(rel)) return true
  }
  return false
}

/** Expand `~` and resolve to an absolute path (portable, no shell). */
function resolvePath(p) {
  if (p === '~' || p.startsWith(`~${sep}`) || p.startsWith('~/') || p.startsWith('~\\')) {
    p = join(homedir(), p.slice(1))
  }
  return resolve(p)
}

// ---- args -----------------------------------------------------------------
const argv = process.argv.slice(2)
function argValue(flag) {
  const i = argv.indexOf(flag)
  return i === -1 ? undefined : argv[i + 1]
}
const dryRun = argv.includes('--dry-run')
const noBuild = argv.includes('--no-build')
const only = argValue('--plugins')?.split(',').map(s => s.trim()).filter(Boolean)
const dshHome = resolvePath(argValue('--home') ?? process.env.DSH_HOME ?? '~/.dsh')

// ---- one command, every instance ------------------------------------------
/**
 * The three local instances this repo is developed against (INTRODUCTION.md
 * §0). `--all-homes` re-runs this script once per home so a change never lands
 * in one instance and not the others — the exact drift that made a redeploy
 * look broken. Desktop has no service: the app is restarted by hand.
 */
const HOMES = [
  { home: '~/.dsh', profile: 'web', service: 'ai.deepseek.dsh.web' },
  { home: '~/.dsh-dev', profile: 'web', service: 'ai.deepseek.dsh.dev.web' },
  { home: '~/.dsh-desktop', profile: 'desktop', service: null },
]

if (argv.includes('--all-homes')) {
  const restart = argv.includes('--restart')
  const pass = argv.filter((a, i) => !['--all-homes', '--restart'].includes(a) && argv[i - 1] !== '--home' && argv[i - 1] !== '--profile' && a !== argValue('--home') && a !== argValue('--profile'))
  let failed = 0
  for (const entry of HOMES) {
    const home = resolvePath(entry.home)
    if (!existsSync(home)) { log(`skip ${home} (not present)`); continue }
    log(`\n=== ${home} (${entry.profile}) ===`)
    const r = spawnSync(process.execPath, [fileURLToPath(import.meta.url), ...pass, '--home', home, '--profile', entry.profile], { stdio: 'inherit' })
    if (r.status !== 0) { failed += 1; continue }
    if (!restart || !entry.service) continue
    if (process.platform !== 'darwin') { log(`restart ${entry.service}: skipped (not macOS)`); continue }
    const kick = spawnSync('launchctl', ['kickstart', '-k', `gui/${process.getuid()}/${entry.service}`], { encoding: 'utf8' })
    log(kick.status === 0 ? `restart ${entry.service}` : `restart ${entry.service}: ${(kick.stderr || '').trim() || `exit ${kick.status}`}`)
    if (kick.status !== 0) failed += 1
  }
  if (failed > 0) fail(`${failed} home(s) failed`)
  log('\nall homes deployed')
  process.exit(0)
}

// ---- plugin discovery ------------------------------------------------------
function isPluginDir(dir) {
  return existsSync(join(dir, 'package.json')) && existsSync(join(dir, 'cordis.patch.yml'))
}
const pluginDirs = readdirSync(repoRoot, { withFileTypes: true })
  .filter(e => e.isDirectory() && isPluginDir(join(repoRoot, e.name)))
  .map(e => e.name)
  .filter(name => !only || only.includes(name))
if (pluginDirs.length === 0) fail('no plugin directories matched (a plugin dir needs package.json + cordis.patch.yml)')

const plugins = pluginDirs.map(name => {
  const dir = join(repoRoot, name)
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const files = Array.isArray(pkg.files) ? pkg.files : []
  if (files.length === 0) fail(`${name}: package.json has no "files" list — nothing to copy`)
  return { name, dir, pkg, files }
})

// ---- build ------------------------------------------------------------------
// Shared-package or ledger edits must keep the rebuilt bundles: those diffs
// are the commit that ships the shared change. A clean tree must not.
const sharedDirty = !noBuild && (
  scopeDirty(snapshot('packages')) || scopeDirty(snapshot('security/route-sensitivity.json'))
)
if (!noBuild) {
  for (const plugin of plugins) {
    const { name, dir } = plugin
    const script = join(dir, 'scripts', 'build-client.mjs')
    if (!existsSync(script)) { log(`${name}: no build script, skipping build`); continue }
    if (!existsSync(join(dir, 'node_modules', 'esbuild'))) {
      fail(`${name}: esbuild not installed — run \`npm ci\` in ${name} first`)
    }
    plugin.built = true
    plugin.before = snapshot(name)
    plugin.ownDirty = ownSourceDirty(name, plugin.before)
    log(`build ${name}`)
    const r = spawnSync(process.execPath, [script], { cwd: dir, stdio: 'inherit' })
    if (r.error) fail(`${name}: build spawn failed: ${r.error.message}`)
    if (r.status !== 0) fail(`${name}: build exited ${r.status}`)
  }
}

// ---- profile resolution -----------------------------------------------------
const profilesRoot = join(dshHome, 'profiles')
let profile = argValue('--profile')
if (!profile) {
  const existing = existsSync(profilesRoot)
    ? readdirSync(profilesRoot, { withFileTypes: true }).filter(e => e.isDirectory()).map(e => e.name)
    : []
  profile = existing.length === 1 ? existing[0] : (existing.includes('web') ? 'web' : (existing[0] ?? 'web'))
  if (existing.length > 1) log(`multiple profiles found (${existing.join(', ')}); using ${profile} — pass --profile to override`)
}
const profileDir = join(profilesRoot, profile)

// ---- partial deploy guard ---------------------------------------------------
// A deploy that names a subset leaves every other installed plugin at its old
// code. That is how one instance ended up with a current pane talking to a
// stale host, which then read as a broken product. Make it explicit.
if (only && !argv.includes('--partial')) {
  const installed = (() => {
    try {
      const pkg = JSON.parse(readFileSync(join(profileDir, 'package.json'), 'utf8'))
      return (pkg?.dsh?.profile?.bundles ?? []).filter(name => existsSync(join(dshHome, 'plugins', name)))
    } catch { return [] }
  })()
  const left = installed.filter(name => !only.includes(name))
  if (left.length > 0) {
    fail(`--plugins names ${only.length} of ${installed.length} installed plugin(s); `
      + `these would stay on their old code: ${left.join(', ')}. `
      + 'Deploy them together, or pass --partial if that is really intended.')
  }
}


// ---- integrity -----------------------------------------------------------------
/** SHA-256 of one file. */
function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

/** Walk `root` and return every regular file as a posix-ish relative path. */
function walkFiles(root, prefix = '', out = []) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    const full = join(root, entry.name)
    if (entry.isDirectory()) walkFiles(full, rel, out)
    else if (entry.isFile()) out.push(rel)
  }
  return out
}

/** Compare a copied file/dir tree against its source; push every mismatch. */
function verifyTree(src, dst, entry, problems) {
  if (!existsSync(dst)) { problems.push(`deployed file missing: ${entry}`); return }
  const srcStat = statSync(src)
  const dstStat = statSync(dst)
  if (srcStat.isDirectory() !== dstStat.isDirectory()) { problems.push(`type mismatch: ${entry}`); return }
  if (srcStat.isDirectory()) {
    const srcFiles = walkFiles(src).sort()
    const dstFiles = walkFiles(dst).sort()
    if (srcFiles.join('\0') !== dstFiles.join('\0')) { problems.push(`file set differs: ${entry}`); return }
    for (const rel of srcFiles) {
      if (sha256(join(src, rel)) !== sha256(join(dst, rel))) problems.push(`content differs: ${entry}/${rel}`)
    }
    return
  }
  if (sha256(src) !== sha256(dst)) problems.push(`content differs: ${entry}`)
}

/** Replace a pnpm virtual-store copy with a symlink to the staged plugin.
 *  pnpm materialises `file:` deps as real directories; a deploy that only
 *  refreshes <dshHome>/plugins leaves that second copy stale and the app can
 *  load the old bundle. One package, one physical copy. */
function relinkPnpmCopies(name, profileDir, pluginDir, summary) {
  const pnpmDir = join(profileDir, 'node_modules', '.pnpm')
  if (!existsSync(pnpmDir)) return
  for (const entry of readdirSync(pnpmDir)) {
    if (!entry.startsWith(`${name}@`)) continue
    const holder = join(pnpmDir, entry, 'node_modules')
    const copy = join(holder, name)
    const stat = lstatSync(copy, { throwIfNoEntry: false })
    if (!stat) continue
    if (stat.isSymbolicLink()) {
      // Already a link — retarget if it points somewhere else.
      if (resolve(realpathSync(copy)) === resolve(pluginDir)) continue
    }
    rmSync(copy, { recursive: true, force: true })
    const target = relative(holder, pluginDir)
    symlinkSync(target, copy, isWin ? 'junction' : 'dir')
    summary.push(`  relink ${copy} -> ${target}`)
  }
}

// ---- deploy -------------------------------------------------------------------
log(`home=${dshHome} profile=${profile} plugins=${plugins.map(p => p.name).join(',')}${dryRun ? ' [dry-run]' : ''}`)

/** Copy one `files` entry (file or directory) into the deployed plugin dir.
 *  Source symlinks are dereferenced (several README.md are links into
 *  docs/specs/); a deployed plugin must hold real files — the docs tree does
 *  not exist inside the dsh home. */
function copyEntry(srcDir, dstDir, entry) {
  const src = join(srcDir, entry)
  const dst = join(dstDir, entry)
  if (!existsSync(src)) fail(`missing file listed in "files": ${entry} — did the build run?`)
  rmSync(dst, { recursive: true, force: true })
  // recursive+dereference together: cpSync({dereference:true}) alone misreads
  // a symlinked file as a directory on Node 24 (ERR_FS_EISDIR).
  if (lstatSync(src).isDirectory()) {
    cpSync(src, dst, { recursive: true, dereference: true })
  } else {
    mkdirSync(dirname(dst), { recursive: true })
    cpSync(src, dst, { recursive: true, dereference: true })
  }
}

/** Drop generated diffs a clean tree did not ask for. The dsh home already
 *  received the fresh bytes; the worktree goes back to the committed bundle. */
function restoreGenerated(name, plugin) {
  if (!plugin?.built || sharedDirty || plugin.ownDirty || plugin.before === null) return
  const after = snapshot(name)
  if (after === null) return
  // Any generated path that differs from HEAD, including one a previous deploy
  // already left dirty. Source was clean, so the bundle is not a commit.
  const restore = [...after.tracked].filter(isGeneratedPath)
  if (restore.length > 0) {
    const result = spawnSync('git', ['restore', '--worktree', '--source=HEAD', '--', ...restore], { cwd: repoRoot, encoding: 'utf8' })
    if (result.status !== 0) {
      log(`${name}: could not restore generated files (${(result.stderr || '').trim()})`)
    } else {
      log(`${name}: restored ${restore.length} generated file(s) — source was clean, so the bundle diff is not a commit`)
    }
  }
  for (const rel of after.untracked) {
    if (plugin.before.untracked.has(rel) || !isGeneratedPath(rel)) continue
    rmSync(join(repoRoot, rel), { recursive: true, force: true })
    log(`${name}: removed generated untracked ${rel}`)
  }
}

const summary = []
for (const plugin of plugins) {
  const { name, dir, pkg, files } = plugin
  const dst = join(dshHome, 'plugins', name)
  if (!dryRun) {
    mkdirSync(dst, { recursive: true })
    for (const entry of files) copyEntry(dir, dst, entry)
    if (existsSync(join(dir, 'README.md')) && !files.includes('README.md')) {
      rmSync(join(dst, 'README.md'), { recursive: true, force: true })
      cpSync(join(dir, 'README.md'), join(dst, 'README.md'), { recursive: true, dereference: true })
    }
    // Rewritten manifest: runtime files are self-contained; build-time file:
    // deps must not resolve inside the dsh home.
    const deployed = { ...pkg, dependencies: {} }
    delete deployed.devDependencies
    writeFileSync(join(dst, 'package.json'), JSON.stringify(deployed, null, 2) + '\n')

  }
  summary.push(`  ${name} -> ${dst} (${files.length} file entries)`)
}

// ---- profile wiring -----------------------------------------------------------
const profilePkgPath = join(profileDir, 'package.json')
let profilePkg = { name: `dsh-profile-${profile}`, private: true }
if (existsSync(profilePkgPath)) {
  profilePkg = JSON.parse(readFileSync(profilePkgPath, 'utf8'))
}
profilePkg.dependencies ??= {}
profilePkg.dsh ??= {}
profilePkg.dsh.profile ??= {}
profilePkg.dsh.profile.bundles ??= []

for (const { name } of plugins) {
  profilePkg.dependencies[name] = `file:../../plugins/${name}`
  if (!profilePkg.dsh.profile.bundles.includes(name)) {
    profilePkg.dsh.profile.bundles.push(name)
  }
}
if (!profilePkg.dsh.profile.bundles.includes('@deepseek-ai/dsh-web-app')) {
  log(`warning: ${profile} has no @deepseek-ai/dsh-web-app bundle — is this a web profile? Desktop/other hosts have their own base bundles; this script only adds the plugin rows.`)
}
if (!dryRun) {
  mkdirSync(profileDir, { recursive: true })
  writeFileSync(profilePkgPath, JSON.stringify(profilePkg, null, 2) + '\n')
}

// node_modules links: ../../plugins/<pkg> relative to profiles/<p>/node_modules
const nmDir = join(profileDir, 'node_modules')
for (const { name } of plugins) {
  const link = join(nmDir, name)
  const target = join('..', '..', '..', 'plugins', name)
  if (dryRun) continue
  mkdirSync(nmDir, { recursive: true })
  if (existsSync(link) || lstatSync(link, { throwIfNoEntry: false }) !== undefined) {
    const stat = lstatSync(link)
    if (stat.isSymbolicLink() || stat.isDirectory()) rmSync(link, { recursive: true, force: true })
  }
  // Junction on Windows (no admin needed), dir symlink elsewhere.
  symlinkSync(target, link, isWin ? 'junction' : 'dir')
  summary.push(`  link ${link} -> ${target}`)
  relinkPnpmCopies(name, profileDir, join(dshHome, 'plugins', name), summary)
}

// ---- verify ---------------------------------------------------------------------
// In --dry-run nothing was copied, so deployed files cannot be checked.
// Verification is content-based: a deploy that "succeeded" while a consumer
// resolves an older copy is the exact failure this guard exists for.
const problems = []
for (const { name, dir, files } of dryRun ? [] : plugins) {
  const dst = join(dshHome, 'plugins', name)
  for (const entry of files) {
    if (entry === 'package.json') continue
    verifyTree(join(dir, entry), join(dst, entry), entry, problems)
  }
  const dep = JSON.parse(readFileSync(join(dst, 'package.json'), 'utf8')).dependencies
  if (dep && Object.keys(dep).length > 0) problems.push(`${name}: deployed dependencies not empty`)

  // The profile must resolve the package to the staged copy, not to a stale
  // pnpm virtual-store directory or an old global link.
  try {
    const req = createRequire(join(profileDir, 'package.json'))
    const resolved = realpathSync(req.resolve(`${name}/package.json`))
    const expected = realpathSync(join(dst, 'package.json'))
    if (resolved !== expected) problems.push(`${name}: profile resolves to ${resolved}, expected ${expected}`)
  } catch (error) {
    problems.push(`${name}: profile cannot resolve package (${error.message})`)
  }
}
// Restore only after content verify. The check compares the source tree to
// the staged copy; restoring generated bundles first makes a clean tree look
// like a failed deploy.
for (const plugin of dryRun ? [] : plugins) restoreGenerated(plugin.name, plugin)
for (const line of summary) log(line)
if (problems.length > 0) {
  for (const p of problems) console.error(`[deploy] FAIL ${p}`)
  process.exit(1)
}
log(`done — ${plugins.length} plugin(s) staged under ${dshHome}.`)
// The deploy carries code only. A sandbox profile's runtime and image are
// derived build artifacts; report them so a missing one is not discovered at
// the first ensure, without turning the deploy into a build.
const sandbox = plugins.find(p => p.name === 'dsh-nano-local-sandbox')
if (sandbox && !dryRun) {
  const entry = join(repoRoot, 'dsh-nano-local-sandbox', 'scripts', 'build-profile.mjs')
  const check = spawnSync(process.execPath, [entry, '--home', dshHome, '--check'], { encoding: 'utf8' })
  let state = null
  try { state = JSON.parse(check.stdout) } catch { /* reported below as unreadable */ }
  if (state?.ready) log(`sandbox profile ${state.profile}@${state.ref.slice(0, 12)}: runtime and image ready`)
  else {
    log(`sandbox profile not ready under ${dshHome}: ${state ? [!state.runtime.ok && 'runtime missing', !state.image.ok && `image ${state.image.tag} missing`].filter(Boolean).join(', ') : (check.stderr || 'check failed').trim()}`)
    log(`build it: node ${relative(process.cwd(), entry)} --home ${dshHome} --work <dir> --source <official checkout> --manifest .dependencies/MANIFEST.json --host-install <dsh package> --container-state <container state dir>`)
  }
}
log('next: restart the host serving this profile, then refresh the page.')
