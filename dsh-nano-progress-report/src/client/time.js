/** Relative timestamps — the host's own bucketing (`relativeTime`), never a
 *  hand-rolled seconds/minutes ladder, so a Progress row and a session row
 *  date the same moment identically. Formatting lives in `time-format.js`
 *  (pure, unit-tested); this module only binds the host bucket function. */
import { relativeTime } from '@deepseek-ai/dsh-client-ui-primitives'
import { relTime as format } from './time-format.js'

/**
 * @param {number|undefined} at - epoch ms of the row.
 * @param {number} now - epoch ms (injected so rendering stays pure).
 * @param {(key: string) => string} t - locale lookup.
 * @returns {string} compact label ('now', '5m', '3h', '2d'), '' when undated.
 */
export function relTime(at, now, t) {
  return format(at, now, t, relativeTime)
}
