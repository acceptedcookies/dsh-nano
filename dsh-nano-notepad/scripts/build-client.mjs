import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const body = join(root, 'lib/client.body.js')

// Prefer the locked devDependency binary; fall back to npx only when it is not
// installed, so a release build never pulls a drifted toolchain (review-01 R12).
const local = join(root, 'node_modules', '.bin', 'esbuild')
const args = ['src/client/index.js', '--bundle', '--format=iife', '--global-name=__notepadExport', '--minify', '--platform=browser', '--external:react', `--outfile=${body}`]
const built = existsSync(local)
  ? spawnSync(local, args, { cwd: root, stdio: 'inherit' })
  : spawnSync('npx', ['--yes', 'esbuild@0.25.0', ...args], { cwd: root, stdio: 'inherit' })
if (built.status !== 0) process.exit(built.status ?? 1)

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
