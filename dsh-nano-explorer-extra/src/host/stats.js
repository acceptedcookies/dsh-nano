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
 * @param fs - the mounted filesystem provider.
 * @param root - workspace root path.
 * @param options - depth, entry, and `.git` policy.
 * @param signal - caller cancellation.
 * @returns the totals plus whether the walk stopped early.
 */
export async function statisticsOf(fs, root, options, signal) {
  const { maxDepth, maxEntries, excludeGit } = options
  const totals = { files: 0, directories: 0, bytes: 0, truncated: false }
  let seen = 0
  let yielded = 0
  /** One pending directory entry per pool slot; LIFO order keeps memory small. */
  const pending = [{ path: root, depth: 1 }]

  /** Yield to the event loop every 200 entries so the host keeps serving routes. */
  const maybeYield = async () => {
    yielded += 1
    if (yielded % 200 === 0) await new Promise(resolve => setImmediate(resolve))
  }

  /** Read one directory, tally its children, and queue the subdirectories. */
  const visit = async (path, depth) => {
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
      if (child.type === 'directory') {
        totals.directories += 1
        pending.push({ path: child.target === undefined ? joinPath(path, child.name) : fs.processPath(child.target), depth: depth + 1 })
      } else if (child.type === 'file') {
        totals.files += 1
        if (typeof child.size === 'number') totals.bytes += child.size
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
      await visit(next.path, next.depth)
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
