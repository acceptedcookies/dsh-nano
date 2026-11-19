#!/usr/bin/env node
/**
 * The one manual build entry for a profile's derived artifacts: the runtime
 * built from the official pin, and the image built from the profile recipe.
 * Re-running is a no-op when both are present. `--check` only reports.
 * Not a release gate; deploys stay code-only and the instance fails closed
 * when an artifact is missing.
 */
import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadProfileDriver } from '../src/host/profile-drivers.js'
import { recipeSource } from '../src/host/profile-registry.js'
import { createAppleBackend } from '../src/host/backend-apple.js'

const here = dirname(fileURLToPath(import.meta.url))
const argv = process.argv.slice(2)
const option = (name) => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1] }
const required = (name) => { const v = option(name); if (!v) throw new Error(`${name} is required to build the missing artifact`); return resolve(v) }

const profileDir = resolve(option('--profile') || join(here, '../profiles/kitesurf'))
const home = resolve(option('--home') || process.env.DSH_HOME || join(homedir(), '.dsh'))
const loaded = await loadProfileDriver(profileDir)
if (!loaded.ready) throw new Error(`invalid profile at ${profileDir}: ${loaded.errors.join(', ')}`)
const { driver, manifest } = loaded
const deps = { env: { ...process.env, DSH_HOME: home }, home }
const tag = driver.image(manifest)

function runtimeState() {
  try { return { ok: true, root: driver.assertRuntime(manifest, deps) } } catch (error) {
    return { ok: false, root: driver.runtimeRoot(manifest, deps), error: error.message }
  }
}

async function imageState() {
  try { await createAppleBackend().ensureImage({ tag }); return { ok: true, tag } } catch (error) {
    return { ok: false, tag, error: String(error?.message || error).split('\n')[0] }
  }
}

async function report() {
  const runtime = runtimeState()
  const image = await imageState()
  return { profile: manifest.id, ref: manifest.build.checkout.ref, home, runtime, image, ready: runtime.ok && image.ok }
}

function run(command, args, cwd) {
  console.error(`$ (${cwd}) ${command} ${args.join(' ')}`)
  const result = spawnSync(command, args, { cwd, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${command} exited ${result.status ?? result.signal}`)
}

const before = await report()
if (argv.includes('--check') || before.ready) {
  console.log(JSON.stringify(before, null, 2))
  process.exit(before.ready ? 0 : 3)
}

const work = required('--work')
if (!before.runtime.ok) {
  const source = required('--source')
  const manifestPath = required('--manifest')
  const ref = manifest.build.checkout.ref
  const pin = join(work, 'pin')
  const build = join(work, 'build')
  const materialize = join(here, 'materialize-kitesurf-pin.mjs')
  if (!existsSync(pin)) run(process.execPath, [materialize, '--source', source, '--destination', pin, '--ref', ref], here)
  run(process.execPath, [materialize, '--source', source, '--destination', pin, '--ref', ref, '--verify'], here)
  if (!existsSync(build)) cpSync(pin, build, { recursive: true, verbatimSymlinks: true })
  for (const [command, args] of driver.build.runtimeSteps) run(command, args, build)
  run(process.execPath, [join(here, 'stage-kitesurf-runtime.mjs'), '--pin', pin, '--build', build, '--home', home, '--profile', profileDir, '--manifest', manifestPath], here)
}

if (!before.image.ok) {
  const hostInstall = required('--host-install')
  const containerState = required('--container-state')
  const context = join(work, `context-${loaded.digest.slice('sha256:'.length, 'sha256:'.length + 12)}`)
  rmSync(context, { recursive: true, force: true })
  mkdirSync(context, { recursive: true })
  for (const file of manifest.build.recipe) {
    const source = recipeSource(profileDir, file)
    if (!source) throw new Error(`recipe member is not a safe file: ${file}`)
    cpSync(source, join(context, file))
  }
  const prefix = driver.build.contextPrefix(manifest)
  run(prefix.argv[0], prefix.argv[1], context)
  run(process.execPath, [join(here, '../../scripts/build-kitesurf-image.mjs'), '--context', context, '--profile', profileDir, '--host-install', hostInstall, '--container-state', containerState], here)
}

const after = await report()
console.log(JSON.stringify(after, null, 2))
process.exit(after.ready ? 0 : 3)
