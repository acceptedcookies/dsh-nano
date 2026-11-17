#!/usr/bin/env node
/**
 * Bake the async-compaction shared modules for dsh-nano-model-selector
 * (T-O-ACE1117-07④ / P1-03): the companion bundle dsh-nano-model-selector-
 * compaction is the single source for the policy engine and the built-in
 * summary prompt. This plugin must never import the sibling package at
 * runtime, so the shared code is emitted as generated files instead.
 *
 *   node scripts/bake-compact-shared.mjs
 *
 * Outputs (committed, do not edit by hand):
 *   ../lib/compact-policy.js  <- verbatim copy of DNMSC lib/compact-policy.js
 *   ../lib/compact-prompt.js  <- COMPACTION_INSTRUCTION + the instruction
 *                              composer (browser-safe, no node imports)
 *
 * The policy file is copied byte-for-byte so both packages validate the same
 * file the same way (T01: identical verdicts on identical fixtures).
 */
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SIBLING = join(ROOT, '..', 'dsh-nano-model-selector-compaction')

const POLICY_SOURCE = join(SIBLING, 'lib', 'compact-policy.js')
const REGION_SOURCE = join(SIBLING, 'lib', 'compact-region.js')

const GENERATED_NOTE = 'GENERATED FILE — do not edit. Source: dsh-nano-model-selector-compaction.'

const policyBody = readFileSync(POLICY_SOURCE, 'utf8')
const regionBody = readFileSync(REGION_SOURCE, 'utf8')
const policyHash = createHash('sha256').update(policyBody).digest('hex').slice(0, 12)
const instructionHash = createHash('sha256').update(regionBody).digest('hex').slice(0, 12)

// COMPACTION_INSTRUCTION is an array literal joined with '\n'; pull the exact
// block so the generated file stays byte-identical to the source constant.
const instructionMatch = regionBody.match(/export const COMPACTION_INSTRUCTION = (\[[\s\S]*?\]\.join\('\\n'\))/)
if (instructionMatch === null) {
  throw new Error('bake-compact-shared: COMPACTION_INSTRUCTION literal not found in compact-region.js')
}
const instructionLiteral = instructionMatch[1]
// The literal references SUMMARY_OPEN_TAG/SUMMARY_CLOSE_TAG; hoist the same
// constants so the copy stays self-contained.
const tagBlock = "const SUMMARY_OPEN_TAG = '<compacted-summary>'\nconst SUMMARY_CLOSE_TAG = '</compacted-summary>'"

const policyOut = `/** ${GENERATED_NOTE}
 *  baked by scripts/bake-compact-shared.mjs from dsh-nano-model-selector-
 *  compaction/lib/compact-policy.js (sha256:${policyHash}). Re-run the bake
 *  after changing the source; compact-shared.test.mjs locks this hash. */
${policyBody}`

const promptOut = `/** ${GENERATED_NOTE}
 *  baked by scripts/bake-compact-shared.mjs from dsh-nano-model-selector-
 *  compaction/lib/compact-region.js (sha256:${instructionHash}).
 *  Browser-safe: no node imports. Re-run the bake after changing the source. */

${tagBlock}

export const DEFAULT_SUMMARY_PROMPT = ${instructionLiteral}

/**
 * Mirror of DNMSC instructionText(options): the instruction actually sent is
 * always the built-in prompt, optionally followed by the fixed
 * 'Additional requirements:' paragraph. Whitespace-only extras append nothing.
 * @param {string|undefined} extra - policy.extraRequirements; empty means none.
 * @returns {string}
 */
export function promptText(extra) {
  return typeof extra === 'string' && extra.length > 0
    ? \`\${DEFAULT_SUMMARY_PROMPT}\\n\\nAdditional requirements:\\n\${extra}\`
    : DEFAULT_SUMMARY_PROMPT
}
`

writeFileSync(join(ROOT, 'lib', 'compact-policy.js'), policyOut)
writeFileSync(join(ROOT, 'lib', 'compact-prompt.js'), promptOut)
console.log(`baked lib/compact-policy.js + lib/compact-prompt.js (policy ${policyHash}, region ${instructionHash})`)
