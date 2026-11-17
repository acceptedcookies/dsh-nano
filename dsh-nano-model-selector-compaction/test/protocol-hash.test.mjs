/**
 * Protocol-hash lock (T04 / P1-04). The verbatim ports of `@deepseek-ai/dsh`
 * LLM stream machinery in compact-region.js — `errorChain` and
 * `BlockAssembler` (host baseline @deepseek-ai/dsh@0.2.2-rc.1) — are a wire
 * contract with the host. Any byte drift inside the two slices breaks the
 * hash; edits outside them (the banner at :185, frameSummary, the selector,
 * COMPACTION_INSTRUCTION) must NOT move it.
 *
 * Counts only if: the hash covers exactly `function errorChain` through the
 * closing brace before `contentHasImage`, and `class BlockAssembler` through
 * its closing brace — nothing before :44 and nothing after :151.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const FILE = join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'compact-region.js')

function protocolSlice() {
  const source = readFileSync(FILE, 'utf8')
  const errorChain = source.match(/function errorChain[\s\S]*?\n\}\n/)
  const assembler = source.match(/class BlockAssembler \{[\s\S]*?\n\}\n/)
  if (errorChain === null || assembler === null) {
    throw new Error('protocol-hash: could not isolate the locked slices')
  }
  return `${errorChain[0]}${assembler[0]}`
}

// Fingerprint of errorChain + BlockAssembler as of this contract. Regenerate
// ONLY with a conscious protocol change:  node -e "…" prints protocolSlice
// sha256.
const EXPECTED = '5dd74efa3601'

test('errorChain + BlockAssembler byte hash matches the locked protocol', () => {
  const digest = createHash('sha256').update(protocolSlice()).digest('hex').slice(0, 12)
  assert.equal(digest, EXPECTED,
    'the verbatim dsh-llm port drifted; if this was intentional, update EXPECTED in the same commit that changes the slice')
})

test('the lock does not cover the banner or the selector region', () => {
  const source = readFileSync(FILE, 'utf8')
  const slice = protocolSlice()
  assert.equal(slice.includes('compacted-summary'), false)
  assert.equal(slice.includes('selectCompactableRange'), false)
  assert.equal(slice.includes('COMPACTION_INSTRUCTION'), false)
  assert.equal(slice.includes('summaryText'), false)
})
