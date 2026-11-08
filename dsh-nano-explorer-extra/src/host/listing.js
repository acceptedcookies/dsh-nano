/** Directory listing with explicit workspace-boundary and symlink policy. */

/**
 * List one directory, reporting whether the target itself resolves outside the workspace.
 *
 * `ctx.fs.resolve` realpaths its argument, so a symlink pointing outside the workspace
 * resolves to the outside target and `contains` reports the escape. This route therefore
 * cannot rely on `contains` for the decision: it compares the *requested* path against the
 * workspace root lexically, and reports the resolved target separately for the UI badge.
 *
 * @param fs - the mounted filesystem provider.
 * @param request - workspace root, requested path, and policy flags.
 * @param limits - entry cap.
 * @param signal - caller cancellation.
 * @returns entries with symlink and outside markers, or a typed refusal.
 */
export async function listDirectory(fs, request, limits, signal) {
  const { workspaceRoot, path, followSymlinks, allowOutsideWorkspace } = request
  const requested = absoluteOf(workspaceRoot, path)
  const lexicalInside = isLexicallyInside(workspaceRoot, requested)
  if (!lexicalInside && !allowOutsideWorkspace) {
    return {
      ok: false,
      code: 'outside-workspace',
      message: `"${path}" is outside the workspace`,
      path,
    }
  }
  if (!followSymlinks) {
    const link = await fs.lstat(requested, {}, signal).catch(() => undefined)
    if (link?.type === 'symlink') {
      return { ok: false, code: 'symlink-disabled', message: `"${path}" is a symbolic link and following is off`, path }
    }
  }
  let target
  try {
    target = await fs.resolve(requested, { signal })
  } catch (error) {
    return { ok: false, code: 'not-found', message: messageOf(error), path }
  }
  const resolved = fs.processPath(target)
  // A link inside the workspace can still resolve outside it. The lexical check above only sees the
  // path the caller asked for, so the resolved target needs the same boundary test before any
  // listing happens; otherwise `allowOutsideWorkspace: false` would be bypassed by any symlink.
  const resolvedOutside = !isLexicallyInside(workspaceRoot, resolved)
  if (resolvedOutside && !allowOutsideWorkspace) {
    return {
      ok: false,
      code: 'outside-workspace',
      message: `"${path}" resolves outside the workspace`,
      path,
      outside: true,
    }
  }
  const info = await fs.stat(target, signal).catch(() => undefined)
  if (info === undefined) return { ok: false, code: 'not-found', message: `"${path}" does not exist`, path }
  if (info.type !== 'directory') {
    return { ok: false, code: 'not-directory', message: `"${path}" is not a directory`, path }
  }
  let children
  try {
    children = await fs.listDir(target, signal)
  } catch (error) {
    return { ok: false, code: 'unreadable', message: messageOf(error), path }
  }
  const capped = children.slice(0, limits.maxEntries)
  const entries = []
  for (const child of capped) {
    const childRequested = `${trimSlash(requested)}/${child.name}`
    const childInfo = await fs.lstat(childRequested, {}, signal).catch(() => undefined)
    const symlink = childInfo?.type === 'symlink'
    entries.push({
      name: child.name,
      type: child.type,
      ...(typeof child.size === 'number' ? { size: child.size } : {}),
      ...(symlink ? { symlink: true } : {}),
      // `listDir` returns the child's own resolved target, so the badge follows where the link points
      // rather than what its name suggests.
      ...(symlink && child.target !== undefined && !isLexicallyInside(workspaceRoot, fs.processPath(child.target)) ? { outside: true } : {}),
    })
  }
  return {
    ok: true,
    path,
    resolvedPath: resolved,
    outside: resolvedOutside,
    entries,
    truncated: children.length > limits.maxEntries,
  }
}

/** @param {unknown} error */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error)
}

/**
 * Resolve a requested path against a root without touching the filesystem, so the lexical check
 * runs before any realpath can follow a link out of the workspace.
 * @param root - workspace root.
 * @param path - absolute or root-relative request.
 * @returns the composed absolute path, separators normalized to `/`.
 */
export function absoluteOf(root, path) {
  const normalizedRoot = trimSlash(root)
  const normalizedPath = path.replace(/\\/gu, '/')
  if (normalizedPath === '') return normalizedRoot
  const composed = normalizedPath.startsWith('/') || /^[A-Za-z]:\//u.test(normalizedPath)
    ? trimSlash(normalizedPath)
    : `${normalizedRoot}/${normalizedPath}`.replace(/\/{2,}/gu, '/')
  // Collapse `.` and `..` segments so `isLexicallyInside` cannot be bypassed by a
  // request that names `root/../outside` — the lexical prefix check must see the
  // real destination, not a traversal that still starts with the root (review-01 R4).
  return foldSegments(composed)
}

/** @param {string} path */
function trimSlash(path) {
  const trimmed = path.replace(/\\/gu, '/').replace(/\/+$/u, '')
  return trimmed === '' ? '/' : trimmed
}

/**
 * Collapse `.` and `..` segments without touching the filesystem.
 *
 * A lexical prefix test alone accepted `/ws/../elsewhere` as living under `/ws`, because the string
 * still starts with the root. Folding the segments first is what makes that test mean what it says.
 * @param path - absolute path to normalize.
 * @returns the path with every `.` and `..` segment resolved.
 */
function foldSegments(path) {
  const absolute = path.startsWith('/')
  const out = []
  for (const segment of path.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') { out.pop(); continue }
    out.push(segment)
  }
  return `${absolute ? '/' : ''}${out.join('/')}`
}

/**
 * Report whether a path is the root or lies below it, by lexical prefix only.
 * @param root - workspace root.
 * @param candidate - absolute candidate path.
 * @returns true when the candidate is the root or one of its descendants.
 */
export function isLexicallyInside(root, candidate) {
  const base = foldSegments(trimSlash(root))
  const target = foldSegments(trimSlash(candidate))
  if (base === target) return true
  const separator = base === '/' ? '' : '/'
  return target.startsWith(`${base}${separator}`)
}
