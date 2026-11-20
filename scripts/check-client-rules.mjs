#!/usr/bin/env node
/**
 * check-client-rules — static invariants for plugin browser code.
 *
 * Optional quality script (part of scripts/test-all.mjs's gate list, not a
 * release gate). Each rule encodes a regression we actually shipped:
 *
 *  1. hooks-order    — every React hook in a function component must be
 *     called before any early `return` in the same component. #310
 *     ("Rendered more hooks than during the previous render") killed the
 *     slot when a useCallback/useEffect sat below `if (state === null)
 *     return …`.
 *  2. primitives-catalog — every name taken from
 *     '@deepseek-ai/dsh-client-ui-primitives' (named / multi-line named /
 *     default+named imports, namespace member access and destructuring,
 *     require() destructuring; `{ A: B }` checks A) must exist in
 *     packages/dsh-nano-ui/catalog/primitives.json for every recorded host
 *     release. Scope: src/client/** of the six nano-ui users plus
 *     packages/dsh-nano-ui/src/**. Missing in ALL releases → fail; missing in
 *     SOME → warn (only legal behind a runtime ??-fallback, like DNMS
 *     CompactionIcon's IconCompact→IconLayers→IconData chain). A missing
 *     catalog or an empty scan fails. Regenerate the catalog with
 *     scripts/gen-nano-catalog.mjs.
 *  3. externals-locked — the built DNMS lib/client.js must still reference
 *     the three loader externals react / react-dom / dsh-client-ui-primitives;
 *     an esbuild external-config drift silently inlines or drops them.
 *
 * Rules 1 and 3 cover dsh-nano-model-selector only.
 * `--root <dir>` replaces the repository root (scan roots, catalog, DNMS
 * package) — used by fixtures.
 *
 * Implementation: line scanner with a scope stack (no babel). Two passes per
 * function scope: collect candidate early returns first, then flag hooks
 * after the earliest confirmed one.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const rootArg = process.argv.indexOf('--root')
const root = rootArg > 0 ? resolve(process.argv[rootArg + 1]) : join(dirname(fileURLToPath(import.meta.url)), '..')
const PKG = join(root, 'dsh-nano-model-selector')
const SRC = join(PKG, 'src', 'client')
const CATALOG = join(root, 'packages', 'dsh-nano-ui', 'catalog', 'primitives.json')
const USERS = [
  'dsh-nano-model-selector',
  'dsh-nano-explorer-extra',
  'dsh-nano-terminal',
  'dsh-nano-kitesurf',
  'dsh-nano-cloud-session',
  'dsh-nano-notepad',
  'dsh-nano-progress-report',
  'dsh-nano-local-sandbox',
]
const SCAN_ROOTS = [...USERS.map(p => join(root, p, 'src', 'client')), join(root, 'packages', 'dsh-nano-ui', 'src')]
const PRIMITIVES = '@deepseek-ai/dsh-client-ui-primitives'

const problems = []
const warnings = []

/* --------------------------- helpers ----------------------------------- */

function* clientFiles() {
  for (const name of readdirSync(SRC)) {
    if (/\.(jsx?|tsx?)$/.test(name)) yield join(SRC, name)
  }
}

function* walk(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(jsx?|mjs|tsx?)$/.test(entry.name)) yield path
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

/* ---------------- rule 2: primitives-catalog ---------------------------- */

const SPEC = `['"]${PRIMITIVES.replace(/[/.-]/g, '\\$&')}['"]`
const ID = '[A-Za-z_$][\\w$]*'

function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, '')).replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1')
}

/** `A, B as C, D: E, ...rest` → ['A', 'B', 'D'] (source-side names only). */
function bindingNames(list) {
  return list.split(',').map(s => s.trim()).filter(s => s && !s.startsWith('...'))
    .map(s => s.split(/\s+as\s+|\s*:\s*/)[0].trim())
    .filter(s => new RegExp(`^${ID}$`).test(s))
}

