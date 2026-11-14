import { spawn, execFile } from 'node:child_process'
import { assertPublicSpec, capabilityReport } from './backend.js'

function run(io, args) {
  io.calls.spawn += 1
  if (io.spawn) return io.spawn('container', args)
  return new Promise((resolve, reject) => {
    const child = spawn('container', args, { stdio: 'pipe' })
    let stderr = ''
    child.stderr?.on('data', (chunk) => { stderr += chunk })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve({ code })
      else reject(new Error(stderr || `container exit ${code}`))
    })
  })
}

function runFile(io, args) {
  io.calls.spawn += 1
  if (io.execFile) return io.execFile('container', args)
  return new Promise((resolve, reject) => {
    execFile('container', args, { encoding: 'utf8' }, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })
}

/**
 * The only file in this package allowed to call the container CLI.
 * Public constructor arguments stay free of platform nouns.
 */
export function publishedHttpBase(raw, containerPort = 8787) {
  const text = String(raw ?? '')
  const start = text.indexOf('[')
  const objectStart = text.indexOf('{')
  const at = start >= 0 ? start : objectStart
  if (at < 0) return null
  let data
  try { data = JSON.parse(text.slice(at)) } catch { return null }
  const item = Array.isArray(data) ? data[0] : data
  const ports = item?.configuration?.publishedPorts ?? item?.publishedPorts ?? []
  const hit = ports.find((row) => Number(row.containerPort) === Number(containerPort) && row.hostPort)
  if (!hit) return null
  const host = hit.hostAddress && hit.hostAddress !== '0.0.0.0' ? hit.hostAddress : '127.0.0.1'
  return `http://${host}:${hit.hostPort}`
}

export function createAppleBackend(spec = {}, io = {}) {
  assertPublicSpec(spec)
  const calls = {
    ensureImage: 0,
    create: 0,
    start: 0,
    stop: 0,
    restart: 0,
    inspect: 0,
    exec: 0,
    publish: 0,
    mount: [],
    networkPolicy: 0,
    identity: 0,
    stateVolume: 0,
    spawn: 0,
  }
  const bound = { ...io, calls }

  return {
    calls,
    async ensureImage(image) {
      calls.ensureImage += 1
      assertPublicSpec(image?.publicSpec ?? {})
      return { ok: true, image: image?.tag ?? spec.image ?? null }
    },
    async create(instance) {
      calls.create += 1
      const args = ['run', '-d', '--name', instance.containerName]
      if (instance.resources?.cpus != null) args.push('-c', String(instance.resources.cpus))
      if (instance.resources?.memory != null) args.push('-m', String(instance.resources.memory))
      for (const mount of instance.mounts ?? []) {
        calls.mount.push(mount)
        args.push('--mount', mount.arg)
      }
      for (const port of instance.ports ?? []) args.push('-p', port.publish)
      args.push(instance.image)
      await run(bound, args)
      return { id: instance.containerName, started: true }
    },
    async start(name) {
      calls.start += 1
      await run(bound, ['start', name])
      return { ok: true }
    },
    async stop(name) {
      calls.stop += 1
      await run(bound, ['stop', name])
      return { ok: true }
    },
    async restart(name) {
      calls.restart += 1
      await run(bound, ['restart', name])
      return { ok: true }
    },
    async inspect(name) {
      calls.inspect += 1
      const stdout = await runFile(bound, ['inspect', name])
      return { raw: stdout ?? '' }
    },
    async exec(name, argv) {
      calls.exec += 1
      await run(bound, ['exec', name, ...argv])
      return { ok: true }
    },
    async publish(ports) {
      calls.publish += 1
      assertPublicSpec({ ports })
      return { ports }
    },
    async mount(mountSpec) {
      calls.mount.push(mountSpec)
      assertPublicSpec({ mounts: [mountSpec] })
      return { ok: true }
    },
    async networkPolicy(policy) {
      calls.networkPolicy += 1
      assertPublicSpec({ network: policy })
      return { ok: true }
    },
    async identity(who) {
      calls.identity += 1
      assertPublicSpec({ identity: who })
      return { ok: true }
    },
    async stateVolume(volume) {
      calls.stateVolume += 1
      return { path: volume }
    },
    capabilities() {
      return capabilityReport()
    },
  }
}
