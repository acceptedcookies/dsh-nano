/** Recursive workspace statistics over `ctx.fs`, bounded by depth and entry count. */

/**
 * Walk one workspace subtree and count files, directories, and bytes.
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
  /** @param {string} path @param {number} depth */
  const walk = async (path, depth) => {
    if (totals.truncated) return
    signal?.throwIfAborted()
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
      if (excludeGit && child.name === '.git') continue
      if (child.type === 'directory') {
        totals.directories += 1
        await walk(child.target === undefined ? joinPath(path, child.name) : fs.processPath(child.target), depth + 1)
      } else if (child.type === 'file') {
        totals.files += 1
        if (typeof child.size === 'number') totals.bytes += child.size
      }
    }
  }
  await walk(root, 1)
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
