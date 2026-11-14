import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'
import { TERM_TOOLS, createTermSession, pingFrame, pongFrame, validateTermCall } from '../src/host/terminal-driver.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

test('terminal schemas reject bounds and extra fields, and create has no path', () => {
  for (const tool of TERM_TOOLS) assert.equal(tool.inputSchema.additionalProperties, false)
  assert.equal(validateTermCall('term.session.read', { id: 'a', lines: 501 }).ok, false)
  assert.equal(validateTermCall('term.session.resize', { id: 'a', cols: 1, rows: 24 }).ok, false)
  assert.equal(validateTermCall('term.session.resize', { id: 'a', cols: 80, rows: 513 }).ok, false)
  assert.equal(validateTermCall('term.session.create', { cols: 80, rows: 24, extra: true }).ok, false)
  const audit = []
  const created = createTermSession({ cols: 80, rows: 24 }, audit, 'ws://127.0.0.1:9/term?session=a')
  assert.equal(created.ok, true)
  assert.equal(Object.prototype.hasOwnProperty.call(created.attach, 'path'), false)
  assert.equal(created.attach.protocol, 'dnt-ws-v1')
  assert.equal(created.attach.url, 'ws://127.0.0.1:9/term?session=a')
  const frame = pongFrame(Buffer.from('ping'))
  assert.equal(frame[0] & 0x0f, 0x0a)
  assert.equal(pingFrame(Buffer.from('x'))[0] & 0x0f, 0x09)
  const pty = readFileSync(join(root, 'profiles', 'terminal', 'pty-entry.mjs'), 'utf8')
  assert.match(pty, /profiles\/terminal\/pty-entry\.mjs/)
  assert.equal(audit[0].op, 'open')
})
