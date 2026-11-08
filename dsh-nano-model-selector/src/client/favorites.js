/** Favorites are browser-local, like the model selector's own display preference. */

const KEY = 'dsh-nano-model-selector:favorites.v1'

/** @returns {string[]} */
export function readFavorites() {
  try {
    const raw = window.localStorage?.getItem(KEY)
    if (raw === null || raw === undefined) return []
    const value = JSON.parse(raw)
    return Array.isArray(value) ? [...new Set(value.filter(item => typeof item === 'string'))] : []
  } catch {
    return []
  }
}

/** @param {string[]} favorites */
export function writeFavorites(favorites) {
  try {
    window.localStorage?.setItem(KEY, JSON.stringify(favorites))
  } catch {
    // A browser that refuses storage keeps favorites for this page only.
  }
}
