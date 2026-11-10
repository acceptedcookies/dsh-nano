import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const body = join(root, 'lib/client.body.js')

// Prefer the locked devDependency binary; fall back to npx only when it is not
// installed, so a release build never pulls a drifted toolchain (review-01 R12).
const local = join(root, 'node_modules', '.bin', 'esbuild')

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
/** Compile-time package version. A SINGLE stringify keeps the bare "0.1.1"
 * string in the bundle (spec §6.1); perf.js reads __NOTEPAD_VERSION__. */
const versionDefine = `--define:__NOTEPAD_VERSION__=${JSON.stringify(version)}`

/**
 * Bundle one entry and fail the build when esbuild rejects it.
 * @param {string[]} args - esbuild flags + entry, in argv order.
 */
function build(args) {
  const built = existsSync(local)
    ? spawnSync(local, args, { cwd: root, stdio: 'inherit' })
    : spawnSync('npx', ['--yes', 'esbuild@0.25.0', ...args], { cwd: root, stdio: 'inherit' })
  if (built.status !== 0) process.exit(built.status ?? 1)
}

// Host helper: the unbundled index.js imports this from lib/. The development
// instance copies lib/ but not node_modules, so dsh-performance-review/host MUST
// be bundled here; node:* builtins stay external automatically on platform=node
// (spec §6.1/F3). Only node:* bare imports survive in the output.
build([
  'node_modules/dsh-performance-review/src/host.js',
  '--bundle', '--format=esm', '--platform=node',
  `--outfile=${join(root, 'lib/perf-review-host.js')}`,
])

// Browser half: an IIFE wrapped in the client module-loader factory format.
// dsh-performance-review/client is a source dependency (NOT external), so it is
// bundled into lib/client.js. Keep all existing externals unchanged.
build([
  'src/client/index.js', '--bundle', '--format=iife',
  '--global-name=__notepadExport', '--minify', '--platform=browser',
  '--external:react', '--external:react-dom', '--external:react-dom/client',
  '--external:@deepseek-ai/dsh-client-ui-primitives',
  versionDefine,
  `--outfile=${body}`,
])

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
