/**
 * Static enumerator for the ACTIVE web routes registered by dsh plugins.
 *
 * This module is the single source of truth for "what the code registers".
 * `gen-route-sensitivity.mjs` and `check-route-sensitivity.mjs` both import it
 * so the generated JSON and the drift gate cannot disagree about the code side.
 *
 * DEPRECATED 2026-11-12: `dsh-nano-shared-workspace` was retired to
 * `deprecated/` and is NO LONGER scanned. Its 20+ routes were removed from
 * security/route-sensitivity.json and security/feature-contract.json so the
 * drift gates stay green. See deprecated/README.md. Do not re-add a scanner
 * for it without an explicit [业主] decision to un-deprecate.
 *
 * Determinism: routes are returned in registration order per plugin, and
 * plugin order is fixed. No timestamps, no environment reads.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
export const ROOT = join(HERE, '..')

/** Read one repo file to text. */
const src = rel => readFileSync(join(ROOT, rel), 'utf8')

/** Evaluate a `N * M * K` byte constant expression (digits + `*` only). */
const evalBytesExpr = expr => {
  const cleaned = String(expr).trim()
  if (!/^[\d\s*]+$/.test(cleaned)) return undefined
  return cleaned.split('*').reduce((acc, part) => acc * Number(part.trim()), 1)
}

/**
 * Line number (1-based) of the first occurrence of `needle` in `text`
 * starting the search at `fromIndex`.
 */
const lineOf = (text, needle, fromIndex = 0) => {
  const idx = text.indexOf(needle, fromIndex)
  if (idx < 0) return 0
  return text.slice(0, idx).split('\n').length
}

/* ------------------------------------------------------------------ *
 * dsh-nano-notepad — index.js                                        *
 * Routes: SAVE/READ/MP constants + four S3_* constants via s3Route(). *
 * All handlers accept POST only (req.method !== 'POST' → 405).        *
 * Body caps: jsonBody default = MAX_SAVE_BYTES; s3 routes use          *
 * MAX_S3_BODY_BYTES.                                                  *
 * ------------------------------------------------------------------ */
function scanNanoNotepad() {
  const file = 'dsh-nano-notepad/index.js'
  const text = src(file)
  const consts = {}
  for (const match of text.matchAll(/^const ([A-Z0-9_]+) = '([^']+)'/gm)) {
    consts[match[1]] = match[2]
  }
  const bytes = name => {
    const m = text.match(new RegExp(`const ${name} = ([^\\n]+)`))
    return m ? evalBytesExpr(m[1]) : undefined
  }
  const MAX_SAVE = bytes('MAX_SAVE_BYTES')
  const MAX_S3 = bytes('MAX_S3_BODY_BYTES')

  // Registration order: three literal ctx.effect blocks (SAVE, READ, MP),
  // then the four s3Route() calls in listing order.
  const rows = []
  const seen = new Set()
  const push = (constName, bodyBytes) => {
    const path = consts[constName]
    if (!path || seen.has(path)) return
    seen.add(path)
    rows.push({
      plugin: 'dsh-nano-notepad',
      path,
      methods: ['POST'],
      bodyLimit: { POST: bodyBytes },
      source: { file, line: lineOf(text, `const ${constName}`) },
    })
  }
  push('SAVE_ROUTE', MAX_SAVE)
  push('READ_ROUTE', MAX_SAVE)
  push('MP_ROUTE', MAX_SAVE)
  // The s3Route() wrapper binds every S3_* constant to POST + MAX_S3_BODY_BYTES.
  for (const name of ['S3_STATUS_ROUTE', 'S3_TEST_ROUTE', 'S3_OBJECT_ROUTE', 'S3_CONFIG_ROUTE']) {
    push(name, MAX_S3)
  }
  return rows
}

/* --------------------------------------------------------------- *
 * dsh-nano-explorer-extra — src/host/routes.js                     *
 * `routes` map: '<suffix>': { method: 'X', ... } then PREFIX join. *
 * Every POST runs jsonBody() → MAX_BODY_BYTES (64 KiB); GETs = 0.  *
 * --------------------------------------------------------------- */
function scanExplorerExtra() {
  const file = 'dsh-nano-explorer-extra/src/host/routes.js'
  const text = src(file)
  const prefixMatch = text.match(/export const PREFIX = '([^']+)'/)
  const bodyMatch = text.match(/const MAX_BODY_BYTES = ([^\n]+)/)
  const prefix = prefixMatch?.[1] ?? ''
  const cap = bodyMatch ? evalBytesExpr(bodyMatch[1]) : undefined
  const rows = []
  for (const match of text.matchAll(/^\s*'(\/[^']+)':\s*\{\s*method:\s*'([A-Z]+)'/gm)) {
    const [, suffix, method] = match
    rows.push({
      plugin: 'dsh-nano-explorer-extra',
      path: `${prefix}${suffix}`,
      methods: [method],
      bodyLimit: { [method]: method === 'GET' ? 0 : cap },
      source: { file, line: lineOf(text, `'${suffix}':`) },
    })
  }
  return rows
}

