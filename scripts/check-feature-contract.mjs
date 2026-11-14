#!/usr/bin/env node
/**
 * Contract gate: security/feature-contract.json must match the code.
 *
 * Asserts per route: path exists in code, method set matches, and per-method
 * bodyLimit matches the code-derived byte cap. Also asserts the contract has a
 * ui + dataLocations snapshot for every plugin. Exits non-zero on any mismatch.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { scanRoutes, ROOT } from './route-scan.mjs'

const CONTRACT = join(ROOT, 'security', 'feature-contract.json')
// DEPRECATED 2026-11-12: dsh-nano-shared-workspace retired to deprecated/,
// excluded from the release/contract surface. See deprecated/README.md.
export const PLUGINS = ['dsh-nano-notepad', 'dsh-nano-explorer-extra', 'dsh-nano-model-selector', 'dsh-nano-kitesurf', 'dsh-nano-local-sandbox', 'dsh-nano-terminal']

const sorted = a => [...a].sort().join(',')

export function contractProblems(contract, code, plugins = PLUGINS) {
  const codeByPath = new Map(code.map(r => [r.path, r]))
  const problems = []

  const routes = contract.routes ?? []
  const seen = new Set()
  for (const row of routes) {
    seen.add(row.path)
    const codeRow = codeByPath.get(row.path)
    if (!codeRow) {
      problems.push(`contract route not in code: ${row.path}`)
      continue
    }
    if (sorted(row.methods) !== sorted(codeRow.methods)) {
      problems.push(`method-mismatch ${row.path}: contract=[${sorted(row.methods)}] code=[${sorted(codeRow.methods)}]`)
    }
    for (const method of codeRow.methods) {
      const want = codeRow.bodyLimit[method] ?? 0
      const got = row.bodyLimit?.[method]
      if (got !== want) {
        problems.push(`bodyLimit-mismatch ${row.path} ${method}: contract=${got} code=${want}`)
      }
    }
  }
  for (const row of code) {
    if (!seen.has(row.path)) problems.push(`code route missing from contract: ${row.path}`)
  }

  for (const plugin of plugins) {
    if (!contract.ui?.[plugin]) problems.push(`missing ui entry: ${plugin}`)
    if (!contract.dataLocations?.[plugin]) problems.push(`missing dataLocations entry: ${plugin}`)
  }
  return problems
}

function main() {
  const contract = JSON.parse(readFileSync(CONTRACT, 'utf8'))
  const code = scanRoutes()
  const problems = contractProblems(contract, code)
  if (problems.length > 0) {
    console.error(`feature-contract drift: ${problems.length} issue(s)`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`feature-contract OK: ${contract.routes.length} routes, ui+dataLocations for ${PLUGINS.length} plugins`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
