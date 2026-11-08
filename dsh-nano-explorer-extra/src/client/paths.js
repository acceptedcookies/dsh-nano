/** Workspace path helpers shared by the client modules. */

/**
 * Compose an absolute path from a root and an absolute-or-relative request, without touching the filesystem.
 * @param root - workspace root path.
 * @param path - absolute or root-relative request.
 * @returns the absolute path, separators normalized to `/`.
 */
export function absoluteOf(root, path) {
  const base = trimSlash(root)
  const value = String(path ?? '').replace(/\\/gu, '/')
  if (value === '') return base
  if (value.startsWith('/') || /^[A-Za-z]:\//u.test(value)) return trimSlash(value)
  return `${base === '/' ? '' : base}/${value}`.replace(/\/{2,}/gu, '/')
}

/**
 * The key the tree Factory uses for one path: its absolute path without trailing separators.
 * @param root - workspace root path.
 * @param path - absolute or root-relative path.
 * @returns the tree key.
 */
export function treeKeyOf(root, path) {
  return trimSlash(absoluteOf(root, path))
}

/**
 * Report whether a path is the root or lies below it, by lexical prefix only.
 * @param root - workspace root path.
 * @param candidate - absolute candidate path.
 * @returns true when the candidate is inside the root.
 */
export function isInside(root, candidate) {
  const base = trimSlash(root)
  const target = trimSlash(candidate)
  if (base === target) return true
  return target.startsWith(base === '/' ? '/' : `${base}/`)
}

/**
 * The path relative to the root, with `/` separators even on Windows.
 * @param root - workspace root path.
 * @param absolute - absolute path inside the root.
 * @returns the relative path, or the original when it lies outside.
 */
export function relativeTo(root, absolute) {
  const base = trimSlash(root)
  const target = trimSlash(absolute)
  if (target === base) return ''
  return isInside(base, target) ? target.slice(base === '/' ? 1 : base.length + 1) : target
}

/**
 * The parent directory of an absolute path.
 * @param absolute - absolute path.
 * @returns the parent path.
 */
export function parentOf(absolute) {
  const trimmed = trimSlash(absolute)
  const cut = trimmed.lastIndexOf('/')
  return cut <= 0 ? '/' : trimmed.slice(0, cut)
}

/**
 * The final segment of a path.
 * @param absolute - absolute path.
 * @returns the basename.
 */
export function basenameOf(absolute) {
  const trimmed = trimSlash(absolute)
  const cut = trimmed.lastIndexOf('/')
  return cut === -1 ? trimmed : trimmed.slice(cut + 1)
}

/** @param {string} path */
function trimSlash(path) {
  const normalized = String(path ?? '').replace(/\\/gu, '/')
  const trimmed = normalized.replace(/\/+$/u, '')
  if (trimmed === '') return normalized.startsWith('/') ? '/' : ''
  return trimmed
}
