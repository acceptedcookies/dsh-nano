import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileName, importTarget, nextAvailableName, validateName } from '../src/client/db.js'

/* The notepad is a text editor: names are stored exactly as given, with no
   implied markdown extension. */

test('fileName keeps any extension verbatim', () => {
  assert.equal(fileName('.env'), '.env')
  assert.equal(fileName('config.yaml'), 'config.yaml')
  assert.equal(fileName('README.md'), 'README.md')
  assert.equal(fileName('script.sh'), 'script.sh')
  assert.equal(fileName('notes'), 'notes')
  assert.equal(fileName('  spaced.txt  '), 'spaced.txt')
})

test('fileName no longer appends .md to unknown suffixes', () => {
  assert.notEqual(fileName('config.yaml'), 'config.yaml.md')
  assert.notEqual(fileName('.env'), '.env.md')
})

test('validateName rejects empty names and separators', () => {
  assert.throws(() => validateName(''), /empty/)
  assert.throws(() => validateName('a/b'), /slash/)
  assert.throws(() => validateName('a\\b'), /slash/)
})

test('nextAvailableName dedupes while preserving the suffix', () => {
  assert.equal(nextAvailableName([], 'config.yaml'), 'config.yaml')
  assert.equal(nextAvailableName(['config.yaml'], 'config.yaml'), 'config-2.yaml')
  assert.equal(nextAvailableName(['config.yaml', 'config-2.yaml'], 'config.yaml'), 'config-3.yaml')
  assert.equal(nextAvailableName(['.env'], '.env'), '.env-2')
  assert.equal(nextAvailableName(['notes'], 'notes'), 'notes-2')
  assert.equal(nextAvailableName(['A.MD'], 'a.md'), 'a-2.md', 'collisions are case-insensitive')
})

test('importTarget overwrites an unpinned same-name file, preferring the root', () => {
  const file = (name, extra = {}) => ({ name, parentId: null, kind: 'file', ...extra })
  assert.equal(importTarget([], '.gitignore'), null)
  const root = file('.gitignore')
  assert.equal(importTarget([root], '.gitignore'), root)
  const folder = { name: '.gitignore', parentId: null, kind: 'folder' }
  assert.equal(importTarget([folder], '.gitignore'), null, 'folders never overwrite')
  const pinned = file('.gitignore', { pinned: true })
  assert.equal(importTarget([pinned], '.gitignore'), null, 'pinned notes are sacred')
  const nested = file('.gitignore', { parentId: 'folder-1' })
  const rootHit = file('.gitignore')
  assert.equal(importTarget([nested], '.gitignore'), nested, 'a nested file still overwrites')
  assert.equal(importTarget([nested, rootHit], '.gitignore'), rootHit, 'root wins over nested')
  assert.equal(importTarget([file('.GITIGNORE')], '.gitignore')?.name, '.GITIGNORE', 'case-insensitive match keeps the existing casing')
})
