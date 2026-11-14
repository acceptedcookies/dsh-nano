/**
 * DNMS01 async-compaction policy engine — pure functions, zero host imports.
 * Frozen contract: T-O-DNMS01-15 (7-field schema, master order, reject law),
 * T-O-DNMS01-11 (async-compact.json is the sole writable authority),
 * T-O-DNMS01-18⑤ (state-read failure -> safety-only degraded).
 *
 * Fields: { schema:1, model:{provider,model}, bufferSizeAsync,
 *           healthTargetAsync, bufferSizeSafety, pinnedAsyncTokens,
 *           pinnedFullTokens }.
 * Constants: S=0.80 (read-only; PUT carrying it -> 400), B floor 0.25,
 * effectivePin = min(pinned, floor(0.15*W)), fill = totalTokens/W (single
 * formula, nominal window the only denominator).
 * Master order: effectivePin/W < H < B < S < 1, B in [0.25,S).
 * DC-1 (effectivePin/W >= H) -> fullOnly marker; DC-2 (H>=B) / DC-3 (B>=S) ->
 * reject. Every violation: 400 + no write, no silent clamp, no audit file.
 */

import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs'
import { dirname } from 'node:path'

export const POLICY_SCHEMA = 1
export const SAFETY_RATIO = 0.80
export const BUFFER_FLOOR = 0.25
export const PIN_FRACTION = 0.15

export const DEFAULT_POLICY = Object.freeze({
  schema: POLICY_SCHEMA,
  model: Object.freeze({ provider: '', model: '' }),
  bufferSizeAsync: 0.65,
  healthTargetAsync: 0.50,
  bufferSizeSafety: SAFETY_RATIO,
  pinnedAsyncTokens: 100000,
  pinnedFullTokens: 20000,
})

/** Fields a PUT body may carry; `schema`, `bufferSizeSafety` are read-only. */
export const PUT_WRITABLE = Object.freeze([
  'model',
  'bufferSizeAsync',
  'healthTargetAsync',
  'pinnedAsyncTokens',
  'pinnedFullTokens',
])

const ok = extra => ({ ok: true, ...extra })
const fail = (code, reason) => ({ ok: false, code, reason })

const isFiniteNumber = v => typeof v === 'number' && Number.isFinite(v)
const isNonNegativeInt = v => Number.isSafeInteger(v) && v >= 0
const isModel = m => m !== null && typeof m === 'object'
  && typeof m.provider === 'string' && typeof m.model === 'string'

/**
 * Single fill formula (-15): fill = totalTokens / W. No second formula, no
 * second denominator.
 */
export function fill(totalTokens, W) {
  return totalTokens / W
}

/**
 * Master-order validation (-15/-13).
 * @param policy - schema-shaped policy object.
 * @param W - nominal context window (ctx.llm.resolveModelInfo(...).context.contextWindow).
 * @returns `{ok:true, effectivePin, windowMin, dcs, fullOnly}` or `{ok:false, code:'invalid-range', reason}`.
 */
export function validateMasterOrder(policy, W) {
  const B = policy.bufferSizeAsync
  const H = policy.healthTargetAsync
  const S = policy.bufferSizeSafety
  if (!isFiniteNumber(W) || W <= 0) return fail('invalid-range', `context window ${W} is not a positive number`)
  if (!isFiniteNumber(B) || !isFiniteNumber(H) || !isFiniteNumber(S)) {
    return fail('invalid-range', 'bufferSizeAsync/healthTargetAsync/bufferSizeSafety must be finite numbers')
  }
  if (S !== SAFETY_RATIO) return fail('invalid-range', `bufferSizeSafety is read-only at ${SAFETY_RATIO}`)
  if (!(B < S)) return fail('invalid-range', `DC-3: bufferSizeAsync ${B} >= bufferSizeSafety ${S}`)
  if (B < BUFFER_FLOOR) return fail('invalid-range', `bufferSizeAsync ${B} below write floor ${BUFFER_FLOOR}`)
  if (!(H < B)) return fail('invalid-range', `DC-2: healthTargetAsync ${H} >= bufferSizeAsync ${B}`)
  if (!(H > 0)) return fail('invalid-range', `healthTargetAsync ${H} must be positive`)
  if (!(S < 1)) return fail('invalid-range', `bufferSizeSafety ${S} must be below 1`)
  if (!isNonNegativeInt(policy.pinnedAsyncTokens) || !isNonNegativeInt(policy.pinnedFullTokens)) {
    return fail('invalid-range', 'pinnedAsyncTokens/pinnedFullTokens must be non-negative integers')
  }
  const effectivePin = Math.min(policy.pinnedAsyncTokens, Math.floor(PIN_FRACTION * W))
  const pinRatio = effectivePin / W
  const windowMin = policy.pinnedAsyncTokens / H
  if (pinRatio >= H) {
    // DC-1: the pin cannot fit under the health target at this window; legal
    // full-only configuration, not a write rejection (-13).
    return ok({ effectivePin, windowMin, dcs: ['DC-1'], fullOnly: true })
  }
  return ok({ effectivePin, windowMin, dcs: [], fullOnly: false })
}

