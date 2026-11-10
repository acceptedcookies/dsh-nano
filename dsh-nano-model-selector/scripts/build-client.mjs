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
/** Compile-time package version, so the client bundle reports `meta.version` to perf-review. */
const versionDefine = `--define:__NMS_VERSION__=${JSON.stringify(version)}`

/** Run esbuild with the local binary (or a pinned npx fallback), failing the build on error. */
function esbuild(argv) {
  const built = existsSync(local)
    ? spawnSync(local, argv, { cwd: root, stdio: 'inherit' })
    : spawnSync('npx', ['--yes', 'esbuild@0.25.0', ...argv], { cwd: root, stdio: 'inherit' })
  if (built.status !== 0) process.exit(built.status ?? 1)
}

// Host half: the unbundled index.js imports ./lib/perf-review-host.js at runtime.
// Bundle dsh-performance-review/src/host.js so the only bare imports left are
// node:* builtins — the dev instance copies lib/ but not node_modules (spec §6.1/F3).
esbuild([
  'node_modules/dsh-performance-review/src/host.js',
  '--bundle', '--format=esm', '--platform=node',
  `--outfile=${join(root, 'lib', 'perf-review-host.js')}`,
])

// Browser half: one IIFE wrapped in the client module-loader factory. Shared UI
// and the perf-review client are bundled (they are file: deps, not externals).
const shared = ['src/client/index.jsx', '--bundle', '--format=iife', '--global-name=__modelSelectorExport', '--minify', '--platform=browser', '--jsx=transform', '--loader:.svg=text', '--loader:.png=dataurl', '--external:react', '--external:react-dom', '--external:react-dom/client', '--external:@deepseek-ai/dsh-client-ui-primitives', versionDefine, `--outfile=${body}`]
esbuild(shared)

// `--global-name` makes esbuild's IIFE assign the package exports to one named
// global, so the factory returns that object instead of guessing at internal
// binding names — which minification renames and a hand-spliced
// `exports.apply = apply` would never find (this was the "apply is not defined"
// regression). The IIFE body is embedded verbatim; no brace-slicing.
const source = readFileSync(body, 'utf8').trim()
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
	id: "dsh-nano-model-selector",
	factory: (require) => {
${source}
		return __modelSelectorExport;
	}
});
`)
rmSync(body)
