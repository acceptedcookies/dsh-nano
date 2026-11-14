import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const ALLOW = [
  'docs/specs/dsh-nano-local-sandbox/qna/DNLS01-qna.md',
  'docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v0.9.md',
  'docs/specs/dsh-nano-local-sandbox/dsh-nano-local-sandbox-v1.1.md',
  'docs/specs/dsh-nano-local-sandbox/plan/DNLS01-macos-platform-cutover.md',
]

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === '.git' || name === 'node_modules' || name === 'target' || name === 'context' || name === '.agents') continue
    const path = join(dir, name)
    let info
    try { info = statSync(path) } catch { continue }
    if (info.isDirectory()) {
      if (name === '.anote') continue
      files(path, out)
    } else out.push(path)
  }
  return out
}

test('retired literals stay in the four historical documents, and the container CLI stays in backend-apple.js', () => {
  assert.equal(ALLOW.length, 4)
  const allowed = new Set(ALLOW.map((path) => resolve(root, path)))
  const apple = resolve(root, 'dsh-nano-local-sandbox/src/host/backend-apple.js')
  const oldPrefix = '/nano-' + 'kitesurf/'
  const toolMark = 'kitesurf' + '_'
  const proc = 'proc:' + 'kitesurf'
  const extras = []
  for (const file of files(root)) {
    let text
    try { text = readFileSync(file, 'utf8') } catch { continue }
    const resolved = resolve(file)
    if (allowed.has(resolved)) continue
    const old = text.includes(oldPrefix) || text.includes(proc) || text.includes('`' + toolMark) || text.includes("'" + toolMark) || text.includes('"' + toolMark)
    const spawn = text.includes('spawn(' + "'container'") || text.includes('execFile(' + "'container'")
    if (old || (spawn && resolved !== apple)) extras.push(resolved.slice(root.length + 1))
  }
  assert.deepEqual(extras, [])
})
