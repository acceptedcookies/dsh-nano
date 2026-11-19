#!/usr/bin/env node
/** Derive a runnable tree from an immutable official pin and its complete build.
 * No source transformation or local patch is allowed. Receipts describe source
 * identity and consumed output hashes; the profile remains the only recipe. */
import { createHash } from 'node:crypto'
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { loadProfile } from '../src/host/profile-registry.js'
import { KITESURF_RUNTIME_FILES } from '../profiles/kitesurf/driver/runtime.js'

const argv = process.argv.slice(2)
const option = name => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1] }
const required = name => { const p = option(name); if (!p) throw new Error(`${name} is required`); return resolve(p) }
const pin = required('--pin')
const build = required('--build')
const home = required('--home')
const profileDir = required('--profile')
const manifestPath = required('--manifest')
const approved = JSON.parse(readFileSync(manifestPath, 'utf8')).deps.kitesurf.pinned
const loaded = loadProfile(profileDir)
if (!loaded.ready) throw new Error(`invalid recipe: ${loaded.errors.join(', ')}`)
const ref = loaded.manifest.build.checkout.ref
if (approved.resolvedSha !== ref || approved.ref !== ref || !/^[0-9a-f]{64}$/.test(approved.sourceTreeSha256 || '')) throw new Error('profile must match the approved manifest pin and source tree hash')
const artifact = join(home, 'artifacts', 'kitesurf', ref)
const runtime = join(artifact, 'runtime')
if (!argv.includes('--verify-only') && existsSync(runtime)) throw new Error(`runtime already exists; do not overwrite a running build: ${runtime}`)
const sha = data => createHash('sha256').update(data).digest('hex')
const sourceRows = []
function officialFiles(root, prefix = '') {
  return readdirSync(join(root, prefix), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name
    return entry.isDirectory() ? officialFiles(root, name) : [name]
  })
}
for (const file of officialFiles(pin)) {
  const p = join(pin, file), b = join(build, file)
  if (!existsSync(b)) throw new Error(`build missing official file: ${file}`)
  const data = lstatSync(p).isSymbolicLink() ? Buffer.from(readlinkSync(p)) : readFileSync(p)
  const built = lstatSync(b).isSymbolicLink() ? Buffer.from(readlinkSync(b)) : readFileSync(b)
  if (!data.equals(built)) throw new Error(`upstream source changed in derived build: ${file}`)
  sourceRows.push(`${file}\0${sha(data)}`)
}
if (sha(sourceRows.join('\n')) !== approved.sourceTreeSha256) throw new Error('source archive does not match the approved upstream pin tree')
if (argv.includes('--verify-only')) { console.log(`verified approved source and derived build at ${ref}`); process.exit(0) }
for (const file of KITESURF_RUNTIME_FILES) if (!existsSync(join(build, file))) throw new Error(`build incomplete: ${file}`)
if (!existsSync(join(build, 'node_modules'))) throw new Error('install locked workspace dependencies into the derived build first')
mkdirSync(artifact, { recursive: true })
cpSync(pin, runtime, { recursive: true, dereference: false, verbatimSymlinks: true })
for (const dir of ['packages/core/pkg', 'packages/renderer-core/pkg', 'packages/engine/public/rbi', 'packages/dom-shim/dist', 'packages/page-script/dist', 'packages/page-renderer/dist', 'packages/worker-script/dist', 'node_modules']) {
  cpSync(join(build, dir), join(runtime, dir), { recursive: true, dereference: false, verbatimSymlinks: true })
}
// pnpm workspace node_modules are relative symlinks into the root .pnpm store.
for (const name of readdirSync(join(build, 'packages'))) {
  const from = join(build, 'packages', name, 'node_modules')
  if (existsSync(from)) cpSync(from, join(runtime, 'packages', name, 'node_modules'), { recursive: true, dereference: false, verbatimSymlinks: true })
}
// Apple requires a nested tmpfs mountpoint to exist inside the read-only
// runtime bind mount before boot. This is generated state, never pin source.
mkdirSync(join(runtime, 'packages/engine/.wrangler'), { recursive: true })
const outputs = Object.fromEntries(KITESURF_RUNTIME_FILES.map(file => [file, sha(readFileSync(join(runtime, file)))]))
writeFileSync(join(artifact, 'artifact.json'), JSON.stringify({ ref, sourceTree: sha(sourceRows.join('\n')), builtAt: new Date().toISOString(), outputs }, null, 2) + '\n')
console.log(JSON.stringify({ ref, runtime, artifact: join(artifact, 'artifact.json'), outputs: Object.keys(outputs).length }))
