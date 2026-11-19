/** Pure relative-time formatting — no host imports, so the copy mapping is
 *  unit-testable. Bucketing itself is the host's (`relativeTime`), never
 *  re-derived here. */

/** Host `RelativeTimeUnit` → copy key. `now` is rendered without a number. */
export const UNIT_KEY = {
  minutes: 'time.minutes',
  hours: 'time.hours',
  days: 'time.days',
  months: 'time.months',
  years: 'time.years',
}

/**
 * @param {{unit: string, n: number}} bucket - host `relativeTime()` result.
 * @param {(key: string) => string} t - locale lookup.
 * @returns {string} '' for an unknown bucket.
 */
export function formatRelative(bucket, t) {
  if (bucket === null || typeof bucket !== 'object') return ''
  if (bucket.unit === 'now') return t('time.now')
  const key = UNIT_KEY[bucket.unit]
  if (key === undefined) return ''
  return t(key).replace('{n}', String(bucket.n))
}

/**
 * @param {number|undefined} at - epoch ms; '' when the row is undated.
 * @param {number} now - epoch ms.
 * @param {(key: string) => string} t - locale lookup.
 * @param {(at: number, now: number) => {unit: string, n: number}} [buckets] - host `relativeTime`.
 * @returns {string} compact label.
 */
export function relTime(at, now, t, buckets) {
  if (typeof at !== 'number' || !Number.isFinite(at) || at <= 0) return ''
  if (typeof buckets !== 'function') return ''
  return formatRelative(buckets(at, now), t)
}
