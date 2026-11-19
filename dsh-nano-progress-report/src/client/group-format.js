/** Pure copy helpers for turn-group headers. No host imports (unit-testable). */

const COUNT_ORDER = ['shell', 'file', 'web', 'tool', 'subagent', 'todo', 'wait', 'job', 'goal', 'lifecycle']

/**
 * Category counts as "12 shell · 4 file" (largest first, at most `max` kinds).
 * @param {Record<string, number>} byType
 * @param {(key: string) => string} t
 * @param {number} [max]
 * @returns {string}
 */
export function countsText(byType, t, max = 4) {
  const entries = Object.entries(byType ?? {})
    .filter(([type, n]) => n > 0 && COUNT_ORDER.includes(type))
    .sort((a, b) => (b[1] - a[1]) || (COUNT_ORDER.indexOf(a[0]) - COUNT_ORDER.indexOf(b[0])))
  return entries.slice(0, max)
    .map(([type, n]) => t(`count.${type}`).replace('{n}', String(n)))
    .join(' · ')
}

/**
 * Compact elapsed time for a closed turn ('' under one second).
 * @param {number} ms
 * @param {(key: string) => string} t
 * @returns {string}
 */
export function durationText(ms, t) {
  if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 1000) return ''
  const s = Math.round(ms / 1000)
  if (s < 60) return t('dur.s').replace('{n}', String(s))
  const m = Math.round(s / 60)
  if (m < 60) return t('dur.m').replace('{n}', String(m))
  return t('dur.h').replace('{n}', (m / 60).toFixed(1))
}

/**
 * Whether a group starts expanded: the latest turn, anything still in flight,
 * and anything waiting on the human. Everything else folds to its header.
 * @param {{status: string, awaiting: boolean}} group
 * @param {boolean} last
 * @returns {boolean}
 */
export function defaultOpen(group, last) {
  return last || group.status === 'open' || group.status === 'awaiting' || group.awaiting === true
}
