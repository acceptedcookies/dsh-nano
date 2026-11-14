import { appendFileSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'

export const TERM_TOOL_NAMES = Object.freeze([
  'term.session.create',
  'term.session.list',
  'term.session.input',
  'term.session.read',
  'term.session.resize',
  'term.session.close',
  'term.audit',
  'term.lane.status',
])

function schema(properties, required = []) {
  return { type: 'object', additionalProperties: false, properties, required }
}

export const TERM_TOOLS = Object.freeze([
  { name: 'term.session.create', inputSchema: schema({ lane: { type: 'string' }, sessionId: { type: 'string' }, shell: { type: 'string' }, cols: { type: 'integer', minimum: 2, maximum: 512 }, rows: { type: 'integer', minimum: 2, maximum: 512 }, title: { type: 'string' } }) },
  { name: 'term.session.list', inputSchema: schema({}) },
  { name: 'term.session.input', inputSchema: schema({ id: { type: 'string' }, data: { type: 'string' } }, ['id', 'data']) },
  { name: 'term.session.read', inputSchema: schema({ id: { type: 'string' }, lines: { type: 'integer', minimum: 1, maximum: 500 } }, ['id']) },
  { name: 'term.session.resize', inputSchema: schema({ id: { type: 'string' }, cols: { type: 'integer', minimum: 2, maximum: 512 }, rows: { type: 'integer', minimum: 2, maximum: 512 } }, ['id', 'cols', 'rows']) },
  { name: 'term.session.close', inputSchema: schema({ id: { type: 'string' }, reason: { type: 'string' } }, ['id']) },
  { name: 'term.audit', inputSchema: schema({ lines: { type: 'integer', minimum: 1, maximum: 500 } }) },
  { name: 'term.lane.status', inputSchema: schema({}) },
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

export function createTermSession(args, audit, url, auditFile) {
  const checked = validateTermCall('term.session.create', args)
  if (!checked.ok) return checked
  const id = args.sessionId ?? 'term-1'
  const session = {
    id,
    attach: { protocol: 'dnt-ws-v1', url },
  }
  const record = { op: 'open', id }
  audit?.push(record)
  appendTermAudit(auditFile, record)
  return { ok: true, ...session }
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
