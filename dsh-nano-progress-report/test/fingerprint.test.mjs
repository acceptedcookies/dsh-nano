/** DNPR-T01 — shared fingerprints: byte-identical digests both sides would
 *  compute, background-bash keyless, path-keyed file tools, canonical args. */
import assert from 'node:assert/strict'
import test from 'node:test'
import { createHash } from 'node:crypto'
import {
  bashFingerprint, callFingerprints, digest, fileFingerprints, isDigest,
  successfulBash,
} from '../src/shared/fingerprint.js'

const refDigest = value => createHash('sha256').update(value).digest('hex')
const args = value => JSON.stringify(value)

test('digest matches node:crypto sha256 byte-for-byte', () => {
  for (const input of ['', 'abc', '中文与 emoji 🚀', 'x'.repeat(5000)]) {
    assert.equal(digest(input), refDigest(input))
    assert.equal(isDigest(digest(input)), true)
  }
})

test('bash fingerprint ignores UI copy, includes cwd and workdir', () => {
  const command = { command: 'npm test', description: 'any UI copy' }
  const base = bashFingerprint(args(command), 'cwddigest')
  assert.equal(base, refDigest(JSON.stringify(['cwddigest', null, 'npm test'])))
  assert.equal(bashFingerprint(args({ ...command, description: 'other copy' }), 'cwddigest'), base)
  assert.notEqual(bashFingerprint(args({ ...command, workdir: 'sub' }), 'cwddigest'), base)
  assert.notEqual(bashFingerprint(args(command), 'other'), base)
  assert.equal(bashFingerprint(args({ ...command, run_in_background: true }), 'cwddigest'), null)
  assert.equal(bashFingerprint('not json', 'c'), null)
  assert.equal(bashFingerprint(args({ command: '' }), 'c'), null)
})

test('file fingerprints key on path; meta paths win over args', () => {
  const one = fileFingerprints(args({ file_path: '/a/x.js' }))
  assert.deepEqual(one, [refDigest('file:/a/x.js')])
  const multi = fileFingerprints(args({}), { diffs: [{ path: '/p1' }, { path: '/p2' }] })
  assert.deepEqual(multi, [refDigest('file:/p1'), refDigest('file:/p2')])
  const fallback = fileFingerprints(args({ file_path: '/a' }), { path: '/meta' })
  assert.deepEqual(fallback, [refDigest('file:/meta')])
  assert.deepEqual(fileFingerprints('not json'), [])
})

test('callFingerprints canonicalizes args and strips description copy', () => {
  const a = callFingerprints('grep', args({ pattern: 'foo', path: '/src', description: 'look' }))
  const b = callFingerprints('grep', args({ path: '/src', pattern: 'foo', description: 'different' }))
  assert.deepEqual(a, b)
  assert.equal(a.length, 1)
  assert.deepEqual(callFingerprints('bash', args({ command: 'ls', run_in_background: true }), { cwd: 'd' }), [])
  assert.deepEqual(callFingerprints('write', args({ file_path: '/f' })), fileFingerprints(args({ file_path: '/f' })))
  // 'read' is not a recovery-keyed file tool: it fingerprints as a generic call.
  assert.notDeepEqual(callFingerprints('read', args({ file_path: '/f' })), fileFingerprints(args({ file_path: '/f' })))
  assert.deepEqual(callFingerprints('unknown', 'garbage'), [])
})

test('successfulBash terminal markers withhold recovery without inferring failure', () => {
  const ok = { message: { content: [{ type: 'text', text: 'fine' }] }, meta: { cwd: '/p' } }
  assert.equal(successfulBash(ok), true)
  for (const tail of ['out\n[exit code: 1]', '[still running after 100ms; moved to background job bash-1]',
    'x\n[timed out after 10s]', '[killed by signal: SIGKILL]', '[sandbox: file access denied under read-only mode]']) {
    assert.equal(successfulBash({ message: { content: [{ type: 'text', text: tail }] }, meta: { cwd: '/p' } }), false)
  }
  assert.equal(successfulBash({ message: { content: [{ type: 'text', text: 'fine' }] }, meta: {} }), false)
})
