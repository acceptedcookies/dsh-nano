/** Carrier credential store.
 *
 *  Profiles live in ${DSH_HOME}/nano-cloud-session.json (mode 0600). Secrets
 *  (the carrier API token) are write-only: every read path returns
 *  `hasSecret`, never the material. First boot seeds from process.env
 *  (`DEVIN_API_TOKEN` / `DEVIN_ORG_ID` / `DEVIN_API_BASE`) or
 *  `${DSH_HOME}/nano-cloud-session.env` — same shape as notepad's S3 store.
 *
 *  A profile = one carrier account: { id, label, carrier, orgId, baseUrl,
 *  secret }. `carrier` is 'devin' today; the shape leaves room for future
 *  carriers without a schema bump.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { randomBytes } from 'node:crypto'

const STORE_VERSION = 1
const STORE_FILE = 'nano-cloud-session.json'
const ENV_FILE = 'nano-cloud-session.env'

const DEFAULT_BASE_URL = 'https://api.devin.ai'

function home() { return process.env.DSH_HOME || process.env.HOME || '.' }
function storePath() { return join(home(), STORE_FILE) }
function envPath() { return join(home(), ENV_FILE) }
export { storePath, envPath }

/* ---- env seed ---- */

function readEnvFile(path) {
  const out = {}
  try {
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* absent env file is fine */ }
  return out
}

function seedFromEnv() {
  const file = readEnvFile(envPath())
  const pick = (key) => process.env[key] || file[key] || ''
  const token = pick('DEVIN_API_TOKEN')
  const orgId = pick('DEVIN_ORG_ID')
  const baseUrl = pick('DEVIN_API_BASE') || DEFAULT_BASE_URL
  if (!token) return { complete: false }
  return { complete: true, token, orgId, baseUrl }
}

/* ---- validation ---- */

function normalizeBaseUrl(value) {
  const raw = String(value ?? '').trim() || DEFAULT_BASE_URL
  let url
  try { url = new URL(raw) } catch { throw new Error('baseUrl must be a valid URL') }
  if (url.protocol !== 'https:') throw new Error('baseUrl must be https')
  url.pathname = url.pathname.replace(/\/+$/, '')
  url.search = ''
  url.hash = ''
  return (url.origin + url.pathname).replace(/\/+$/, '')
}

function normalizeProfile(input, { existing } = {}) {
  if (!input || typeof input !== 'object') throw new Error('profile must be an object')
  const label = String(input.label ?? '').trim()
  if (!label || label.length > 80) throw new Error('label is required (max 80 chars)')
  const orgId = String(input.orgId ?? '').trim()
  if (!/^org-[A-Za-z0-9-]*$/.test(orgId)) throw new Error('orgId must look like org-…')
  const profile = {
    id: existing?.id ?? (String(input.id ?? '').trim() || `dncs-${randomBytes(4).toString('hex')}`),
    label,
    carrier: 'devin',
    orgId,
    baseUrl: normalizeBaseUrl(input.baseUrl),
    secret: existing?.secret ?? '',
    createdAt: existing?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  }
  const secret = input.secret !== undefined ? String(input.secret) : null
  if (secret !== null && secret !== '') {
    if (!/^cog_[A-Za-z0-9_-]{8,}$/.test(secret)) {
      throw new Error('token must look like cog_… (Devin PAT or service user key)')
    }
    profile.secret = secret
  }
  if (!profile.secret) throw new Error('token is required')
  return profile
}

function publicProfile(p, activeId) {
  return {
    id: p.id, label: p.label, carrier: p.carrier, orgId: p.orgId,
    baseUrl: p.baseUrl, hasSecret: Boolean(p.secret),
    active: p.id === activeId, createdAt: p.createdAt, updatedAt: p.updatedAt,
  }
}

/* ---- store ---- */

function load() {
  if (!existsSync(storePath())) {
    return { version: STORE_VERSION, activeId: null, profiles: [] }
  }
  let data
  try { data = JSON.parse(readFileSync(storePath(), 'utf8')) }
  catch { throw new Error(`${STORE_FILE} is not valid JSON`) }
  if (!data || data.version !== STORE_VERSION || !Array.isArray(data.profiles)) {
    throw new Error(`${STORE_FILE} version/shape mismatch`)
  }
  return data
}

function save(data) {
  mkdirSync(dirname(storePath()), { recursive: true })
  const tmp = `${storePath()}.tmp-${process.pid}`
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
  renameSync(tmp, storePath())
}

export function createProfileStore() {
  let data = load()
  let seeded = false
  if (data.profiles.length === 0) {
    const seed = seedFromEnv()
    if (seed.complete) {
      const profile = normalizeProfile({ label: 'default (env)', orgId: seed.orgId, baseUrl: seed.baseUrl, secret: seed.token })
      data.profiles.push(profile)
      data.activeId = profile.id
      save(data)
      seeded = true
    }
  }

  return {
    seededFromEnv: seeded,
    list() { return data.profiles.map(p => publicProfile(p, data.activeId)) },
    active() { return data.profiles.find(p => p.id === data.activeId) ?? null },
    get(id) { return data.profiles.find(p => p.id === id) ?? null },
    saveProfile(input) {
      const existing = input?.id ? data.profiles.find(p => p.id === input.id) : null
      const profile = normalizeProfile(input, { existing })
      const duplicate = data.profiles.find(p => p.id === profile.id && p !== existing)
      if (duplicate) throw new Error('profile id already exists')
      if (existing) Object.assign(existing, profile)
      else data.profiles.push(profile)
      if (data.profiles.length === 1) data.activeId = profile.id
      save(data)
      return publicProfile(profile, data.activeId)
    },
    removeProfile(id) {
      const before = data.profiles.length
      data.profiles = data.profiles.filter(p => p.id !== id)
      if (data.profiles.length === before) throw new Error('profile not found')
      if (data.activeId === id) data.activeId = data.profiles[0]?.id ?? null
      save(data)
    },
    activate(id) {
      if (!data.profiles.find(p => p.id === id)) throw new Error('profile not found')
      data.activeId = id
      save(data)
    },
  }
}
