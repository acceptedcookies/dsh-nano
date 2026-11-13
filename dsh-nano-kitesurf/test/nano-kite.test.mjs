import assert from 'node:assert/strict'
import test from 'node:test'
import { createNanoKite, engineOrigin } from '../lib/nano-kite.js'

function memoryFs() {
  const files = new Map()
  return {
    files,
    async readFile(file) {
      if (!files.has(file)) throw new Error('missing')
      return files.get(file)
    },
    async writeFile(file, text) {
      files.set(file, text)
    },
    async mkdir() {},
  }
}

test('init writes a lock once and the second call returns it', async () => {
  const fs = memoryFs()
  const kite = createNanoKite({ fs, lockPath: 'runtime/nano-kite.lock.json', nodeVersion: '22.23.4' })
  const first = await kite.init()
  assert.equal(first.already, false)
  assert.equal(first.lock.pitfalls.length >= 4, true)
  const second = await kite.init()
  assert.equal(second.already, true)
  assert.equal(second.lock.at, first.lock.at)
  assert.equal(fs.files.size, 1)
})

test('an old Node does not write the lock', async () => {
  const fs = memoryFs()
  const kite = createNanoKite({ fs, lockPath: 'runtime/nano-kite.lock.json', nodeVersion: '20.0.0' })
  await assert.rejects(() => kite.init(), (error) => error.id === 'kitesurf.kite.node')
  assert.equal(fs.files.size, 0)
})

test('start, suspend, and resume follow one path and call the engine hooks', async () => {
  const seen = []
  const kite = createNanoKite({
    onStart: () => seen.push('start'),
    onSuspend: () => seen.push('suspend'),
    onResume: () => seen.push('resume'),
  })
  assert.equal((await kite.start()).phase, 'running')
  await assert.rejects(() => kite.start(), (error) => error.id === 'kitesurf.kite.state')
  assert.equal((await kite.suspend()).phase, 'suspended')
  // A suspended engine must go through resume, never start.
  await assert.rejects(() => kite.start(), (error) => error.id === 'kitesurf.kite.state')
  await assert.rejects(() => kite.suspend(), (error) => error.id === 'kitesurf.kite.state')
  assert.equal((await kite.resume()).phase, 'running')
  await assert.rejects(() => kite.resume(), (error) => error.id === 'kitesurf.kite.state')
  assert.deepEqual(seen, ['start', 'suspend', 'resume'])
})

test('a failed start does not leave the engine running', async () => {
  const kite = createNanoKite({
    onStart: () => { throw Object.assign(new Error('down'), { id: 'kitesurf.kite.start' }) },
  })
  await assert.rejects(() => kite.start(), (error) => error.id === 'kitesurf.kite.start')
  assert.equal(kite.snapshot().phase, 'idle')
})

test('a remote engine needs allowRemote, and credentials are never allowed', () => {
  const local = createNanoKite()
  assert.throws(() => local.configure({ httpBase: 'http://10.0.0.8:8798' }), (error) => error.id === 'kitesurf.kite.remote')
  const kite = createNanoKite({ allowRemote: true })
  const saved = kite.configure({ httpBase: 'http://10.0.0.8:8798', mcpPort: '8801' })
  assert.equal(saved.httpBase, 'http://10.0.0.8:8798')
  assert.equal(saved.mcpPort, 8801)
  assert.equal(saved.cdp, 'ws://10.0.0.8:8798/devtools/browser')
  assert.throws(() => engineOrigin('http://user:secret@10.0.0.8:8798', true), (error) => error.id === 'kitesurf.url.credentials')
  assert.throws(() => kite.configure({ mcpPort: 0 }), (error) => error.id === 'kitesurf.kite.mcpPort')
})

test('init on an old Node refuses even when a lock already exists', async () => {
  const fs = memoryFs()
  fs.files.set('runtime/nano-kite.lock.json', JSON.stringify({ version: 1, pitfalls: [] }))
  const kite = createNanoKite({ fs, lockPath: 'runtime/nano-kite.lock.json', nodeVersion: '20.0.0' })
  await assert.rejects(() => kite.init(), (error) => error.id === 'kitesurf.kite.node')
})