/** Every primitives name a source file takes, as [{ name, line }]. */
export function primitivesNames(source) {
  const text = stripComments(source)
  const lineOf = index => text.slice(0, index).split('\n').length
  const found = []
  const add = (names, index) => { for (const name of names) found.push({ name, line: lineOf(index) }) }
  const namespaces = new Set()
  for (const m of text.matchAll(new RegExp(`import\\s+(?:(${ID})\\s*,\\s*)?\\{([^}]*)\\}\\s*from\\s*${SPEC}`, 'g'))) add(bindingNames(m[2]), m.index)
  for (const m of text.matchAll(new RegExp(`import\\s+(?:${ID}\\s*,\\s*)?\\*\\s*as\\s+(${ID})\\s+from\\s*${SPEC}`, 'g'))) namespaces.add(m[1])
  for (const m of text.matchAll(new RegExp(`(?:const|let|var)\\s*\\{([^}]*)\\}\\s*=\\s*require\\(\\s*${SPEC}\\s*\\)`, 'g'))) add(bindingNames(m[1]), m.index)
  for (const m of text.matchAll(new RegExp(`(?:const|let|var)\\s+(${ID})\\s*=\\s*require\\(\\s*${SPEC}\\s*\\)`, 'g'))) namespaces.add(m[1])
  for (const ns of namespaces) {
    const n = ns.replace(/\$/g, '\\$')
    for (const m of text.matchAll(new RegExp(`(?<![\\w$.])${n}\\??\\.(${ID})`, 'g'))) add([m[1]], m.index)
    for (const m of text.matchAll(new RegExp(`(?:const|let|var)\\s*\\{([^}]*)\\}\\s*=\\s*${n}(?![\\w$])`, 'g'))) add(bindingNames(m[1]), m.index)
  }
  return found
}

function checkPrimitivesImports(file, text, exportSets) {
  const releases = Object.keys(exportSets)
  const names = primitivesNames(text)
  for (const { name, line } of names) {
    const missingIn = releases.filter(rel => !exportSets[rel].has(name))
    if (missingIn.length === releases.length) {
      problems.push(`primitives-catalog ${file}:${line} — "${name}" not exported by ANY recorded release (${releases.join('/')})`)
    } else if (missingIn.length > 0) {
      warnings.push(`primitives-catalog ${file}:${line} — "${name}" missing in ${missingIn.join(',')} (only safe behind a ??-fallback)`)
    }
  }
  return names.length
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

const rel = file => file.replace(`${root}/`, '')

if (existsSync(SRC)) {
  for (const file of clientFiles()) checkHooksOrder(rel(file), readFileSync(file, 'utf8').split('\n'))
}

if (!existsSync(CATALOG)) {
  problems.push(`primitives-catalog ${rel(CATALOG)} missing — regenerate with scripts/gen-nano-catalog.mjs`)
} else {
  const catalog = JSON.parse(readFileSync(CATALOG, 'utf8'))
  const exportSets = Object.fromEntries(Object.entries(catalog.exports ?? {}).map(([k, v]) => [k, new Set(v)]))
  if (Object.keys(exportSets).length === 0) problems.push(`primitives-catalog ${rel(CATALOG)} records no release`)
  else {
    let files = 0
    let names = 0
    for (const dir of SCAN_ROOTS) {
      for (const file of walk(dir)) {
        files++
        names += checkPrimitivesImports(rel(file), readFileSync(file, 'utf8'), exportSets)
      }
    }
    console.log(`primitives-catalog: ${files} file(s), ${names} primitives name(s) checked against ${Object.keys(exportSets).join('/')}`)
    console.log(`primitives-catalog: scan roots ${SCAN_ROOTS.map(rel).join(', ')}`)
    if (files === 0) problems.push('primitives-catalog scanned 0 files — scan roots are wrong')
  }
}
checkExternals()

for (const w of warnings) console.log(`WARN  ${w}`)
if (problems.length > 0) {
  for (const p of problems) console.error(`FAIL  ${p}`)
  console.error(`\ncheck-client-rules: ${problems.length} problem(s), ${warnings.length} warning(s)`)
  process.exit(1)
}
console.log(`check-client-rules: ok (${warnings.length} warning(s))`)
