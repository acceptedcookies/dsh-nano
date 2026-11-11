/**
 * Static enumerator for the 43 web routes registered by the four dsh plugins.
 *
 * This module is the single source of truth for "what the code registers".
 * `gen-route-sensitivity.mjs` and `check-route-sensitivity.mjs` both import it
 * so the generated JSON and the drift gate cannot disagree about the code side.
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

/* ------------------------------------------------------------------ *
 * dsh-nano-shared-workspace — src/host/routes.js                      *
 * Same '<suffix>': { method } map under PREFIX; readBody cap 64 KiB   *
 * written inline as `64 * 1024`.                                      *
 * ------------------------------------------------------------------ */
function scanSharedWorkspace() {
  const file = 'dsh-nano-shared-workspace/src/host/routes.js'
  const text = src(file)
  const prefixMatch = text.match(/export const PREFIX = '([^']+)'/)
  const prefix = prefixMatch?.[1] ?? ''
  // readBody uses a literal 64 * 1024 (no named constant).
  const bodyMatch = text.match(/total > (\d+ \* \d+)/)
  const cap = bodyMatch ? evalBytesExpr(bodyMatch[1]) : 64 * 1024
  const rows = []
  for (const match of text.matchAll(/^\s*'(\/[^']+)':\s*\{\s*method:\s*'([A-Z]+)'/gm)) {
    const [, suffix, method] = match
    rows.push({
      plugin: 'dsh-nano-shared-workspace',
      path: `${prefix}${suffix}`,
      methods: [method],
      bodyLimit: { [method]: method === 'GET' ? 0 : cap },
      source: { file, line: lineOf(text, `'${suffix}':`) },
    })
  }
  return rows
}

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

/**
 * Enumerate every registered route across the four plugins.
 * @returns rows: { plugin, path, methods[], bodyLimit{METHOD:bytes}, source{file,line} }
 */
export function scanRoutes() {
  return [
    ...scanNanoNotepad(),
    ...scanExplorerExtra(),
    ...scanSharedWorkspace(),
    ...scanModelSelector(),
  ]
}

/** Max body limit across methods for one row (the route-level cap). */
export const routeBodyLimit = row => Math.max(0, ...Object.values(row.bodyLimit ?? { GET: 0 }))
