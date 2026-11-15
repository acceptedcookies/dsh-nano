/**
 * FamilyDefinition — the minimal authoring record (CF1115 / P2-02 / T-O-17).
 *
 * One authoring record per contract family, from which the sanctioned
 * projections are derived from the SAME source (F17.4):
 *   - the web binding table (Q6 / P1-03 bindings)
 *   - the binding-carrying operation view (Q8 / P2-01 operations)
 *   - the toolset definition view (Q9 / P3-01)
 *   - the service declaration view (Q10 / P2-03)
 *
 * Frozen shape (truth:367-380):
 *   { contractId, authorityRefs,
 *     operations:{ operationId:{ input, output, failures, semanticsRef } },
 *     bindings:  { bindingId:{ operationIds, transport, codecs, dispatch? } },
 *     providers: { providerId:{ plugin, supports, constraintsRef } } }
 *   supports = [{ bindingId, operationIds, constraintsRef }]
 *
 * Boundary (F17.2/F17.5/F17.7): pure contracts — never captures ctx,
 * credentials, or a DB, never reads the repo or DSH_HOME. Not a universal IDL
 * or runtime registry. Identity is contractId × operationId/bindingId/
 * providerId — never inferred from path/tool-name/plugin-name or versions.
 * A `REVIEW`/absent/auto-false authority is NOT approval; an explicit approved
 * `false` is honoured. It migrates the author ONCE per family; old ledgers /
 * OpenRPC may remain derived artifacts but never act as a second author.
 */

export class FamilyError extends Error {
  constructor(reason, detail) {
    super(detail ? `family: ${reason} — ${detail}` : `family: ${reason}`)
    this.name = 'FamilyError'
    this.reason = reason
    this.detail = detail
  }
}

const isObj = (v) => v != null && typeof v === 'object' && !Array.isArray(v)
const req = (cond, reason, detail) => { if (!cond) throw new FamilyError(reason, detail) }

/**
 * Validate + freeze a FamilyDefinition. Returns the authoring record.
 * Rejects: missing contractId, empty operations/bindings/providers, a binding
 * referencing an undeclared operation, a provider support referencing an
 * undeclared binding/operation, and an unapproved authorityRefs entry.
 * @param {object} def - the authoring record.
 */
export function defineFamily(def) {
  req(isObj(def), 'bad-shape', 'FamilyDefinition must be an object')
  req(typeof def.contractId === 'string' && def.contractId !== '', 'missing-contractId')
  const authorityRefs = def.authorityRefs
  req(isObj(authorityRefs) || Array.isArray(authorityRefs), 'missing-authorityRefs')
  // An authority entry is approval only when it is an explicit approved value.
  // `REVIEW`/absent/auto-false is not approval and must fail the definition.
  for (const ref of Object.entries(isObj(authorityRefs) ? authorityRefs : {})) {
    const [name, verdict] = ref
    req(verdict === true || (isObj(verdict) && verdict.approved === true),
      'unapproved-authority', `authorityRefs.${name} is not an approved source`)
  }
  const operations = def.operations, bindings = def.bindings, providers = def.providers
  req(isObj(operations) && Object.keys(operations).length > 0, 'missing-operations')
  req(isObj(bindings) && Object.keys(bindings).length > 0, 'missing-bindings')
  req(isObj(providers) && Object.keys(providers).length > 0, 'missing-providers')

  for (const [opId, op] of Object.entries(operations)) {
    req(isObj(op), 'bad-operation', `operations.${opId}`)
    req(op.input !== undefined && op.output !== undefined, 'missing-io', `operations.${opId} needs input/output`)
  }
  for (const [bId, b] of Object.entries(bindings)) {
    req(isObj(b), 'bad-binding', `bindings.${bId}`)
    req(Array.isArray(b.operationIds) && b.operationIds.length > 0, 'missing-operationIds', `bindings.${bId}`)
    for (const opId of b.operationIds) {
      req(operations[opId] !== undefined, 'unknown-operation', `bindings.${bId} references undeclared operation ${opId}`)
    }
    // Multi-operation bindings need an explicit selector/cases that reject an
    // unknown dispatch value — never silently default to the first operation.
    if (b.operationIds.length > 1) {
      req(isObj(b.dispatch) && isObj(b.dispatch.cases), 'missing-dispatch',
        `bindings.${bId} has ${b.operationIds.length} operations but no dispatch.cases selector`)
    }
  }
  for (const [pId, p] of Object.entries(providers)) {
    req(isObj(p) && typeof p.plugin === 'string', 'bad-provider', `providers.${pId}`)
    req(Array.isArray(p.supports), 'missing-supports', `providers.${pId}`)
    for (const s of p.supports) {
      req(isObj(s) && typeof s.bindingId === 'string', 'bad-support', `providers.${pId}.supports`)
      req(bindings[s.bindingId] !== undefined, 'unknown-binding', `providers.${pId}.supports → ${s.bindingId}`)
      for (const opId of (s.operationIds ?? [])) {
        req(operations[opId] !== undefined, 'unknown-operation', `providers.${pId}.supports → ${opId}`)
      }
    }
  }
  return Object.freeze(def)
}