/* --------------------------------------------------------------------- *
 * dsh-nano-shared-workspace — REMOVED (DEPRECATED 2026-11-12)            *
 * Retired to deprecated/; its scanner and all route rows were unwired.    *
 * See deprecated/README.md.                                              *
 * --------------------------------------------------------------------- */

/* --------------------------------------------------------------------- *
 * dsh-nano-model-selector — index.js                                     *
 * Three path constants. /catalog → catalogHandler (GET+HEAD).            *
 * /media-engines and /media-engine share mediaHandler; the inner         *
 * `url.pathname === ENGINE_ROUTE` branch adds PUT with a 16384-byte cap. *
 * --------------------------------------------------------------------- */
function scanModelSelector() {
  const file = 'dsh-nano-model-selector/index.js'
  const text = src(file)
  const consts = {}
  for (const match of text.matchAll(/^const ([A-Z0-9_]+) = '([^']+)'/gm)) {
    consts[match[1]] = match[2]
  }
  const catalog = consts.ROUTE
  const engines = consts.ENGINES_ROUTE
  const engine = consts.ENGINE_ROUTE
  // PUT body cap is the literal in readBody(req, 16384) inside mediaHandler.
  const putCap = (() => {
    const m = text.match(/readBody\(req,\s*(\d+)\)/)
    return m ? Number(m[1]) : 16384
  })()
  const rows = [
    {
      plugin: 'dsh-nano-model-selector',
      path: catalog,
      methods: ['GET', 'HEAD'],
      bodyLimit: { GET: 0, HEAD: 0 },
      source: { file, line: lineOf(text, 'const ROUTE =') },
    },
    {
      plugin: 'dsh-nano-model-selector',
      path: engines,
      methods: ['GET', 'HEAD'],
      bodyLimit: { GET: 0, HEAD: 0 },
      source: { file, line: lineOf(text, 'const ENGINES_ROUTE =') },
    },
    {
      plugin: 'dsh-nano-model-selector',
      path: engine,
      methods: ['GET', 'HEAD', 'PUT'],
      bodyLimit: { GET: 0, HEAD: 0, PUT: putCap },
      source: { file, line: lineOf(text, 'const ENGINE_ROUTE =') },
    },
  ]
  return rows
}

/* ------------------------------------------------------------------ *
 * dsh-nano-kitesurf — index.js                                       *
 * Path constants + a registerRoutes(ctx, [ ... ]) spec array. Methods   *
 * and bodyLimit are read from the specs themselves — never hand-listed *
 * here, so adding a method to a spec can't drift past the gate.        *
 * ------------------------------------------------------------------ */
function scanKitesurf() {
  const file = 'dsh-nano-kitesurf/index.js'
  const text = src(file)
  const consts = {}
  for (const match of text.matchAll(/^const ([A-Z0-9_]+) = '([^']+)'/gm)) {
    consts[match[1]] = match[2]
  }
  const rows = []
  // Each route spec declares `path: X_ROUTE,` then `methods: [...]` (or the
  // singular `method: 'M'` the guard also accepts). bodyLimit is read only
  // within the spec head — before its `handler:` — so a missing cap can't
  // pick up the next spec's number.
  for (const match of text.matchAll(/path: ([A-Z0-9_]+|'[^']+'),\s*\n?\s*(?:methods: \[([^\]]*)\]|method: '([A-Z]+)')/g)) {
    const name = match[1].startsWith("'") ? null : match[1]
    const path = name ? consts[name] : match[1].slice(1, -1)
    const methodBlock = match[2] ?? `'${match[3]}'`
    const methods = [...methodBlock.matchAll(/'(GET|HEAD|POST|PUT|DELETE|PATCH)'/g)].map((m) => m[1])
    if (!path || methods.length === 0) continue
    const specHead = text.slice(match.index, match.index + 600)
    const handlerAt = specHead.search(/handler[:(]/)
    const capMatch = (handlerAt > 0 ? specHead.slice(0, handlerAt) : specHead).match(/bodyLimit: (\d+)/)
    const cap = capMatch ? Number(capMatch[1]) : 0
    rows.push({
      plugin: 'dsh-nano-kitesurf',
      path,
      methods,
      bodyLimit: Object.fromEntries(methods.map((method) => [method, method === 'POST' ? cap : 0])),
      source: { file, line: lineOf(text, `const ${name || 'ROUTE'}`) },
    })
  }
  // Every `*_ROUTE`/`ROUTE` string constant in the file must resolve to a
  // registered row — a hard count would go stale the next time a route is
  // added (it already drifted from 8 to 27 before this guard was written).
  const declared = Object.keys(consts).filter((name) => /ROUTE$/.test(name))
  const missing = declared.filter((name) => !rows.some((row) => row.path === consts[name]))
  if (missing.length > 0) {
    throw new Error(`route-scan: parsed ${rows.length} kitesurf route specs; unregistered constants: ${missing.join(', ') || 'none'} — parser/spec drift`)
  }
  return rows
}

function tableRows(text) {
  const rows = []
  const re = /"path": "([^"]+)"[\s\S]*?"methods": \[([^\]]*)\][\s\S]*?"bodyLimit": (\d+)/g
  for (const match of text.matchAll(re)) {
    const methods = [...match[2].matchAll(/"([A-Z]+)"/g)].map((item) => item[1])
    rows.push({ path: match[1], methods, bodyLimit: Number(match[3]) })
  }
  return rows
}

