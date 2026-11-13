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
 * After deploying, restart the host that serves the profile — plugin code is
 * loaded at host start. On Windows no admin rights are needed: node_modules
 * links are created as junctions.
 */
import { spawnSync } from 'node:child_process'
import {
  cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync,
  rmSync, symlinkSync, writeFileSync,
} from 'node:fs'
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const isWin = process.platform === 'win32'

function fail(msg) { console.error(`[deploy] ${msg}`); process.exit(1) }
function log(msg) { console.log(`[deploy] ${msg}`) }

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
if (!noBuild) {
  for (const { name, dir } of plugins) {
    const script = join(dir, 'scripts', 'build-client.mjs')
    if (!existsSync(script)) { log(`${name}: no build script, skipping build`); continue }
    if (!existsSync(join(dir, 'node_modules', 'esbuild'))) {
      fail(`${name}: esbuild not installed — run \`npm ci\` in ${name} first`)
    }
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

const summary = []
for (const { name, dir, pkg, files } of plugins) {
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
}

// ---- verify ---------------------------------------------------------------------
// In --dry-run nothing was copied, so deployed files cannot be checked.
const problems = []
for (const { name, files } of dryRun ? [] : plugins) {
  const dst = join(dshHome, 'plugins', name)
  for (const entry of files) {
    if (!existsSync(join(dst, entry))) problems.push(`${name}: deployed file missing: ${entry}`)
  }
  const dep = JSON.parse(readFileSync(join(dst, 'package.json'), 'utf8')).dependencies
  if (dep && Object.keys(dep).length > 0) problems.push(`${name}: deployed dependencies not empty`)
}
for (const line of summary) log(line)
if (problems.length > 0) {
  for (const p of problems) console.error(`[deploy] FAIL ${p}`)
  process.exit(1)
}
log(`done — ${plugins.length} plugin(s) staged under ${dshHome}.`)
log('next: restart the host serving this profile, then refresh the page.')
