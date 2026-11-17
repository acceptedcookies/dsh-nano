import { test } from 'node:test'
import assert from 'node:assert/strict'
import { applyNumstat, numstatDestination, parseNumstat, summarizePatch } from '../src/host/git.js'

test('numstatDestination unwraps a brace rename', () => {
  assert.equal(numstatDestination('src/{old => new}/a.js'), 'src/new/a.js')
  assert.equal(numstatDestination('old.js => new.js'), 'new.js')
  assert.equal(numstatDestination('plain.js'), 'plain.js')
})

test('parseNumstat counts lines and treats binary as zero', () => {
  const rows = parseNumstat('10\t2\tsrc/a.js\n-\t-\tbin.dat\n1\t4\told.js => new.js\n')
  assert.deepEqual(rows.get('src/a.js'), { additions: 10, deletions: 2 })
  assert.deepEqual(rows.get('bin.dat'), { additions: 0, deletions: 0 })
  assert.deepEqual(rows.get('new.js'), { additions: 1, deletions: 4 })
})

test('applyNumstat writes counts onto matching status rows only', () => {
  const files = [{ path: 'src/a.js', status: 'M' }, { path: 'new.txt', status: '?' }]
  applyNumstat(files, '3\t1\tsrc/a.js\n')
  assert.equal(files[0].additions, 3)
  assert.equal(files[0].deletions, 1)
  assert.equal(files[1].additions, undefined)
})

test('summarizePatch ignores headers and flags a binary patch', () => {
  const text = [
    'diff --git a/a.js b/a.js',
    '--- a/a.js',
    '+++ b/a.js',
    '@@ -1 +1,2 @@',
    '-old',
    '+new',
    '+extra',
  ].join('\n')
  assert.deepEqual(summarizePatch(text), { additions: 2, deletions: 1, binary: false })
  assert.deepEqual(summarizePatch('Binary files a/x and b/x differ\n'), { additions: 0, deletions: 0, binary: true })
})
