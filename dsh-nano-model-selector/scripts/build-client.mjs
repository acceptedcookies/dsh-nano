import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const body = join(root, 'lib/client.body.js')

// Prefer the locked devDependency binary; fall back to npx only when it is not
// installed, so a release build never pulls a drifted toolchain (review-01 R12).
const local = join(root, 'node_modules', '.bin', 'esbuild')
const shared = ['src/client/index.jsx', '--bundle', '--format=iife', '--global-name=__modelSelectorExport', '--minify', '--platform=browser', '--jsx=transform', '--loader:.svg=text', '--loader:.png=dataurl', '--external:react', '--external:react-dom', '--external:react-dom/client', '--external:@deepseek-ai/dsh-client-ui-primitives', `--outfile=${body}`]
const built = existsSync(local)
  ? spawnSync(local, shared, { cwd: root, stdio: 'inherit' })
  : spawnSync('npx', ['--yes', 'esbuild@0.25.0', ...shared], { cwd: root, stdio: 'inherit' })
if (built.status !== 0) process.exit(built.status ?? 1)

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
