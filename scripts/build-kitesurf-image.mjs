#!/usr/bin/env node
/** Manual image build through the installed host's real confinement provider.
 * This never falls back to an unconfined container command. The profile, not
 * duplicated literals, supplies the base image and final immutable tag. */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { join, resolve } from 'node:path'
import { loadProfile } from '../dsh-nano-local-sandbox/src/host/profile-registry.js'
import { createAppleBackend } from '../dsh-nano-local-sandbox/src/host/backend-apple.js'

const argv = process.argv.slice(2)
const option = name => { const i = argv.indexOf(name); return i < 0 ? undefined : argv[i + 1] }
const contextDir = resolve(option('--context') || '.')
const profileDir = resolve(option('--profile') || join(import.meta.dirname, '../dsh-nano-local-sandbox/profiles/kitesurf'))
const hostRoot = option('--host-install')
const containerState = option('--container-state')
if (!containerState) throw new Error('--container-state must explicitly grant the container service state directory for image creation')
if (!hostRoot) throw new Error('--host-install must identify the installed dsh package; confinement is required')
const fromHost = createRequire(join(resolve(hostRoot), 'package.json'))
const { Context } = await import(pathToFileURL(fromHost.resolve('@deepseek-ai/cordis')).href)
const { LocalSandboxProvider } = await import(pathToFileURL(fromHost.resolve('@deepseek-ai/dsh-sandbox-local')).href)
const profile = loadProfile(profileDir)
if (!profile.ready) throw new Error(`invalid recipe: ${profile.errors.join(', ')}`)
const ctx = new Context()
const provider = new LocalSandboxProvider(ctx, { runnerCommand: [], runnerFailureSignatures: [], probeTimeoutMs: 5000 })
const confinedContext = { sandbox: { confine: command => provider.confine(command, {
  mode: 'workspace-write', workspaceRoot: contextDir, additionalWritableRoots: [resolve(containerState)],
}) } }
await createAppleBackend().build({ ctx: confinedContext, contextDir, dockerfile: join(contextDir, 'Dockerfile'), image: profile.manifest.build.image, base: profile.manifest.build.base })
console.log(`built ${profile.manifest.build.image} through host confinement`)
