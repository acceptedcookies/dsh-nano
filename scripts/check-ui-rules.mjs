#!/usr/bin/env node
/**
 * check-ui-rules — warn-only scan of plugin browser UI against
 * docs/specs/dsh-nano-ui/DESIGN.md §9 (U1–U10).
 *
 * Usage:
 *   node scripts/check-ui-rules.mjs [--plugin <dir|abbr>] [--json] [--root <repo>]
 *
 * Scope: src/client/** of the six nano-ui users plus packages/dsh-nano-ui/src/**.
 * Findings never change the exit code (DESIGN.md §9, not part of
 * scripts/test-all.mjs); only a crash (unreadable catalog, bad argument)
 * exits non-zero. U7 lives in scripts/check-client-rules.mjs rule 2.
 * The scans are line heuristics: a finding is a prompt to look, and an
 * intentional deviation is marked `nano-ui-exempt` and registered in §10.
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { join, dirname, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PLUGINS = [
  { abbr: 'DNMS', dir: 'dsh-nano-model-selector', src: 'src/client', prefixes: ['nms-'] },
  { abbr: 'DNEE', dir: 'dsh-nano-explorer-extra', src: 'src/client', prefixes: ['nxe-'] },
  { abbr: 'DNT', dir: 'dsh-nano-terminal', src: 'src/client', prefixes: ['dnt-'] },
  { abbr: 'DNK', dir: 'dsh-nano-kitesurf', src: 'src/client', prefixes: ['nks-'] },
  { abbr: 'DNCS', dir: 'dsh-nano-cloud-session', src: 'src/client', prefixes: ['dncs-'] },
  { abbr: 'DNN', dir: 'dsh-nano-notepad', src: 'src/client', prefixes: ['np-', 'nj-', 'nm-'] },
  { abbr: 'nano-ui', dir: 'packages/dsh-nano-ui', src: 'src', prefixes: ['nano-'] },
]

export const RULES = {
  U1: '未解析令牌',
  U2: '手绘已有控件',
  U3: '原生按钮密度',
  U4: '非宿主图标',
  U5: '宿主 DOM 嫁接',
  U6: '硬编码层级 / 主题',
  U7: '见 scripts/check-client-rules.mjs 规则 2',
  U8: '死样式',
  U9: '未定义类',
  U10: '豁免登记',
}

const CONTROL_RE = /(?:^|-)(switch|tabs?|tag|tooltip|tip|toast|menu)(?:-|$)/
const SYMBOL_RE = /^[\u00d7\u2190-\u21ff\u2295-\u22ff\u2300-\u23ff\u25a0-\u25ff\u2600-\u27bf\u2b00-\u2bff]{1,2}$/
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function* walk(dir) {
  if (!existsSync(dir)) return
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* walk(path)
    else if (/\.(jsx?|mjs|tsx?)$/.test(entry.name)) yield path
  }
}

/** Replace comment bodies with blanks so line numbers stay put. */
function stripComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`\\])\/\/.*$/gm, (m, lead) => lead + ' '.repeat(m.length - lead.length))
}

const lineAt = (text, index) => text.slice(0, index).split('\n').length
const lineText = (text, index) => text.slice(text.lastIndexOf('\n', index) + 1, (text.indexOf('\n', index) + 1 || text.length + 1) - 1)

/** Scan one plugin. `files` is [{ rel, text }]; returns findings [{ rule, file, line, detail }]. */
export function scanPlugin(plugin, files, ctx) {
  const findings = []
  const push = (rule, file, line, detail) => findings.push({ plugin: plugin.abbr, rule, file, line, detail })
  const prefixRe = plugin.prefixes.map(esc).join('|')
  const classRe = new RegExp(`(?<![\\w$-])(\\.?)((?:${prefixRe})[a-z0-9_-]*[a-z0-9])(\\$\\{)?`, 'g')
  const defined = new Map()
  const referenced = new Map()
  const classRefs = new Map()
  const stems = []
  const keyframes = new Set()
  for (const { rel, text: raw } of files) {
    const text = stripComments(raw)
    for (const m of text.matchAll(/@keyframes\s+([\w-]+)/g)) keyframes.add(m[1])
    for (const m of text.matchAll(/var\((--(?:dsw|dsh)-[a-z0-9-]+)/g)) {
      if (ctx.tokens[m[1]] === undefined) push('U1', rel, lineAt(text, m.index), `${m[1]} 不在 catalog/tokens.json`)
    }
    for (const m of text.matchAll(/<button\b|\bh\(\s*['"]button['"]|createElement\(\s*['"]button['"]/g)) {
      push('U3', rel, lineAt(text, m.index), 'native <button>')
    }
    for (const m of text.matchAll(/(['"])([^'"\n]{1,2})\1|>\s*([^<>{}\s]{1,2})\s*</g)) {
      const s = m[2] ?? m[3]
      if (SYMBOL_RE.test(s)) push('U4', rel, lineAt(text, m.index), `unicode 图标 "${s}"`)
    }
    if (!/icons?\.(jsx?|mjs)$/.test(basename(rel))) {
      for (const m of text.matchAll(/<svg\b|createElementNS\([^)]*['"]svg['"]/g)) push('U4', rel, lineAt(text, m.index), '内联 <svg> 未经图标门面')
    }
    for (const m of text.matchAll(/\[class[*^$|~]?=/g)) push('U5', rel, lineAt(text, m.index), '属性选择器匹配宿主类名')
    for (const m of text.matchAll(/:has\(([^)]*)\)/g)) {
      if (!new RegExp(prefixRe).test(m[1])) push('U5', rel, lineAt(text, m.index), `:has(${m[1]}) 指向非本插件结构`)
    }
    if (basename(rel) !== 'layers.js') {
      for (const m of text.matchAll(/z-index\s*:\s*-?\d+|zIndex\s*:\s*-?\d+/g)) push('U6', rel, lineAt(text, m.index), `数字层级 ${m[0]}`)
    }
    for (const m of text.matchAll(/data-ds-dark-theme|dsDarkTheme/g)) push('U6', rel, lineAt(text, m.index), '读取宿主主题属性')
    for (const m of text.matchAll(/\bfunction\s+schemeOf\b|\bschemeOf\s*=/g)) push('U6', rel, lineAt(text, m.index), '自写 schemeOf')
    for (const m of raw.matchAll(/nano-ui-exempt/g)) {
      const line = lineAt(raw, m.index)
      const registered = ctx.exemptRows.some(row => row.includes(rel) || row.includes(`${rel}:${line}`))
      push('U10', rel, line, registered ? '已登记' : '未在 DESIGN.md §10 登记')
    }
    for (const m of text.matchAll(classRe)) {
      const [, dot, name, dynamic] = m
      const at = { rel, line: lineAt(text, m.index) }
      if (dynamic) { stems.push(name); continue }
      const map = dot ? defined : referenced
      if (!map.has(name)) map.set(name, at)
      const isId = /\b(?:id|htmlFor|for)\s*[:=]\s*['"`]$/.test(text.slice(Math.max(0, m.index - 16), m.index))
      if (!dot && !isId && !classRefs.has(name) && /class/i.test(lineText(text, m.index))) classRefs.set(name, at)
    }
  }
  for (const name of keyframes) { defined.delete(name); referenced.delete(name); classRefs.delete(name) }
  const isDynamic = name => stems.some(stem => name.startsWith(stem))
  for (const [name, at] of new Map([...defined, ...referenced])) {
    if (CONTROL_RE.test(name.slice(plugin.prefixes.find(p => name.startsWith(p)).length))) push('U2', at.rel, at.line, `.${name} 疑似手绘控件`)
  }
  for (const [name, at] of defined) {
    if (!referenced.has(name) && !isDynamic(name)) push('U8', at.rel, at.line, `.${name} 只在样式中定义`)
  }
  // U9 only trusts references on a line that mentions class (className, classList, class=…);
  // the same prefix also names ids, storage keys and workers.
  for (const [name, at] of classRefs) {
    if (!defined.has(name) && !isDynamic(name)) push('U9', at.rel, at.line, `${name} 没有样式定义`)
  }
  return findings
}

