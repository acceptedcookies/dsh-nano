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
