/**
 * spike-claim.js — 复刻 dsh-nano-shared-workspace/src/host/session-io.js 的
 * acquireClaim/renewClaim 逻辑（搬语义不搬文件），作用于 run/artifact 级键。
 * 用途：V-18 验证 claim 原语可用于非 session 键 + 双写者竞态只一个 acquired:true。
 *
 * 边界实测登记：
 *  - SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/（packages/dsh-remote-data-schema/src/schema/v1.js:52）
 *  - `run-01HX…`/`kind-uuid` 形键直接放行；含 `/` 的键被拒 → artifact 键需扁平化
 */

const CLAIM_TTL_MS = 90_000
const CAS_ATTEMPTS = 4
const CLAIM_KEYS = new Set(['writerId', 'acquiredAt', 'expiresAt', 'heartbeatRev'])
const SESSION_ID_RE = /^[A-Za-z0-9_-]{1,128}$/

function validClaim(obj) {
  if (obj === null || typeof obj !== 'object') return false
  for (const key of Object.keys(obj)) if (!CLAIM_KEYS.has(key)) return false
  if (typeof obj.writerId !== 'string' || obj.writerId === '') return false
  if (typeof obj.acquiredAt !== 'string') return false
  if (typeof obj.expiresAt !== 'number' || !Number.isFinite(obj.expiresAt)) return false
  if (obj.heartbeatRev !== undefined && !Number.isInteger(obj.heartbeatRev)) return false
  return true
}

async function casPut(s3, key, value, etag) {
  return etag === undefined
    ? s3.putJson(key, value, { ifNoneMatch: '*' })
    : s3.putJson(key, value, { ifMatch: etag })
}

export async function acquireClaim(s3, key, writerId, heartbeatRev = 0) {
  if (!SESSION_ID_RE.test(key)) {
    return { acquired: false, reason: 'schema:badKey', key }
  }
  const claimKey = `claims/${key}.json`
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const got = await s3.getJson(claimKey, { withMeta: true }).catch(() => undefined)
    const existing = validClaim(got?.value) ? got.value : undefined
    const etag = got?.value === undefined ? undefined : got.etag
    const now = Date.now()
    if (existing !== undefined && existing.writerId !== writerId && existing.expiresAt > now) {
      return { acquired: false, holder: existing.writerId, heartbeatRev: existing.heartbeatRev ?? 0, key }
    }
    const claim = {
      writerId,
      acquiredAt: new Date(now).toISOString(),
      expiresAt: now + CLAIM_TTL_MS,
      heartbeatRev,
    }
    const put = await casPut(s3, claimKey, claim, etag)
    if (put?.conflict === true) continue
    return { acquired: true, heartbeatRev, expiresAt: claim.expiresAt, key }
  }
  return { acquired: false, holder: null, heartbeatRev, raced: true, key }
}

export async function renewClaim(s3, key, writerId) {
  if (!SESSION_ID_RE.test(key)) return { renewed: false, reason: 'schema:badKey', key }
  const claimKey = `claims/${key}.json`
  for (let attempt = 0; attempt < CAS_ATTEMPTS; attempt += 1) {
    const got = await s3.getJson(claimKey, { withMeta: true }).catch(() => undefined)
    const existing = validClaim(got?.value) ? got.value : undefined
    const now = Date.now()
    if (existing === undefined || existing.writerId !== writerId || !(existing.expiresAt > now)) {
      return { renewed: false, holder: existing?.writerId ?? null, expiresAt: existing?.expiresAt ?? null, key }
    }
    const expiresAt = now + CLAIM_TTL_MS
    const put = await casPut(s3, claimKey, {
      ...existing,
      expiresAt,
      heartbeatRev: (existing.heartbeatRev ?? 0) + 1,
    }, got.etag)
    if (put?.conflict === true) continue
    return { renewed: true, holder: writerId, expiresAt, key }
  }
  return { renewed: false, holder: writerId, expiresAt: null, raced: true, key }
}

export async function readClaim(s3, key) {
  const got = await s3.getJson(`claims/${key}.json`, { withMeta: true }).catch(() => undefined)
  return got === undefined ? undefined : { value: got.value, etag: got.etag }
}

export async function releaseClaim(s3, key) {
  await s3.del(`claims/${key}.json`)
}
