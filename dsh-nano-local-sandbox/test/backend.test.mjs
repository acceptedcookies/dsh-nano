import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { BACKEND_METHODS } from '../src/host/backend.js'
import { createAppleBackend } from '../src/host/backend-apple.js'
import { createNvxBackend } from '../src/host/backend-nvx.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const fixture = {
  image: 'node:22-bookworm-slim',
  mounts: [{ source: '/workspace', target: '/workspace', readonly: true }],
  ports: [{ publish: '127.0.0.1:0:8787' }],
  resources: { cpus: 4, memory: '4G' },
  network: { mode: 'loopback-only' },
  identity: { user: 'node' },
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) walk(path, out)
    else if (name.endsWith('.js')) out.push(path)
  }
  return out
}

test('thirteen methods; NVX rejects all but capabilities with the internal code', async () => {
  assert.equal(BACKEND_METHODS.length, 13)
  const apple = createAppleBackend(fixture, {
    spawn() { return Promise.resolve({ code: 0 }) },
    execFile() { return Promise.resolve('{}') },
  })
  const nvx = createNvxBackend(fixture)
  assert.deepEqual(Object.keys(apple.capabilities()).sort(), Object.keys(nvx.capabilities()).sort())
  for (const method of BACKEND_METHODS) {
    if (method === 'capabilities') {
      assert.equal(typeof nvx.capabilities(), 'object')
      continue
    }
    await assert.rejects(nvx[method](fixture), (error) => {
      assert.equal(error.code, 'backend.nvx.unimplemented')
      return true
    })
  }
})

test('apple nouns in the public spec throw at construction', () => {
  assert.throws(() => createAppleBackend({ ...fixture, container: true }))
  assert.throws(() => createNvxBackend({ image: 'virtiofs' }))
  assert.throws(() => createAppleBackend({ mounts: [{ type: 'vmnet' }] }))
  assert.throws(() => createNvxBackend({ identity: { user: 'kitesurf' } }))
})

test('the NVX internal code is not an ERROR_CATALOG id', () => {
  const hits = []
  for (const file of walk(join(root, 'src'))) {
    const text = readFileSync(file, 'utf8')
    if (!text.includes('ERROR_CATALOG')) continue
    if (text.includes('backend.nvx.unimplemented')) hits.push(file)
  }
  assert.deepEqual(hits, [])
})
