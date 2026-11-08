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
 * Refuse a write whose parent lies outside the workspace.
 * @param fs - filesystem provider.
 * @param workspaceRoot - session workspace root.
 * @param path - absolute candidate path.
 * @returns nothing; throws when the path escapes.
 */
function assertInside(fs, workspaceRoot, path) {
  if (!isLexicallyInside(workspaceRoot, path)) throw new Error(`"${path}" is outside the workspace`)
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
  assertInside(fs, workspaceRoot, parent)
  const path = `${parent}/${finalName}`
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
  assertInside(fs, workspaceRoot, source)
  const parent = source.slice(0, source.lastIndexOf('/')) || '/'
  const destination = `${parent}/${finalName}`
  if (source === destination) return { path: source }
  const existing = await fs.lstat(destination, {}, signal).catch(() => undefined)
  if (existing !== undefined) throw new Error(`"${finalName}" already exists in this folder`)

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
  assertInside(fs, workspaceRoot, parent)
  const path = `${parent}/${finalName}`
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
