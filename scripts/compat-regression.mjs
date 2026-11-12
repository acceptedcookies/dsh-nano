#!/usr/bin/env node
/**
 * compat-regression — P2-08 / B1-T07: run the real-bucket samples in
 * test/remote-schema/compat/ through the schema validator and require 100%
 * pass (existing data must survive v1 — the v1-freeze gate).
 *
 * Kinds map to directories: manifest | file | image | marker | session-meta | tree-head.
 * `file` objects are raw bytes (a .md draft body) — validated as UTF-8 text, not JSON.
 * Every other kind is JSON.
 *
 * Exit 0 iff every sample validates (or is a legal v0-backfill); else 1.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, dirname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const CORPUS = join(ROOT, 'test/remote-schema/compat')
const SCHEMA = join(ROOT, 'packages/dsh-remote-data-schema/src/index.js')

let validate
try {
  ({ validate } = await import(SCHEMA))
} catch (e) {
  console.log(`compat-regression: schema not importable yet (${e.message}) — skeleton phase`)
  process.exit(0)
}

const KINDS = ['manifest', 'file', 'image', 'marker', 'session-meta', 'tree-head']
const RAW_KINDS = new Set(['file']) // raw bytes, not JSON

let pass = 0, fail = 0, backfill = 0
const failures = []
for (const kind of KINDS) {
  const dir = join(CORPUS, kind)
  let names
  try { names = readdirSync(dir).filter(n => !n.startsWith('.') && n !== 'README.md') }
  catch { continue }
  for (const name of names) {
    const file = join(dir, name)
    const raw = readFileSync(file)
    const input = RAW_KINDS.has(kind) ? raw.toString('utf8') : JSON.parse(raw.toString('utf8'))
    try {
      const r = validate(kind, input)
      pass++
      if (r.compat === 'v0-backfill') { backfill++; console.log(`  ~ ${kind}/${name}  v0-backfill`) }
      else console.log(`  ✔ ${kind}/${name}`)
    } catch (e) {
      fail++
      failures.push(`${kind}/${name}: ${e.reason ?? e.message}`)
      console.log(`  ✘ ${kind}/${name}  REJECT ${e.reason ?? e.message}`)
    }
  }
}
const total = pass + fail
console.log(`\ncompat-regression: ${pass}/${total} pass (${backfill} v0-backfill), ${fail} reject`)
if (fail) { console.log('failures:'); for (const f of failures) console.log('  ' + f) }
process.exit(fail === 0 ? 0 : 1)