/**
 * Resolve which operation a binding dispatches to. Single-operation bindings
 * return their one operation. Multi-operation bindings require an explicit
 * `dispatch.cases` map keyed by the dispatch value; an unlisted value is
 * rejected — never falls back to operationIds[0].
 * @param {object} def - validated FamilyDefinition.
 * @param {string} bindingId
 * @param {*} [dispatchValue] - the discriminator (required for multi-op).
 * @returns {string} the resolved operationId.
 */
export function selectOperation(def, bindingId, dispatchValue) {
  const b = def?.bindings?.[bindingId]
  req(b !== undefined, 'unknown-binding', bindingId)
  if (b.operationIds.length === 1) return b.operationIds[0]
  const cases = b.dispatch?.cases ?? {}
  const opId = cases[String(dispatchValue)]
  req(opId !== undefined && b.operationIds.includes(opId),
    'unknown-dispatch', `bindings.${bindingId} has no case for dispatch ${String(dispatchValue)}`)
  return opId
}

/**
 * Project the web binding table (Q6/P1-03 rows) for the bindings a provider
 * supports. Same source, stable association — every row keeps contractId +
 * bindingId + operationIds so a surface is never re-keyed by path/name.
 * @param {object} def - validated FamilyDefinition.
 * @param {string} providerId
 * @param {function} rowOf - (bindingId, binding) → the provider's row shape.
 */
export function projectWebTable(def, providerId, rowOf) {
  const p = def?.providers?.[providerId]
  req(p !== undefined, 'unknown-provider', providerId)
  return p.supports.map((s) => {
    const binding = def.bindings[s.bindingId]
    return Object.freeze({
      contractId: def.contractId,
      providerId,
      bindingId: s.bindingId,
      operationIds: s.operationIds ?? binding.operationIds,
      ...rowOf(s.bindingId, binding),
    })
  })
}

/**
 * Project the operation view (Q8/P2-01) for one binding: each bound operation
 * carries its codec + failures + source association.
 */
export function projectOperations(def, bindingId) {
  const b = def?.bindings?.[bindingId]
  req(b !== undefined, 'unknown-binding', bindingId)
  const codecs = b.codecs ?? {}
  return b.operationIds.map((opId) => Object.freeze({
    contractId: def.contractId,
    bindingId,
    operationId: opId,
    codec: codecs[opId],
    ...def.operations[opId],
  }))
}

/**
 * Project the service declaration view (Q10/P2-03): the provides contract for
 * one provider — which bindings/operations it actually serves.
 */
export function projectService(def, providerId) {
  const p = def?.providers?.[providerId]
  req(p !== undefined, 'unknown-provider', providerId)
  return Object.freeze({
    contractId: def.contractId,
    providerId,
    plugin: p.plugin,
    constraintsRef: p.constraintsRef,
    bindings: p.supports.map((s) => s.bindingId),
    operations: p.supports.flatMap((s) => s.operationIds ?? []),
  })
}
