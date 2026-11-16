#!/usr/bin/env node
/**
 * gen-nano-catalog — regenerate packages/dsh-nano-ui/catalog/{primitives,icons,tokens}.json
 * from real host artifacts. The catalog is the single record of what the host
 * exports (DESIGN.md §1); never hand-edit it.
 *
 * Usage:
 *   node scripts/gen-nano-catalog.mjs [label=<frontend bundle file|assets dir> ...] [--theme <ui-theme lib/client.js>] [--out <dir>]
 *
 * With no label pairs it probes the desktop rc.3 asar and the rc.1 CLI install.
 * Paths that run through an `.asar` archive are read directly from the archive.
 * A missing source is recorded as "missing" in `sources`; exit 1 only when
 * every input is missing.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, openSync, readSync, closeSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const CLI = join(homedir(), '.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai')
const DESKTOP = '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai'
const DEFAULT_BUNDLES = [
  ['rc.3', `${DESKTOP}/dsh-web-frontend/dist/assets`],
  ['rc.1', `${CLI}/dsh-web-frontend/dist/assets`],
]
const DEFAULT_THEME = `${CLI}/dsh-client-ui-theme/lib/client.js`

export const METHOD = {
  primitives: 'keys of the object literal that contains `Tooltip:` in the dsh-web-frontend index-*.js bundle (the primitives export map), sorted',
  icons: 'components: primitives names matching ^Icon[A-Z]; sprite: glyph keys of the object passed to Object.entries() in the ICON_SYMBOLS builder × weight keys of the weight map; sprite id = dsw-icon-<glyph>-<weight>',
  tokens: 'names: every distinct match of /--(?:dsw|dsh|ds)-[a-z0-9-]+/ in dsh-client-ui-theme lib/client.js; a name ending in "-" is a template prefix (prefix=true). values: light = declarations in blocks whose selector list is only :root / html / body / body *, dark = light overlaid with blocks whose selector list is only body[data-ds-dark-theme] (optionally followed by " *"); var() chains resolved within the same scheme; platform-scoped and nested selectors ignored. declared=false means no such declaration; runtime=true means the name is a quoted JS string literal or extends a template prefix (written by host code at runtime)',
}

const TOKEN_NAME_RE = /--(?:dsw|dsh|ds)-[a-z0-9-]+/g
const LIGHT_SELECTORS = new Set([':root', 'html', 'body', 'body *'])
const DARK_SELECTORS = new Set(['body[data-ds-dark-theme]', 'body[data-ds-dark-theme] *'])

const selectorIn = (selector, allowed) => selector.split(',').every(s => allowed.has(s.trim().replace(/\s+/g, ' ')))

/* ------------------------------ asar ------------------------------------ */

function splitAsar(path) {
  const i = path.indexOf('.asar/')
  return i < 0 ? null : { archive: path.slice(0, i + 5), inner: path.slice(i + 6) }
}

const asarCache = new Map()
function asarHeader(archive) {
  if (asarCache.has(archive)) return asarCache.get(archive)
  const fd = openSync(archive, 'r')
  try {
    const head = Buffer.alloc(16)
    readSync(fd, head, 0, 16, 0)
    const headerSize = head.readUInt32LE(4)
    const jsonSize = head.readUInt32LE(12)
    const json = Buffer.alloc(jsonSize)
    readSync(fd, json, 0, jsonSize, 16)
    const entry = { header: JSON.parse(json.toString('utf8')), base: 8 + headerSize }
    asarCache.set(archive, entry)
    return entry
  } finally { closeSync(fd) }
}

function asarNode(archive, inner) {
  let node = asarHeader(archive).header
  for (const part of inner.split('/').filter(Boolean)) {
    node = node?.files?.[part]
    if (node === undefined) return null
  }
  return node
}

function asarRead(archive, inner) {
  const node = asarNode(archive, inner)
  if (node === null || node.offset === undefined) return null
  const { base } = asarHeader(archive)
  const fd = openSync(archive, 'r')
  try {
    const buf = Buffer.alloc(node.size)
    readSync(fd, buf, 0, node.size, base + Number(node.offset))
    return buf.toString('utf8')
  } finally { closeSync(fd) }
}

