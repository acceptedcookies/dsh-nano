import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dnprDefine } from '../../scripts/dnpr-define.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const body = join(root, 'lib/client.body.js')

import { spawnSync } from 'node:child_process'

function bakeBindings() {
  const repoRoot = join(root, '..')
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const result = spawnSync(process.execPath, [join(repoRoot, 'scripts/bake-plugin-bindings.mjs'), '--plugin', pkg.name], { stdio: 'inherit' })
  if (result.status !== 0) process.exit(result.status ?? 1)
  const decl = spawnSync(process.execPath, [join(repoRoot, 'scripts/bake-declaration.mjs'), '--plugin', pkg.name], { stdio: 'inherit' })
  if (decl.status !== 0) process.exit(decl.status ?? 1)
}

bakeBindings()

const require = createRequire(join(root, 'package.json'))
let esbuild
try {
  esbuild = require('esbuild')
} catch {
  console.error('[build] esbuild not installed — run `npm ci` first (no npx fallback)')
  process.exit(1)
}

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const versionDefine = { __DNCS_VERSION__: JSON.stringify(version) }

function build(options) {
  try {
    esbuild.buildSync({ absWorkingDir: root, logLevel: 'info', ...options })
  } catch (error) {
    console.error(`[build] esbuild failed: ${error.message}`)
    process.exit(1)
  }
}

// Host helpers bundled into lib/: the dev instance copies lib/ but not
// node_modules, so every bare import must be bundled; only node:* externals
// survive. Same constraint for all three host bundles below.
build({
  entryPoints: ['node_modules/dsh-performance-review/src/host.js'],
  bundle: true, format: 'esm', platform: 'node',
  define: dnprDefine,
  outfile: join(root, 'lib/perf-review-host.js'),
})

build({
  entryPoints: ['src/host/devin-api.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/devin-api.js'),
})

build({
  entryPoints: ['src/host/profiles.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/profiles-store.js'),
})

build({
  entryPoints: ['src/host/route-guard-entry.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/route-guard.js'),
})

build({
  entryPoints: ['src/host/ssh-keys.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/ssh-keys.js'),
})

// Browser half: IIFE wrapped in the client module-loader factory format.
build({
  entryPoints: ['src/client/index.js'], bundle: true, format: 'iife',
  globalName: '__dncsExport', minify: true, platform: 'browser',
  external: ['react', 'react-dom', 'react-dom/client',
    '@deepseek-ai/dsh-client-ui-primitives'],
  define: { ...versionDefine, ...dnprDefine },
  outfile: body,
})

const source = readFileSync(body, 'utf8').trim()
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
	id: "dsh-nano-cloud-session",
	factory: (require) => {
${source}
		return __dncsExport;
	}
});
`)
rmSync(body)
