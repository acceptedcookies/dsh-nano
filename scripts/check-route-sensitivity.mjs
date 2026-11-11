#!/usr/bin/env node
/**
 * Drift gate: compare code-registered routes ↔ security/route-sensitivity.json.
 *
 * Bidirectional:
 *   - every path registered in code must be present in the JSON (route-not-listed)
 *   - every path in the JSON must exist in code (route-stale)
 *   - method sets must match
 *   - route-level bodyLimit must match the code-derived cap
 *
 * Exits non-zero and prints each drift on any mismatch.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { scanRoutes, routeBodyLimit, ROOT } from './route-scan.mjs'

const LEDGER = join(ROOT, 'security', 'route-sensitivity.json')

const sorted = a => [...a].sort().join(',')

function main() {
  const ledger = JSON.parse(readFileSync(LEDGER, 'utf8'))
  const code = scanRoutes()
  const codeByPath = new Map(code.map(r => [r.path, r]))
  const jsonByPath = new Map((ledger.routes ?? []).map(r => [r.path, r]))

  const drift = []

  for (const row of code) {
    const json = jsonByPath.get(row.path)
    if (!json) {
      drift.push(`route-not-listed: ${row.path} (${row.plugin}) registered at ${row.source.file}:${row.source.line} but missing from JSON`)
      continue
    }
    if (sorted(json.methods) !== sorted(row.methods)) {
      drift.push(`method-mismatch: ${row.path} code=[${sorted(row.methods)}] json=[${sorted(json.methods)}]`)
    }
    if (json.bodyLimit !== routeBodyLimit(row)) {
      drift.push(`bodyLimit-mismatch: ${row.path} code=${routeBodyLimit(row)} json=${json.bodyLimit}`)
    }
  }
  for (const json of ledger.routes ?? []) {
    if (!codeByPath.has(json.path)) {
      drift.push(`route-stale: ${json.path} (${json.plugin}) in JSON but not registered in code`)
    }
  }

  if (drift.length > 0) {
    console.error(`route-sensitivity drift: ${drift.length} issue(s)`)
    for (const d of drift) console.error(`  - ${d}`)
    process.exit(1)
  }
  console.log(`route-sensitivity OK: ${code.length} routes, 0 drift`)
}

main()