export function assertSameRoutes(parsed, table, plugin) {
  const parsedPaths = new Set(parsed.map((row) => row.path))
  const tablePaths = new Set(table.map((row) => row.path))
  if (parsedPaths.size !== tablePaths.size || [...parsedPaths].some((path) => !tablePaths.has(path))) {
    throw new Error(`route-scan: ${plugin} parsed ${parsedPaths.size} routes, table has ${tablePaths.size}`)
  }
  for (const row of parsed) {
    const expected = table.find((item) => item.path === row.path)
    const got = [...row.methods].sort().join(',')
    const want = [...expected.methods].sort().join(',')
    if (got !== want) throw new Error(`route-scan: ${plugin} ${row.path} methods ${got} != table ${want}`)
  }
}

export function scanLocalSandboxSource(text, tableText, file = 'dsh-nano-local-sandbox/src/host/routes.js') {
  const constants = [...text.matchAll(/export const ([A-Z0-9_]+) = '([^']+)'/g)].map((match) => ({ name: match[1], path: match[2] }))
  const table = tableRows(tableText)
  const parsed = constants.map((item) => {
    const row = table.find((candidate) => candidate.path === item.path)
    return {
      plugin: 'dsh-nano-local-sandbox',
      path: item.path,
      methods: row?.methods ?? [],
      bodyLimit: Object.fromEntries((row?.methods ?? []).map((method) => [method, method === 'GET' || method === 'HEAD' ? 0 : row.bodyLimit])),
      source: { file, line: lineOf(text, `export const ${item.name}`) },
    }
  })
  assertSameRoutes(parsed, table, 'dsh-nano-local-sandbox')
  return parsed
}

function scanLocalSandbox() {
  return scanLocalSandboxSource(
    src('dsh-nano-local-sandbox/src/host/routes.js'),
    src('dsh-nano-local-sandbox/lib/route-table.js'),
  )
}

function scanTerminal() {
  const file = 'dsh-nano-terminal/index.js'
  const text = src(file)
  const base = text.match(/const ROUTE = '([^']+)'/)?.[1]
  if (!base) throw new Error('route-scan: dsh-nano-terminal is missing ROUTE')
  const suffixes = [...text.matchAll(/path: `\$\{ROUTE\}([^`]*)`/g)].map((match) => match[1])
  const unique = [...new Set(suffixes)]
  const known = {
    '/stream': { methods: ['GET'], cap: 0 },
    '/mcp': { methods: ['POST'], cap: 524288 },
    '/sessions': { methods: ['GET'], cap: 0 },
    '/events': { methods: ['GET'], cap: 0 },
    '/health': { methods: ['GET'], cap: 0 },
    '/session': { methods: ['POST'], cap: 0 },
  }
  if (unique.length !== Object.keys(known).length || unique.some((suffix) => !known[suffix])) {
    throw new Error(`route-scan: dsh-nano-terminal paths ${unique.join(',')} do not match the known set`)
  }
  return unique.map((suffix) => ({
    plugin: 'dsh-nano-terminal',
    path: `${base}${suffix}`,
    methods: known[suffix].methods,
    bodyLimit: Object.fromEntries(known[suffix].methods.map((method) => [method, method === 'POST' ? known[suffix].cap : 0])),
    source: { file, line: lineOf(text, 'const ROUTE =') },
  }))
}

export const SCAN_PLUGINS = [
  'dsh-nano-notepad',
  'dsh-nano-explorer-extra',
  'dsh-nano-model-selector',
  'dsh-nano-kitesurf',
  'dsh-nano-local-sandbox',
  'dsh-nano-terminal',
]

/**
 * Enumerate every registered route across the ACTIVE plugins.
 * dsh-nano-shared-workspace is deprecated and intentionally excluded.
 * @returns rows: { plugin, path, methods[], bodyLimit{METHOD:bytes}, source{file,line} }
 */
export function scanRoutes(plugins = SCAN_PLUGINS) {
  const scanners = {
    'dsh-nano-notepad': scanNanoNotepad,
    'dsh-nano-explorer-extra': scanExplorerExtra,
    'dsh-nano-model-selector': scanModelSelector,
    'dsh-nano-kitesurf': scanKitesurf,
    'dsh-nano-local-sandbox': scanLocalSandbox,
    'dsh-nano-terminal': scanTerminal,
  }
  return plugins.flatMap((plugin) => {
    const scan = scanners[plugin]
    if (!scan) throw new Error(`route-scan: unknown plugin ${plugin}`)
    return scan()
  })
}

/** Max body limit across methods for one row (the route-level cap). */
export const routeBodyLimit = row => Math.max(0, ...Object.values(row.bodyLimit ?? { GET: 0 }))
