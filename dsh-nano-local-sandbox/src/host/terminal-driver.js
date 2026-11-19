import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export const TERM_TOOL_NAMES = Object.freeze([
  'term.session.create',
  'term.session.list',
  'term.session.attach',
  'term.session.input',
  'term.session.read',
  'term.session.resize',
  'term.session.close',
])

function schema(properties, required = []) {
  return { type: 'object', additionalProperties: false, properties, required }
}

const size = { type: 'integer', minimum: 2, maximum: 512 }

/**
 * Managed terminal tool surface — the single source for names, input and
 * result shapes. Sessions are guest-resident workers; nothing on this list
 * returns a URL or token: attach yields only an opaque locator, output is a
 * bounded seq-framed tail, never a screen.
 */
export const TERM_TOOLS = Object.freeze([
  {
    name: 'term.session.create',
    description: 'Reserve and spawn one terminal worker on an explicit sandboxId; returns exactly {sandboxId, terminalId}.',
    inputSchema: schema({ sandboxId: { type: 'string' }, openId: { type: 'string' }, paneId: { type: 'string' }, cols: size, rows: size, cwd: { type: 'string' }, service: { type: 'string' } }, ['sandboxId', 'openId', 'paneId']),
  },
  {
    name: 'term.session.list',
    description: 'List this principal\'s terminals on one sandboxId; returns {sandboxId, terminals:[{terminalId,state}]}, never a URL.',
    inputSchema: schema({ sandboxId: { type: 'string' } }, ['sandboxId']),
  },
  {
    name: 'term.session.attach',
    description: 'Verify an owned active terminal and return its opaque locator.',
    inputSchema: schema({ sandboxId: { type: 'string' }, terminalId: { type: 'string' } }, ['sandboxId', 'terminalId']),
  },
  {
    name: 'term.session.input',
    description: 'Send input bytes to an owned terminal worker.',
    inputSchema: schema({ sandboxId: { type: 'string' }, terminalId: { type: 'string' }, data: { type: 'string', maxLength: 65536 } }, ['sandboxId', 'terminalId', 'data']),
  },
  {
    name: 'term.session.read',
    description: 'Read the bounded output tail as {seq, from, bytes, ended} — a tail, not a screen.',
    inputSchema: schema({ sandboxId: { type: 'string' }, terminalId: { type: 'string' }, from: { type: 'integer', minimum: 0 } }, ['sandboxId', 'terminalId']),
  },
  {
    name: 'term.session.resize',
    description: 'Resize an owned terminal worker.',
    inputSchema: schema({ sandboxId: { type: 'string' }, terminalId: { type: 'string' }, cols: size, rows: size }, ['sandboxId', 'terminalId', 'cols', 'rows']),
  },
  {
    name: 'term.session.close',
    description: 'Hang up and reap an owned terminal worker.',
    inputSchema: schema({ sandboxId: { type: 'string' }, terminalId: { type: 'string' } }, ['sandboxId', 'terminalId']),
  },
])

function bounds(name, key, value) {
  const tool = TERM_TOOLS.find((row) => row.name === name)
  const spec = tool.inputSchema.properties[key]
  if (!spec || typeof value !== 'number') return null
  if (spec.minimum != null && value < spec.minimum) return `${key}-low`
  if (spec.maximum != null && value > spec.maximum) return `${key}-high`
  return null
}

export function validateTermCall(name, args = {}) {
  const tool = TERM_TOOLS.find((row) => row.name === name)
  if (!tool) return { ok: false, error: 'unknown' }
  const schema = tool.inputSchema
  for (const key of Object.keys(args)) {
    if (!Object.prototype.hasOwnProperty.call(schema.properties, key)) return { ok: false, error: 'additional' }
  }
  for (const key of schema.required) {
    if (args[key] == null) return { ok: false, error: 'required' }
  }
  for (const key of ['lines', 'cols', 'rows']) {
    if (args[key] == null) continue
    const problem = bounds(name, key, args[key])
    if (problem) return { ok: false, error: problem }
  }
  return { ok: true }
}

export function appendTermAudit(file, record) {
  if (!file) return
  mkdirSync(dirname(file), { recursive: true })
  appendFileSync(file, `${JSON.stringify({ t: new Date().toISOString(), ...record })}\n`)
}

export function encodeFrame(payload, opcode = 0x02) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload)
  const header = Buffer.from([0x80 | opcode, body.length])
  return Buffer.concat([header, body])
}

export function pongFrame(payload) {
  return encodeFrame(payload, 0x0a)
}

export function pingFrame(payload) {
  return encodeFrame(payload, 0x09)
}
