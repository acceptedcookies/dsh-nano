import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SKILL_BODIES, kitesurfSkill, nanoKiteSkill } from '../lib/skill.js'
import { BINDING_TABLE } from '../lib/bindings.js'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))

// Descriptions read from the same source the build stamps, so this test
// asserts generated output equals lib/skill.js — not a stale copy of it.
const FRONTMATTER = { 'kitesurf-cdp': kitesurfSkill().description, 'nano-kite': nanoKiteSkill().description }

const canonical = (text) => text.replace(/\r\n/g, '\n')

function skillTree(name) {
  const dir = join(root, 'skills', name)
  let text = readFileSync(join(dir, 'SKILL.md'), 'utf8')
  let refs = []
  try { refs = readdirSync(join(dir, 'references')) } catch {}
  for (const f of refs) text += readFileSync(join(dir, 'references', f), 'utf8')
  return text
}

test('generated SKILL.md files exactly match the single source of truth', () => {
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

test('coverage reconciliation: every BINDING_TABLE path is documented in the tree', () => {
  const text = skillTree('kitesurf-cdp')
  for (const r of BINDING_TABLE) assert.ok(text.includes(r.path), `route not documented: ${r.path}`)
})

test('skill tree teaches only the generic DNLS surface — no private paths, retired routes or env vars', () => {
  const text = skillTree('kitesurf-cdp') + skillTree('nano-kite')
  for (const needle of [
    'dsh-nano-local-sandbox/',
    '/Users/',
    'KITESURF_',
    'nano-kitesurf' + '.lock',
    '/nano-local-sandbox/' + 'kite',
    '/nano-local-sandbox/' + 'last',
    'config' + 'ure',
  ]) {
    assert.equal(text.includes(needle), false, `skill tree still teaches ${needle}`)
  }
})

test('skill bodies carry the hard agentic constraints', () => {
  const all = skillTree('kitesurf-cdp')
  for (const phrase of ['同一个宿主进程状态', 'componentStack=null', 'sandbox.diagnostics', '事务性', 'buildId', 'about:blank', 'one MCP writer', 'policyFingerprint', 'har-lite', 'navigation.outcome']) {
    assert.ok(all.includes(phrase), `missing constraint: ${phrase}`)
  }
  assert.ok(nanoKiteSkill().content.includes('each text frame'))
  assert.equal(kitesurfSkill().resourceBase?.kind, 'directory')
})

// Route-doc drift guard: every `/nano-local-sandbox/<path>` the skill's
// routes.md teaches must be a route DNLS actually registers. The check runs
// only when the sibling DNLS source tree is present — DNK must stay
// installable on its own, so a missing tree is a skip, never a failure.
test('routes.md documents only routes DNLS routeSpecs registers (drift guard)', async (t) => {
  const dnls = join(root, '..', 'dsh-nano-local-sandbox')
  let exists = true
  try { statSync(join(dnls, 'src', 'host', 'routes.js')) } catch { exists = false }
  if (!exists) { t.skip('dsh-nano-local-sandbox source tree not present'); return }
  const { routeSpecs } = await import(`file://${join(dnls, 'src', 'host', 'routes.js')}`)
  const registered = new Set(routeSpecs({ session: {}, env: { DNLS_STATE_ROOT: '/tmp' } }).map((r) => r.path))
  const doc = readFileSync(join(root, 'src', 'skill', 'kitesurf-cdp', 'references', 'routes.md'), 'utf8')
  const documented = new Set([...doc.matchAll(/`(\/nano-local-sandbox\/[a-z-]+)`/g)].map((m) => m[1]))
  const ghost = [...documented].filter((p) => !registered.has(p))
  assert.deepEqual(ghost, [], `routes.md teaches routes DNLS never registers: ${ghost}`)
})
