/** Host-side S3 proxy engine for nano-notepad.
 *
 *  Bundled into lib/s3-sync-host.js because the plugin-development instance
 *  copies lib/ but not node_modules. Credentials never reach the browser: the
 *  client sends object operations and config actions to the host, which signs
 *  them with dsh-s3-client, applies the token-bucket limiter and records usage.
 *
 *  Multiple endpoints live in ${DSH_HOME}/nano-notepad-s3.json (mode 0600).
 *  On first boot the file is seeded from S3_NOTEPAD_* / nano-notepad.env, so an
 *  existing installation keeps working while the UI becomes fully editable.
 *
 *  Manifest structure, cursors and conflict handling live in the client. */
import { existsSync, readFileSync, writeFileSync, chmodSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { createS3Client } from 'dsh-s3-client/client'

const LIMITS = { rps: 10, burst: 20, kbps: 512, concurrency: 2 }
const STORE_VERSION = 1

function messageOf(value) { return value instanceof Error ? value.message : String(value) }

function parseEnvFile(text) {
  const out = {}
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const i = trimmed.indexOf('=')
    if (i < 0) continue
    out[trimmed.slice(0, i).trim()] = trimmed.slice(i + 1).trim()
  }
  return out
}

/** S3_NOTEPAD_* from process.env, falling back to ${DSH_HOME}/nano-notepad.env. */
export function loadS3Config() {
  let source = process.env
  let sourceName = 'process.env'
  if (!process.env.S3_NOTEPAD_ACCESS_KEY) {
    const file = process.env.DSH_NP_S3_ENV
      || join(process.env.DSH_HOME || process.env.HOME || '.', 'nano-notepad.env')
    if (existsSync(file)) {
      source = parseEnvFile(readFileSync(file, 'utf8'))
      sourceName = file
    }
  }
  const config = {
    endpoint: source.S3_NOTEPAD_ENDPOINT,
    region: source.S3_NOTEPAD_REGION || 'shv1',
    bucket: source.S3_NOTEPAD_BUCKET,
    accessKeyId: source.S3_NOTEPAD_ACCESS_KEY,
    secretAccessKey: source.S3_NOTEPAD_SECRET_KEY,
    prefix: source.S3_NOTEPAD_PREFIX || 'notepad/',
    pathStyle: source.S3_NOTEPAD_PATH_STYLE === undefined ? true : String(source.S3_NOTEPAD_PATH_STYLE) === 'true',
    source: sourceName,
  }
  config.complete = Boolean(config.endpoint && config.region && config.bucket && config.accessKeyId && config.secretAccessKey)
  return config
}

function home() { return process.env.DSH_HOME || process.env.HOME || '.' }

