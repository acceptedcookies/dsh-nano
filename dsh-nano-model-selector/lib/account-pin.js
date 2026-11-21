/** Per-session magpie account pin. One file, no second copy, no login store. */

import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'

export const SESSION_ID = /^(?!\.{1,2}$)[A-Za-z0-9._-]{1,128}$/
const UPSTREAM_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const ACCOUNT_MAX = 200
const DISCOVER_HEADER = '__dsh_no_such_account__'

/** @param {string} model */
export function upstreamOf(model) {
  if (typeof model !== 'string') return null
  const slash = model.indexOf('/')
  const head = slash > 0 ? model.slice(0, slash) : ''
  return UPSTREAM_ID.test(head) ? head : null
}

/**
 * Magpie rejects an unknown X-Magpie-Account before the model runs and lists
 * the display names that do serve the model. That sentence is the catalog.
 * @param {string} message
 * @returns {string[] | null}
 */
export function parseAccountList(message) {
  if (typeof message !== 'string') return null
  const marker = 'its accounts are '
  const at = message.indexOf(marker)
  if (at < 0) return null
  const names = message.slice(at + marker.length).split(', ').map(part => part.trim()).filter(Boolean)
  return names.length > 0 ? names : null
}

/**
 * Header values are latin-1 on the wire. Magpie compares the raw bytes with
 * the UTF-8 display name, so the middle dot must travel as its UTF-8 bytes.
 * @param {string} value
 */
export function utf8Header(value) {
  return Buffer.from(value, 'utf8').toString('latin1')
}

/**
 * @param {{ provider?: string, model?: string, sessionId?: string, pins?: Record<string, Record<string, string>> }} input
 * @returns {Record<string, string>}
 */
export function headersForCall(input) {
  if (input?.provider !== 'magpie') return {}
  const sessionId = input.sessionId
  if (typeof sessionId !== 'string' || !SESSION_ID.test(sessionId)) return {}
  const headers = { 'X-Magpie-Session': sessionId }
  const upstream = upstreamOf(input.model)
  const account = upstream === null ? undefined : input.pins?.[sessionId]?.[upstream]
  if (typeof account === 'string' && account.length > 0) headers['X-Magpie-Account'] = utf8Header(account)
  return headers
}

/** @param {unknown} value */
export function readPins(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return {}
  const sessions = /** @type {{ sessions?: unknown }} */ (value).sessions
  if (sessions === null || typeof sessions !== 'object' || Array.isArray(sessions)) return {}
  /** @type {Record<string, Record<string, string>>} */
  const out = {}
  for (const [sessionId, row] of Object.entries(sessions)) {
    if (!SESSION_ID.test(sessionId) || row === null || typeof row !== 'object' || Array.isArray(row)) continue
    /** @type {Record<string, string>} */
    const pins = {}
    for (const [upstream, account] of Object.entries(row)) {
      if (!UPSTREAM_ID.test(upstream) || !validAccount(account)) continue
      pins[upstream] = account
    }
    if (Object.keys(pins).length > 0) out[sessionId] = pins
  }
  return out
}

/** @param {unknown} account */
function validAccount(account) {
  return typeof account === 'string' && account.length > 0 && account.length <= ACCOUNT_MAX && !/[\u0000-\u001f]/.test(account)
}

/** @param {string} file */
export function loadPins(file) {
  try {
    return readPins(JSON.parse(readFileSync(file, 'utf8')))
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return {}
    throw error
  }
}

/**
 * @param {string} file
 * @param {Record<string, Record<string, string>>} pins
 */
export function savePins(file, pins) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 })
  const tmp = `${file}.${process.pid}.tmp`
  writeFileSync(tmp, `${JSON.stringify({ version: 1, sessions: pins })}\n`, { mode: 0o600 })
  renameSync(tmp, file)
}

/**
 * @param {Record<string, Record<string, string>>} pins
 * @param {string} sessionId
 * @param {string} upstream
 * @param {string | null} account
 */
export function assignPin(pins, sessionId, upstream, account) {
  if (!SESSION_ID.test(sessionId)) throw new Error('invalid-session')
  if (!UPSTREAM_ID.test(upstream)) throw new Error('invalid-upstream')
  const next = { ...pins, [sessionId]: { ...(pins[sessionId] ?? {}) } }
  if (account === null || account === '') delete next[sessionId][upstream]
  else if (!validAccount(account)) throw new Error('invalid-account')
  else next[sessionId][upstream] = account
  if (Object.keys(next[sessionId]).length === 0) delete next[sessionId]
  return next
}

/**
 * Read only the magpie provider block from this home's settings.yaml.
 * The URL is the operator's configured gateway, never a literal in this file.
 * @param {string} text
 */
export function magpieTargetFromSettings(text) {
  const lines = String(text).split('\n')
  let baseIndent = null
  let baseURL = null
  let apiKeyEnv = null
  for (const line of lines) {
    if (baseIndent === null) {
      const head = /^(\s*)magpie:\s*$/.exec(line)
      if (!head) continue
      baseIndent = head[1].length
      continue
    }
    if (line.trim() === '') continue
    const indent = line.match(/^\s*/)[0].length
    if (indent <= baseIndent) break
    if (indent !== baseIndent + 2) continue
    const url = /^\s*baseURL:\s*(\S+)\s*$/.exec(line)
    if (url) baseURL = url[1]
    const env = /^\s*apiKeyEnv:\s*([A-Z0-9_]+)\s*$/.exec(line)
    if (env) apiKeyEnv = env[1]
  }
  if (baseURL === null) return null
  let parsed
  try { parsed = new URL(baseURL) } catch { return null }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
  if (parsed.username !== '' || parsed.password !== '') return null
  return { baseURL: parsed.toString().replace(/\/$/, ''), apiKeyEnv }
}

/**
 * @param {{ baseURL: string, apiKey?: string, model: string, timeoutMs?: number }} input
 * @returns {Promise<{ upstream: string, model: string, names: string[], error?: string }>}
 */
export function discoverAccounts(input) {
  const upstream = upstreamOf(input.model)
  if (upstream === null) return Promise.resolve({ upstream: '', model: input.model, names: [], error: 'invalid-model' })
  const url = new URL(`${input.baseURL.replace(/\/$/, '')}/chat/completions`)
  const body = JSON.stringify({
    model: input.model,
    max_tokens: 1,
    messages: [{ role: 'user', content: 'A' }],
  })
  const transport = url.protocol === 'https:' ? httpsRequest : httpRequest
  return new Promise(resolve => {
    const req = transport(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(body),
        'x-magpie-session': 'dsh-account-discover',
        'x-magpie-account': DISCOVER_HEADER,
        ...(input.apiKey ? { authorization: `Bearer ${input.apiKey}` } : {}),
      },
      timeout: input.timeoutMs ?? 8000,
    }, res => {
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8')
        let message = text
        try { message = JSON.parse(text)?.error?.message ?? text } catch { /* keep text */ }
        const names = parseAccountList(message)
        if (names) resolve({ upstream, model: input.model, names })
        else resolve({ upstream, model: input.model, names: [], error: `discover-${res.statusCode}` })
      })
    })
    req.on('timeout', () => { req.destroy(); resolve({ upstream, model: input.model, names: [], error: 'discover-timeout' }) })
    req.on('error', () => resolve({ upstream, model: input.model, names: [], error: 'discover-failed' }))
    req.end(body)
  })
}
