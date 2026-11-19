/** Carrier credential store. Snapshots are immutable; configEpoch advances
 *  on save/remove (not activate) so that profile's WorkspaceScopes cannot keep using stale secrets. */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { randomBytes } from 'node:crypto'
import {
  decodeProfileSave, publicProfile as publicOf, DEFAULT_BASE_URL, ProfileCodecError, providerKeyOf,
} from '../providers/devin/profile-codec.js'

const STORE_VERSION = 1
const STORE_FILE = 'nano-cloud-session.json'
const ENV_FILE = 'nano-cloud-session.env'

function home() { return process.env.DSH_HOME || process.env.HOME || '.' }
function storePath() { return join(home(), STORE_FILE) }
function envPath() { return join(home(), ENV_FILE) }
export { storePath, envPath, DEFAULT_BASE_URL }

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

function load() {
  if (!existsSync(storePath())) {
    return { version: STORE_VERSION, activeId: null, profiles: [], configEpoch: 0, profileEpochs: {} }
  }
  let data
  try { data = JSON.parse(readFileSync(storePath(), 'utf8')) }
  catch { throw new Error(`${STORE_FILE} is not valid JSON`) }
  if (!data || data.version !== STORE_VERSION || !Array.isArray(data.profiles)) {
    throw new Error(`${STORE_FILE} version/shape mismatch`)
  }
  if (!Number.isInteger(data.configEpoch)) data.configEpoch = 0
  if (!data.profileEpochs || typeof data.profileEpochs !== 'object') data.profileEpochs = {}
  /* A stored profile of an unknown carrier is corrupt data, not a Devin
   * profile: refuse at load rather than route it to the wrong provider. */
  for (const profile of data.profiles) providerKeyOf(profile)
  return data
}

function save(data) {
  mkdirSync(dirname(storePath()), { recursive: true })
  const tmp = `${storePath()}.tmp-${process.pid}`
  writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 })
  renameSync(tmp, storePath())
}

export function createProfileStore({ onEpoch } = {}) {
  let data = load()
  let seeded = false
  data.profileEpochs = data.profileEpochs ?? {}
  const bump = (profileId) => {
    data.configEpoch = (data.configEpoch ?? 0) + 1
    if (profileId) data.profileEpochs[profileId] = data.configEpoch
    onEpoch?.(data.configEpoch, profileId)
  }

  if (data.profiles.length === 0) {
    const seed = seedFromEnv()
    if (seed.complete) {
      const profile = decodeProfileSave({ label: 'default (env)', orgId: seed.orgId, baseUrl: seed.baseUrl, secret: seed.token })
      profile.id = `dncs-${randomBytes(4).toString('hex')}`
      data.profiles.push(Object.freeze({ ...profile }))
      data.activeId = profile.id
      save(data)
      seeded = true
    }
  }

  return {
    seededFromEnv: seeded,
    configEpoch: () => data.configEpoch ?? 0,
    profileEpoch: (id) => data.profileEpochs?.[id] ?? 0,
    list() { return data.profiles.map(p => publicOf(p, data.activeId)) },
    active() { return data.profiles.find(p => p.id === data.activeId) ?? null },
    get(id) { return data.profiles.find(p => p.id === id) ?? null },
    saveProfile(input) {
      const existing = input?.id ? data.profiles.find(p => p.id === input.id) : null
      let profile
      try { profile = decodeProfileSave(input, { existing }) }
      catch (error) {
        if (error instanceof ProfileCodecError) throw error
        throw error
      }
      if (!profile.id) profile.id = `dncs-${randomBytes(4).toString('hex')}`
      const duplicate = data.profiles.find(p => p.id === profile.id && p !== existing)
      if (duplicate) throw new Error('profile id already exists')
      const frozen = Object.freeze({ ...profile })
      if (existing) {
        data.profiles = data.profiles.map(p => p === existing ? frozen : p)
      } else {
        data.profiles = [...data.profiles, frozen]
      }
      if (data.profiles.length === 1) data.activeId = frozen.id
      bump(frozen.id)
      save(data)
      return publicOf(frozen, data.activeId)
    },
    removeProfile(id) {
      const before = data.profiles.length
      data.profiles = data.profiles.filter(p => p.id !== id)
      if (data.profiles.length === before) throw new Error('profile not found')
      if (data.activeId === id) data.activeId = data.profiles[0]?.id ?? null
      bump(id)
      save(data)
    },
    activate(id) {
      if (!data.profiles.find(p => p.id === id)) throw new Error('profile not found')
      data.activeId = id
      save(data)
    },
  }
}
