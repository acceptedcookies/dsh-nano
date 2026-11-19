#!/usr/bin/env node
/** Isolated container experiments use the same driver backend and recipe as
 * production. Explicit names and paths avoid touching the three daily instances. */
import { resolve } from 'node:path'
import { createAppleBackend } from '../src/host/backend-apple.js'
import { loadProfileDriver, resourcesOf } from '../src/host/profile-drivers.js'
const args = process.argv.slice(2)
const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1] }
const action = args[0]
const name = option('--name')
if (!/^kitesurf-lab-[a-z0-9-]+$/.test(name || '')) throw new Error('use an explicit isolated kitesurf-lab-* name')
const backend = createAppleBackend()
if (action === 'start') {
  const runtime = option('--runtime'), state = option('--state'), ports = (option('--ports') || '').split(',').map(Number)
  if (!runtime || !state || ports.length !== 2 || ports.some(p => !Number.isInteger(p) || p < 1024 || p > 65535)) throw new Error('--runtime --state --ports engine,bridge are required')
  const loaded = await loadProfileDriver(resolve(option('--profile') || resolve(import.meta.dirname, '../profiles/kitesurf')))
  if (!loaded.ready) throw new Error(`profile invalid: ${loaded.errors.join(', ')}`)
  const { driver, manifest: profile } = loaded
  const resources = resourcesOf(profile)
  const deps = { env: process.env, runtimeRoot: resolve(runtime) }
  await backend.create({ containerName: name, image: driver.image(profile), resources,
    mounts: driver.mounts(profile, deps, resolve(state)),
    ports: [{ publish: `127.0.0.1:${ports[0]}:8787` }, { publish: `127.0.0.1:${ports[1]}:8791` }],
  })
  console.log(`started ${name}`)
} else if (action === 'resume') {
  await backend.start(name)
  console.log(`resumed ${name}`)
} else if (action === 'stop') {
  await backend.stop(name)
  console.log(`stopped ${name}; retained for inspection`)
} else throw new Error('use start, resume or stop; this tool never deletes containers or data')
