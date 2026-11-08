/** Pure formatting helpers with no dependencies, so they can be exercised outside the browser. */

/**
 * Render one byte count in the units the status bar uses.
 * @param bytes - total size.
 * @returns a compact human-readable size, one decimal at most.
 */
export function formatBytes(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = unit === 0 ? String(Math.round(value)) : value.toFixed(1).replace(/\.0$/u, '')
  return `${rounded} ${units[unit]}`
}

/**
 * Render the ahead/behind pair the branch row shows.
 * @param ahead - commits to push.
 * @param behind - commits to pull.
 * @returns the arrow pair, or an empty string when both are zero.
 */
export function formatAheadBehind(ahead, behind) {
  const parts = []
  if (Number.isFinite(ahead) && ahead > 0) parts.push(`↑${ahead}`)
  if (Number.isFinite(behind) && behind > 0) parts.push(`↓${behind}`)
  return parts.join(' ')
}

/**
 * Render the sync block the footer shows: the incoming count first, then the outgoing one.
 *
 * Both numbers always appear, including zero, so the reader can tell "nothing to pull" from
 * "no upstream configured" — the two look identical when a zero count is hidden.
 * @param ahead - local commits not yet pushed.
 * @param behind - remote commits not yet pulled.
 * @returns the text for the sync block.
 */
export function formatSync(ahead, behind) {
  const local = Number.isFinite(ahead) && ahead > 0 ? ahead : 0
  const remote = Number.isFinite(behind) && behind > 0 ? behind : 0
  return `${remote}↓ ${local}↑`
}
