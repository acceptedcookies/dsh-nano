#!/usr/bin/env node
// dep-status.mjs — 只读依赖状态报告。现算现报，不落盘任何「当前状态」文件。
// 真相来源：每个 .dependencies/{pinned,eval}/<dep>/ 目录自身 .git 的 HEAD SHA
// （内容寻址、不可伪造）、已安装 npm 包版本、profile cordis.patch.yml 的
// checkout 指向。不存在第二份手抄登记。
//
// 用法: node scripts/dep-status.mjs [--json]

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const ROOT = new URL('..', import.meta.url).pathname.replace(/\/$/, '')
const DEPS = join(ROOT, '.dependencies')
const PROFILE_PATCHES = [
  join(homedir(), '.dsh/profiles/web/cordis.patch.yml'),
  join(homedir(), '.dsh-dev/profiles/web/cordis.patch.yml'),
  join(homedir(), '.dsh-desktop/profiles/desktop/cordis.patch.yml'),
]
const DSH_PKG = join(homedir(), '.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/package.json')

const json = process.argv.includes('--json')
const sh = (cmd, args, cwd) => { try { return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim() } catch { return null } }

function dirFact(dir) {
  if (!existsSync(join(dir, '.git'))) return null
  const head = sh('git', ['rev-parse', 'HEAD'], dir)
  const remote = sh('git', ['remote', 'get-url', 'origin'], dir)
  const dirty = sh('git', ['status', '--porcelain'], dir)
  const behind = remote ? sh('git', ['-c', 'protocol.version=2', 'ls-remote', remote, 'HEAD'], dir) : null
  const upstreamHead = behind ? behind.split('\t')[0] : null
  return { head, remote, dirty: dirty ? dirty.split('\n').length : 0, upstreamHead }
}

const facts = { pinned: {}, eval: {}, installedDsh: null, profileCheckouts: [] }

for (const lane of ['pinned', 'eval']) {
  const base = join(DEPS, lane)
  if (!existsSync(base)) continue
  for (const dep of readdirSync(base)) {
    if (dep.startsWith('.')) continue
    const f = dirFact(join(base, dep))
    if (f) facts[lane][dep] = f
  }
}

if (existsSync(DSH_PKG)) {
  facts.installedDsh = JSON.parse(readFileSync(DSH_PKG, 'utf8')).version
}

for (const p of PROFILE_PATCHES) {
  if (!existsSync(p)) continue
  const text = readFileSync(p, 'utf8')
  for (const m of text.matchAll(/checkout:\s*(\S+)/g)) {
    facts.profileCheckouts.push({ profile: p, checkout: m[1], resolvesToPinned: m[1].includes('.dependencies/pinned') })
  }
}

if (json) { console.log(JSON.stringify(facts, null, 2)); process.exit(0) }

const fmt = (f) => f ? `${f.head?.slice(0, 9) ?? '?'}  ${f.dirty ? `⚠ ${f.dirty} dirty` : 'clean'}  ${f.remote ?? 'no-remote'}` : 'missing'
console.log('== pinned (生产) ==')
for (const [dep, f] of Object.entries(facts.pinned)) console.log(`  ${dep.padEnd(18)} ${fmt(f)}`)
console.log('== eval (待评审) ==')
for (const [dep, f] of Object.entries(facts.eval)) console.log(`  ${dep.padEnd(18)} ${fmt(f)}`)
console.log('== 已安装 dsh ==')
console.log(`  ${facts.installedDsh ?? '未检测到'}  (pinned=${facts.pinned['deepseek-harness']?.head?.slice(0, 9) ?? '?'})`)
console.log('== profile checkout 指向 ==')
for (const c of facts.profileCheckouts) console.log(`  ${c.resolvesToPinned ? '✓' : '✗ 未指 pinned'} ${c.checkout}  (${c.profile.split('/').slice(-2).join('/')})`)
