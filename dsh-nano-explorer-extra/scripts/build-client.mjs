import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dnprDefine } from '../../scripts/dnpr-define.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

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

// Locked devDependency only — a release build never pulls a drifted toolchain
// (P4-06, review-01 R12). We resolve the installed esbuild's JS API instead of
// spawning node_modules/.bin/esbuild: that shim is a POSIX shell script on
// macOS/Linux and unspawnable on Windows (esbuild.cmd needs shell:true, the
// native binary lives under @esbuild/<platform>-<arch>/). Letting esbuild pick
// its own binary keeps this script identical on every OS.
const require = createRequire(join(root, 'package.json'))
let esbuild
try {
  esbuild = require('esbuild')
} catch {
  console.error('[build] esbuild not installed — run `npm ci` first (no npx fallback)')
  process.exit(1)
}

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
/** Compile-time package version, so both halves can report `meta.version` to perf-review. */
const versionDefine = { __NXE_VERSION__: JSON.stringify(version) }

/**
 * Bundle one entry through the esbuild JS API (CLI flags minus leading `--`
 * map 1:1 onto build options). buildSync throws on failure, so a broken build
 * can no longer exit silently with no stderr.
 * @param {object} options - esbuild build options.
 */
function bundle(options) {
  try {
    esbuild.buildSync({ absWorkingDir: root, logLevel: 'info', bundle: true, ...options })
  } catch (error) {
    console.error(`[build] esbuild failed: ${error.message}`)
    process.exit(1)
  }
}

// Host half: plain ESM for Node. No --packages=external: the only bare import the host
// sources carry is dsh-performance-review, and it MUST be bundled — the development
// instance copies lib/ but not node_modules, so a runtime bare import would fail to
// resolve (spec §3.3/F3). node:* builtins stay external automatically on platform=node.
bundle({
  entryPoints: ['src/host/entry.js'],
  outfile: join(root, 'lib/host.js'),
  format: 'esm',
  platform: 'node',
  define: { ...versionDefine, ...dnprDefine },
})

// Browser half: an IIFE wrapped in the client module-loader factory format.
bundle({
  entryPoints: ['src/client/index.js'],
  outfile: join(root, 'lib/client.body.js'),
  format: 'iife',
  globalName: '__nxeExport',
  minify: true,
  platform: 'browser',
  external: ['react', 'react-dom', 'react-dom/client',
    // Shared through PLATFORM_MODULES: the shell seeds this identity, so the bundle must not copy it.
    '@deepseek-ai/dsh-client-ui-primitives'],
  define: { ...versionDefine, ...dnprDefine },
})

const body = join(root, 'lib/client.body.js')
// The bundle assigns its exports to one named global, so the factory returns that object rather than
// guessing at internal binding names: those survive minification only by luck.
const source = readFileSync(body, 'utf8').trim()
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
	id: "dsh-nano-explorer-extra",
	factory: (require) => {
${source}
		return __nxeExport;
	}
});
`)
rmSync(body)
