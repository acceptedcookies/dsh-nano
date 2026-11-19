import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { TERM_TOOLS, pingFrame, pongFrame, validateTermCall } from '../src/host/terminal-driver.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('terminal tool schemas are the managed surface: strict, id-addressed, no session/url field', () => {
  const names = TERM_TOOLS.map((tool) => tool.name)
  assert.deepEqual(names, [
    'term.session.create',
    'term.session.list',
    'term.session.attach',
    'term.session.input',
    'term.session.read',
    'term.session.resize',
    'term.session.close',
  ])
  for (const tool of TERM_TOOLS) {
    assert.equal(tool.inputSchema.additionalProperties, false)
    assert.equal(Object.hasOwn(tool.inputSchema.properties, 'sessionId'), false)
    assert.equal(Object.hasOwn(tool.inputSchema.properties, 'url'), false)
    assert.equal(Object.hasOwn(tool.inputSchema.properties, 'token'), false)
  }
  // Every tool addresses an explicit sandboxId; session ops also need terminalId.
  for (const tool of TERM_TOOLS) {
    assert.equal(tool.inputSchema.required.includes('sandboxId'), true, tool.name)
  }
  for (const name of names.filter((n) => n !== 'term.session.create' && n !== 'term.session.list')) {
    const tool = TERM_TOOLS.find((row) => row.name === name)
    assert.equal(tool.inputSchema.required.includes('terminalId'), true, name)
  }
  assert.equal(TERM_TOOLS.find((row) => row.name === 'term.session.create').inputSchema.required.includes('openId'), true)
  assert.equal(TERM_TOOLS.find((row) => row.name === 'term.session.create').inputSchema.required.includes('paneId'), true)
})

test('validateTermCall enforces the managed bounds', () => {
  const open = { sandboxId: 's', openId: 'o', paneId: 'p' }
  assert.equal(validateTermCall('term.session.create', open).ok, true)
  assert.equal(validateTermCall('term.session.create', { ...open, sessionId: 'x' }).ok, false)
  assert.equal(validateTermCall('term.session.create', { ...open, extra: 1 }).ok, false)
  assert.equal(validateTermCall('term.session.create', { sandboxId: 's', openId: 'o' }).ok, false)
  assert.equal(validateTermCall('term.session.resize', { sandboxId: 's', terminalId: 't', cols: 1, rows: 24 }).ok, false)
  assert.equal(validateTermCall('term.session.resize', { sandboxId: 's', terminalId: 't', cols: 80, rows: 513 }).ok, false)
  assert.equal(validateTermCall('term.session.read', { sandboxId: 's', terminalId: 't' }).ok, true)
  assert.equal(validateTermCall('term.unknown', {}).ok, false)
})

test('guest helpers are package-owned recipe members; control plane is a unix socket, never a listener', () => {
  for (const name of ['pty-entry.mjs', 'pty-worker.py']) {
    assert.equal(existsSync(join(root, 'profiles', 'terminal', name)), true, name)
  }
  const entry = readFileSync(join(root, 'profiles', 'terminal', 'pty-entry.mjs'), 'utf8')
  const worker = readFileSync(join(root, 'profiles', 'terminal', 'pty-worker.py'), 'utf8')
  // No TCP listener, no bearer token, no arbitrary shell path.
  assert.equal(/createServer|\.listen\(|token|bearer/i.test(entry), false)
  assert.equal(/socket\.AF_INET|AF_INET6|0\.0\.0\.0/i.test(worker), false)
  assert.match(worker, /pty\.fork\(\)/)
  assert.match(worker, /TIOCSWINSZ/)
  assert.match(worker, /setgroups|setuid/)
  assert.match(entry, /createConnection/)
  const frame = pongFrame(Buffer.from('ping'))
  assert.equal(frame[0] & 0x0f, 0x0a)
  assert.equal(pingFrame(Buffer.from('x'))[0] & 0x0f, 0x09)
})
