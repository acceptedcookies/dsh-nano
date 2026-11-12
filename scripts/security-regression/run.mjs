#!/usr/bin/env node
/**
 * security-regression harness — replay attacker PoCs and assert the host now REJECTS them.
 *
 * SKELETON (P1-09): the runner + case-discovery + fake-S3 + page-fetch helpers are
 * built; concrete PoC cases land in ./cases/*.mjs as the batches arrive
 * (B1-T03 nsw remote-cross, B3-T02/T03 sanitize, B3-T07 imagine, B4-* P2).
 *
 * Rejection oracle (per charter, hard gate):
 *   A case PASSES iff the host-side effect the PoC tried to cause did NOT happen
 *   AND the response carries an {ok:false,reason} / {error} family — never
 *   "the request didn't throw". Each case returns {rejected:bool, reason, detail}.
 *
 * Baseline-RED anchor: every case is expected to be *executable* on the
 * pre-hardening HEAD (90ac6b6) and *rejected* after. The harness records which.
 *
 * Usage:
 *   node scripts/security-regression/run.mjs [--base https://dsh-dev.local]
 *                                            [--token <tok>] [--only <fingerprint>...]
 *                                            [--determinism N]
 *
 * Exit 0 iff every selected case is rejected; non-zero otherwise.
 */
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const CASES_DIR = join(HERE, 'cases')

const args = process.argv.slice(2)
const flag = name => { const i = args.indexOf(name); return i === -1 ? undefined : args[i + 1] }
const BASE = (flag('--base') ?? 'https://dsh-dev.local').replace(/\/+$/, '')
const TOKEN = flag('--token')
const ONLY = args.includes('--only') ? args.slice(args.indexOf('--only') + 1).filter(a => !a.startsWith('--')) : null
const DETERMINISM = Number(flag('--determinism') ?? 1)

/** Load every case module. Each exports {fingerprint, describe, run(ctx)}. */
async function loadCases() {
  const files = readdirSync(CASES_DIR).filter(f => f.endsWith('.mjs')).sort()
  const cases = []
  for (const f of files) {
    const mod = await import(join(CASES_DIR, f))
    if (typeof mod.run === 'function' && mod.fingerprint) cases.push(mod)
  }
  return cases
}

async function main() {
  const all = await loadCases()
  const selected = ONLY ? all.filter(c => ONLY.some(o => c.fingerprint.includes(o))) : all
  if (selected.length === 0) {
    console.log(`security-regression: no cases selected (dir ${CASES_DIR} — cases land per batch)`)
    process.exit(0)
  }
  const ctx = { base: BASE, token: TOKEN }
  let fail = 0
  const runs = DETERMINISM
  for (let round = 1; round <= runs; round++) {
    if (runs > 1) console.log(`\n== determinism round ${round}/${runs} ==`)
    for (const c of selected) {
      try {
        const r = await c.run(ctx)
        const tag = r.rejected ? 'REJECTED' : 'NOT-REJECTED'
        if (!r.rejected) fail++
        console.log(`  ${r.rejected ? '✔' : '✘'} ${c.fingerprint.padEnd(42)} ${tag}  ${r.reason ?? ''}`)
      } catch (error) {
        fail++
        console.log(`  ✘ ${c.fingerprint.padEnd(42)} ERROR  ${String(error?.message ?? error)}`)
      }
    }
  }
  console.log(`\nsecurity-regression: ${selected.length} case(s), ${fail} NOT-REJECTED/ERROR`)
  process.exit(fail === 0 ? 0 : 1)
}

await main()