/* ----------------------------- sources ---------------------------------- */

function listDir(path) {
  const asar = splitAsar(path + '/')
  if (asar !== null) {
    if (!existsSync(asar.archive)) return null
    const node = asarNode(asar.archive, asar.inner)
    return node?.files ? Object.keys(node.files) : null
  }
  try { return readdirSync(path) } catch { return null }
}

function readSource(path) {
  const asar = splitAsar(path)
  if (asar !== null) return existsSync(asar.archive) ? asarRead(asar.archive, asar.inner) : null
  return existsSync(path) && statSync(path).isFile() ? readFileSync(path, 'utf8') : null
}

/** Resolve an assets dir to its index-*.js bundle (latest name wins). */
export function bundleFile(spec) {
  if (spec.endsWith('.js')) return spec
  const names = listDir(spec)?.filter(n => /^index-.*\.js$/.test(n)).sort()
  return names && names.length > 0 ? `${spec}/${names[names.length - 1]}` : null
}

/* ---------------------------- extraction -------------------------------- */

function objectAt(text, start) {
  let depth = 0
  let quote = null
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (quote !== null) {
      if (c === '\\') { i++; continue }
      if (c === quote) quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue }
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return text.slice(start, i + 1) }
  }
  throw new Error('unbalanced braces')
}

/** Keys of the primitives export map (object literal holding `Tooltip:`). */
export function extractExports(text) {
  const anchor = text.indexOf('Tooltip:')
  if (anchor < 0) throw new Error('no Tooltip: marker — not the primitives export map?')
  const start = text.lastIndexOf('{', anchor)
  let depth = 0
  let end = -1
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end < 0) throw new Error('unbalanced braces around export map')
  const keys = new Set()
  for (const m of text.slice(start, end + 1).matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) keys.add(m[1])
  return [...keys].sort()
}

