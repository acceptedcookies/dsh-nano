/** Browser-local viewing preferences. These never travel to the Host. */

const KEY = 'dsh-nano-explorer-extra:prefs.v1'

/** Every viewing switch the settings page edits, with the spec defaults. */
export const DEFAULT_PREFS = {
  openPreviewOnClick: false,
  openPreviewOnDoubleClick: true,
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
    return raw === null || raw === undefined ? { ...DEFAULT_PREFS } : normalizePrefs(JSON.parse(raw))
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
