/** File and folder creation, plus renaming, each guarded by the workspace boundary. */

import { absoluteOf, isLexicallyInside } from './listing.js'

/** Names the explorer refuses unconditionally: empty, separator-bearing, or traversal. */
const BAD_NAME = /[/\\\0]/u

/**
 * Validate one entry name the same way the notepad plugin does.
 * @param name - proposed basename.
 * @returns the trimmed name.
 * @throws with a caller-readable reason when the name cannot be used.
 */
export function validateName(name) {
  if (typeof name !== 'string') throw new Error('name must be a string')
  const trimmed = name.trim()
  if (trimmed === '') throw new Error('name must not be empty')
  if (trimmed === '.' || trimmed === '..') throw new Error('name must not be a relative path segment')
  if (BAD_NAME.test(trimmed)) throw new Error('name must not contain a path separator')
  return trimmed
}

/**
 * Report whether two absolute paths name the same entry when casing is the only difference.
 *
 * This is not a filesystem query: it answers whether the rename is a pure case change of the entry
 * being renamed, which is the one case where an existing destination is not a collision.
 *
 * @param source - the path being renamed.
 * @param destination - the proposed path.
 * @returns true when both paths differ only in letter case.
 */
function sameEntryIgnoringCase(source, destination) {
  return source !== destination && source.toLowerCase() === destination.toLowerCase()
}

/** Lexically fold a root when `fs.resolve` is unavailable (defensive fallback). */
function foldRoot(root) {
  return root.replace(/\\/gu, '/').replace(/\/+$/u, '') || '/'
}

/**
 * Refuse a write whose resolved path escapes the workspace or touches `.git`.
 *
 * P4-01/P4-02: the check is realpath-aware, not just lexical. A lexical prefix
 * match is bypassable through a symlinked ancestor (a link inside the
 * workspace pointing out would pass the prefix check yet land outside the
 * root); `fs.resolve` returns a target whose `processPath` is the realpath of
 * the deepest existing ancestor plus any missing tail, so comparing that
 * against the realpath'd root closes the symlink escape. The same fence also
 * refuses a `<root>/.git/**` write so the explorer cannot plant a filter
 * driver the git ops would execute (P4-02).
 *
 * @param fs - filesystem provider.
 * @param workspaceRoot - session workspace root.
 * @param path - absolute candidate path.
 * @param signal - caller cancellation.
 * @returns nothing; throws when the path escapes or targets `.git`.
 */
async function assertInside(fs, workspaceRoot, path, signal) {
  if (!isLexicallyInside(workspaceRoot, path)) throw new Error(`"${path}" is outside the workspace`)
  // Lexically-inside `.git` is rejected before any realpath work: writing
  // `.git/config` could arm a filter/smudge driver that `git add --all` runs.
  if (isLexicallyInside(`${workspaceRoot.replace(/\/+$/u, '')}/.git`, path)
    || /\/\.git(?:\/|$)/u.test(path)) {
    throw new Error('writes inside .git are refused')
  }
  const rootTarget = await fs.resolve(workspaceRoot, { signal }).catch(() => undefined)
  const pathTarget = await fs.resolve(path, { signal }).catch(() => undefined)
  if (rootTarget === undefined || pathTarget === undefined) return
  const realRoot = fs.processPath(rootTarget).replace(/\/+$/u, '')
  const realPath = fs.processPath(pathTarget)
  if (/\/\.git(?:\/|$)/u.test(realPath)) throw new Error('writes inside .git are refused')
  if (!isLexicallyInside(realRoot, realPath)) throw new Error(`"${path}" is outside the workspace`)
}

/**
 * Create an empty file, refusing to overwrite an existing path.
 * @param fs - filesystem provider.
 * @param request - workspace root, parent directory, name, and session policy.
 * @param signal - caller cancellation.
 * @returns the created file's absolute path.
 */
