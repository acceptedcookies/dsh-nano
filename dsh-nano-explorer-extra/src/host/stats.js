/** Recursive workspace statistics over `ctx.fs`, bounded by depth and entry count. */

/**
 * Walk one workspace subtree and count files, directories, and bytes.
 *
 * The walk runs as a bounded pool of directory readers rather than a depth-first
 * recursion: `fs.resolve` and `listDir` are I/O, so a serial walk idles on every
 * directory while six in flight hide that latency entirely. The pool cap keeps
 * the provider queue shallow enough that other requests still interleave.
 * `setImmediate` yields keep the host event loop responsive between batches.
 *
 * Two pruning layers run before a child is counted:
 *
 * - `ignored`, when the caller supplied Git's own ignore listing, drops files and
 *   directories matched by the workspace's `.gitignore` rules. The measure is
 *   "project content", not `du`, so generated output that every clone
 *   reproduces does not dominate the number.
 * - `followSymlinks: false` treats every symbolic link as a leaf. `listDir`
 *   reports a symlinked child's *resolved* type and target, so following it
 *   would count content that lives outside the workspace — and a link cycle
 *   would count the same bytes repeatedly up to `maxDepth`.
 *
 * @param fs - the mounted filesystem provider.
 * @param root - workspace root path.
 * @param options - depth, entry, `.git`, ignore, and symlink policy.
 * @param signal - caller cancellation.
 * @returns the totals plus whether the walk stopped early.
 */
export async function statisticsOf(fs, root, options, signal) {
  const { maxDepth, maxEntries, excludeGit, ignored, followSymlinks } = options
  const totals = { files: 0, directories: 0, bytes: 0, truncated: false }
  let seen = 0
  let yielded = 0
  // The walk path is always the realpath'd target: `listDir` resolves each child's own target,
  // so comparing a child against `join(resolvedParent, name)` is what identifies a symlink —
  // a plain entry's resolved target equals exactly that, while a link's differs. The
  // workspace-relative `rel` rides along separately for ignore pruning.
  let seedPath = root
  try {
    seedPath = fs.processPath(await fs.resolve(root, { signal }))
  } catch { /* an unresolvable root fails the first listDir, which the walk already tolerates */ }
  const pending = [{ path: seedPath, rel: '', depth: 1 }]

  /** Yield to the event loop every 200 entries so the host keeps serving routes. */
  const maybeYield = async () => {
    yielded += 1
    if (yielded % 200 === 0) await new Promise(resolve => setImmediate(resolve))
  }

  /** Read one directory, tally its children, and queue the subdirectories. */
  const visit = async (item) => {
    const { path, depth } = item
    if (depth > maxDepth) {
      totals.truncated = true
      return
    }
    let children
    try {
      children = await fs.listDir(await fs.resolve(path, { signal }), signal)
    } catch {
      // An unreadable directory (permissions, a dangling link) contributes nothing and never fails the total.
      return
    }
    for (const child of children) {
      if (totals.truncated) return
      seen += 1
      if (seen > maxEntries) {
        totals.truncated = true
        return
      }
      await maybeYield()
      if (excludeGit && child.name === '.git') continue
      const rel = item.rel === '' ? child.name : `${item.rel}/${child.name}`
      if (ignored !== undefined && ignored.has(rel)) continue
      // `path` is the parent's resolved target, so a child whose own resolved target differs is a
      // symbolic link — detecting it costs no extra `lstat` per entry. Both sides are normalized to
      // `/` separators before comparing: `processPath` may keep `\` on Windows, and a separator-only
      // difference must not read as a link.
      const expected = joinPath(path, child.name).replace(/\\/gu, '/')
      const resolved = (child.target === undefined ? joinPath(path, child.name) : fs.processPath(child.target)).replace(/\\/gu, '/')
      const link = !followSymlinks && resolved !== expected
      if (child.type === 'directory') {
        if (link) {
          // The link itself is the workspace content; its target is not. It still counts as
          // one filesystem entry but contributes no bytes and no descendents.
          totals.files += 1
          continue
        }
        totals.directories += 1
        pending.push({ path: resolved, rel, depth: depth + 1 })
      } else if (child.type === 'file') {
        totals.files += 1
        // A symlinked file's `size` is the target's — content this workspace does not own.
        // The link itself is a name, not bytes.
        if (!link && typeof child.size === 'number') totals.bytes += child.size
      }
    }
  }

  // A fixed number of workers drains the shared pending list: each pop hands the
  // next unread directory to whichever worker finished first, so the pool width —
  // not the tree shape — decides how many provider calls overlap at once.
  const workers = Array.from({ length: 6 }, async () => {
    while (!totals.truncated) {
      signal?.throwIfAborted()
      const next = pending.pop()
      if (next === undefined) return
      await visit(next)
    }
  })
  await Promise.all(workers)
  return totals
}

/**
 * Join a directory and a child name with the platform-independent separator the provider prints.
 * @param parent - directory path.
 * @param name - child basename.
 * @returns the joined path.
 */
function joinPath(parent, name) {
  const trimmed = parent.replace(/[/\\]+$/u, '')
  return `${trimmed}/${name}`
}