/** Sprite glyphs × weights from the ICON_SYMBOLS builder. */
export function extractSprite(text) {
  const builder = text.match(/function ([\w$]+)\(\w,\w\)\{return`dsw-icon-\$\{\w\}-\$\{\w\}`\}/)
  if (builder === null) return null
  const id = builder[1].replace(/\$/g, '\\$')
  const use = text.match(new RegExp(`Object\\.entries\\(([\\w$]+)\\)\\.flatMap\\(\\(\\[\\w,\\w\\]\\)=>Object\\.keys\\(([\\w$]+)\\)\\.map\\(\\w=>\\[${id}\\(`))
  if (use === null) return null
  const literal = name => {
    const at = text.search(new RegExp(`[,;\\s(]${name.replace(/\$/g, '\\$')}=\\{`))
    return at < 0 ? null : objectAt(text, text.indexOf('{', at))
  }
  const glyphObj = literal(use[1])
  const weightObj = literal(use[2])
  if (glyphObj === null || weightObj === null) return null
  const glyphs = [...new Set([...glyphObj.matchAll(/[{,]"([a-z0-9-]+)":\{size:/g)].map(m => m[1]))].sort()
  const weights = [...new Set([...weightObj.matchAll(/[{,]([a-z]+):/g)].map(m => m[1]))].sort()
  return { glyphs, weights }
}

function declarations(text) {
  const blocks = []
  for (const m of text.matchAll(/([^{}"`\n]*)\{([^{}]*--[^{}]*)\}/g)) {
    const selector = m[1].replace(/^.*[;"'`]/, '').trim()
    const decls = {}
    for (const d of m[2].matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+?)\s*(?:;|$)/g)) decls[d[1]] = d[2]
    blocks.push({ selector, decls })
  }
  return blocks
}

function resolveValue(value, map, seen = new Set()) {
  return value.replace(/var\((--[a-z0-9-]+)\s*(?:,\s*([^()]*))?\)/g, (whole, name, fallback) => {
    if (seen.has(name)) return whole
    if (map[name] !== undefined) return resolveValue(map[name], map, new Set([...seen, name]))
    return fallback !== undefined ? fallback.trim() : whole
  })
}

export function extractTokens(text) {
  const all = [...new Set(text.match(TOKEN_NAME_RE) ?? [])].sort()
  const prefixes = all.filter(n => n.endsWith('-'))
  const names = all
  const literals = new Set([...text.matchAll(/["'](--(?:dsw|dsh|ds)-[a-z0-9-]*[a-z0-9])["']/g)].map(m => m[1]))
  const light = {}
  const darkOnly = {}
  for (const { selector, decls } of declarations(text)) {
    if (selectorIn(selector, LIGHT_SELECTORS)) Object.assign(light, decls)
    else if (selectorIn(selector, DARK_SELECTORS)) Object.assign(darkOnly, decls)
  }
  const dark = { ...light, ...darkOnly }
  const tokens = {}
  for (const name of names) {
    const declared = light[name] !== undefined || dark[name] !== undefined
    tokens[name] = {
      declared,
      prefix: name.endsWith('-'),
      runtime: literals.has(name) || prefixes.some(p => name.startsWith(p)),
      light: light[name] === undefined ? null : resolveValue(light[name], light),
      dark: dark[name] === undefined ? null : resolveValue(dark[name], dark),
    }
  }
  return tokens
}

/* ------------------------------- output --------------------------------- */

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep)
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(k => [k, sortDeep(value[k])]))
  }
  return value
}

export function stableJson(value) {
  return JSON.stringify(sortDeep(value), null, 2) + '\n'
}

export function buildCatalog({ bundles, theme, generated }) {
  const sources = {}
  const exportsMap = {}
  const iconComponents = {}
  let sprite = null
  let spriteFrom = null
  for (const [label, spec] of bundles) {
    const file = bundleFile(spec)
    const text = file === null ? null : readSource(file)
    if (text === null) { sources[label] = 'missing'; continue }
    sources[label] = file
    exportsMap[label] = extractExports(text)
    iconComponents[label] = exportsMap[label].filter(n => /^Icon[A-Z]/.test(n))
    if (sprite === null) {
      sprite = extractSprite(text)
      if (sprite !== null) spriteFrom = label
    }
  }
  const themeText = theme === null ? null : readSource(theme)
  const tokenSources = { theme: themeText === null ? 'missing' : theme }
  const resolved = Object.values(sources).filter(s => s !== 'missing').length
  if (resolved === 0 && themeText === null) return null
  return {
    primitives: { generated, method: METHOD.primitives, sources, exports: exportsMap },
    icons: { generated, method: METHOD.icons, sources, components: iconComponents, sprite: sprite === null ? null : { from: spriteFrom, ...sprite } },
    tokens: themeText === null
      ? { generated, method: METHOD.tokens, sources: tokenSources, count: 0, tokens: {} }
      : (() => { const tokens = extractTokens(themeText); return { generated, method: METHOD.tokens, sources: tokenSources, count: Object.keys(tokens).length, tokens } })(),
  }
}

function parseArgs(argv) {
  const bundles = []
  let theme = DEFAULT_THEME
  let out = join(root, 'packages', 'dsh-nano-ui', 'catalog')
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--theme') theme = argv[++i]
    else if (a === '--out') out = resolve(argv[++i])
    else { const eq = a.indexOf('='); bundles.push([a.slice(0, eq), a.slice(eq + 1)]) }
  }
  return { bundles: bundles.length > 0 ? bundles : DEFAULT_BUNDLES, theme, out }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { bundles, theme, out } = parseArgs(process.argv.slice(2))
  const catalog = buildCatalog({ bundles, theme, generated: new Date().toISOString().slice(0, 10) })
  if (catalog === null) {
    console.error('[gen-nano-catalog] every source is missing; nothing written')
    process.exit(1)
  }
  mkdirSync(out, { recursive: true })
  for (const [name, body] of Object.entries(catalog)) writeFileSync(join(out, `${name}.json`), stableJson(body))
  for (const [label, src] of Object.entries(catalog.primitives.sources)) {
    console.log(`[gen-nano-catalog] ${label}: ${src === 'missing' ? 'missing' : `${catalog.primitives.exports[label].length} exports`}`)
  }
  console.log(`[gen-nano-catalog] tokens: ${catalog.tokens.count}; sprite glyphs: ${catalog.icons.sprite?.glyphs.length ?? 'missing'}`)
  console.log(`[gen-nano-catalog] wrote ${out}`)
}
