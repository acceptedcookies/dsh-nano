#!/usr/bin/env node
/** Export only an approved official commit. Never patch an upstream checkout;
 * local behavior belongs in DNLS driver adapters. This is a manual development
 * command, not a release gate. Build from a separate derived workspace. */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, lstatSync, readlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

const args = process.argv.slice(2)
const value = name => { const index = args.indexOf(name); return index < 0 ? undefined : args[index + 1] }
const source = resolve(value('--source') || '.')
const destination = resolve(value('--destination') || '.')
const ref = value('--ref')
if (!/^[0-9a-f]{40}$/.test(ref || '')) throw new Error('--ref must be an explicit official 40-character commit')
if (destination === source || destination.startsWith(source + '/')) throw new Error('export outside the source checkout')
const run = (command, argv, options = {}) => {
  const r = spawnSync(command, argv, { encoding: 'utf8', ...options })
  if (r.status !== 0) throw new Error(r.stderr || `${command} exited ${r.status}`)
  return r.stdout
}
if (run('git', ['-C', source, 'rev-parse', ref]).trim() !== ref) throw new Error('ref not present')
const paths = run('git', ['-C', source, 'ls-tree', '-r', '--name-only', '-z', ref]).split('\0').filter(Boolean)
if (args.includes('--verify')) {
  const problems = []
  for (const path of paths) {
    const expected = spawnSync('git', ['-C', source, 'show', `${ref}:${path}`], { maxBuffer: 64 * 1024 * 1024 })
    const target = join(destination, path)
    let actual
    try { actual = lstatSync(target).isSymbolicLink() ? Buffer.from(readlinkSync(target)) : readFileSync(target) } catch { problems.push(`missing ${path}`); continue }
    if (expected.status !== 0 || !actual.equals(expected.stdout)) problems.push(`changed ${path}`)
  }
  const scan = root => readdirSync(root, { withFileTypes: true }).flatMap(e => e.isDirectory() ? scan(join(root, e.name)) : [join(root, e.name).slice(destination.length + 1)])
  for (const path of scan(destination)) if (!paths.includes(path)) problems.push(`extra ${path}`)
  if (problems.length) throw new Error(problems.join('\n'))
  console.log(`verified ${paths.length} upstream files at ${ref}`)
} else {
  if (existsSync(destination)) throw new Error('destination already exists; never overwrite an existing pin')
  const archived = spawnSync('git', ['-C', source, 'archive', ref], { maxBuffer: 128 * 1024 * 1024 })
  if (archived.status !== 0) throw new Error('git archive failed')
  mkdirSync(destination, { recursive: true })
  const extracted = spawnSync('tar', ['-xf', '-', '-C', destination], { input: archived.stdout, encoding: 'utf8' })
  if (extracted.status !== 0) throw new Error(extracted.stderr || 'archive extraction failed')
  console.log(JSON.stringify({ ref, destination, files: paths.length, archiveSha256: createHash('sha256').update(archived.stdout).digest('hex') }))
}
