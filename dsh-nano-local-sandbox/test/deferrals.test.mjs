import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const ledger = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'security', 'accepted-risks.json'), 'utf8'))
const BEFORE = [
  'nxe:mutate-symlink-escape',
  'nxe:git-config-filter-exec',
  'hunter-e:grok-creds-workspace-copy',
  'nxe:scopeof-cross-session',
  'nxe:routes-read-arbitrary-file',
  'nano-notepad:read-arbitrary-md-read',
  'nsw:ls-mkdir-any-absolute-path',
  'nano-notepad:s3-config-endpoint-ssrf',
  'nxe:perf-review-window-drain',
]

test('U10 rows are appended and earlier fingerprints stay unchanged', () => {
  const ids = ledger.risks.map((row) => row.fingerprint)
  for (const id of BEFORE) assert.equal(ids.includes(id), true)
  const added = ids.filter((id) => id.startsWith('dnls:defer-'))
  assert.deepEqual(added, ['dnls:defer-nvx', 'dnls:defer-xray', 'dnls:defer-gateway', 'dnls:defer-local-s3'])
  assert.equal(ids.slice(-4).join(','), added.join(','))
  for (const row of ledger.risks.filter((item) => item.fingerprint.startsWith('dnls:defer-'))) {
    assert.equal(row.disposition, 'accept')
  }
  const previous = ledger.risks.filter((row) => BEFORE.includes(row.fingerprint))
  assert.equal(previous.length, BEFORE.length)
  assert.equal(previous.some((row) => row.disposition !== 'harden' && row.disposition !== 'accept'), false)
})
