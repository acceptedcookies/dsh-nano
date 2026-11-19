import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const bridge = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'profiles', 'kitesurf', 'mcp-bridge.mjs'), 'utf8')

test('sandbox.control describes the lock as one MCP writer, never one writer', () => {
  const block = bridge.match(/name: 'sandbox\.control',\s*description: '([^']+)'/)
  assert.ok(block, 'sandbox.control tool descriptor')
  const description = block[1]
  assert.equal(description.includes('one MCP writer'), true)
  assert.equal(/\bone writer\b/i.test(description), false)
  assert.equal(description.includes('REST'), true, 'the pane write path is named as outside the lock')
})
