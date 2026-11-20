import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, realpathSync, rmSync, symlinkSync, writeFileSync, readFileSync, existsSync, lstatSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

import { pasteImage } from '../src/host/mutate.js'
import { candidateNames, decodeImageData, sniffImage, writeExclusiveFile, PASTE_IMAGE_MAX_BYTES } from '../src/host/paste-image.js'

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])

function fakeFs() {
  const processPath = target => (typeof target === 'string' ? target : target.targetKey)
  const resolve = async path => {
    let cur = path
    const tail = []
    while (!existsSync(cur)) {
      tail.unshift(cur.slice(cur.lastIndexOf('/') + 1))
      cur = dirname(cur)
    }
    const targetKey = realpathSync(cur) + (tail.length ? `/${tail.join('/')}` : '')
    return { targetKey, displayPath: path }
  }
  return {
    resolve,
    processPath,
    lstat: async path => (existsSync(path) ? lstatSync(path) : undefined),
    stat: async target => {
      const p = processPath(target)
      return existsSync(p) ? statSync(p) : undefined
    },
  }
}

function setup() {
  const outside = mkdtempSync(join(tmpdir(), 'nxe-paste-out-'))
  const root = mkdtempSync(join(tmpdir(), 'nxe-paste-root-'))
  mkdirSync(join(root, 'real'), { recursive: true })
  symlinkSync(outside, join(root, 'escape'))
  return { root: realpathSync(root), outside, fs: fakeFs() }
}

test('sniff accepts png/jpeg and rejects text', () => {
  assert.equal(sniffImage(PNG), 'png')
  assert.equal(sniffImage(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'jpeg')
  assert.equal(sniffImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')), null)
})

test('candidate names keep a real stem and suffix collisions', () => {
  assert.equal(candidateNames('diagram.png', 'png')[0], 'diagram.png')
  assert.equal(candidateNames('image.png', 'png')[1], 'image-2.png')
  assert.equal(candidateNames('../../.git/config', 'png')[0], 'config.png')
  assert.equal(candidateNames('', 'jpg')[0], 'image.jpg')
})

test('decode rejects a non-image alphabet and an oversized payload', () => {
  assert.throws(() => decodeImageData('not base64!!!'), /base64/)
  const huge = Buffer.alloc(PASTE_IMAGE_MAX_BYTES + 1, 1).toString('base64')
  assert.throws(() => decodeImageData(huge), /8MB/)
})

test('paste writes a png and will not overwrite an existing name', async () => {
  const { root, fs } = setup()
  writeFileSync(join(root, 'image.png'), 'keep')
  const written = []
  const created = await pasteImage(fs, {
    workspaceRoot: root, directory: '', name: 'image.png', bytes: PNG,
  }, async (path, bytes) => {
    written.push(path)
    await writeExclusiveFile(path, bytes)
  })
  assert.equal(created.name, 'image-2.png')
  assert.equal(readFileSync(join(root, 'image.png'), 'utf8'), 'keep')
  assert.equal(readFileSync(created.path).length, PNG.length)
  assert.equal(written.length, 1)
  rmSync(root, { recursive: true, force: true })
})

test('paste refuses a symlink that leaves the workspace and a .git leaf', async () => {
  const { root, fs } = setup()
  mkdirSync(join(root, '.git'), { recursive: true })
  const calls = []
  const writer = async path => { calls.push(path) }
  await assert.rejects(
    pasteImage(fs, { workspaceRoot: root, directory: 'escape', name: 'x.png', bytes: PNG }, writer),
    /outside the workspace/,
  )
  await assert.rejects(
    pasteImage(fs, { workspaceRoot: root, directory: '.git', name: 'x.png', bytes: PNG }, writer),
    /\.git/,
  )
  assert.equal(calls.length, 0)
  rmSync(root, { recursive: true, force: true })
})

test('paste refuses bytes that are not a bitmap before any write', async () => {
  const { root, fs } = setup()
  const calls = []
  await assert.rejects(
    pasteImage(fs, {
      workspaceRoot: root, directory: 'real', name: 'note.svg', bytes: Buffer.from('<svg/>'),
    }, async path => { calls.push(path) }),
    /png, jpeg, gif, or webp/,
  )
  assert.equal(calls.length, 0)
  rmSync(root, { recursive: true, force: true })
})
