import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'test') continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) files(path, out)
    else if (name.endsWith('.js') || name.endsWith('.mjs')) out.push(path)
  }
  return out
}

test('runtime source has no SandboxProvider and no shell seam assignment', () => {
  const hits = []
  for (const file of files(root)) {
    const text = readFileSync(file, 'utf8')
    if (text.includes('SandboxProvider') || /\.shell\s*=/.test(text)) hits.push(file)
  }
  assert.deepEqual(hits, [])
})
