/** Pure helpers for the filter dropdown: the query stays the single source of
 *  truth, the menu just toggles `type:` / `status:` tokens in it. */

/** Tokens the menu owns. Free text and other tokens are preserved untouched. */
const MENU_TOKEN = /^(type|status):[a-z-]+$/

/**
 * @param {string} query
 * @returns {string[]} active `type:`/`status:` tokens, in query order.
 */
export function activeMenuTokens(query) {
  return String(query ?? '').split(/\s+/).filter(token => MENU_TOKEN.test(token))
}

/**
 * Add or remove one token. Exact (case-insensitive) match; everything else in
 * the query survives, including free text and negated tokens.
 * @param {string} query
 * @param {string} token
 * @returns {string}
 */
export function toggleMenuToken(query, token) {
  const parts = String(query ?? '').split(/\s+/).filter(Boolean)
  const hit = parts.findIndex(part => part.toLowerCase() === token.toLowerCase())
  if (hit >= 0) parts.splice(hit, 1)
  else parts.push(token)
  return parts.join(' ')
}

/**
 * Count rows for the menu's right-hand numbers.
 * @param {readonly object[]} rows
 * @returns {{ types: Record<string, number>, statuses: Record<string, number> }}
 */
export function filterCounts(rows) {
  const types = {}
  const statuses = {}
  for (const row of rows ?? []) {
    if (typeof row?.type === 'string') types[row.type] = (types[row.type] ?? 0) + 1
    if (typeof row?.status === 'string') statuses[row.status] = (statuses[row.status] ?? 0) + 1
  }
  return { types, statuses }
}

/**
 * C0-05: menu offers only dimensions that currently exist. A token already in
 * the query stays visible even at zero so the user can see and uncheck it.
 * @param {readonly string[]} all - TYPES or STATUSES
 * @param {Record<string, number>} counts - counts.types or counts.statuses
 * @param {readonly string[]} selected - activeMenuTokens(query)
 * @param {'type'|'status'} axis
 */
export function visibleMenuOptions(all, counts, selected, axis) {
  return all.filter(value => (counts[value] ?? 0) > 0 || selected.includes(`${axis}:${value}`))
}
