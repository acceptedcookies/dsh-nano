import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(root, 'src')

// Walk the ESM import graph from an entry, collecting local file paths.
function importGraph(entryFile) {
  const seen = new Set()
  const stack = [entryFile]
  while (stack.length) {
    const f = stack.pop()
    if (seen.has(f)) continue
    seen.add(f)
    const src = readFileSync(f, 'utf8')
    const re = /(?:import|export)[^'"]*from\s+['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]/g
    let m
    while ((m = re.exec(src))) {
      const spec = m[1] ?? m[2]
      if (spec && (spec.startsWith('./') || spec.startsWith('../'))) {
        stack.push(resolve(dirname(f), spec))
      }
    }
  }
  return seen
}

function srcOf(files) {
  return [...files].map(f => readFileSync(f, 'utf8')).join('\n')
}

test('contracts export has no IO / node:* / DOM / cordis / mutable store in its dependency graph', async () => {
  const entry = join(SRC, 'contracts/index.js')
  const graph = importGraph(entry)
  const code = srcOf(graph)
  // Forbidden imports anywhere in the contracts dependency graph.
  assert.equal(/from\s+['"]node:/.test(code), false, 'contracts must not import node:*')
  assert.equal(/from\s+['"](fs|path|http|os|net|child_process)['"]/.test(code), false)
  assert.equal(/require\s*\(/.test(code), false, 'contracts must not use require()')
  assert.equal(/\bwindow\b|\bdocument\b/.test(code), false, 'contracts must not touch DOM')
  assert.equal(/cordis/.test(code), false, 'contracts must not hold a Cordis instance')
  assert.equal(/\bnew\s+Map\s*\(\s*\)|\bnew\s+Set\s*\(\s*\)\s*\/\/\s*store/.test(code), false)
  // The module itself imports cleanly.
  const m = await import(entry)
  assert.equal(typeof m.normalizeBindings, 'function')
})

test('host export is importable and injects only ctx (no file IO in createWebRegistrar)', async () => {
  const m = await import('../src/host/index.js')
  assert.equal(typeof m.createWebRegistrar, 'function')
  const src = readFileSync(join(SRC, 'host/createWebRegistrar.js'), 'utf8')
  // host facade must not read files itself (bindings are baked constants).
  assert.equal(/readFileSync|readFile\(/.test(src), false)
  assert.equal(/from\s+['"]node:fs/.test(src), false)
})

test('build export emits byte-identical table for same input (T03 idempotent)', async () => {
  const { bindingTableModule } = await import('../src/build/index.js')
  const rows = [
    { id: 'a', plugin: 'p', channel: 'http', match: 'exact', path: '/a', methods: ['GET'], bodyLimit: 0 },
    { id: 'b', plugin: 'p', channel: 'http', match: 'prefix', path: '/b/', methods: ['GET'], sessionBinding: true },
  ]
  const one = bindingTableModule(rows, { plugin: 'p' })
  const two = bindingTableModule(rows, { plugin: 'p' })
  assert.equal(one, two, 'same input must produce byte-identical output')
  const changed = bindingTableModule(rows.map(r => r.id === 'a' ? { ...r, bodyLimit: 1 } : r), { plugin: 'p' })
  assert.notEqual(one, changed, 'author field change must change output')
})

test('package.json exposes exactly contracts/host/build and no dsh.bundle/dsh.client', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  assert.equal(pkg.dsh, undefined, 'no dsh key (not a plugin)')
  assert.deepEqual(Object.keys(pkg.exports).sort(), ['./build', './contracts', './host'])
  assert.equal(pkg.exports['.'], undefined, 'no万能 root export')
})
