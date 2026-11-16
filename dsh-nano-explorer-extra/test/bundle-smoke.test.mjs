/**
 * The client bundle must load, not just pass check-clean-lib. Regression guard
 * for the missing-import class of failure (PRE1116 review-03 F1).
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import test from 'node:test'
import vm from 'node:vm'

const root = join(dirname(import.meta.url.replace('file://', '')), '..')

test('lib/client.js loads in a stubbed module loader and exports a factory', () => {
  const code = readFileSync(join(root, 'lib', 'client.js'), 'utf8')
  const loaded = []
  const sandbox = {
    window: { __ModuleLoader__: { load: mod => loaded.push(mod) } },
    document: {
      querySelectorAll: () => [], querySelector: () => null,
      addEventListener: () => {}, removeEventListener: () => {},
    },
    localStorage: { getItem: () => null },
    navigator: { userAgent: 'Chrome/143' },
    console, setTimeout, clearTimeout, setInterval, clearInterval, performance,
  }
  sandbox.window.document = sandbox.document
  sandbox.window.localStorage = sandbox.localStorage
  vm.createContext(sandbox)
  vm.runInContext(code, sandbox)
  assert.equal(loaded.length, 1)
  assert.equal(loaded[0].id, 'dsh-nano-explorer-extra')
  assert.equal(typeof loaded[0].factory, 'function')
  const exports = loaded[0].factory(() => ({}))
  assert.equal(typeof exports, 'object')
})
