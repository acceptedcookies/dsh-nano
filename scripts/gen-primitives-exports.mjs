#!/usr/bin/env node
/**
 * Regenerate dsh-nano-model-selector/test/primitives-exports.json.
 *
 * Extracts the named-export list of @deepseek-ai/dsh-client-ui-primitives from
 * each installed dsh-web-frontend bundle (the primitives module ships inside
 * that shell bundle, never as a standalone package dir).
 *
 * Usage:
 *   node scripts/gen-primitives-exports.mjs <label=abs-path-to-bundle> ...
 *   # e.g.
 *   node scripts/gen-primitives-exports.mjs \
 *     "rc.3=/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-Ciz7DZxv.js" \
 *     "rc.1=$HOME/.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets/index-BgUyXZcc.js"
 *
 * With no arguments it probes the two conventional locations above.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(root, 'dsh-nano-model-selector', 'test', 'primitives-exports.json')

const defaults = [
  ['rc.3', '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets'],
  ['rc.1', join(homedir(), '.nvm/versions/node/v24.22.2/lib/node_modules/@deepseek-ai/dsh/node_modules/@deepseek-ai/dsh-web-frontend/dist/assets')],
]

function bundleFile(path) {
  if (path.endsWith('.js')) return path
  const m = readdirOrNull(path)?.filter(n => /^index-.*\.js$/.test(n)).sort()
  return m && m.length > 0 ? join(path, m[m.length - 1]) : null
}
import { readdirSync } from 'node:fs'
function readdirOrNull(d) { try { return readdirSync(d) } catch { return null } }

/** Pull the keys of the object literal that contains `Tooltip:`. */
function extractExports(file) {
  const text = readFileSync(file, 'utf8')
  const anchor = text.indexOf('Tooltip:')
  if (anchor < 0) throw new Error(`${file}: no Tooltip: marker — not the primitives export map?`)
  const start = text.lastIndexOf('{', anchor)
  let depth = 0, end = -1
  for (let i = start; i < text.length; i++) {
    const c = text[i]
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end < 0) throw new Error(`${file}: unbalanced braces around export map`)
  const obj = text.slice(start, end + 1)
  const keys = new Set()
  for (const m of obj.matchAll(/([A-Za-z_$][\w$]*)\s*:/g)) keys.add(m[1])
  return [...keys].sort()
}

const pairs = process.argv.length > 2
  ? process.argv.slice(2).map(arg => { const i = arg.indexOf('='); return [arg.slice(0, i), arg.slice(i + 1)] })
  : defaults

const exportsMap = {}
const sources = {}
for (const [label, spec] of pairs) {
  const file = bundleFile(spec)
  if (file === null || !existsSync(file)) {
    console.error(`[gen] ${label}: no frontend bundle under ${spec} — skipped`)
    continue
  }
  exportsMap[label] = extractExports(file)
  sources[label] = file
  console.log(`[gen] ${label}: ${exportsMap[label].length} exports from ${file}`)
}
if (Object.keys(exportsMap).length === 0) {
  console.error('[gen] no bundles resolved; nothing written')
  process.exit(1)
}
const out = {
  generated: new Date().toISOString().slice(0, 10),
  note: 'Snapshot of @deepseek-ai/dsh-client-ui-primitives named exports per host release, extracted from the real dsh-web-frontend bundles by scripts/gen-primitives-exports.mjs. Regenerate when a new host release lands; do not hand-edit the export lists.',
  sources,
  exports: exportsMap,
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`[gen] wrote ${OUT}`)
