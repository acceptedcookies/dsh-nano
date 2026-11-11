/**
 * B1-T01 (skeleton) — dsh-remote-data-schema unit tests.
 *
 * Phase 1 asserts the API *surface*: exports exist, SchemaReject is an Error
 * carrying `reason`, version dispatch works, and v1 fails closed while v0 is
 * read-only with the backfill tag. v1 rule content arrives in Phase 2 (P2-01).
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { validate, SchemaReject, SUPPORTED_KINDS } from '../src/index.js'

test('exports the API surface', () => {
  assert.equal(typeof validate, 'function')
  assert.ok(typeof SchemaReject === 'function' && SchemaReject.prototype instanceof Error)
  assert.ok(Array.isArray(SUPPORTED_KINDS) && SUPPORTED_KINDS.length === 6)
  assert.deepEqual([...SUPPORTED_KINDS], ['manifest', 'file', 'image', 'marker', 'session-meta', 'tree-head'])
})

test('SchemaReject carries `reason` and extends Error', () => {
  const e = new SchemaReject('schema:name', 'has control char')
  assert.ok(e instanceof Error)
  assert.ok(e instanceof SchemaReject)
  assert.equal(e.name, 'SchemaReject')
  assert.equal(e.reason, 'schema:name')
  assert.match(e.message, /control char/)
})

test('v0 (no discriminant) passes read-only and is tagged compat:v0-backfill', () => {
  const out = validate('manifest', { rev: 3, files: {} }) // no schemaVersion → v0
  assert.deepEqual(out, { ok: true, v: 0, compat: 'v0-backfill' })
})

test('explicit v:0 is honored', () => {
  const out = validate('marker', { title: 'x' }, { v: 0 })
  assert.equal(out.v, 0)
  assert.equal(out.compat, 'v0-backfill')
})

test('v1 dispatch exists but fails closed (skeleton)', () => {
  assert.throws(
    () => validate('manifest', { schemaVersion: 1, rev: 1, files: {} }),
    e => e instanceof SchemaReject && e.reason === 'schema:unimplemented',
  )
  assert.throws(
    () => validate('image', { mime: 'image/png', base64: 'AAA=' }, { v: 1 }),
    e => e instanceof SchemaReject && e.reason === 'schema:unimplemented',
  )
})

test('unknown kind and unknown version reject', () => {
  assert.throws(
    () => validate('nope', {}),
    e => e instanceof SchemaReject && e.reason === 'schema:kind',
  )
  assert.throws(
    () => validate('manifest', { schemaVersion: 99 }),
    e => e instanceof SchemaReject && e.reason === 'schema:unknown-version',
  )
})
