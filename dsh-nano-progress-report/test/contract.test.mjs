/** Source-level contract tests: the wiring the runtime relies on must exist
 *  verbatim, and forbidden DOM-grafting patterns must be absent. */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = rel => readFileSync(join(root, rel), 'utf8')

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.(jsx?|mjs)$/.test(entry)) yield path
  }
}

test('client entry injects the required cordis services', () => {
  const src = read('src/client/index.js')
  const body = src.match(/export const inject = \[([\s\S]*?)\]/)
  assert.ok(body, 'export const inject = [...] not found')
  const names = body[1].match(/'[^']+'/g).map(s => s.slice(1, -1)).sort()
  assert.deepEqual(names,
    ['jobs', 'locale', 'sessions', 'sidebarRight', 'sidebarRightTabs', 'slots', 'uiConversation', 'uiSession'],
    'inject array must be exactly the AGENTS.md identity set')
})

test('workbench tab type + body registration exists', () => {
  const src = read('src/client/index.js')
  assert.match(src, /sidebarRightTabs\.register\(\{/)
  assert.match(src, /kind:\s*TAB_KIND/)
  assert.match(src, /slots\.inject\('sidebar\.right\.pane\.tab'/)
  assert.match(src, /keepMounted:\s*true/)
  assert.match(src, /priority:\s*'extension'/)
})

test('view target registration exists and uses progress target', () => {
  const src = read('src/client/events/index.js')
  assert.match(src, /uiConversation\.views\.register\(\{\s*target:\s*TARGET/)
  assert.match(src, /uiConversation\.events\.register\(/)
  const constants = read('src/client/constants.js')
  assert.match(constants, /TARGET\s*=\s*'progress'/)
  assert.match(constants, /TAB_KIND\s*=\s*'progress'/)
})

test('root DOM marker is present', () => {
  const src = read('src/client/view/ProgressBody.jsx')
  assert.match(src, /data-nano-progress-report/)
})

test('no host-DOM grafting patterns in src/client', () => {
  // Aligned with check-ui-rules U5: host class grafting is forbidden, but
  // :has() scoping on our own npr- prefixed classes is allowed.
  const forbidden = /\[class\s*[*^$|~]?=|:has\((?![^)]*npr-)/
  for (const path of walk(join(root, 'src/client'))) {
    const text = readFileSync(path, 'utf8')
    assert.doesNotMatch(text, forbidden, `${path} grafts host DOM`)
  }
})

test('host entry registers no routes (AGENTS.md: 无宿主路由)', () => {
  const src = read('index.js')
  assert.doesNotMatch(src, /\.route\s*\(|registerRoute|routes\s*[:=]/,
    'index.js must not declare host routes — route-scan/contract do not cover this plugin')
})

test('baked artifacts match their sources (freshness)', async () => {
  const { createHash } = await import('node:crypto')
  const decl = JSON.parse(read('src/perf/declaration.json'))
  const baked = read('lib/perf-declaration.js')
  const hash = createHash('sha256').update(JSON.stringify(decl)).digest('hex').slice(0, 12)
  assert.match(baked, new RegExp(`DECL_HASH = "${hash}"`), 'lib/perf-declaration.js is stale — run npm run build')
  const pkg = JSON.parse(read('package.json'))
  const bundle = read('lib/client.js')
  assert.ok(bundle.includes(JSON.stringify(pkg.version)),
    `lib/client.js does not carry version ${pkg.version} — run npm run build`)
})

test('package identity fields', () => {
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.name, 'dsh-nano-progress-report')
  assert.ok(typeof pkg.engines.dsh === 'string' && pkg.engines.dsh.includes('>='),
    'engines.dsh must declare a range (read, not hardcode)')
  assert.ok(pkg.files.includes('lib/client.js'))
  const patch = read('cordis.patch.yml')
  assert.match(patch, /id:\s*nano-progress-report/)
  assert.match(patch, /name:\s*dsh-nano-progress-report/)
})
