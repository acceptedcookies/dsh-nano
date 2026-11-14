import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const forkPath = join(root, 'dsh-nano-local-sandbox', 'scripts', 'e2e-ego.mjs')
const NAMES = [
  'bundle-mounted', 'pane-open', 'nav-fab', 'nav-slide', 'nav-tabs', 'native-html',
  'annotate-reachable', 'annotate-armed', 'pick-opens-note', 'no-jitter', 'composer-ref',
  'devtools-console', 'devtools-network', 'devtools-elements', 'computed-styles',
  'styles-panel', 'matched-rules', 'viewport-390', 'shortcut-cmd-e-2', 'lifecycle',
  'host-selftest', 'history-kv', 'perf-spans',
]

test('the forked e2e names the 23 records and only calls the new prefix', () => {
  const text = readFileSync(forkPath, 'utf8')
  const names = [...text.matchAll(/record\('([^']+)'/g)].map((match) => match[1])
  assert.deepEqual([...names].sort(), [...NAMES].sort())
  assert.equal(text.includes("source === 'workerd-kv'"), false)
  assert.equal(text.includes('fetch ='), false)
  const retired = '/nano-' + 'kitesurf/'
  assert.equal(text.includes(retired), false)
  const urls = [...text.matchAll(/fetch\(\s*'([^']+)'/g)].map((match) => match[1])
  assert.ok(urls.length >= 8)
  for (const url of urls) {
    const path = url.startsWith('http') ? new URL(url).pathname : url.split('?')[0]
    assert.equal(path.startsWith('/nano-local-sandbox/'), true, url)
  }
  const index = readFileSync(join(root, 'dsh-nano-local-sandbox', 'index.js'), 'utf8')
  assert.equal(index.includes('registerRoutes'), true)
})
