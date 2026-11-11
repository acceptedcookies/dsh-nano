/**
 * sanitizePolicy — pure decision function shared by the two renderers
 * (Phase 1 SKELETON: signature only; Phase 3 / P3-01 implements the rules).
 *
 * Intended contract (P3-01): a renderer walks a parsed node and calls
 * sanitizePolicy once per decision:
 *
 *   sanitizePolicy({ kind:'element',   name })            → 'keep'|'unwrap'|'drop'
 *   sanitizePolicy({ kind:'attr',      name, value, el }) → 'keep'|'drop'
 *   sanitizePolicy({ kind:'style-prop',name, value })     → 'keep'|'drop'
 *   sanitizePolicy({ kind:'url',       name, value, el }) → 'keep'|'drop'
 *
 * The function is PURE: no DOM, no IO, no state. Both the client
 * DOMParser renderer and the host regex renderer consume it so their
 * keep/drop sets stay identical (T-O-9).
 *
 * Until Phase 3 fills the policy tables, calling this stub throws — a
 * renderer wired early must never silently sanitize.
 */
import {
  ALLOWED_ELEMENTS,
  ALLOWED_ATTRS,
  ALLOWED_SCHEMES,
  ALLOWED_STYLE_PROPS,
  DROP_ELEMENTS,
  isDropAttr,
  isDropScheme,
} from './policy.js'

export function sanitizePolicy(/* { kind, name, value, el } */) {
  throw new Error(
    'dsh-html-policy: sanitizePolicy not implemented (Phase 3 / P3-01); ' +
    'tables are skeletons — wire renderers only after the allowlist is filled',
  )
}

export {
  ALLOWED_ELEMENTS,
  ALLOWED_ATTRS,
  ALLOWED_SCHEMES,
  ALLOWED_STYLE_PROPS,
  DROP_ELEMENTS,
  isDropAttr,
  isDropScheme,
}
