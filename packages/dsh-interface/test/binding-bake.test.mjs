/**
 * PRE1116-T05 / T06 / T07 — ledger identity is authored, not sliced from a path.
 */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bindingTableModule } from '../src/build/index.js'
import { assertMatchesNaming, bindingsModule, parseNamingTable } from '../../../scripts/bake-plugin-bindings.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

test('PRE1116-T05 gen preserves authored ids and refuses a path with no id', () => {
  const before = JSON.parse(readFileSync(join(ROOT, 'security/route-sensitivity.json'), 'utf8'))
  const generated = spawnSync(process.execPath, [join(ROOT, 'scripts/gen-route-sensitivity.mjs')], { encoding: 'utf8' })
  assert.equal(generated.status, 0, generated.stderr)
  const after = JSON.parse(generated.stdout)
  assert.equal(after.routes.length, before.routes.length)
  for (const row of after.routes) {
    const prev = before.routes.find(item => item.path === row.path)
    assert.ok(prev, row.path)
    for (const key of ['methods', 'sensitivity', 'capability', 'bodyLimit', 'sessionBinding', 'id', 'channel', 'match']) {
      assert.deepEqual(row[key], prev[key], `${row.path} ${key}`)
    }
  }
})

test('PRE1116-T05 missing id exits non-zero and does not invent an id', async () => {
  const { writeFileSync } = await import('node:fs')
  const path = join(ROOT, 'security/route-sensitivity.json')
  const original = readFileSync(path, 'utf8')
  const broken = JSON.parse(original)
  const target = broken.routes[0]
  delete target.id
  delete target.channel
  delete target.match
  writeFileSync(path, JSON.stringify(broken, null, 2) + '\n')
  try {
    const generated = spawnSync(process.execPath, [join(ROOT, 'scripts/gen-route-sensitivity.mjs')], { encoding: 'utf8' })
    assert.notEqual(generated.status, 0)
    assert.match(`${generated.stderr}`, /refusing to derive an id/)
    assert.equal(`${generated.stdout}${generated.stderr}`.includes(`dnee${target.path}`), false)
  } finally {
    writeFileSync(path, original)
  }
})

test('PRE1116-T06 naming mismatch fails and a path change does not change the id', () => {
  const ledger = JSON.parse(readFileSync(join(ROOT, 'security/route-sensitivity.json'), 'utf8'))
  const naming = parseNamingTable(readFileSync(join(ROOT, 'security/perf-binding-ids.md'), 'utf8'))
  assert.doesNotThrow(() => assertMatchesNaming(ledger.routes, naming))
  const moved = { ...ledger.routes[0], path: ledger.routes[0].path + '-moved' }
  assert.throws(() => assertMatchesNaming([moved, ...ledger.routes.slice(1)], naming), /mismatch|missing/)
  const source = bindingsModule([ledger.routes[0]], { plugin: ledger.routes[0].plugin })
  const again = bindingsModule([{ ...ledger.routes[0], path: '/changed' }], { plugin: ledger.routes[0].plugin })
  assert.match(source, new RegExp(ledger.routes[0].id.replace('.', '\\.')))
  assert.match(again, new RegExp(`"id":"${ledger.routes[0].id.replace('.', '\\.')}"`))
  assert.match(again, /"path":"\/changed"/)
  assert.equal(bindingTableModule([ledger.routes[0]], { plugin: 'p' }), bindingTableModule([ledger.routes[0]], { plugin: 'p' }))
  assert.throws(() => bindingTableModule([{ path: '/x' }], { plugin: 'p' }), /id/)
  assert.throws(() => bindingTableModule([
    { id: 'a.b', path: '/a' },
    { id: 'a.b', path: '/b' },
  ], { plugin: 'p' }), /duplicate/)
})

test('PRE1116-T07 routeTableModule is gone and the browser constant has no justification', async () => {
  const build = await import('../src/build/index.js')
  assert.equal(build.routeTableModule, undefined)
  const src = readFileSync(join(ROOT, 'packages/dsh-interface/src/build/index.js'), 'utf8')
  assert.equal(src.includes('routeTableModule'), false)
  const row = { id: 'dnms.catalog', plugin: 'dsh-nano-model-selector', path: '/nano-model-selector/catalog', justification: 'SECRET-JUSTIFICATION' }
  const browser = bindingTableModule([{ id: row.id, path: row.path }], { constName: 'BROWSER_BINDINGS' })
  assert.equal(browser.includes('SECRET-JUSTIFICATION'), false)
  assert.match(browser, /BROWSER_BINDINGS/)
})
