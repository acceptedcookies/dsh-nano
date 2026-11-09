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

/**
 * Split a pending-change list the way a source-control view does.
 *
 * A file that is partly staged appears in both the staged and unstaged groups, because the next
 * commit will take only the index side. Conflicts and untracked paths stay in their own groups.
 * @param files - status entries (`path`, `status`, and optional `staged` / `unstaged` letters).
 * @returns the four groups, in source-control order.
 */
export function partitionChanges(files) {
  const staged = []
  const unstaged = []
  const untracked = []
  const conflicts = []
  for (const file of files ?? []) {
    if (file?.status === 'U') {
      conflicts.push(file)
      continue
    }
    if (file?.status === '?') {
      untracked.push(file)
      continue
    }
    if (file?.staged) staged.push({ ...file, status: file.staged })
    if (file?.unstaged) unstaged.push({ ...file, status: file.unstaged })
    else if (!file?.staged) unstaged.push(file)
  }
  return { staged, unstaged, untracked, conflicts }
}

/**
 * Split a repository path into the name a row leads with and the directory that follows it.
 * @param path - a slash-separated path.
 * @returns the two halves; `dir` is empty at the repository root.
 */
export function splitPath(path) {
  const value = typeof path === 'string' ? path : ''
  const slash = Math.max(value.lastIndexOf('/'), value.lastIndexOf('\\'))
  if (slash <= 0) return { name: value, dir: '' }
  return { name: value.slice(slash + 1), dir: value.slice(0, slash) }
}

/**
 * Shorten a worktree path to the last two segments, so sibling checkouts stay distinguishable
 * without spending the row on an absolute prefix.
 * @param path - an absolute worktree path.
 * @returns the shortened path.
 */
export function shortenPath(path) {
  const parts = String(path ?? '').split(/[/\\]/u).filter(part => part !== '')
  if (parts.length <= 2) return parts.join('/')
  return `…/${parts.slice(-2).join('/')}`
}

/**
 * Bucket a unix timestamp into a relative age the copy can name.
 * @param unixSeconds - commit time.
 * @param nowMs - clock, injectable so a test does not depend on the wall time.
 * @returns `{ unit, value }` where `unit` is `now`, `minutes`, `hours`, `days`, `date`, or `unknown`.
 */
export function ageParts(unixSeconds, nowMs = Date.now()) {
  if (!Number.isFinite(unixSeconds) || unixSeconds <= 0) return { unit: 'unknown', value: '' }
  const minutes = Math.floor(Math.max(0, nowMs - unixSeconds * 1000) / 60000)
  if (minutes < 1) return { unit: 'now', value: 0 }
  if (minutes < 60) return { unit: 'minutes', value: minutes }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { unit: 'hours', value: hours }
  const days = Math.floor(hours / 24)
  if (days < 30) return { unit: 'days', value: days }
  const date = new Date(unixSeconds * 1000)
  const pad = number => String(number).padStart(2, '0')
  return { unit: 'date', value: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
}
