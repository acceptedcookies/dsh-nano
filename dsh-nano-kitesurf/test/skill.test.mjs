import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SKILL_BODIES, kitesurfSkill, nanoKiteSkill } from '../lib/skill.js'
import { ERROR_CATALOG } from '../lib/diagnostics.js'
import { BINDING_TABLE } from '../lib/bindings.js'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

const FRONTMATTER = {
  'kitesurf-cdp': 'Collaborate on a frontend through the Kitesurf CDP endpoint. Use when the user points at a page, or asks to inspect or change what Kitesurf is rendering. Do not launch Chrome.',
  'nano-kite': 'Initialize, start, suspend, or resume Kitesurf, and point MCP at a local or remote engine. Use when the user types /nano-kite.',
}

const canonical = (text) => text.replace(/\r\n/g, '\n')

test('generated SKILL.md files exactly match the single source of truth', () => {
  for (const [name, body] of Object.entries(SKILL_BODIES)) {
    const actual = canonical(readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8'))
    assert.equal(actual.endsWith(`${body}\n`), true, `${name}/SKILL.md body drifted`)
  }
})

test('skill bodies are generated from ERROR_CATALOG (no hand-copied table)', () => {
  const catalog = readFileSync(join(root, 'skills', 'kitesurf-cdp', 'references', 'error-catalog.md'), 'utf8')
  for (const row of ERROR_CATALOG) {
    assert.ok(catalog.includes(row.example), `missing catalogue row: ${row.example}`)
  }
})

test('generated SKILL.md files exactly match the single source of truth (+ version/date frontmatter)', () => {
  for (const [name, body] of Object.entries(SKILL_BODIES)) {
    const actual = canonical(readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8'))
    // version/date are build-stamped; compare everything but those two lines.
    const stamp = /^version: .*$/m.exec(actual)?.[0]
    assert.match(actual, new RegExp(`^name: ${name}\\ndescription: `, 'm'))
    assert.match(actual, /^version: \d+\.\d+\.\d+/m, 'version frontmatter')
    assert.match(actual, /^date: \d{4}-\d{2}-\d{2}/m, 'date frontmatter')
    assert.ok(actual.includes(`description: ${FRONTMATTER[name]}`), `${name} description drifted`)
    assert.ok(actual.endsWith(`${body}\n`), `${name}/SKILL.md body drifted — run npm run build`)
    assert.equal(pkg.version, stamp?.split(': ')[1], 'frontmatter version must equal package.json')
  }
})

test('kitesurf-cdp is a directory skill: entry ≤90 lines + resourceBase directory + references on disk', () => {
  const entry = SKILL_BODIES['kitesurf-cdp']
  assert.ok(entry.split('\n').length <= 90, `entry ${entry.split('\n').length} lines > 90`)
  assert.deepEqual(kitesurfSkill().resourceBase, { kind: 'directory' })
  const refs = readdirSync(join(root, 'skills', 'kitesurf-cdp', 'references')).filter((f) => f.endsWith('.md'))
  assert.ok(refs.length >= 7, `expected ≥7 references, got ${refs.length}`)
  assert.ok(statSync(join(root, 'skills', 'kitesurf-cdp', 'templates', 'probe.sh')).isFile())
  // The entry must name every reference file it points at.
  for (const f of refs) assert.ok(entry.includes(`references/${f}`), `entry doesn't index references/${f}`)
})

test('coverage reconciliation: every BINDING_TABLE path and kitesurf_* tool is documented in the tree', () => {
  // P3-04: the bridge's sole carrier is DNLS `profiles/kitesurf/mcp-bridge.mjs`
  // (the DNK `runtime/` copy is retired). Read it from there.
  const bridge = readFileSync(join(root, '..', 'dsh-nano-local-sandbox', 'profiles', 'kitesurf', 'mcp-bridge.mjs'), 'utf8')
  const tools = [...bridge.matchAll(/name:\s*['"](sandbox\.[a-z_]+)['"]/g)].map((m) => m[1])
  const dir = join(root, 'skills', 'kitesurf-cdp')
  let text = readFileSync(join(dir, 'SKILL.md'), 'utf8')
  for (const f of readdirSync(join(dir, 'references'))) text += readFileSync(join(dir, 'references', f), 'utf8')
  for (const r of BINDING_TABLE) assert.ok(text.includes(r.path), `route not documented: ${r.path}`)
  for (const t of tools) assert.ok(text.includes(t), `MCP tool not documented: ${t}`)
})

test('error catalogue reference is generated from ERROR_CATALOG (no hand-copied table)', () => {
  const cat = readFileSync(join(root, 'skills', 'kitesurf-cdp', 'references', 'error-catalog.md'), 'utf8')
  for (const row of ERROR_CATALOG) {
    assert.ok(cat.includes(`| \`${row.example}\` | ${row.status} |`), `missing catalogue row: ${row.example}`)
  }
})

test('skill bodies carry the hard agentic constraints', () => {
  const dir = join(root, 'skills', 'kitesurf-cdp')
  let all = SKILL_BODIES['kitesurf-cdp']
  for (const f of readdirSync(join(dir, 'references'))) all += readFileSync(join(dir, 'references', f), 'utf8')
  for (const phrase of ['同一个宿主进程状态', 'componentStack=null', 'kite-container', 'route-not-listed', 'sandbox.diagnostics', '事务性', 'buildId', 'about:blank']) {
    assert.ok(all.includes(phrase), `missing constraint: ${phrase}`)
  }
  assert.ok(nanoKiteSkill().content.includes('each text frame'))
  assert.ok(all.includes('sandbox.diagnostics'))
})