function parseArgs(argv) {
  const opts = { plugin: null, json: false, root: join(dirname(fileURLToPath(import.meta.url)), '..') }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--json') opts.json = true
    else if (a === '--plugin') opts.plugin = argv[++i]
    else if (a === '--root') opts.root = resolve(argv[++i])
    else throw new Error(`unknown argument ${a}`)
  }
  return opts
}

export function run({ root, plugin = null }) {
  const catalog = join(root, 'packages', 'dsh-nano-ui', 'catalog', 'tokens.json')
  const tokens = JSON.parse(readFileSync(catalog, 'utf8')).tokens
  if (tokens === undefined) throw new Error(`${catalog} has no tokens`)
  const design = join(root, 'docs', 'specs', 'dsh-nano-ui', 'DESIGN.md')
  const designText = existsSync(design) ? readFileSync(design, 'utf8') : ''
  const exemptSection = designText.split(/^## 10\./m)[1] ?? ''
  const exemptRows = exemptSection.split('\n').filter(l => l.startsWith('|'))
  const selected = plugin === null ? PLUGINS : PLUGINS.filter(p => p.abbr.toLowerCase() === plugin.toLowerCase() || p.dir === plugin || basename(p.dir) === plugin)
  if (selected.length === 0) throw new Error(`unknown plugin ${plugin}`)
  const result = { files: 0, plugins: {}, findings: [] }
  for (const p of selected) {
    const files = [...walk(join(root, p.dir, p.src))].map(f => ({ rel: f.replace(`${root}/`, ''), text: readFileSync(f, 'utf8') }))
    const findings = scanPlugin(p, files, { tokens, exemptRows })
    result.files += files.length
    const counts = Object.fromEntries(Object.keys(RULES).filter(r => r !== 'U7').map(r => [r, findings.filter(f => f.rule === r).length]))
    result.plugins[p.abbr] = { files: files.length, counts }
    result.findings.push(...findings)
  }
  return result
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const opts = parseArgs(process.argv.slice(2))
    const result = run(opts)
    if (opts.json) {
      console.log(JSON.stringify(result, null, 2))
    } else {
      for (const f of result.findings) console.log(`WARN  ${f.rule} ${RULES[f.rule]}  ${f.file}:${f.line}  ${f.detail}`)
      console.log('')
      const rules = Object.keys(RULES).filter(r => r !== 'U7')
      console.log(['plugin', 'files', ...rules].join('\t'))
      for (const [abbr, { files, counts }] of Object.entries(result.plugins)) console.log([abbr, files, ...rules.map(r => counts[r])].join('\t'))
      console.log(`U7: ${RULES.U7}`)
      console.log(`check-ui-rules: ${result.files} file(s) scanned, ${result.findings.length} warning(s) (warn-only)`)
    }
  } catch (error) {
    console.error(`check-ui-rules: crashed — ${error.message}`)
    process.exit(2)
  }
}
