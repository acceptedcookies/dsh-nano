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
  /** @param {string} path @param {number} depth @param {boolean} needsResolve */
  const walk = async (path, depth, needsResolve) => {
    if (totals.truncated) return
    signal?.throwIfAborted()
    if (depth > maxDepth) {
      totals.truncated = true
      return
    }
    let children
    try {
      // E9: a directory reached by joining names onto an already-resolved parent is plain — only the
      // walk's root and paths that arrived through a symlink need the provider's resolve pass.
      children = await fs.listDir(needsResolve ? await fs.resolve(path, { signal }) : path, signal)
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
      // Yield between directories so a large workspace never monopolizes the event loop; a blocked
      // loop stalls the SSE and WebSocket carriers, which the browser reports as a reconnect.
      if (seen % 200 === 0) await new Promise(resolve => setImmediate(resolve))
      if (excludeGit && child.name === '.git') continue
      if (child.type === 'directory') {
        totals.directories += 1
        // A child listing carries `target` only when it is a symlink itself.
        const viaLink = child.target !== undefined
        await walk(viaLink ? fs.processPath(child.target) : joinPath(path, child.name), depth + 1, viaLink)
      } else if (child.type === 'file') {
        totals.files += 1
        if (typeof child.size === 'number') totals.bytes += child.size
      }
    }
  }
  await walk(root, 1, true)
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