/** Normalise one profile; throws on malformed values. */
function normalizeProfile(input, existing) {
  const source = input && typeof input === 'object' ? input : {}
  const str = (key, fallback, max = 256) => {
    const value = source[key] === undefined ? fallback : String(source[key]).trim()
    if (value.length > max) throw new Error(`${key} is too long`)
    return value
  }
  const id = str('id', existing?.id || `p-${Date.now().toString(36)}`, 64)
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('id may only contain letters, digits, - and _')
  const endpoint = str('endpoint', existing?.endpoint)
  if (endpoint && !/^https?:\/\//i.test(endpoint)) throw new Error('endpoint must start with http:// or https://')
  const bucket = str('bucket', existing?.bucket)
  /* Secret is write-only: an empty value on an edit keeps the stored one. */
  const secret = source.secretAccessKey ? String(source.secretAccessKey) : (existing?.secretAccessKey ?? '')
  return {
    id,
    label: str('label', existing?.label || bucket || 'Endpoint', 80) || bucket || 'Endpoint',
    endpoint,
    region: str('region', existing?.region || 'us-east-1', 64) || 'us-east-1',
    bucket,
    prefix: str('prefix', existing?.prefix ?? '', 128),
    pathStyle: source.pathStyle === undefined ? (existing?.pathStyle ?? true) : Boolean(source.pathStyle),
    accessKeyId: str('accessKeyId', existing?.accessKeyId),
    secretAccessKey: secret,
    sessionToken: str('sessionToken', existing?.sessionToken ?? '', 2048),
  }
}

function publicProfile(profile, activeId) {
  return {
    id: profile.id,
    label: profile.label,
    endpoint: profile.endpoint,
    region: profile.region,
    bucket: profile.bucket,
    prefix: profile.prefix,
    pathStyle: profile.pathStyle,
    accessKeyId: profile.accessKeyId,
    hasSecret: Boolean(profile.secretAccessKey),
    active: profile.id === activeId,
  }
}

/** Persisted multi-endpoint store with atomic writes and switch rollback. */
export function createProfileStore() {
  const file = process.env.DSH_NP_S3_PROFILES || join(home(), 'nano-notepad-s3.json')
  let data
  try {
    data = JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    data = null
  }
  if (!data || data.version !== STORE_VERSION || !Array.isArray(data.profiles)) {
    const seed = loadS3Config()
    data = {
      version: STORE_VERSION,
      activeId: 'env-default',
      profiles: seed.complete ? [normalizeProfile({
        id: 'env-default', label: '默认端点',
        endpoint: seed.endpoint, region: seed.region, bucket: seed.bucket,
        prefix: seed.prefix, pathStyle: seed.pathStyle,
        accessKeyId: seed.accessKeyId, secretAccessKey: seed.secretAccessKey,
      })] : [],
      pending: null,
    }
    persist()
  }
  /* A switch interrupted by a crash/restart is never left half-committed. */
  if (data.pending) {
    data.activeId = data.pending.fromId
    data.pending = null
    persist()
  }

  function persist() {
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 })
    try { chmodSync(file, 0o600) } catch { /* best effort */ }
  }

  return {
    file,
    list() { return data.profiles.map(p => publicProfile(p, data.activeId)) },
    activeId() { return data.activeId },
    pending() { return data.pending },
    active() { return data.profiles.find(p => p.id === data.activeId) ?? null },
    get(id) { return data.profiles.find(p => p.id === id) ?? null },
    save(input) {
      const existing = input?.id ? data.profiles.find(p => p.id === input.id) : null
      const profile = normalizeProfile(input, existing)
      const duplicate = data.profiles.find(p => p.id === profile.id && p !== existing)
      if (duplicate) throw new Error('profile id already exists')
      if (existing) Object.assign(existing, profile)
      else data.profiles.push(profile)
      if (data.profiles.length === 1) data.activeId = profile.id
      persist()
      return publicProfile(profile, data.activeId)
    },
    remove(id) {
      if (id === data.activeId) throw new Error('cannot delete the active endpoint')
      const before = data.profiles.length
      data.profiles = data.profiles.filter(p => p.id !== id)
      if (data.profiles.length === before) throw new Error('endpoint not found')
      persist()
    },
    beginSwitch(targetId) {
      if (!this.get(targetId)) throw new Error('target endpoint not found')
      data.pending = { fromId: data.activeId, targetId, at: Date.now() }
      data.activeId = targetId
      persist()
      return data.pending
    },
    commitSwitch() { data.pending = null; persist() },
    abortSwitch() {
      if (data.pending) data.activeId = data.pending.fromId
      data.pending = null
      persist()
    },
  }
}

/** Build a signed client + counters for one profile. */
function buildEngine(profile, ledgerFile) {
  let client = null
  let lastError = null
  let lastSuccessAt = null
  const stats = { put: 0, get: 0, delete: 0, list: 0, head: 0, bytesUp: 0, bytesDown: 0 }
  const config = profile
  if (profile && profile.endpoint && profile.bucket && profile.accessKeyId && profile.secretAccessKey) {
    try {
      client = createS3Client({
        endpoint: profile.endpoint,
        region: profile.region,
        bucket: profile.bucket,
        prefix: profile.prefix,
        accessKeyId: profile.accessKeyId,
        secretAccessKey: profile.secretAccessKey,
        sessionToken: profile.sessionToken || undefined,
        pathStyle: profile.pathStyle,
        limits: LIMITS,
        ledgerFile,
      })
    } catch (error) { lastError = messageOf(error) }
  }
  function succeed() { lastSuccessAt = new Date().toISOString(); lastError = null }
  function fail(error) { lastError = messageOf(error); throw error }

  return {
    get ready() { return Boolean(client) },
    status() {
      return {
        ok: Boolean(client),
        config: config ? {
          id: config.id, label: config.label, endpoint: config.endpoint, region: config.region,
          bucket: config.bucket, prefix: config.prefix, pathStyle: config.pathStyle,
          hasSecret: Boolean(config.secretAccessKey),
        } : null,
        limits: client?.limiter.stats() ?? null,
        ledger: client?.ledger?.snapshot() ?? null,
        stats: { ...stats },
        lastError, lastSuccessAt,
      }
    },
    async test() {
      if (!client) return { ok: false, reason: 'not-configured' }
      try { const result = await client.test(); succeed(); return result }
      catch (error) { return { ok: false, reason: 'failed', message: fail(error) } }
    },
    async object({ op, key, under, bodyB64, contentType, ifMatch }) {
      if (!client) throw new Error('s3 client is not configured')
      if (op !== 'list' && (typeof key !== 'string' || key.length > 512 || key.includes('..'))) throw new Error('invalid object key')
      if (under && (typeof under !== 'string' || under.length > 512 || under.includes('..'))) throw new Error('invalid under prefix')
      try {
        switch (op) {
          case 'put': {
            if (typeof bodyB64 !== 'string') throw new Error('put requires bodyB64')
            const body = Buffer.from(bodyB64, 'base64')
            const out = await client.putObject(key, body, { contentType, ifMatch })
            stats.put += 1; stats.bytesUp += body.length
            succeed(); return out
          }
          case 'get': {
            const got = await client.getObject(key)
            stats.get += 1
            if (!got) { succeed(); return null }
            stats.bytesDown += got.body.byteLength
            succeed()
            return { bodyB64: Buffer.from(got.body).toString('base64'), etag: got.etag, contentType: got.contentType }
          }
          case 'head': { const head = await client.headObject(key); stats.head += 1; succeed(); return head }
          case 'delete': { await client.deleteObject(key); stats.delete += 1; succeed(); return { ok: true } }
          case 'list': {
            const out = await client.listObjects(under ? { under } : {})
            stats.list += 1
            if (!under) void client.ledger?.reconcile({
              objects: out.objects.length,
              bytes: out.objects.reduce((sum, item) => sum + item.bytes, 0),
            })
            succeed(); return out
          }
          default: throw new Error(`unknown s3 op: ${op}`)
        }
      } catch (error) { fail(error) }
    },
  }
}

