import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// Prefer the locked devDependency binary; fall back to npx only when it is not
// installed, so a release build never pulls a drifted toolchain (review-01 R12).
const local = join(root, 'node_modules', '.bin', 'esbuild')

/**
 * Bundle one entry and fail the build when esbuild rejects it.
 * @param {string} entry - source entry, relative to the package root.
 * @param {string} outfile - output path, relative to the package root.
 * @param {string[]} extra - additional esbuild flags.
 */
function bundle(entry, outfile, extra) {
  const argv = [entry, '--bundle', ...extra, `--outfile=${join(root, outfile)}`]
  const built = existsSync(local)
    ? spawnSync(local, argv, { cwd: root, stdio: 'inherit' })
    : spawnSync('npx', ['--yes', 'esbuild@0.25.0', ...argv], { cwd: root, stdio: 'inherit' })
  if (built.status !== 0) process.exit(built.status ?? 1)
}

// Host half: plain ESM for Node, with the Host's own packages left to the runtime resolution.
// Bundling keeps every source module inside `lib/`, which is the only directory the development
// instance copies into ~/.dsh-dev/plugins.
bundle('src/host/entry.js', 'lib/host.js', [
  '--format=esm',
  '--platform=node',
  '--packages=external',
])

// Browser half: an IIFE wrapped in the client module-loader factory format.
bundle('src/client/index.js', 'lib/client.body.js', [
  '--format=iife',
  '--global-name=__nxeExport',
  '--minify',
  '--platform=browser',
  '--external:react',
  '--external:react-dom',
  '--external:react-dom/client',
  // Shared through PLATFORM_MODULES: the shell seeds this identity, so the bundle must not copy it.
  '--external:@deepseek-ai/dsh-client-ui-primitives',
])

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
