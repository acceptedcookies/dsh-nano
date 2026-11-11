import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createLedger } from '../src/ledger.js'

test('ledger records ops and persists', async () => {
  const dir = mkdtempSync(join(tmpdir(), 's3-ledger-'))
  const file = join(dir, 'ledger.json')
  try {
    const ledger = createLedger(file)
    await ledger.recordOp('put', { bytes: 100, up: true })
    await ledger.recordOp('get')
    const snap = ledger.snapshot()
    assert.equal(snap.ops.put, 1)
    assert.equal(snap.ops.get, 1)
    assert.equal(snap.dailyUpBytes, 100)
    // reread from disk
    const again = createLedger(file)
    assert.equal(again.snapshot().ops.put, 1)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('reconcile stores bucket totals', async () => {
  const dir = mkdtempSync(join(tmpdir(), 's3-ledger-'))
  try {
    const ledger = createLedger(join(dir, 'l.json'))
    await ledger.reconcile({ objects: 7, bytes: 12345 })
    assert.deepEqual([ledger.snapshot().objects, ledger.snapshot().bytes], [7, 12345])
    assert.equal(JSON.parse(readFileSync(ledger.file, 'utf8')).objects, 7)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
