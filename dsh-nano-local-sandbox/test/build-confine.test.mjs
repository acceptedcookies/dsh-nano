import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { buildImage } from '../src/host/build.js'

test('confine is the only build path, and a missing sandbox does not spawn', async () => {
  const profileDir = mkdtempSync(join(tmpdir(), 'dnls-build-'))
  const checkout = join(profileDir, 'checkout')
  const naked = { spawn: 0, execFile: 0 }
  const spawn = () => { naked.spawn += 1 }
  const execFile = () => { naked.execFile += 1 }
  let confined = 0
  const legal = await buildImage({
    ctx: { sandbox: { async confine(argv) { confined += 1; return { argv } } } },
    profileDir,
    checkout,
    argv: ['build', profileDir],
    spawn,
    execFile,
  })
  assert.equal(legal.ok, true)
  assert.equal(confined, 1)
  assert.equal(naked.spawn, 0)
  assert.equal(naked.execFile, 0)

  naked.spawn = 0
  await assert.rejects(() => buildImage({
    ctx: {},
    profileDir,
    checkout,
    spawn,
    execFile,
  }))
  assert.equal(naked.spawn, 0)
  assert.equal(naked.execFile, 0)

  const escaped = await buildImage({
    ctx: { sandbox: { async confine() { confined += 1; return {} } } },
    profileDir,
    checkout: join(profileDir, '..', 'outside'),
    spawn,
    execFile,
  })
  assert.equal(escaped.ok, false)
  assert.equal(escaped.confined, 0)
  assert.equal(naked.spawn, 0)
})
