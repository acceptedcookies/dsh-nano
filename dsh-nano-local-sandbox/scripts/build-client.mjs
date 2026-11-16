import { createRequire } from 'node:module'
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const result = spawnSync(process.execPath, [
  join(root, '..', 'scripts/bake-plugin-bindings.mjs'),
  '--plugin',
  pkg.name,
], { stdio: 'inherit' })
if (result.status !== 0) process.exit(result.status ?? 1)

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
  outfile: join(root, 'lib/perf-review-host.js'),
  logLevel: 'warning',
})
