import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const archivePath = join(root, 'dsh-nano-local-sandbox', 'test', 'artifacts', 'pack-manifest.json')

test('the phase-6 pack archive already exists and matches a fresh dry run', () => {
  assert.equal(existsSync(archivePath), true)
  const saved = JSON.parse(readFileSync(archivePath, 'utf8'))
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim()
  execFileSync('git', ['merge-base', '--is-ancestor', saved.commit, head], { cwd: root })
  const names = ['dsh-nano-local-sandbox', 'dsh-nano-kitesurf', 'dsh-nano-terminal']
  for (const name of names) {
    const raw = execFileSync('npm', ['pack', '--dry-run', '--json', '--cache', '/tmp/dnls-npm-cache'], {
      cwd: join(root, name),
      encoding: 'utf8',
    })
    const files = JSON.parse(raw)[0].files.map((file) => file.path).sort()
    assert.deepEqual(files, saved.packs[name])
    assert.equal(files.some((file) => file.includes('linux-prefix/')), false)
  }
  assert.equal(saved.packs['dsh-nano-local-sandbox'].includes('profiles/kitesurf/Dockerfile'), true)
  assert.equal(saved.packs['dsh-nano-local-sandbox'].includes('profiles/kitesurf/entrypoint.sh'), true)
  assert.equal(saved.packs['dsh-nano-local-sandbox'].includes('profiles/kitesurf/mcp-bridge.mjs'), true)
})
