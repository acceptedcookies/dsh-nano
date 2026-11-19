/** Confine remote paths to a verified root using realpath, not startsWith. */

import { realpathSync, lstatSync, existsSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'

export function assertInside(rootReal, candidateReal) {
  const root = rootReal.endsWith('/') ? rootReal.slice(0, -1) : rootReal
  const path = candidateReal.endsWith('/') && candidateReal !== '/' ? candidateReal.slice(0, -1) : candidateReal
  if (path === root) return
  if (!path.startsWith(`${root}/`)) {
    const error = new Error('path escapes workspace root')
    error.reason = 'workspace-denied'
    throw error
  }
}

export function resolveUnderRoot(rootReal, rel) {
  const relative = String(rel ?? '')
  if (relative.includes('\0')) {
    const error = new Error('path must not contain NUL')
    error.reason = 'invalid-request'
    throw error
  }
  const joined = posix.isAbsolute(relative)
    ? join(rootReal, relative.replace(/^\//, ''))
    : join(rootReal, relative)
  if (existsSync(joined)) {
    const lst = lstatSync(joined)
    if (lst.isSymbolicLink()) {
      const target = realpathSync(joined)
      assertInside(rootReal, target)
      return { joined, exists: true, lstat: lst, real: target }
    }
    const real = realpathSync(joined)
    assertInside(rootReal, real)
    return { joined, exists: true, lstat: lst, real }
  }
  const parent = dirname(joined)
  if (!existsSync(parent)) {
    const error = new Error('parent path does not exist')
    error.reason = 'workspace-not-found'
    throw error
  }
  const parentReal = realpathSync(parent)
  assertInside(rootReal, parentReal)
  return { joined, parentReal, exists: false, lstat: null }
}
