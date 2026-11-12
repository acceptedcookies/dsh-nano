#!/usr/bin/env node
/**
 * Regenerate security/route-sensitivity.json from the plugin code.
 *
 * Paths/methods/bodyLimit are read from code via scripts/route-scan.mjs.
 * sensitivity / capability / sessionBinding / justification are hand-reviewed
 * fields: when a matching row already exists in the JSON they are carried over;
 * a brand-new route gets a "REVIEW" marker so the run fails review instead of
 * silently shipping an ungraded route.
 *
 * Usage:
 *   node scripts/gen-route-sensitivity.mjs           # print JSON to stdout
 *   node scripts/gen-route-sensitivity.mjs --write   # overwrite security/route-sensitivity.json
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { scanRoutes, routeBodyLimit, ROOT } from './route-scan.mjs'

const OUT = join(ROOT, 'security', 'route-sensitivity.json')

function loadExisting() {
  try {
    const parsed = JSON.parse(readFileSync(OUT, 'utf8'))
    const byPath = new Map()
    for (const row of parsed.routes ?? []) byPath.set(row.path, row)
    return byPath
  } catch {
    return new Map()
  }
}

const HEADER = {
  version: 1,
  purpose:
    'Per-route sensitivity ledger for dsh-host-route-guard (T-O-2 / T-O-7). One row per registered path (43 total). sensitivity = validation strength required when a same-origin page script calls the route: L0 read-only/no-secret, L1 bounded workspace write, L2 host-level capability, L3 operator config. bodyLimit is the route-level cap (max over methods; GET/HEAD carry no body). sessionBinding records whether the route takes a sessionId; it is metadata, not a runtime assertion (M8).',
  generatedBy:
    'scripts/gen-route-sensitivity.mjs (paths/methods/bodyLimit from code; sensitivity/capability/justification hand-reviewed and preserved on merge)',
}

function main() {
  const code = scanRoutes()
  const existing = loadExisting()
  const routes = code.map(row => {
    const prior = existing.get(row.path)
    return {
      plugin: row.plugin,
      path: row.path,
      methods: row.methods,
      sensitivity: prior?.sensitivity ?? 'REVIEW',
      capability: prior?.capability ?? 'REVIEW',
      bodyLimit: routeBodyLimit(row),
      sessionBinding: prior?.sessionBinding ?? false,
      justification: prior?.justification ?? `AUTO — review me (registered at ${row.source.file}:${row.source.line})`,
    }
  })
  const out = JSON.stringify({ ...HEADER, routes }, null, 2) + '\n'
  if (process.argv.includes('--write')) {
    writeFileSync(OUT, out)
    console.log(`wrote ${OUT} (${routes.length} routes)`)
  } else {
    process.stdout.write(out)
  }
}

main()
