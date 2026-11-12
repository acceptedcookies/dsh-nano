#!/usr/bin/env node
/**
 * Clean-lib gate (T-O-13 / P1-04): the runtime may only resolve `node:*`
 * builtins and relative `./`/`../` imports. Any bare package specifier left in
 * a shipped artifact would fail at runtime — the dev instance copies lib/ but
 * not node_modules, and a tarball cannot resolve `file:` dependencies.
 *
 * `node --check` is NOT sufficient: it parses but never resolves specifiers.
 * This script scans the emitted bundles for bare `import/export ... from`,
 * side-effect `import '<pkg>'`, dynamic `import('<pkg>')`, and `require('<pkg>')`.
 *
 * Scope: each plugin's lib/*.js (host ESM bundles + route-guard bundles +
 * shipped sources like lib/host-media.js) plus the unbundled host index.js
 * (notepad, model-selector). The IIFE lib/client.js bundles carry no static
 * imports, but they are scanned anyway — a bare specifier is illegal anywhere.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

// DEPRECATED 2026-11-12: dsh-nano-shared-workspace retired to deprecated/;
// its lib/ is archived, not shipped, so it is no longer scanned. See
// deprecated/README.md.
const PLUGINS = [
  'dsh-nano-notepad',
  'dsh-nano-explorer-extra',
  'dsh-nano-model-selector',
]

/** Plugins whose host entry is the unbundled index.js (also a runtime file). */
const UNBUNDLED_INDEX = ['dsh-nano-notepad', 'dsh-nano-model-selector']

/**
 * Strip comments so JSDoc `import('pkg').Type` annotations and commented-out
 * imports are not mistaken for real specifiers. Block comments are removed
 * wholesale; line comments are removed only when `//` starts the line or
 * follows whitespace — so a `//` inside a string literal (e.g. 'a://b') or a
 * regex does not eat real code.
 */
function stripComments(text) {
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
  return noBlocks.split('\n').map(line => {
    const idx = line.search(/(^|\s)\/\//)
    return idx === -1 ? line : line.slice(0, idx)
  }).join('\n')
}

/**
 * Every static/dynamic specifier in a JS source, with its 1-based line.
 * @returns {{spec: string, line: number}[]}
 */
function specifiers(text) {
  const clean = stripComments(text)
  const out = []
  const patterns = [
    /(?:import|export)\s+[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g, // import ... from / export ... from
    /\bimport\s*['"]([^'"]+)['"]/g,                           // side-effect import
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,                 // dynamic import('...')
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,                // require('...')
  ]
  for (const re of patterns) {
    for (const match of clean.matchAll(re)) {
      out.push({ spec: match[1], line: clean.slice(0, match.index).split('\n').length })
    }
  }
  return out
}

/** A specifier the runtime cannot resolve: not node:*, not ./ ../ or absolute. */
const isBare = spec =>
  !spec.startsWith('node:')
  && !spec.startsWith('./')
  && !spec.startsWith('../')
  && !spec.startsWith('/')

function main() {
  const problems = []
  const scanned = []

  for (const plugin of PLUGINS) {
    const dir = join(ROOT, plugin)
    const lib = join(dir, 'lib')
    const files = existsSync(lib)
      ? readdirSync(lib).filter(name => name.endsWith('.js')).map(name => join(lib, name))
      : []
    if (UNBUNDLED_INDEX.includes(plugin) && existsSync(join(dir, 'index.js'))) {
      files.push(join(dir, 'index.js'))
    }
    for (const file of files.sort()) {
      scanned.push(file)
      const text = readFileSync(file, 'utf8')
      for (const { spec, line } of specifiers(text)) {
        if (isBare(spec)) {
          problems.push(`${file.slice(ROOT.length + 1)}:${line} — bare specifier '${spec}' would fail at runtime`)
        }
      }
    }
  }

  if (problems.length > 0) {
    console.error(`clean-lib FAILED: ${problems.length} bare specifier(s) in runtime artifacts`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`clean-lib OK: ${scanned.length} runtime artifact(s), only node:* + relative imports`)
}

main()
