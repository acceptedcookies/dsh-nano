#!/usr/bin/env node
/** Devin VM resource bridge. No Chat, no PAT, no model keys. */

import { realpathSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { createFilesystem } from './filesystem.js'
import { createProcessTable } from './processes.js'
import { createMcpServer } from './mcp-stdio.js'
import os from 'node:os'

export { createFilesystem } from './filesystem.js'
export { createProcessTable } from './processes.js'
export { createMcpServer } from './mcp-stdio.js'

function runningAsCli() {
  try {
    const self = realpathSync(fileURLToPath(import.meta.url))
    const invoked = process.argv[1] ? realpathSync(process.argv[1]) : ''
    return self === invoked
  } catch {
    return false
  }
}

function arg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

function start(rootArg) {
  if (!rootArg) {
    process.stderr.write('missing --root\n')
    process.exit(2)
  }
  let rootReal
  try {
    rootReal = realpathSync(rootArg)
    if (!statSync(rootReal).isDirectory()) throw new Error('not a directory')
  } catch (error) {
    process.stderr.write(`invalid root: ${error.message}\n`)
    process.exit(2)
  }
  const fs = createFilesystem(rootReal)
  const processes = createProcessTable(rootReal)
  createMcpServer({
    fs,
    processes,
    inspectFacts: () => ({
      root: rootReal,
      os: `${os.platform()}-${os.arch()}`,
      runtime: { node: process.versions.node, execPath: process.execPath },
      user: os.userInfo().username,
      home: os.homedir(),
      cwd: process.cwd(),
      pty: { supported: false, reason: 'NATIVE_UNAVAILABLE' },
      forward: { supported: false, reason: 'NATIVE_UNAVAILABLE' },
    }),
  })
}

if (runningAsCli()) start(arg('--root'))
