import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dnprDefine } from '../../scripts/dnpr-define.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
{
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const baked = spawnSync(process.execPath, [join(root, '..', 'scripts/bake-plugin-bindings.mjs'), '--plugin', pkg.name], { stdio: 'inherit' })
  if (baked.status !== 0) process.exit(baked.status ?? 1)
  const decl = spawnSync(process.execPath, [join(root, '..', 'scripts/bake-declaration.mjs'), '--plugin', pkg.name], { stdio: 'inherit' })
  if (decl.status !== 0) process.exit(decl.status ?? 1)
}
const body = join(root, 'lib/client.body.js')

// CF1115 / P1-04: the path-keyed ROUTE_TABLE bake is retired. The web surfaces
// are declared in lib/bindings.js (channel/match ledger committed as the baked
// artifact) and registered through lib/web-registrar.js (bundled below).

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
/** Compile-time package version. A SINGLE stringify keeps the bare "0.1.1"
 * string in the bundle (spec §6.1); perf.js reads __NOTEPAD_VERSION__. */
const versionDefine = { __NOTEPAD_VERSION__: JSON.stringify(version) }

/**
 * Bundle one entry through the esbuild JS API (CLI flags minus leading `--`
 * map 1:1 onto build options, e.g. `--loader:.svg=text` →
 * `loader: { '.svg': 'text' }`). buildSync throws on failure, so a broken
 * build can no longer exit silently with no stderr.
 * @param {object} options - esbuild build options.
 */
function build(options) {
  try {
    esbuild.buildSync({ absWorkingDir: root, logLevel: 'info', ...options })
  } catch (error) {
    console.error(`[build] esbuild failed: ${error.message}`)
    process.exit(1)
  }
}

// Host helper: the unbundled index.js imports this from lib/. The development
// instance copies lib/ but not node_modules, so dsh-performance-review/host MUST
// be bundled here; node:* builtins stay external automatically on platform=node
// (spec §6.1/F3). Only node:* bare imports survive in the output.
build({
  entryPoints: ['node_modules/dsh-performance-review/src/host.js'],
  bundle: true, format: 'esm', platform: 'node',
  define: dnprDefine,
  outfile: join(root, 'lib/perf-review-host.js'),
})

// Host S3 engine: same reason as above — the dev instance copies lib/ but not
// node_modules, so dsh-s3-client/* must be bundled into a single relative
// import for index.js. Only node:* builtins survive as externals.
build({
  entryPoints: ['src/host/s3-sync.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/s3-sync-host.js'),
})

// Web registrar: same constraint — index.js is unbundled and imports
// ./lib/web-registrar.js at runtime, so the dsh-interface/host facade (which
// reuses the single dsh-host-route-guard implementation) and the baked binding
// table are bundled here; only node:* bare imports survive (CF1115 / P1-04).
build({
  entryPoints: ['src/host/route-guard-entry.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/web-registrar.js'),
})

// mp-sanitize-entry (P3-03): same constraint — index.js imports
// ./lib/mp-sanitize.js at runtime, so dsh-html-policy (the shared ALLOWED/DROP
// policy table + string serializer) is bundled here; only node:* bare imports
// survive. The client renderer consumes the same policy inside lib/client.js.
build({
  entryPoints: ['src/host/mp-sanitize.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/mp-sanitize.js'),
})

// fx bridge + pipeline: index.js is unbundled and imports ./lib/fx-bridge.js and
// ./lib/pipeline.js; bundle each (pipeline inlines pipeline-s3 + pipeline-claim).
// Only node:* bare imports survive.
build({
  entryPoints: ['src/host/fx-bridge.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/fx-bridge.js'),
})
build({
  entryPoints: ['src/host/pipeline.js'],
  bundle: true, format: 'esm', platform: 'node',
  outfile: join(root, 'lib/pipeline.js'),
})

// Browser half: an IIFE wrapped in the client module-loader factory format.
// dsh-performance-review/client is a source dependency (NOT external), so it is
// bundled into lib/client.js. Keep all existing externals unchanged.
build({
  entryPoints: ['src/client/index.js'], bundle: true, format: 'iife',
  globalName: '__notepadExport', minify: true, platform: 'browser',
  external: ['react', 'react-dom', 'react-dom/client',
    '@deepseek-ai/dsh-client-ui-primitives'],
  define: { ...versionDefine, ...dnprDefine },
  outfile: body,
})

// `--global-name` makes esbind's IIFE assign the package exports to one named
// global, so the factory returns that object instead of guessing at internal
// binding names — which minification renames and a hand-spliced
// `exports.apply = apply` would never find (this was the "apply is not defined"
// regression). The IIFE body is embedded verbatim; no brace-slicing.
const source = readFileSync(body, 'utf8').trim()
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
	id: "dsh-nano-notepad",
	factory: (require) => {
${source}
		return __notepadExport;
	}
});
`)
rmSync(body)
