/** Bounded remote filesystem operations. Node-only; no Chat, no secrets. */

import { mkdirSync, readdirSync, openSync, readSync, closeSync, renameSync, rmdirSync, realpathSync, statSync, unlinkSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { randomBytes } from 'node:crypto'
import { resolveUnderRoot } from './path-policy.js'

function versionOf(stat) {
  return `${stat.ino}-${stat.mtimeMs}-${stat.size}`
}

function kindOf(stat) {
  if (stat.isDirectory()) return 'directory'
  if (stat.isSymbolicLink()) return 'symlink'
  if (stat.isFile()) return 'file'
  return 'other'
}

export function createFilesystem(rootInput, { maxPage = 64 * 1024 } = {}) {
  const rootReal = realpathSync(rootInput)
  const inspect = () => {
    const st = statSync(rootReal)
    return {
      root: rootReal,
      kind: 'directory',
      version: versionOf(st),
    }
  }

  return {
    inspect,
    list({ path, limit = 200, cursor }) {
      const resolved = resolveUnderRoot(rootReal, path)
      if (!resolved.exists) {
        const error = new Error('not found')
        error.reason = 'workspace-not-found'
        throw error
      }
      const st = statSync(resolved.real)
      if (!st.isDirectory()) {
        const error = new Error('not a directory')
        error.reason = 'workspace-denied'
        throw error
      }
      const names = readdirSync(resolved.real).sort()
      let start = 0
      if (cursor) {
        const idx = names.indexOf(cursor)
        if (idx === -1) {
          const error = new Error('unknown list cursor')
          error.reason = 'invalid-request'
          throw error
        }
        start = idx + 1
      }
      const slice = names.slice(start, start + limit)
      const entries = slice.map(name => {
        const child = join(resolved.real, name)
        try {
          const info = statSync(child)
          return { name, kind: kindOf(info), size: info.isFile() ? info.size : undefined, version: versionOf(info) }
        } catch {
          return { name, kind: 'other' }
        }
      })
      const truncated = start + slice.length < names.length
      return {
        entries,
        truncated,
        nextCursor: truncated ? slice.at(-1) : undefined,
      }
    },
    stat({ path }) {
      const resolved = resolveUnderRoot(rootReal, path)
      if (!resolved.exists) {
        const error = new Error('not found')
        error.reason = 'workspace-not-found'
        throw error
      }
      const info = resolved.lstat.isSymbolicLink() ? resolved.lstat : statSync(resolved.real)
      return {
        kind: kindOf(info),
        resolvedPath: resolved.real ?? resolved.joined,
        version: versionOf(info),
        size: info.isFile() ? info.size : undefined,
        linkTarget: resolved.lstat.isSymbolicLink() ? resolved.real : undefined,
      }
    },
    read({ path, offset = 0, length = maxPage }) {
      const resolved = resolveUnderRoot(rootReal, path)
      if (!resolved.exists) {
        const error = new Error('not found')
        error.reason = 'workspace-not-found'
        throw error
      }
      const info = statSync(resolved.real)
      if (!info.isFile()) {
        const error = new Error('not a file')
        error.reason = 'workspace-denied'
        throw error
      }
      const fd = openSync(resolved.real, 'r')
      try {
        const slice = Buffer.alloc(Math.min(length, maxPage))
        const n = readSync(fd, slice, 0, slice.length, offset)
        return {
          bytes: slice.subarray(0, n).toString('base64'),
          offset,
          eof: offset + n >= info.size,
          version: versionOf(info),
        }
      } finally { closeSync(fd) }
    },
    write({ path, bytes, expectedVersion, createOnly }) {
      const resolved = resolveUnderRoot(rootReal, path)
      const payload = Buffer.from(bytes, 'base64')
      if (payload.length > maxPage) {
        const error = new Error('write exceeds page')
        error.reason = 'workspace-limit'
        throw error
      }
      if (resolved.exists) {
        if (createOnly) {
          const error = new Error('already exists')
          error.reason = 'workspace-conflict'
          throw error
        }
        const info = statSync(resolved.real)
        if (expectedVersion && versionOf(info) !== expectedVersion) {
          const error = new Error('version conflict')
          error.reason = 'workspace-conflict'
          throw error
        }
      } else if (expectedVersion) {
        const error = new Error('version conflict')
        error.reason = 'workspace-conflict'
        throw error
      }
      const dir = dirname(resolved.joined)
      const tmp = join(dir, `.dncs-${randomBytes(6).toString('hex')}.tmp`)
      writeFileSync(tmp, payload, { mode: 0o600 })
      renameSync(tmp, resolved.joined)
      const info = statSync(resolved.joined)
      return { version: versionOf(info), bytes: payload.length }
    },
    mkdir({ path }) {
      const resolved = resolveUnderRoot(rootReal, path)
      if (resolved.exists) {
        const error = new Error('already exists')
        error.reason = 'workspace-conflict'
        throw error
      }
      mkdirSync(resolved.joined)
      return { created: true }
    },
    rename({ from, to }) {
      const src = resolveUnderRoot(rootReal, from)
      if (!src.exists) {
        const error = new Error('not found')
        error.reason = 'workspace-not-found'
        throw error
      }
      const dst = resolveUnderRoot(rootReal, to)
      if (dst.exists) {
        const error = new Error('destination exists')
        error.reason = 'workspace-conflict'
        throw error
      }
      renameSync(src.real ?? src.joined, dst.joined)
      const info = statSync(dst.joined)
      return { destinationVersion: versionOf(info) }
    },
    remove({ path, expectedVersion }) {
      const resolved = resolveUnderRoot(rootReal, path)
      if (!resolved.exists) {
        const error = new Error('not found')
        error.reason = 'workspace-not-found'
        throw error
      }
      const info = resolved.lstat
      if (expectedVersion && versionOf(info) !== expectedVersion) {
        const error = new Error('version conflict')
        error.reason = 'workspace-conflict'
        throw error
      }
      if (info.isSymbolicLink()) {
        unlinkSync(resolved.joined)
      } else if (info.isDirectory()) {
        const names = readdirSync(resolved.real)
        if (names.length > 0) {
          const error = new Error('directory is not empty')
          error.reason = 'workspace-denied'
          throw error
        }
        rmdirSync(resolved.real)
      } else {
        unlinkSync(resolved.joined)
      }
      return { removed: true }
    },
  }
}

export function exists(path) { return existsSync(path) }
