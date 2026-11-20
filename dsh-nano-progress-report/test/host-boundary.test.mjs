/** DNPR-T19 — host-side boundary: nothing under src/host (or src/shared) may
 *  import the client tree, React, or browser globals; the host bundle must be
 *  DOM-free so it can run inside the cordis host fiber. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const srcRoot = join(here, '..', 'src')

function listJs(dir) {
  const out = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) out.push(...listJs(path))
    else if (entry.name.endsWith('.js')) out.push(path)
  }
  return out
}

const FORBIDDEN_IMPORT = /from\s+['"][^'"]*(\.\.\/client|\.\.\/\.\.\/client|client\/)[^'"]*['"]|require\(['"]react['"]\)|from\s+['"]react['"]|from\s+['"]@deepseek-ai\/dsh-client/
const BROWSER_GLOBAL = /\b(document|window|localStorage|sessionStorage|navigator|HTMLElement)\./

test('src/host + src/shared import no client modules, React, or browser globals', () => {
  const files = [...listJs(join(srcRoot, 'host')), ...listJs(join(srcRoot, 'shared'))]
  assert.ok(files.length >= 5)
  for (const file of files) {
    const text = readFileSync(file, 'utf8')
    assert.equal(FORBIDDEN_IMPORT.test(text), false, `${file} imports a client-side module`)
    assert.equal(BROWSER_GLOBAL.test(text), false, `${file} touches a browser global`)
  }
})

test('host exposes no provide, route, or exported error enum (T-O-6/T19)', () => {
  for (const file of listJs(join(srcRoot, 'host'))) {
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(text, /ctx\.provide|\.provide\(/, `${file} provides a service`)
    assert.doesNotMatch(text, /ctx\.(server|router|http)|\.route\(/, `${file} registers a route`)
    assert.doesNotMatch(text, /export\s+(const|class)\s+\w*Error/, `${file} exports an error type`)
  }
})

test('host modules carry no JSX', () => {
  for (const file of listJs(join(srcRoot, 'host'))) {
    assert.equal(file.endsWith('.jsx'), false)
    const text = readFileSync(file, 'utf8')
    assert.doesNotMatch(text, /createElement|jsx\(/, `${file} renders UI`)
  }
})