export async function createFile(fs, request, signal) {
  const { workspaceRoot, directory, name, sandboxPolicy } = request
  const finalName = validateName(name)
  const parent = absoluteOf(workspaceRoot, directory)
  await assertInside(fs, workspaceRoot, parent, signal)
  const path = `${parent}/${finalName}`
  /* Fence the LEAF too (7788 F2): the parent check alone let `name:".git"`
   * create `<root>/.git` — a realpath'd parent inside the root passed while
   * the composed path was never tested for the `.git` segment. */
  await assertInside(fs, workspaceRoot, path, signal)
  const target = await fs.resolve(path, { signal })
  try {
    await fs.writeText(target, '', { kind: 'createIfAbsent' }, signal, sandboxPolicy)
  } catch (error) {
    throw translate(error, path)
  }
  return { path }
}

/**
 * Rename one entry inside its current directory.
 * @param fs - filesystem provider.
 * @param ctx - context providing `subprocess`, `sandbox`, and `sandboxPolicy`.
 * @param config - executable and process limits.
 * @param request - workspace root, current path, new name, type, and session policy.
 * @param signal - caller cancellation.
 * @returns the new absolute path.
 */
export async function rename(fs, ctx, config, request, signal) {
  const { workspaceRoot, path, name, kind, sandboxPolicy, session, runExternal } = request
  const finalName = validateName(name)
  const source = absoluteOf(workspaceRoot, path)
  await assertInside(fs, workspaceRoot, source, signal)
  const parent = source.slice(0, source.lastIndexOf('/')) || '/'
  const destination = `${parent}/${finalName}`
  /* Fence the DESTINATION (7788 F1): only the source was fenced, so
   * `rename {name:".git"}` could move an armed gitdir/gitfile into place and
   * `git add --all` would execute its filter driver — RCE as the host user. */
  await assertInside(fs, workspaceRoot, destination, signal)
  if (source === destination) return { path: source }
  const existing = await fs.lstat(destination, {}, signal).catch(() => undefined)
  // A case-insensitive filesystem answers a lookup of the new name with the file being renamed, so
  // `RELEASE.md` looked like an existing entry and the rename was refused. The two paths are the same
  // file when only their casing differs, and that is exactly the rename the reader is asking for.
  if (existing !== undefined && !sameEntryIgnoringCase(source, destination)) {
    throw new Error(`"${finalName}" already exists in this folder`)
  }

  // A pure case change needs two steps on a case-insensitive filesystem: moving `release.md` to
  // `RELEASE.md` in one call resolves both names to the same entry, so the move is a no-op and the
  // old casing survives. A unique intermediate name breaks that bond.
  if (sameEntryIgnoringCase(source, destination)) {
    const staging = `${parent}/.nxe-case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
    await runExternal({
      session, sandboxPolicy, cwd: parent,
      argv: ['mv', '--', source, staging], args: ['mv'],
    })
    await runExternal({
      session, sandboxPolicy, cwd: parent,
      argv: ['mv', '--', staging, destination], args: ['mv'],
    })
    return { path: destination }
  }

  // A text file keeps `ctx.fs`'s own atomic move; everything else needs the external command,
  // because `moveFile` is contracted for UTF-8 text sources and has no directory form.
  if (kind === 'file' && await isTextFile(fs, source, signal)) {
    const from = await fs.resolve(source, { signal })
    const to = await fs.resolve(destination, { signal })
    try {
      await fs.moveFile(from, to, {}, signal, sandboxPolicy)
    } catch (error) {
      throw translate(error, source)
    }
    return { path: destination }
  }
  await runExternal({
    session,
    sandboxPolicy,
    cwd: parent,
    argv: ['mv', '--', source, destination],
    args: ['mv'],
  })
  return { path: destination }
}

/**
 * Create one empty directory through the external command, since `ctx.fs` has no mkdir.
 * @param fs - filesystem provider.
 * @param request - workspace root, parent directory, name, and session policy.
 * @param runExternal - sandboxed command runner supplied by the route layer.
 * @returns the created directory's absolute path.
 */
export async function createFolder(fs, request, runExternal) {
  const { workspaceRoot, directory, name, sandboxPolicy, session } = request
  const finalName = validateName(name)
  const parent = absoluteOf(workspaceRoot, directory)
  await assertInside(fs, workspaceRoot, parent, /* signal */ undefined)
  const path = `${parent}/${finalName}`
  /* Fence the LEAF (7788 F2): `name:".git"` must not create `<root>/.git`. */
  await assertInside(fs, workspaceRoot, path, /* signal */ undefined)
  const existing = await fs.lstat(path).catch(() => undefined)
  if (existing !== undefined) throw new Error(`"${finalName}" already exists in this folder`)
  await runExternal({ session, sandboxPolicy, cwd: parent, argv: ['mkdir', '--', path], args: ['mkdir'] })
  return { path }
}

/**
 * Decide whether a file is text the `ctx.fs` move path accepts, by probing a small window.
 * @param fs - filesystem provider.
 * @param path - absolute source path.
 * @param signal - caller cancellation.
 * @returns true when the leading bytes decode as UTF-8 without NUL.
 */
async function isTextFile(fs, path, signal) {
  try {
    const target = await fs.resolve(path, { signal })
    const head = await fs.readByteRange(target, { offset: 0, length: 8192 }, signal)
    if (head.includes(0)) return false
    new TextDecoder('utf-8', { fatal: true }).decode(head)
    return true
  } catch {
    return false
  }
}

/**
 * Turn a provider refusal into a message the dialog can show.
 * @param error - provider error.
 * @param path - path the operation targeted.
 * @returns the error to throw.
 */
function translate(error, path) {
  const code = error?.code ?? error?.name
  if (code === 'FS_NOT_OBSERVED') return new Error(`"${path}" already exists`)
  if (typeof code === 'string' && code.startsWith('FS_')) return new Error(`${path}: ${error.message}`)
  return error
}

/**
 * Delete one file or one directory tree.
 *
 * Deleting is the only operation here that cannot be undone, so it takes the narrowest route the
 * platform offers: `ctx.fs` has no removal abstraction, and the external command is sandboxed and
 * confined exactly like the `mv` that rename already uses. Four guards run before that command:
 * the path must be absolute and inside the workspace, it must not be the workspace root itself, the
 * session sandbox must be able to confine it, and the entry must actually exist.
 *
 * @param fs - filesystem provider.
 * @param request - workspace root, target path, entry kind, session policy, and the runner.
 * @param signal - caller cancellation.
 * @returns the path that was removed.
 */
export async function removeEntry(fs, request, signal) {
  const { workspaceRoot, path, kind, sandboxPolicy, session, runExternal } = request
  if (typeof path !== 'string' || path.trim() === '') throw new Error('a path is required')
  const target = absoluteOf(workspaceRoot, path)
  await assertInside(fs, workspaceRoot, target, signal)

  // The workspace root is the one entry this tool must never delete: `rm -rf` there would take the
  // whole session with it, and every path below is already reachable on its own.
  const normalizedRoot = workspaceRoot.replace(/\/+$/u, '')
  const normalizedTarget = target.replace(/\/+$/u, '')
  if (normalizedTarget === normalizedRoot) throw new Error('the workspace root cannot be deleted')

  const existing = await fs.lstat(target, {}, signal).catch(() => undefined)
  if (existing === undefined) throw new Error(`"${path}" does not exist`)

  // Trust the observed entry over the caller, so a directory is never removed as a plain file.
  const directory = kind === 'directory' || existing.isDirectory === true
  const parent = normalizedTarget.slice(0, normalizedTarget.lastIndexOf('/')) || '/'
  await runExternal({
    session,
    sandboxPolicy,
    cwd: parent,
    argv: directory ? ['rm', '-rf', '--', normalizedTarget] : ['rm', '-f', '--', normalizedTarget],
    args: ['rm'],
  })
  return { path: normalizedTarget, directory }
}

/**
 * Move one file or directory into another directory inside the same workspace.
 *
 * This is rename's sibling rather than a flag on it: the name never changes, the parent does. The
 * same guards apply, plus three that only a move can trip — the destination must be a real resolved
 * directory, the move must not drop an entry inside itself, and a no-op (same parent) returns
 * quietly because the tree may legitimately drag a row onto its own folder.
 *
 * @param fs - filesystem provider.
 * @param ctx - context kept for parity with rename; the runExternal runner carries what it needs.
 * @param config - process limits for the runner's callers; unused directly.
 * @param request - workspace root, source path, destination directory, and session policy.
 * @param signal - caller cancellation.
 * @returns the entry's absolute path after the move (the source when nothing had to happen).
 */
export async function moveEntry(fs, ctx, config, request, signal) {
  const { workspaceRoot, path, directory, sandboxPolicy, session, runExternal } = request
  if (typeof path !== 'string' || path.trim() === '') throw new Error('a path is required')
  const source = absoluteOf(workspaceRoot, path).replace(/\/+$/u, '')
  await assertInside(fs, workspaceRoot, source, signal)
  // The workspace root has no parent to move into within this tree.
  if (source === workspaceRoot.replace(/\/+$/u, '')) throw new Error('the workspace root cannot be moved')

  const info = await fs.lstat(source, {}, signal).catch(() => undefined)
  if (info === undefined) throw new Error(`"${path}" does not exist`)
  const name = source.slice(source.lastIndexOf('/') + 1)
  const sourceParent = source.slice(0, source.lastIndexOf('/')) || '/'

  const destinationDir = absoluteOf(workspaceRoot, typeof directory === 'string' ? directory : '')
  await assertInside(fs, workspaceRoot, destinationDir, signal)
  // Resolve the drop target through the provider: a symlinked folder may be the row under the
  // cursor, and the command must land where the link leads, not beside the link itself. The
  // resolved path is fenced again, so a link out of the workspace cannot move entries across it.
  const resolvedDirTarget = await fs.resolve(destinationDir, { signal })
  const resolvedDir = fs.processPath(resolvedDirTarget).replace(/\/+$/u, '')
  /* Compare the RESOLVED dir against the RESOLVED root (7788 W2): a symlinked
   * workspaceRoot made realpath≠lexical, so a real dir inside the workspace
   * was wrongly rejected. `.git` is checked on the real path too — a linked
   * destination that resolves into a gitdir must not be a drop target. */
  const realRootTarget = await fs.resolve(workspaceRoot, { signal }).catch(() => undefined)
  const realRoot = realRootTarget === undefined
    ? foldRoot(workspaceRoot)
    : fs.processPath(realRootTarget).replace(/\/+$/u, '')
  if (/\/\.git(?:\/|$)/u.test(resolvedDir)) throw new Error('writes inside .git are refused')
  if (!isLexicallyInside(realRoot, resolvedDir)) throw new Error(`"${directory}" resolves outside the workspace`)
  // `stat` reads the resolved target object; `processPath` output is what the `mv` command needs,
  // and `lstat` does not accept that form.
  const dirInfo = await fs.stat(resolvedDirTarget, {}, signal).catch(() => undefined)
  if (dirInfo === undefined || dirInfo === null || dirInfo.type !== 'directory') throw new Error(`"${directory}" is not a folder`)

  // Dropping a row onto its own parent is a harmless no-op: the entry is already there.
  if (resolvedDir === sourceParent) return { path: source }

  // A folder cannot move beneath itself, and neither can the filesystem it rides on.
  if (isLexicallyInside(source, resolvedDir)) throw new Error('a folder cannot be moved into itself')

  const destination = `${resolvedDir}/${name}`
  /* Fence the composed destination (7788 F1 parity with rename): the source
   * name can't be `.git` (source was fenced), but the drop must still refuse
   * a realpath'd destination that resolves into or outside `.git`. */
  if (/\/\.git(?:\/|$)/u.test(destination)) throw new Error('writes inside .git are refused')
  if (!isLexicallyInside(realRoot, destination)) throw new Error(`"${name}" would move outside the workspace`)
  const existing = await fs.lstat(destination, {}, signal).catch(() => undefined)
  if (existing !== undefined) throw new Error(`"${name}" already exists in that folder`)

  await runExternal({
    session,
    sandboxPolicy,
    cwd: resolvedDir,
    argv: ['mv', '--', source, destination],
    args: ['mv'],
  })
  return { path: destination }
}
