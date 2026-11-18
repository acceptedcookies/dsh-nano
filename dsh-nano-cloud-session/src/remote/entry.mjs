#!/usr/bin/env node
/** Devin VM resource bridge. No Chat, no PAT, no model keys. */

import { realpathSync, statSync } from 'node:fs'
import { createFilesystem } from './filesystem.js'
import { createProcessTable } from './processes.js'
import { createMcpServer } from './mcp-stdio.js'
import os from 'node:os'

function arg(name) {
  const idx = process.argv.indexOf(name)
  if (idx === -1) return null
  return process.argv[idx + 1] ?? null
}

const rootArg = arg('--root')
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
const nodePath = process.execPath
const nodeVersion = process.versions.node

createMcpServer({
  fs,
  processes,
  inspectFacts: () => ({
    root: rootReal,
    os: `${os.platform()}-${os.arch()}`,
    runtime: { node: nodeVersion, execPath: nodePath },
    user: os.userInfo().username,
    home: os.homedir(),
    cwd: process.cwd(),
  }),
})
