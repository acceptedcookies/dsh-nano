/** Browser-local viewing preferences. These never travel to the Host. */

// The key carries its version: v1 stored the opposite click default, and a stored v1 value would
// otherwise keep every existing reader on the old behaviour forever.
const KEY = 'dsh-nano-explorer-extra:prefs.v2'
const LEGACY_KEY = 'dsh-nano-explorer-extra:prefs.v1'

/** Every viewing switch the settings page edits, with the spec defaults. */
export const DEFAULT_PREFS = {
  // A single press opens, matching the builtin explorer: the row is a file, and pressing a file is
  // how it is read. The double-click switch starts off so one press never opens two previews.
  openPreviewOnClick: true,
  openPreviewOnDoubleClick: false,
  showOpenButton: true,
  followSymlinks: true,
  allowOutsideWorkspace: false,
  showIgnoredBadge: false,
  showGitStatus: true,
  showStatusBar: true,
  statsExcludeGit: true,
}

/** @param {unknown} value */
function record(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Coerce stored JSON into the preference shape, falling back per field.
 * @param {unknown} raw - parsed storage value.
 * @returns a complete preference object.
 */
export function normalizePrefs(raw) {
  const source = record(raw) ? raw : {}
  const result = {}
  for (const [key, fallback] of Object.entries(DEFAULT_PREFS)) {
    result[key] = typeof source[key] === 'boolean' ? source[key] : fallback
  }
  return result
}

/** @returns the stored preferences, or the defaults when storage is unreadable. */
export function readPrefs() {
  try {
    const raw = window.localStorage?.getItem(KEY)
    if (raw !== null && raw !== undefined) return normalizePrefs(JSON.parse(raw))
    // Carry a v1 record forward for everything except the click switches: v1 meant "a press only
    // selects", which is no longer the shipped behaviour, so those two start from the new defaults.
    const legacy = window.localStorage?.getItem(LEGACY_KEY)
    if (legacy === null || legacy === undefined) return { ...DEFAULT_PREFS }
    const parsed = JSON.parse(legacy)
    const carried = record(parsed) ? { ...parsed } : {}
    delete carried.openPreviewOnClick
    delete carried.openPreviewOnDoubleClick
    return normalizePrefs(carried)
  } catch {
    return { ...DEFAULT_PREFS }
  }
}

/**
 * Persist preferences; a browser that refuses storage keeps them for this page only.
 * @param {Record<string, boolean>} prefs - complete preference object.
 */
export function writePrefs(prefs) {
  try {
    window.localStorage?.setItem(KEY, JSON.stringify(prefs))
  } catch {
    // Storage refused: the in-memory copy still drives this page.
  }
}