/**
 * Shape check for the 7-field schema. `enabled` is ignored, never stored
 * (AMEND-1 / R-7). Unknown extra keys are rejected.
 */
export function validatePolicyShape(value) {
  if (value === null || typeof value !== 'object') return fail('invalid-schema', 'policy must be an object')
  if (value.schema !== POLICY_SCHEMA) return fail('invalid-schema', `unknown schema ${JSON.stringify(value.schema)}`)
  const allowed = new Set(['schema', 'model', 'bufferSizeAsync', 'healthTargetAsync', 'bufferSizeSafety', 'pinnedAsyncTokens', 'pinnedFullTokens', 'enabled'])
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) return fail('invalid-schema', `unknown field ${key}`)
  }
  if (!isModel(value.model)) return fail('invalid-schema', 'model must be {provider:string,model:string}')
  if (!isFiniteNumber(value.bufferSizeAsync)) return fail('invalid-schema', 'bufferSizeAsync must be a number')
  if (!isFiniteNumber(value.healthTargetAsync)) return fail('invalid-schema', 'healthTargetAsync must be a number')
  if (!isFiniteNumber(value.bufferSizeSafety)) return fail('invalid-schema', 'bufferSizeSafety must be a number')
  if (!isNonNegativeInt(value.pinnedAsyncTokens)) return fail('invalid-schema', 'pinnedAsyncTokens must be a non-negative integer')
  if (!isNonNegativeInt(value.pinnedFullTokens)) return fail('invalid-schema', 'pinnedFullTokens must be a non-negative integer')
  return ok({
    policy: {
      schema: POLICY_SCHEMA,
      model: { provider: value.model.provider, model: value.model.model },
      bufferSizeAsync: value.bufferSizeAsync,
      healthTargetAsync: value.healthTargetAsync,
      bufferSizeSafety: value.bufferSizeSafety,
      pinnedAsyncTokens: value.pinnedAsyncTokens,
      pinnedFullTokens: value.pinnedFullTokens,
    },
  })
}

/** Serialize a policy to the canonical on-disk form (schema:1, no enabled). */
export function serializePolicy(policy) {
  return JSON.stringify({
    schema: POLICY_SCHEMA,
    model: { provider: policy.model.provider, model: policy.model.model },
    bufferSizeAsync: policy.bufferSizeAsync,
    healthTargetAsync: policy.healthTargetAsync,
    bufferSizeSafety: policy.bufferSizeSafety,
    pinnedAsyncTokens: policy.pinnedAsyncTokens,
    pinnedFullTokens: policy.pinnedFullTokens,
  }, null, 2) + '\n'
}

/**
 * Parse + shape-validate a stored/PUT payload. Unknown schema is rejected with
 * no legacy-key fallback and no dual-read (-15).
 * @returns `{ok:true, policy}` or `{ok:false, code:'invalid-json-body'|'invalid-schema', reason}`.
 */
export function deserializePolicy(raw) {
  let value = raw
  if (typeof raw === 'string' || raw instanceof Uint8Array) {
    try {
      value = JSON.parse(raw.toString())
    } catch {
      return fail('invalid-json-body', 'payload is not valid JSON')
    }
  }
  return validatePolicyShape(value)
}

