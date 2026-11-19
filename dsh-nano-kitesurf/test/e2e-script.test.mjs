import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const here = dirname(fileURLToPath(import.meta.url))
const script = readFileSync(join(here, '..', 'scripts', 'e2e-ego.mjs'), 'utf8')

// The perf-review read view is the only non-sandbox read the suite makes.
const PERF_READ_VIEW = '/nano-explorer-extra/perf-review/host'

test('the live e2e talks only to the sandbox prefix and opens the pane without coordinates', () => {
  const urls = [...script.matchAll(/fetch\(\s*'([^']+)'/g)].map((match) => match[1])
  assert.ok(urls.length >= 8)
  for (const url of urls) {
    const path = url.split('?')[0]
    assert.equal(path.startsWith('/nano-local-sandbox/') || path === PERF_READ_VIEW, true, url)
  }
  assert.equal(script.includes('/nano-' + 'kitesurf/'), false, 'retired page prefix')
  assert.equal(script.includes("source === 'workerd-kv'"), false)
  assert.equal(/mouse\.click\(\s*\d+\s*,\s*\d+/.test(script), false, 'no fixed-coordinate clicks')
  assert.equal(script.includes('openPane(page)'), true)
})
