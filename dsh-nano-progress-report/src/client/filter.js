/** Filter-bar query parsing and row matching. Pure functions. */
import { STATUSES, TYPES } from './constants.js'

const TYPE_SET = new Set(TYPES)
const STATUS_SET = new Set(STATUSES)

/**
 * @typedef {object} ProgressFilter
 * @property {string} text           lowercase free-text needle ('' = none)
 * @property {Set<string>} types     included types (empty = all)
 * @property {Set<string>} notTypes  excluded types
 * @property {Set<string>} statuses  included statuses (empty = all)
 * @property {Set<string>} notStatuses excluded statuses
 * @property {string|null} tool      exact tool name, or null
 * @property {string|null} notTool   excluded exact tool name (`-tool:x`), or null
 */

export const EMPTY_FILTER = Object.freeze({
  text: '', types: Object.freeze(new Set()), notTypes: Object.freeze(new Set()),
  statuses: Object.freeze(new Set()), notStatuses: Object.freeze(new Set()),
  tool: null, notTool: null,
})

/**
 * Parse a query like `type:shell -status:failed fix login`.
 * Unknown tokens (type:bogus, key:x) degrade to free text.
 * @param {string} query
 * @returns {ProgressFilter}
 */
export function parseFilter(query) {
  const types = new Set()
  const notTypes = new Set()
  const statuses = new Set()
  const notStatuses = new Set()
  let tool = null
  let notTool = null
  const words = []
  for (const raw of String(query ?? '').split(/\s+/)) {
    if (raw === '') continue
    const neg = raw.startsWith('-')
    const body = neg ? raw.slice(1) : raw
    const colon = body.indexOf(':')
    if (colon > 0) {
      const key = body.slice(0, colon).toLowerCase()
      const value = body.slice(colon + 1).toLowerCase()
      if (key === 'type' && TYPE_SET.has(value)) {
        (neg ? notTypes : types).add(value); continue
      }
      if (key === 'status' && STATUS_SET.has(value)) {
        (neg ? notStatuses : statuses).add(value); continue
      }
      if (key === 'tool' && value !== '') {
        if (neg) { notTool = value } else { tool = value }
        continue
      }
    }
    words.push(raw)
  }
  return {
    text: words.join(' ').toLowerCase(),
    types, notTypes, statuses, notStatuses, tool, notTool,
  }
}

/** Whether a parsed filter is a no-op (avoids pointless re-render churn). */
export function isEmptyFilter(f) {
  return f.text === '' && f.types.size === 0 && f.notTypes.size === 0
    && f.statuses.size === 0 && f.notStatuses.size === 0 && f.tool === null && f.notTool === null
}

/** Haystack text for free-text matching: summary + detail text + tool name. */
export function rowHaystack(row) {
  const parts = [row.summary, row.tool]
  const detail = row.detail
  if (detail !== undefined) {
    if (typeof detail.text === 'string') parts.push(detail.text)
    if (typeof detail.resultText === 'string') parts.push(detail.resultText)
    if (typeof detail.error === 'string') parts.push(detail.error)
    if (typeof detail.argsRaw === 'string') parts.push(detail.argsRaw)
  }
  return parts.join('\n').toLowerCase()
}

/**
 * Apply a parsed filter to rows. Returns the same array untouched when the
 * filter is empty (callers may skip on isEmptyFilter).
 * @param {readonly object[]} rows
 * @param {ProgressFilter} filter
 */
export function applyFilter(rows, filter) {
  return rows.filter(row => {
    if (filter.types.size > 0 && !filter.types.has(row.type)) return false
    if (filter.notTypes.has(row.type)) return false
    if (filter.statuses.size > 0 && !filter.statuses.has(row.status)) return false
    if (filter.notStatuses.has(row.status)) return false
    if (filter.tool !== null && row.tool.toLowerCase() !== filter.tool) return false
    if (filter.notTool !== null && row.tool.toLowerCase() === filter.notTool) return false
    if (filter.text !== '' && !rowHaystack(row).includes(filter.text)) return false
    return true
  })
}
