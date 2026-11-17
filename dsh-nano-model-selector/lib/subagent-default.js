/**
 * Default route for a newly created subagent that did not name its own model.
 *
 * The file is the only writable copy. `agent/created` reads it and, when the
 * child still carries the parent route, records that combination with
 * `agent.model.select` before the first step. An explicit provider/model on
 * the delegation is left alone. Compaction summaries do not read this file.
 */

import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const SCHEMA = 1

/** @param {string} reason */
function fail(reason) {
  return { ok: false, reason }
}

/**
 * @param {unknown} value
 * @returns {{ok:true, policy:object|null}|{ok:false, reason:string}}
 */
export function parsePolicy(value) {
  if (value === null) return { ok: true, policy: null }
  if (typeof value !== 'object') return fail('policy must be an object')
  if (value.schema !== SCHEMA) return fail(`unknown schema ${JSON.stringify(value.schema)}`)
  const allowed = new Set(['schema', 'enabled', 'provider', 'model', 'reasoningEffort'])
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) return fail(`unknown field ${key}`)
  }
  if (typeof value.enabled !== 'boolean') return fail('enabled must be a boolean')
  const provider = value.provider
  const model = value.model
  const hasProvider = typeof provider === 'string' && provider.length > 0
  const hasModel = typeof model === 'string' && model.length > 0
  if (hasProvider !== hasModel) return fail('provider and model must be set together')
  if (value.enabled && !hasProvider) return fail('enabled policy requires provider and model')
  if ('reasoningEffort' in value && value.reasoningEffort !== undefined) {
    if (typeof value.reasoningEffort !== 'string' || value.reasoningEffort.length === 0) {
      return fail('reasoningEffort must be a non-empty string')
    }
    if (!hasProvider) return fail('reasoningEffort requires provider and model')
  }
  return {
    ok: true,
    policy: {
      schema: SCHEMA,
      enabled: value.enabled,
      ...(hasProvider ? { provider, model } : {}),
      ...(typeof value.reasoningEffort === 'string' ? { reasoningEffort: value.reasoningEffort } : {}),
    },
  }
}

/** @param {string} text */
export function deserializePolicy(text) {
  if (text.trim() === '') return { ok: true, policy: null }
  try {
    return parsePolicy(JSON.parse(text))
  } catch {
    return fail('invalid JSON')
  }
}

/**
 * @param {string} path
 * @returns {{ok:true, policy:object|null}|{ok:false, reason:string}}
 */
export function readPolicy(path) {
  try {
    return deserializePolicy(readFileSync(path, 'utf8'))
  } catch (error) {
    if (error?.code === 'ENOENT') return { ok: true, policy: null }
    return fail(error instanceof Error ? error.message : String(error))
  }
}

/** @param {object} policy */
export function serializePolicy(policy) {
  return `${JSON.stringify({
    schema: SCHEMA,
    enabled: policy.enabled,
    ...(policy.provider ? { provider: policy.provider, model: policy.model } : {}),
    ...(policy.reasoningEffort ? { reasoningEffort: policy.reasoningEffort } : {}),
  })}\n`
}

/**
 * @param {string} path
 * @param {object} policy
 * @returns {{ok:true}|{ok:false, reason:string}}
 */
export function writePolicy(path, policy) {
  const parsed = parsePolicy({ schema: SCHEMA, ...policy })
  if (!parsed.ok) return parsed
  if (existsSync(path)) {
    const prior = readPolicy(path)
    if (!prior.ok) return fail('refusing to overwrite a file that is not schema 1')
  }
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`
  try {
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(tmp, serializePolicy(parsed.policy), { mode: 0o600 })
    renameSync(tmp, path)
    return { ok: true }
  } catch (error) {
    try { if (existsSync(tmp)) unlinkSync(tmp) } catch { /* the failed temp is not the authority */ }
    return fail(error instanceof Error ? error.message : String(error))
  }
}

/** @param {string} path */
export function resetPolicy(path) {
  try {
    if (existsSync(path)) unlinkSync(path)
    return { ok: true }
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error))
  }
}

/**
 * Route carried by a live agent: the latest request header, else creation options.
 * @param {object|undefined} agent
 */
export function routeOfAgent(agent) {
  if (agent === undefined || agent === null) return undefined
  let header
  try { header = agent.session?.requestHeader()?.config } catch { header = undefined }
  const options = agent.options ?? {}
  const provider = typeof header?.provider === 'string' && header.provider.length > 0
    ? header.provider
    : options.provider
  const model = typeof header?.model === 'string' && header.model.length > 0
    ? header.model
    : options.model
  if (typeof provider !== 'string' || provider.length === 0) return undefined
  if (typeof model !== 'string' || model.length === 0) return undefined
  const effort = header?.reasoningEffort ?? options.reasoningEffort
  return {
    provider,
    model,
    ...(typeof effort === 'string' && effort.length > 0 ? { reasoningEffort: effort } : {}),
  }
}

/** @param {object|undefined} left @param {object|undefined} right */
export function sameRoute(left, right) {
  if (left === undefined || right === undefined) return false
  return left.provider === right.provider
    && left.model === right.model
    && (left.reasoningEffort ?? undefined) === (right.reasoningEffort ?? undefined)
}

/**
 * Apply only when the child was created on the parent's route.
 * A different provider, model, or effort is an explicit delegation choice.
 * @param {object|null|undefined} policy
 * @param {object|undefined} child
 * @param {object|undefined} parent
 */
export function shouldApplyDefault(policy, child, parent) {
  if (policy?.enabled !== true) return false
  if (typeof policy.provider !== 'string' || typeof policy.model !== 'string') return false
  if (!sameRoute(child, parent)) return false
  return true
}

/**
 * Selection passed to `agent.model.select`. Effort is omitted when unset so the
 * adapter default materializes.
 * @param {object} policy
 */
export function selectionOf(policy) {
  return {
    provider: policy.provider,
    model: policy.model,
    ...(policy.reasoningEffort ? { reasoningEffort: policy.reasoningEffort } : {}),
  }
}
