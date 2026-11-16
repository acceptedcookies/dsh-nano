// NUE1117-T17: the hard cut leaves no legacy surface, and every plugin import still resolves.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { PKG, REPO, exportedNames, hits, read, sourceFiles, walk } from './_lib.mjs'

const LEGACY = /MutationObserver|data-nano-theme|--nano-dlg-|setTheme|region|NanoMenuItem/i
const USERS = ['dsh-nano-model-selector', 'dsh-nano-explorer-extra', 'dsh-nano-terminal', 'dsh-nano-kitesurf', 'dsh-nano-cloud-session', 'dsh-nano-notepad']

/** Names a source imports from dsh-nano-ui (`import {…} from` and `const {…} = require(…)`). */
export function importedNames(text) {
  const names = new Set()
  const patterns = [
    /import\s*\{([^}]*)\}\s*from\s*['"]dsh-nano-ui['"]/g,
    /\{([^}]*)\}\s*=\s*require\(\s*['"]dsh-nano-ui['"]\s*\)/g,
  ]
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      for (const part of match[1].split(',')) {
        const name = part.trim().split(/\s+as\s+|\s*:\s*/)[0]
        if (name) names.add(name)
      }
    }
  }
  return names
}

test('no legacy surface left in nano-ui', () => {
  const files = sourceFiles()
  assert.ok(files.length > 0)
  assert.deepEqual(hits(files, LEGACY), [])
  assert.equal(hits([{ path: 'old.js', text: 'export { NanoMenu, NanoMenuItem }\nlayer.setAttribute("data-nano-theme", t)' }], LEGACY).length, 2)
})

test('every name the six plugins import from dsh-nano-ui is exported', () => {
  const exported = exportedNames(read(join(PKG, 'index.js')))
  let files = 0
  const used = new Map()
  for (const user of USERS) {
    const dir = join(REPO, user, 'src', 'client')
    assert.ok(existsSync(dir), dir)
    for (const path of walk(dir)) {
      files++
      for (const name of importedNames(read(path))) used.set(name, `${user}/${path.slice(dir.length + 1)}`)
    }
  }
  assert.ok(files > 0)
  assert.ok(used.size >= 8, `found ${used.size} imported names`)
  for (const [name, where] of used) assert.ok(exported.has(name), `${name} (${where})`)
})

test('importedNames sees named, multi-line and require forms', () => {
  const names = importedNames("import { A,\n  B as C } from 'dsh-nano-ui'\nconst { D, E: F } = require('dsh-nano-ui')")
  assert.deepEqual([...names].sort(), ['A', 'B', 'D', 'E'])
})
