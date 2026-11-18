/** Bounded remote filesystem operations. Node-only; no Chat, no secrets. */

import { mkdirSync, readdirSync, readFileSync, renameSync, rmdirSync, realpathSync, statSync, unlinkSync, writeFileSync, existsSync } from 'node:fs'
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
    list({ path, limit = 200 }) {
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
      const names = readdirSync(resolved.real)
      const slice = names.slice(0, limit)
      const entries = slice.map(name => {
        const child = join(resolved.real, name)
        try {
          const info = statSync(child)
          return { name, kind: kindOf(info), size: info.isFile() ? info.size : undefined, version: versionOf(info) }
        } catch {
          return { name, kind: 'other' }
        }
      })
      return { entries, truncated: names.length > slice.length }
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
      const buf = readFileSync(resolved.real)
      const slice = buf.subarray(offset, offset + length)
      return {
        bytes: slice.toString('base64'),
        offset,
        eof: offset + slice.length >= buf.length,
        version: versionOf(info),
      }
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
      if (info.isDirectory()) {
        const names = readdirSync(resolved.real)
        if (names.length > 0) {
          const error = new Error('directory is not empty')
          error.reason = 'workspace-denied'
          throw error
        }
        rmdirSync(resolved.real)
      } else {
        unlinkSync(resolved.real ?? resolved.joined)
      }
      return { removed: true }
    },
  }
}

export function exists(path) { return existsSync(path) }