/** Probe an endpoint without activating it: connectivity + manifest summary. */
async function probeProfile(profile) {
  if (!profile || !profile.endpoint || !profile.accessKeyId || !profile.secretAccessKey) {
    return { ok: false, reason: 'incomplete', message: 'endpoint / access key / secret are required' }
  }
  const probe = buildEngine(profile, undefined)
  try {
    const tested = await probe.test()
    if (!tested.ok) return { ok: false, reason: 'unreachable', message: tested.message || 'connectivity probe failed' }
    const got = await probe.object({ op: 'get', key: 'manifest.json' })
    let manifest = null
    if (got?.bodyB64) {
      try {
        const parsed = JSON.parse(Buffer.from(got.bodyB64, 'base64').toString('utf8'))
        manifest = {
          rev: parsed.rev ?? 0,
          updatedAt: parsed.updatedAt ?? null,
          files: Object.entries(parsed.files ?? {}).map(([id, entry]) => ({
            id, name: entry.name ?? '', sha256: entry.sha256 ?? '', bytes: entry.bytes ?? 0,
          })),
          images: Object.keys(parsed.images ?? {}).length,
        }
      } catch { manifest = { rev: 0, updatedAt: null, files: [], images: 0, corrupt: true } }
    }
    return { ok: true, latencyMs: tested.latencyMs, bucket: profile.bucket, manifest }
  } catch (error) {
    return { ok: false, reason: 'failed', message: messageOf(error) }
  }
}

export function createSyncEngine() {
  const store = createProfileStore()
  const ledgerFile = join(home(), 'nano-notepad-s3-ledger.json')
  let engine = buildEngine(store.active(), ledgerFile)

  function rebuild() { engine = buildEngine(store.active(), ledgerFile) }

  return {
    get ready() { return engine.ready },
    status() {
      return { ...engine.status(), activeId: store.activeId(), pending: store.pending(), profiles: store.list() }
    },
    test() { return engine.test() },
    object(body) { return engine.object(body) },

    /** All /s3/config actions. Secrets are write-only and never returned. */
    async config(payload) {
      const action = String(payload?.action ?? '')
      switch (action) {
        case 'list':
          return { ok: true, profiles: store.list(), activeId: store.activeId(), pending: store.pending() }
        case 'save': {
          const saved = store.save(payload.profile)
          if (saved.active) rebuild()
          return { ok: true, profile: saved, profiles: store.list(), activeId: store.activeId() }
        }
        case 'delete':
          store.remove(String(payload.id ?? ''))
          return { ok: true, profiles: store.list(), activeId: store.activeId() }
        case 'probe':
          return probeProfile(store.get(String(payload.id ?? '')))
        case 'testOne':
          return probeProfile(store.get(String(payload.id ?? '')))
        case 'beginSwitch': {
          const pending = store.beginSwitch(String(payload.id ?? ''))
          rebuild()
          return { ok: true, pending, activeId: store.activeId() }
        }
        case 'commitSwitch':
          store.commitSwitch()
          return { ok: true, activeId: store.activeId(), pending: null }
        case 'abortSwitch':
          store.abortSwitch()
          rebuild()
          return { ok: true, activeId: store.activeId(), pending: null }
        default:
          throw new Error(`unknown s3 config action: ${action}`)
      }
    },
  }
}
