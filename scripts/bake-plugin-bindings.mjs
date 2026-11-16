#!/usr/bin/env node
/**
 * Bake lib/bindings.js from security/route-sensitivity.json.
 * Fails when the ledger id does not match security/perf-binding-ids.md.
 * Never derives an id from a path (T-O-PRE1116-05).
 *
 *   node scripts/bake-plugin-bindings.mjs --write-naming
 *   node scripts/bake-plugin-bindings.mjs --plugin <package-name>
 *   node scripts/bake-plugin-bindings.mjs --all
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bindingTableModule } from '../packages/dsh-interface/src/build/index.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const LEDGER_PATH = join(ROOT, 'security/route-sensitivity.json')
const TABLE_PATH = join(ROOT, 'security/perf-binding-ids.md')
const ID_RE = /^[a-z0-9][a-z0-9.-]{0,63}$/

export const BAKE_PLUGINS = [
  'dsh-nano-explorer-extra',
  'dsh-nano-notepad',
  'dsh-nano-model-selector',
  'dsh-nano-cloud-session',
  'dsh-nano-terminal',
  'dsh-nano-local-sandbox',
  'dsh-nano-kitesurf',
]

const AUTHORED = [
  'dsh-nano-explorer-extra/lib/bindings.js',
  'dsh-nano-notepad/lib/bindings.js',
  'dsh-nano-terminal/lib/bindings.js',
]

function ledgerRows() {
  return JSON.parse(readFileSync(LEDGER_PATH, 'utf8')).routes ?? []
}

function authoredIds() {
  const ids = new Map()
  for (const rel of AUTHORED) {
    let text
    try { text = readFileSync(join(ROOT, rel), 'utf8') } catch { continue }
    const re = /id:\s*'([^']+)'[\s\S]*?path:\s*'([^']+)'/g
    for (const m of text.matchAll(re)) ids.set(m[2], m[1])
  }
  return ids
}

export function namingMarkdown(rows, existing) {
  const lines = [
    '# perf binding ids',
    '',
    '抽查件（T-O-PRE1116-05.2）。烘焙只比对「proposed id」与账本 `id`。',
    '测试变绿不等于 [业主] 已抽查。发车指令授权按冻结规则使用下表，不把绿灯写成抽查。',
    '',
    '| path | existing id | proposed id | channel | match |',
    '|---|---|---|---|---|',
  ]
  for (const row of rows) {
    const prior = existing.get(row.path)
    lines.push(`| \`${row.path}\` | ${prior ? `\`${prior}\`` : '—'} | \`${row.id}\` | ${row.channel} | ${row.match} |`)
  }
  lines.push('')
  return lines.join('\n')
}

export function parseNamingTable(markdown) {
  const map = new Map()
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('| `')) continue
    const cells = line.split('|').map(c => c.trim())
    const path = cells[1].replace(/`/g, '')
    const proposed = cells[3].replace(/`/g, '')
    if (!path || !proposed) continue
    map.set(path, proposed)
  }
  return map
}

export function assertMatchesNaming(rows, naming) {
  const problems = []
  for (const row of rows) {
    if (!ID_RE.test(row.id ?? '')) problems.push(`bad id ${row.id} for ${row.path}`)
    const want = naming.get(row.path)
    if (!want) problems.push(`naming table missing ${row.path}`)
    else if (want !== row.id) problems.push(`id mismatch ${row.path}: ledger ${row.id} table ${want}`)
  }
  for (const path of naming.keys()) {
    if (!rows.some(r => r.path === path)) problems.push(`naming table has extra path ${path}`)
  }
  if (problems.length) {
    const error = new Error(problems.join('\n'))
    error.problems = problems
    throw error
  }
}

export function bindingsModule(rows, { plugin }) {
  const extra = plugin === 'dsh-nano-explorer-extra'
    ? `export const PREFIX = ${JSON.stringify('/nano-explorer-extra')}\n`
    : ''
  const host = bindingTableModule(rows, { plugin, constName: 'BINDING_TABLE' })
  const browser = bindingTableModule(rows.map(r => ({ id: r.id, path: r.path })), { constName: 'BROWSER_BINDINGS' })
  return `export const PLUGIN = ${JSON.stringify(plugin)}\n${extra}${host}\n${browser}`
}

function writePlugin(plugin, rows, naming) {
  const mine = rows.filter(r => r.plugin === plugin)
  if (plugin !== 'dsh-nano-kitesurf' && mine.length === 0) {
    throw new Error(`bake: no ledger rows for ${plugin}`)
  }
  for (const row of mine) {
    const want = naming.get(row.path)
    if (want !== row.id) throw new Error(`bake: ${row.path} id ${row.id} != naming ${want}`)
  }
  const dir = join(ROOT, plugin, 'lib')
  mkdirSync(dir, { recursive: true })
  const out = join(dir, 'bindings.js')
  writeFileSync(out, bindingsModule(mine, { plugin }))
  return out
}

function main() {
  const args = process.argv.slice(2)
  const rows = ledgerRows()
  if (args.includes('--write-naming')) {
    writeFileSync(TABLE_PATH, namingMarkdown(rows, authoredIds()))
    console.log(`wrote ${TABLE_PATH} (${rows.length} rows)`)
    return
  }
  const naming = parseNamingTable(readFileSync(TABLE_PATH, 'utf8'))
  assertMatchesNaming(rows, naming)
  const pluginFlag = args.indexOf('--plugin')
  const plugins = pluginFlag >= 0 ? [args[pluginFlag + 1]] : BAKE_PLUGINS
  for (const plugin of plugins) {
    const out = writePlugin(plugin, rows, naming)
    console.log(`baked ${out}`)
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href || process.argv[1]?.endsWith('bake-plugin-bindings.mjs')) {
  try { main() } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
