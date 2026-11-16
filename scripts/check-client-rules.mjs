#!/usr/bin/env node
/**
 * check-client-rules — static invariants for the DNMS browser bundle.
 *
 * Optional quality script (part of scripts/test-all.mjs's gate list, not a
 * release gate). Each rule encodes a regression we actually shipped:
 *
 *  1. hooks-order    — every React hook in a function component must be
 *     called before any early `return` in the same component. #310
 *     ("Rendered more hooks than during the previous render") killed the
 *     slot when a useCallback/useEffect sat below `if (state === null)
 *     return …`.
 *  2. primitives-exports — every named import from
 *     '@deepseek-ai/dsh-client-ui-primitives' must exist in the recorded
 *     export list of every supported host release. Missing in ALL lists →
 *     fail. Missing in SOME → warn (only legal behind a runtime ??-fallback,
 *     like CompactionIcon's IconCompact→IconLayers→IconData chain).
 *  3. externals-locked — the built lib/client.js must still reference the
 *     three loader externals react / react-dom / dsh-client-ui-primitives;
 *     an esbuild external-config drift silently inlines or drops them.
 *
 * Implementation: line scanner with a scope stack (no babel). Two passes per
 * function scope: collect candidate early returns first, then flag hooks
 * after the earliest confirmed one.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const PKG = join(root, 'dsh-nano-model-selector')
const SRC = join(PKG, 'src', 'client')
const EXPORTS_JSON = join(PKG, 'test', 'primitives-exports.json')

const problems = []
const warnings = []

/* --------------------------- helpers ----------------------------------- */

function* clientFiles() {
  for (const name of readdirSync(SRC)) {
    if (/\.(jsx?|tsx?)$/.test(name)) yield join(SRC, name)
  }
}

/** Strip // comments and '…'/"…"/`…` literals so braces in strings don't skew depth. */
function cleanLine(line) {
  let out = ''
  let inS = null
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inS !== null) {
      if (c === '\\') { i++; continue }
      if (c === inS) inS = null
      continue
    }
    if (c === '/' && line[i + 1] === '/') break
    if (c === "'" || c === '"' || c === '`') { inS = c; continue }
    out += c
  }
  return out
}

