#!/usr/bin/env node
// Aggregate quality gate for the whole repo: every package's `npm test`,
// standalone smoke tests that no package script covers, and the repo-level
// gate scripts under scripts/. Works on Windows and POSIX: npm is spawned
// through the shell so `npm.cmd` resolution is handled by the OS.
//
// Usage:
//   node scripts/test-all.mjs            # tests + gates
//   node scripts/test-all.mjs --build    # also run each package's `npm run build`
//   node scripts/test-all.mjs --only <substr>   # filter suites by name

import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const isWin = process.platform === 'win32'
const args = process.argv.slice(2)
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null
const wantBuild = args.includes('--build')

const suites = []

function pkgDirs() {
  const dirs = []
  for (const name of readdirSync(root)) {
    if (name.startsWith('dsh-nano-') && existsSync(join(root, name, 'package.json'))) dirs.push(join(root, name))
  }
  const pkgs = join(root, 'packages')
  if (existsSync(pkgs)) {
    for (const name of readdirSync(pkgs)) {
      if (existsSync(join(pkgs, name, 'package.json'))) dirs.push(join(pkgs, name))
    }
  }
  return dirs
}

for (const dir of pkgDirs()) {
  const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
  const rel = dir.slice(root.length + 1)
  if (pkg.scripts?.test) {
    suites.push({ name: rel, cwd: dir, cmd: 'npm', args: ['test', '--silent'], shell: true })
  }
  if (wantBuild && pkg.scripts?.build) {
    suites.push({ name: `${rel} (build)`, cwd: dir, cmd: 'npm', args: ['run', 'build', '--silent'], shell: true })
  }
}

// Standalone smoke tests not reachable through any package test script.
const smoke = join(root, 'dsh-nano-terminal', 'test', 'register-routes.smoke.mjs')
if (existsSync(smoke)) {
  suites.push({ name: 'dsh-nano-terminal/register-routes.smoke', cwd: root, cmd: process.execPath, args: ['--test', smoke], shell: false })
}

// Repo-level gates.
for (const gate of [
  'scripts/check-clean-lib.mjs',
  'scripts/check-feature-contract.mjs',
  'scripts/check-route-sensitivity.mjs',
  'scripts/route-scan.mjs',
  'scripts/compat-regression.mjs',
  'scripts/security-regression/run.mjs',
]) {
  const p = join(root, gate)
  if (existsSync(p)) {
    suites.push({ name: `gate/${gate.replace(/^scripts\//, '')}`, cwd: root, cmd: process.execPath, args: [p], shell: false })
  }
}

const filtered = only ? suites.filter((s) => s.name.includes(only)) : suites
let pass = 0
const failed = []
for (const s of filtered) {
  const t0 = Date.now()
  const r = spawnSync(s.cmd, s.args, { cwd: s.cwd, shell: s.shell, encoding: 'utf8' })
  const ok = r.status === 0
  const tail = (ok ? '' : [r.stdout, r.stderr].filter(Boolean).join('\n').trim().split('\n').slice(-12).join('\n'))
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${s.name}  (${((Date.now() - t0) / 1000).toFixed(1)}s)`)
  if (!ok) {
    failed.push(s.name)
    if (tail) console.log(tail.split('\n').map((l) => `      ${l}`).join('\n'))
  } else {
    pass += 1
  }
}
console.log(`\n${pass}/${filtered.length} suites passed${failed.length ? `; failed: ${failed.join(', ')}` : ''}`)
process.exit(failed.length ? 1 : 0)
