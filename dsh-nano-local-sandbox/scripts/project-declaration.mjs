#!/usr/bin/env node
/**
 * Plugin-local projection: rebuild the `contract` array of
 * src/perf/declaration.json deterministically from
 * security/route-sensitivity.json — ledger order is the only source; nothing
 * is carried over from the previously generated array. `dnls.kite` is the
 * single explicitly-legacy non-route id and is pinned after `dnls.settings`.
 * Any other non-ledger id in the current file is an error, not a carry.
 *
 *   node scripts/project-declaration.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const ledger = JSON.parse(readFileSync(join(root, '..', 'security', 'route-sensitivity.json'), 'utf8'))
const declarationPath = join(root, 'src', 'perf', 'declaration.json')
const declaration = JSON.parse(readFileSync(declarationPath, 'utf8'))

// Rows present in the ledger but excluded from the perf contract subset.
const EXCLUDED = new Set(['dnls.logs', 'dnls.lifecycle'])
// Non-route ids that legitimately live in the contract: explicit list only.
const LEGACY_EXTRAS = new Map([['dnls.kite', 'dnls.settings']])

const ledgerIds = (ledger.routes ?? [])
  .filter((row) => row.plugin === 'dsh-nano-local-sandbox' && !EXCLUDED.has(row.id))
  .map((row) => row.id)
const ledgerSet = new Set(ledgerIds)

const contract = [...ledgerIds]
for (const [extra, after] of LEGACY_EXTRAS) {
  const at = contract.indexOf(after)
  if (at < 0) throw new Error(`project-declaration: ${extra} cannot be placed after missing ${after}`)
  contract.splice(at + 1, 0, extra)
}
const projected = new Set(contract)

for (const id of declaration.contract ?? []) {
  if (!projected.has(id)) throw new Error(`project-declaration: ${id} is neither a ledger route id nor a declared legacy extra`)
}

declaration.contract = contract
writeFileSync(declarationPath, JSON.stringify(declaration, null, 2) + '\n')
console.log(`projected ${contract.length} contract ids into src/perf/declaration.json`)
