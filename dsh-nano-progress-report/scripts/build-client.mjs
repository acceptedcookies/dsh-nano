import { createRequire } from 'node:module'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { dnprDefine } from '../../scripts/dnpr-define.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const body = join(root, 'lib/client.body.js')

// perf declaration bake: src/perf/declaration.json -> lib/perf-declaration.js.
const repoRoot = join(root, '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const decl = spawnSync(process.execPath, [join(repoRoot, 'scripts/bake-declaration.mjs'), '--plugin', pkg.name], { stdio: 'inherit' })
if (decl.status !== 0) process.exit(decl.status ?? 1)

const require = createRequire(join(root, 'package.json'))
let esbuild
try {
  esbuild = require('esbuild')
} catch {
  console.error('[build] esbuild not installed — run `npm install` first (no npx fallback)')
  process.exit(1)
}

const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const versionDefine = { __NPR_VERSION__: JSON.stringify(version) }

function bundle(options) {
  try {
    esbuild.buildSync({ absWorkingDir: root, logLevel: 'info', bundle: true, ...options })
  } catch (error) {
    console.error(`[build] esbuild failed: ${error.message}`)
    process.exit(1)
  }
}

// Browser half: an IIFE wrapped in the client module-loader factory format.
bundle({
  entryPoints: ['src/client/index.js'],
  outfile: body,
  format: 'iife',
  globalName: '__nprExport',
  minify: true,
  platform: 'browser',
  external: ['react', 'react-dom', 'react-dom/client',
    // Shared through PLATFORM_MODULES: the shell seeds this identity.
    '@deepseek-ai/dsh-client-ui-primitives'],
  define: { ...versionDefine, ...dnprDefine },
})

const source = readFileSync(body, 'utf8').trim()
writeFileSync(join(root, 'lib/client.js'), `window.__ModuleLoader__.load({
	id: "dsh-nano-progress-report",
	factory: (require) => {
${source}
		return __nprExport;
	}
});
`)
rmSync(body)
