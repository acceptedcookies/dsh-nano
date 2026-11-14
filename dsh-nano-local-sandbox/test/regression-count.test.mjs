import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'

const BASE = '6afb4d99c157951864274c152a27cb5f7ade8503'
const root = new URL('../../', import.meta.url).pathname

function gitShow(path) {
  return execFileSync('git', ['show', `${BASE}:${path}`], { cwd: root, encoding: 'utf8' })
}

function filesAt(prefix) {
  return execFileSync('git', ['ls-tree', '-r', '--name-only', BASE, prefix], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter((path) => path.endsWith('.mjs'))
}

function titles(text) {
  const found = []
  const re = /(?:^|\n)\s*(?:test|it)\(\s*'([^']+)'/g
  let match
  while ((match = re.exec(text))) {
    const start = match.index
    const next = text.slice(start + match[0].length).search(/\n\s*(?:test|it)\(/)
    const body = next === -1 ? text.slice(start) : text.slice(start, start + match[0].length + next)
    const asserts = (body.match(/\bassert\./g) ?? []).length + (body.match(/\bstrictEqual\(/g) ?? []).length
    found.push({ title: match[1], asserts })
  }
  return found
}

function currentFiles(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...currentFiles(path))
    else if (name.endsWith('.mjs')) out.push(path)
  }
  return out
}

test('deleted DNK and DNT titles still exist with at least as many asserts', () => {
  const before = new Map()
  for (const path of [...filesAt('dsh-nano-kitesurf/test'), ...filesAt('dsh-nano-terminal/test')]) {
    for (const row of titles(gitShow(path))) {
      const prev = before.get(row.title)
      if (!prev || row.asserts > prev.asserts) before.set(row.title, { ...row, path })
    }
  }
  const now = new Map()
  for (const dir of ['dsh-nano-kitesurf/test', 'dsh-nano-terminal/test', 'dsh-nano-local-sandbox/test']) {
    for (const path of currentFiles(join(root, dir))) {
      for (const row of titles(readFileSync(path, 'utf8'))) {
        const prev = now.get(row.title)
        if (!prev || row.asserts > prev.asserts) now.set(row.title, row)
      }
    }
  }
  const missing = []
  for (const [title, row] of before) {
    const kept = now.get(title)
    if (!kept) missing.push(`${title} (${row.path})`)
    else if (kept.asserts < row.asserts) missing.push(`${title} asserts ${kept.asserts} < ${row.asserts}`)
    else if (kept.asserts === 0) missing.push(`${title} has no assert`)
  }
  assert.equal(before.size > 0, true)
  assert.deepEqual(missing, [])
})
