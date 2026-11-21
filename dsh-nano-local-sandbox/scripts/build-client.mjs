import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dnprDefine } from '../../scripts/dnpr-define.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
// declaration.json's contract array is projected from the security ledger
// before bake-declaration reads it — ids are authored once, in the ledger.
const projection = spawnSync(process.execPath, [join(root, 'scripts/project-declaration.mjs')], { stdio: 'inherit' })
if (projection.status !== 0) process.exit(projection.status ?? 1)
const result = spawnSync(process.execPath, [
  join(root, '..', 'scripts/bake-plugin-bindings.mjs'),
  '--plugin',
  pkg.name,
], { stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status ?? 1)
const decl = spawnSync(process.execPath, [join(root, '..', 'scripts/bake-declaration.mjs'), '--plugin', pkg.name], { stdio: 'inherit' })
if (decl.status !== 0) process.exit(decl.status ?? 1)

let esbuild
try {
  esbuild = createRequire(join(root, 'package.json'))('esbuild')
} catch {
  esbuild = createRequire(join(root, '../dsh-nano-terminal/package.json'))('esbuild')
}
esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: [join(root, '../packages/dsh-performance-review/src/host.js')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  define: dnprDefine,
  outfile: join(root, 'lib/perf-review-host.js'),
  logLevel: 'warning',
})

// Browser half: dashboard/control pane, IIFE inside the module-loader factory.
mkdirSync(join(root, 'lib'), { recursive: true })
const built = esbuild.buildSync({
  absWorkingDir: root,
  entryPoints: ['src/client/index.jsx'],
  bundle: true,
  format: 'iife',
  globalName: '__dnlsClient',
  platform: 'browser',
  external: ['react', 'react-dom', 'react-dom/client', '@deepseek-ai/dsh-client-ui-primitives'],
  write: false,
  logLevel: 'warning',
})
const clientSource = built.outputFiles[0].text.trim()
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
	id: "dsh-nano-local-sandbox",
	factory: (require) => {
${clientSource}
		return __dnlsClient;
	}
});
`)
console.log('[build] lib/client.js written')
