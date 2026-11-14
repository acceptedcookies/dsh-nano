import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const kitesurf = JSON.parse(readFileSync(join(root, '..', 'dsh-nano-kitesurf', 'package.json'), 'utf8'))
const { name, inject, apply } = await import('../index.js')

test('package id, engine range, and file whitelist', () => {
  assert.equal(pkg.name, 'dsh-nano-local-sandbox')
  assert.equal(name, 'nano-local-sandbox')
  assert.equal(pkg.engines.dsh, kitesurf.engines.dsh)
  assert.equal(pkg.engines.dsh, '>=0.2.2-rc.1 <0.3.0')
  assert.equal(pkg.files.some((entry) => entry.includes('linux-prefix')), false)
  const patch = readFileSync(join(root, 'cordis.patch.yml'), 'utf8')
  assert.match(patch, /id: nano-local-sandbox/)
  assert.match(patch, /name: dsh-nano-local-sandbox/)
  assert.deepEqual(Object.keys(pkg.exports).sort(), ['.', './icon', './locale/*.json', './package.json'])
})

test('inject is exactly the five host services', () => {
  assert.deepEqual(inject, ['webServer', 'connection', 'sandboxPolicy', 'sandbox', 'sessions'])
  const source = readFileSync(join(root, 'index.js'), 'utf8')
  assert.equal(source.includes('ctx.webServer.register'), false)
  assert.equal(typeof apply, 'function')
  for (const banned of ['kitesurf', 'terminal', 'notepad']) {
    assert.equal(inject.includes(banned), false)
  }
})
