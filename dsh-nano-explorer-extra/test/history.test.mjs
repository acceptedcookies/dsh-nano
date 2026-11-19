import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseHistory, parseLog, parseRemoteRefs } from '../src/host/git.js'

const pretty = (hash, refs) => `${hash}${'f'.repeat(33)}\x1f${hash}\x1fparent\x1f1700000000\x1fsubject\x1f${refs}`

test('parseLog still reads a one-line commit', () => {
  const [commit] = parseLog(`${pretty('abc1234', 'HEAD -> main, tag: v1, origin/main')}\n`)
  assert.equal(commit.hash, 'abc1234')
  assert.deepEqual(commit.refs, ['main', 'v1', 'origin/main'])
})

test('parseHistory sums numstat and keeps the file list', () => {
  const stdout = [
    `\x1e${pretty('aaa1111', 'HEAD -> main')}`,
    '10\t2\tsrc/a.js',
    '-\t-\tbin.dat',
    '1\t0\told => new',
    `\x1e${pretty('bbb2222', 'origin/main')}`,
    '3\t4\tREADME.md',
    '',
  ].join('\n')
  const commits = parseHistory(stdout)
  assert.equal(commits.length, 2)
  assert.equal(commits[0].additions, 11)
  assert.equal(commits[0].deletions, 2)
  assert.deepEqual(commits[0].files.map(file => file.path), ['src/a.js', 'bin.dat', 'old => new'])
  assert.equal(commits[0].files[1].additions, 0)
  assert.equal(commits[1].additions, 3)
  assert.equal(commits[1].deletions, 4)
  assert.equal(commits[1].refs[0], 'origin/main')
})

test('parseHistory flags a file list past 80 rows without dropping the totals', () => {
  const lines = [`\x1e${pretty('ccc3333', '')}`]
  for (let i = 0; i < 85; i += 1) lines.push(`1\t1\tf${i}`)
  const [commit] = parseHistory(lines.join('\n'))
  assert.equal(commit.files.length, 80)
  assert.equal(commit.fileCount, 85)
  assert.equal(commit.filesTruncated, true)
  assert.equal(commit.additions, 85)
  assert.equal(commit.deletions, 85)
})

test('parseRemoteRefs drops symrefs and reads ahead/behind against the default', () => {
  const stdout = [
    'origin\tabc\torigin/main\t0 0',
    'origin/main\tabc\t\t0 0',
    'origin/feature\tdef\t\t2 5',
  ].join('\n')
  const rows = parseRemoteRefs(stdout, 'origin/main')
  assert.deepEqual(rows, [
    { name: 'origin/main', commit: 'abc', ahead: 0, behind: 0, base: 'origin/main' },
    { name: 'origin/feature', commit: 'def', ahead: 2, behind: 5, base: 'origin/main' },
  ])
})
