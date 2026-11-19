/**
 * One-click policy presets for the async-compaction panel.
 *
 * The policy file is global (every session shares one B/H/pin), while the
 * right lines depend on the context window of the session model: a 262K
 * window has little room between the trigger and the 90% safety line, a 1M
 * window can start earlier and settle lower. A preset is nothing more than a
 * multi-field PUT; the host still validates the master order.
 */

/** Keeps the current turn's opening request intact when it falls inside the summarised span. */
export const PRESET_EXTRA_REQUIREMENTS = 'In Primary Request and Intent, copy the current-turn opening request verbatim in full; never truncate or use ellipses.'

/** Fields a preset writes, in the order the confirmation lists them. */
export const PRESET_FIELDS = Object.freeze([
  'bufferSizeAsync',
  'healthTargetAsync',
  'pinnedAsyncTokens',
  'pinnedFullTokens',
  'extraRequirements',
])

export const COMPACT_PRESETS = Object.freeze([
  Object.freeze({
    id: 'small',
    patch: Object.freeze({
      bufferSizeAsync: 0.70,
      healthTargetAsync: 0.45,
      pinnedAsyncTokens: 140000,
      pinnedFullTokens: 20000,
      extraRequirements: PRESET_EXTRA_REQUIREMENTS,
    }),
  }),
  Object.freeze({
    id: 'large',
    patch: Object.freeze({
      bufferSizeAsync: 0.60,
      healthTargetAsync: 0.30,
      pinnedAsyncTokens: 140000,
      pinnedFullTokens: 20000,
      extraRequirements: PRESET_EXTRA_REQUIREMENTS,
    }),
  }),
])

const sameValue = (field, a, b) => {
  if (field === 'extraRequirements') {
    return (typeof a === 'string' ? a.trim() : '') === (typeof b === 'string' ? b.trim() : '')
  }
  return typeof a === 'number' && typeof b === 'number' && Math.abs(a - b) < 1e-9
}

/**
 * Fields the preset would change, as `{field, from, to}` rows.
 * @param {object|null} policy - current policy face.
 * @param {{patch: object}} preset
 */
export function presetChanges(policy, preset) {
  const rows = []
  for (const field of PRESET_FIELDS) {
    const from = policy?.[field]
    const to = preset.patch[field]
    if (!sameValue(field, from, to)) rows.push({ field, from: from ?? null, to })
  }
  return rows
}

/** True when the policy already equals every field the preset writes. */
export function presetActive(policy, preset) {
  return policy !== null && policy !== undefined && presetChanges(policy, preset).length === 0
}