const HOOK_RE = /\bReact\.use[A-Z]\w*\s*\(/
const RETURN_RE = /\breturn\b/
const IF_RE = /\bif\s*\(/
// A line that opens a function scope: `function` or `=>` only — `if/for/
// while/switch/catch …) {` lines must NOT push a scope or relative depths skew.
// Class method bodies need no scope: hooks never live there legally.
const SCOPE_RE = /\bfunction\b|=>/

/* --------------------- rule 1: hooks-order ------------------------------ */

function checkHooksOrder(file, lines) {
  const scopes = [] // {bodyDepth, hooks:[line], returns:[{line,maybeEarly}], earlyBlock:boolean}
  let depth = 0
  for (let n = 0; n < lines.length; n++) {
    const src = cleanLine(lines[n])
    const opens = (src.match(/\{/g) ?? []).length
    const closes = (src.match(/\}/g) ?? []).length
    const cur = scopes[scopes.length - 1]
    if (cur) {
      const rel = depth - cur.bodyDepth
      if (HOOK_RE.test(src)) cur.hooks.push(n + 1)
      if (RETURN_RE.test(src)) {
        // Early candidates: `if (...) return` one-liner at body level, a
        // return inside an if-block at body level, or any bare return at body
        // level (confirmed later by "not the last return in the scope").
        const maybeEarly = (rel === 0 && IF_RE.test(src)) || (rel === 1 && cur.earlyBlock) || rel === 0
        cur.returns.push({ line: n + 1, maybeEarly })
      }
      // An `if` block opened at body depth marks the early-return region
      // until depth drops back to the body level (`} else {` stays inside).
      if (rel === 0 && IF_RE.test(src) && opens > closes) cur.earlyBlock = true
    }
    const opensScope = SCOPE_RE.test(src) && opens - closes > 0
    depth += opens - closes
    if (opensScope) scopes.push({ bodyDepth: depth, hooks: [], returns: [], earlyBlock: false })
    if (cur && depth <= cur.bodyDepth) cur.earlyBlock = false
    while (scopes.length > 0 && depth < scopes[scopes.length - 1].bodyDepth) {
      finalizeScope(scopes.pop(), file)
    }
  }
  while (scopes.length > 0) finalizeScope(scopes.pop(), file)
}

function finalizeScope(scope, file) {
  if (scope.returns.length === 0 || scope.hooks.length === 0) return
  const lastReturn = scope.returns[scope.returns.length - 1].line
  const firstEarly = scope.returns
    .filter(r => r.maybeEarly && r.line !== lastReturn)
    .reduce((min, r) => Math.min(min, r.line), Infinity)
  if (firstEarly === Infinity) return
  for (const h of scope.hooks) {
    if (h > firstEarly) {
      problems.push(`hooks-order ${file}:${h} — hook runs only after an early return at line ${firstEarly} (React #310 unmounts the slot)`)
    }
  }
}

/* ---------------- rule 2: primitives-exports ---------------------------- */

function checkPrimitivesImports(file, text, exportSets) {
  for (const m of text.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]@deepseek-ai\/dsh-client-ui-primitives['"]/g)) {
    const names = m[1].split(',').map(s => s.trim()).filter(Boolean)
    for (const name of names) {
      const missingIn = Object.keys(exportSets).filter(rel => !exportSets[rel].has(name))
      if (missingIn.length === Object.keys(exportSets).length) {
        problems.push(`primitives-exports ${file} — "${name}" not exported by ANY recorded release (${Object.keys(exportSets).join('/')})`)
      } else if (missingIn.length > 0) {
        warnings.push(`primitives-exports ${file} — "${name}" missing in ${missingIn.join(',')} (only safe behind a ??-fallback)`)
      }
    }
  }
}

/* ---------------- rule 3: externals-locked ------------------------------ */

function checkExternals() {
  const bundle = join(PKG, 'lib', 'client.js')
  if (!existsSync(bundle)) { problems.push('externals-locked lib/client.js missing — run npm run build'); return }
  const text = readFileSync(bundle, 'utf8')
  for (const name of ['react', 'react-dom', '@deepseek-ai/dsh-client-ui-primitives']) {
    if (!text.includes(`"${name}"`) && !text.includes(`'${name}'`)) {
      problems.push(`externals-locked lib/client.js lost its "${name}" external reference — check esbuild external list`)
    }
  }
  if (!text.includes('__ModuleLoader__.load')) {
    problems.push('externals-locked lib/client.js missing the ModuleLoader wrapper')
  }
}

/* ------------------------------ run ------------------------------------- */

let exportSets = null
if (existsSync(EXPORTS_JSON)) {
  const snapshot = JSON.parse(readFileSync(EXPORTS_JSON, 'utf8'))
  exportSets = Object.fromEntries(Object.entries(snapshot.exports).map(([k, v]) => [k, new Set(v)]))
} else {
  warnings.push(`primitives-exports snapshot missing — rule 2 skipped; regenerate with scripts/gen-primitives-exports.mjs`)
}

for (const file of clientFiles()) {
  const text = readFileSync(file, 'utf8')
  const rel = file.replace(`${root}/`, '')
  checkHooksOrder(rel, text.split('\n'))
  if (exportSets) checkPrimitivesImports(rel, text, exportSets)
}
checkExternals()

for (const w of warnings) console.log(`WARN  ${w}`)
if (problems.length > 0) {
  for (const p of problems) console.error(`FAIL  ${p}`)
  console.error(`\ncheck-client-rules: ${problems.length} problem(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
console.log(`check-client-rules: ok (${warnings.length} warning(s))`)