/**
 * Check a PUT body: only PUT_WRITABLE fields may appear; `schema` and
 * `bufferSizeSafety` are read-only and carrying them is 400 invalid-schema.
 */
export function validatePutBody(body) {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return fail('invalid-schema', 'PUT body must be an object')
  }
  for (const key of Object.keys(body)) {
    if (!PUT_WRITABLE.includes(key)) {
      return fail('invalid-schema', `field ${key} is read-only or unknown`)
    }
  }
  if ('bufferSizeAsync' in body && !isFiniteNumber(body.bufferSizeAsync)) {
    return fail('invalid-schema', 'bufferSizeAsync must be a number')
  }
  if ('healthTargetAsync' in body && !isFiniteNumber(body.healthTargetAsync)) {
    return fail('invalid-schema', 'healthTargetAsync must be a number')
  }
  if ('pinnedAsyncTokens' in body && !isNonNegativeInt(body.pinnedAsyncTokens)) {
    return fail('invalid-schema', 'pinnedAsyncTokens must be a non-negative integer')
  }
  if ('pinnedFullTokens' in body && !isNonNegativeInt(body.pinnedFullTokens)) {
    return fail('invalid-schema', 'pinnedFullTokens must be a non-negative integer')
  }
  if ('model' in body && !isModel(body.model)) {
    return fail('invalid-schema', 'model must be {provider:string,model:string}')
  }
  return ok({})
}

/** Merge a validated PUT body over a base policy (PUT is partial-update). */
export function mergePutBody(base, body) {
  return {
    schema: POLICY_SCHEMA,
    model: 'model' in body ? { provider: body.model.provider, model: body.model.model } : { ...base.model },
    bufferSizeAsync: 'bufferSizeAsync' in body ? body.bufferSizeAsync : base.bufferSizeAsync,
    healthTargetAsync: 'healthTargetAsync' in body ? body.healthTargetAsync : base.healthTargetAsync,
    bufferSizeSafety: SAFETY_RATIO,
    pinnedAsyncTokens: 'pinnedAsyncTokens' in body ? body.pinnedAsyncTokens : base.pinnedAsyncTokens,
    pinnedFullTokens: 'pinnedFullTokens' in body ? body.pinnedFullTokens : base.pinnedFullTokens,
  }
}

/**
 * Read the durable state file. Fail-closed (-18⑤): corrupt JSON, unknown
 * schema, or shape violations surface as state-read-failed and the caller
 * enters safety-only degraded mode; a missing file yields DEFAULT_POLICY in
 * memory only — nothing is written back.
 * @returns `{ok:true, policy, missing}` or `{ok:false, code:'state-read-failed', reason}`.
 */
export function readState(path) {
  let raw
  try {
    raw = readFileSync(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return ok({ policy: DEFAULT_POLICY, missing: true })
    return fail('state-read-failed', `read failed: ${error.message}`)
  }
  const parsed = deserializePolicy(raw)
  if (!parsed.ok) {
    return fail('state-read-failed', `${parsed.code}: ${parsed.reason}`)
  }
  return ok({ policy: parsed.policy, missing: false })
}

/**
 * Atomically replace the durable state file (tmp + renameSync). Never
 * produces anything but a schema:1 file, and refuses to overwrite an existing
 * file that does not itself deserialize as schema:1 (a corrupt/legacy file is
 * a separate artifact, not a draft we may clobber silently).
 * @returns `{ok:true}` or `{ok:false, code:'state-write-failed', reason}`.
 */
export function writeState(path, policy) {
  if (existsSync(path)) {
    const prior = deserializePolicy(safeRead(path))
    if (!prior.ok) {
      return fail('state-write-failed', 'refusing to overwrite a file that is not schema:1')
    }
  }
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(tmp, serializePolicy(policy), { mode: 0o600 })
    renameSync(tmp, path)
    return ok({})
  } catch (error) {
    try { if (existsSync(tmp)) renameSync(tmp, `${path}.tmp-stale`) } catch { /* best effort */ }
    return fail('state-write-failed', error.message)
  }
}

function safeRead(path) {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}
