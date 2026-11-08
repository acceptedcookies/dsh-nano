import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * Bundle one entry and fail the build when esbuild rejects it.
 * @param {string} entry - source entry, relative to the package root.
 * @param {string} outfile - output path, relative to the package root.
 * @param {string[]} extra - additional esbuild flags.
 */
function bundle(entry, outfile, extra) {
  const built = spawnSync('npx', ['--yes', 'esbuild@0.25.0', entry, '--bundle', ...extra, `--outfile=${join(root, outfile)}`], {
    cwd: root,
    stdio: 'inherit',
  })
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
  '--platform=browser',
  '--external:react',
  '--external:react-dom',
  '--external:react-dom/client',
  // Shared through PLATFORM_MODULES: the shell seeds this identity, so the bundle must not copy it.
  '--external:@deepseek-ai/dsh-client-ui-primitives',
])

const body = join(root, 'lib/client.body.js')
const source = readFileSync(body, 'utf8')
const start = source.indexOf('{')
const end = source.lastIndexOf('}')
const inner = source.slice(start + 1, end)
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
\tid: "dsh-nano-explorer-extra",
\tfactory: (require) => {
\t\tvar module = { exports: {} };
\t\tvar exports = module.exports;
\t\tObject.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
${inner}
\texports.apply = apply;
\texports.inject = inject;
\t\treturn module.exports;
\t}
});
`)
rmSync(body)
