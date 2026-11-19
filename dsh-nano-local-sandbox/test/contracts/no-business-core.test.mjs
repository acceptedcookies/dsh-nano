import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const KERNEL_DIR = join(packageRoot, 'src', 'host')
const ENTRY = join(packageRoot, 'index.js')

// I-1: the kernel is profile-neutral. Business words may appear in profiles/,
// scripts/ and tests; a single occurrence here means business logic leaked in.
const BANNED = ['kitesurf', 'workerd', 'wrangler', 'agent-browser', 'browser-settings']

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.json') || name.endsWith('.md') || name.endsWith('.yml') || name.endsWith('.yaml')) out.push(path)
  }
  return out
}

function hits(file) {
  const rows = []
  const text = readFileSync(file, 'utf8')
  const lines = text.split('\n')
  for (const word of BANNED) {
    const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    lines.forEach((line, index) => {
      if (re.test(line)) rows.push(`${relative(packageRoot, file)}:${index + 1}: ${line.trim().slice(0, 160)}`)
    })
  }
  return rows
}

test('src/host and index.js contain no profile business words', () => {
  const files = [...walk(KERNEL_DIR), ENTRY]
  const found = files.flatMap(hits)
  assert.deepEqual(found, [], `business words in the kernel:\n${found.join('\n')}`)
})

test('the scan itself would catch a leak', () => {
  const rows = hits(join(packageRoot, 'profiles', 'kitesurf', 'driver', 'index.js'))
  assert.equal(rows.length > 0, true, 'fixture check: the driver is outside the kernel and does contain business words')
})
