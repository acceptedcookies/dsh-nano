import test from 'node:test'
import assert from 'node:assert/strict'
import { ERROR_CATALOG as HOST_CATALOG } from '../src/host/error-catalog.js'
import { ERROR_CATALOG as MIRROR_CATALOG, BRIDGE_ERRORS } from '../../dsh-nano-kitesurf/lib/diagnostics.js'

// The AGENTS.md contract says the DNK lib/diagnostics.js catalog is an
// agent-facing mirror of the DNLS emitter truth — same ids, same statuses.
// Historically three real emitters (kitesurf.dom.empty, sandbox.cdp.page-lost,
// kitesurf.control.bridge) drifted out of the mirror and nothing caught it.
// This test reconciles the two tables by example-id, not by regex row count
// (row shapes may legitimately differ in cause/next prose).

function statusOf(catalog, id) {
  // Order-sensitive, matching the real matcher.
  for (const row of catalog) {
    if (new RegExp(row.match).test(id)) return row.status
  }
  return undefined
}

const bridgeIds = new Set((BRIDGE_ERRORS || []).map((row) => row.id))

test('every host-emitted errorId has a mirror row that maps the same status', () => {
  // Bridge-local ids (BRIDGE_ERRORS) are exempt: the host catalog carries them
  // only so the /control proxy can map a bridge answer to an HTTP status; the
  // mirror documents them in a separate no-status section by design.
  const hostIds = HOST_CATALOG.map((row) => row.example).filter((id) => !bridgeIds.has(id))
  const missing = []
  const statusMismatch = []
  for (const id of hostIds) {
    const hostStatus = statusOf(HOST_CATALOG, id)
    const mirrorStatus = statusOf(MIRROR_CATALOG, id)
    if (mirrorStatus === undefined) { missing.push(id); continue }
    if (mirrorStatus !== hostStatus) statusMismatch.push(`${id}: host ${hostStatus} ≠ mirror ${mirrorStatus}`)
  }
  assert.deepEqual(missing, [], `mirror-missing host ids: ${missing.join(', ')}`)
  assert.deepEqual(statusMismatch, [], `status mismatch: ${statusMismatch.join('; ')}`)
})

test('mirror host rows never invent an id the host catalog cannot emit', () => {
  // Reverse direction: every example in the mirror's DNLS_EMITTED section must
  // be an id the host table would actually map — otherwise the agent learns a
  // status for an error that can never occur through the host face.
  const invented = MIRROR_CATALOG.map((row) => row.example)
    .filter((id) => statusOf(HOST_CATALOG, id) === undefined)
  assert.deepEqual(invented, [], `mirror-only ids: ${invented.join(', ')}`)
})
