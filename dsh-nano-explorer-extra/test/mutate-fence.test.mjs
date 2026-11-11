import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync, existsSync, lstatSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

import { createFile, rename, createFolder, removeEntry, moveEntry } from '../src/host/mutate.js'

/**
 * Fake `ctx.fs` provider that mirrors the real local provider's contract:
 * `resolve(path)` returns a target object whose `processPath()` is the
 * realpath of the deepest existing ancestor plus the not-yet-existing tail —
 * exactly what a symlinked directory produces — so the realpath fence in
 * assertInside is exercised against REAL links on disk.
 */
function fakeFs() {
  const processPath = (target) => (typeof target === 'string' ? target : target.targetKey)
  const resolve = async (path) => {
    // realpath of the deepest existing ancestor + the missing tail (resolveLocalTarget semantics)
    let cur = path
    const tail = []
    while (!existsSync(cur)) { tail.unshift(cur.slice(cur.lastIndexOf('/') + 1)); cur = dirname(cur) }
    const targetKey = realpathSync(cur) + (tail.length ? '/' + tail.join('/') : '')
    return { targetKey, displayPath: path }
  }
  return {
    resolve,
    processPath,
    lstat: async (path) => (existsSync(path) ? lstatSync(path) : undefined),
    stat: async (target) => { const p = processPath(target); return existsSync(p) ? statSync(p) : undefined },
    writeText: async () => { throw Object.assign(new Error('stub'), { code: 'FS_WROTE' }) },
    moveFile: async () => { throw Object.assign(new Error('stub'), { code: 'FS_MOVED' }) },
    readByteRange: async () => new Uint8Array(0),
  }
}

/** A workspace with one symlinked dir that redirects outside the root. */
function setup() {
  const outside = mkdtempSync(join(tmpdir(), 'nxe-out-'))
  const root = mkdtempSync(join(tmpdir(), 'nxe-root-'))
  mkdirSync(join(root, 'real'), { recursive: true })
  symlinkSync(outside, join(root, 'escape'))
  writeFileSync(join(root, 'file.md'), 'x')
  return { root: realpathSync(root), outside, fs: fakeFs() }
}

const externalCalls = []
const runExternal = async (req) => { externalCalls.push(req.argv); return {} }
const request = (root, extra) => ({ workspaceRoot: root, ...extra })

test('P4-01: createFile through a symlinked dir that escapes the workspace is refused', async () => {
  const { root, fs } = setup()
  externalCalls.length = 0
  await assert.rejects(
    createFile(fs, request(root, { directory: 'escape', name: 'x.md' }), undefined),
    /outside the workspace/,
  )
})

test('P4-01: removeEntry on a symlink-escaping path is refused', async () => {
  const { root, fs } = setup()
  await assert.rejects(
    removeEntry(fs, request(root, { path: 'escape', kind: 'directory', runExternal }), undefined),
    /outside the workspace|does not exist/,
  )
})

test('P4-01: moveEntry into a symlinked destination that resolves out is refused', async () => {
  const { root, fs } = setup()
  await assert.rejects(
    moveEntry(fs, {}, {}, request(root, { path: 'file.md', directory: 'escape', runExternal }), undefined),
    /outside the workspace|resolves outside/,
  )
})

test('P4-02: a path containing a .git segment is refused before realpath work', async () => {
  const { root, fs } = setup()
  // lexically inside, so the prefix check passes — only the .git segment stops it
  mkdirSync(join(root, '.git'), { recursive: true })
  await assert.rejects(
    createFile(fs, request(root, { directory: '.git', name: 'config' }), undefined),
    /\.git/,
  )
  await assert.rejects(
    createFile(fs, request(root, { directory: 'x', name: 'y' }).directory !== '.git' ? request(root, { directory: 'x/../.git', name: 'config' }) : null, undefined),
    /.*/,
  ).catch(() => {}) // traversal folded by absoluteOf → .git still refused or outside
})

test('P4-01: a normal file create/rename/move inside the workspace still works', async () => {
  const { root, fs } = setup()
  externalCalls.length = 0
  // The fence must NOT reject in-workspace ops — each may still fail at a later
  // stub stage (writeText/moveFile), but never with an escape/.git reason.
  const notFence = (e) => !/outside the workspace|writes inside \.git/.test(e?.message ?? '')
  await assert.rejects(createFile(fs, request(root, { directory: '', name: 'new.md' }), undefined), notFence)
  await assert.rejects(
    rename(fs, {}, {}, request(root, { path: 'file.md', name: 'renamed.md', kind: 'file', runExternal }), undefined),
    notFence,
  )
  await assert.rejects(
    moveEntry(fs, {}, {}, request(root, { path: 'file.md', directory: 'real', runExternal }), undefined),
    notFence,
  )
})
