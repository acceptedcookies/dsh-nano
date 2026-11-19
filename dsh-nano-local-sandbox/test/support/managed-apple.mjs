// Hermetic Apple-backend fixture shared by managed-owner integration tests.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { KITESURF_RUNTIME_FILES } from '../../profiles/kitesurf/driver/runtime.js'

export const DIGEST = `sha256:${'ab'.repeat(32)}`

/** A fake-built kitesurf runtime tree: receipt + required files + node_modules. */
export function materializeRuntime(root, manifest) {
  mkdirSync(dirname(root), { recursive: true })
  writeFileSync(join(dirname(root), 'artifact.json'), JSON.stringify({ ref: manifest.build.checkout.ref }))
  for (const file of [manifest.build.checkout.verify, ...KITESURF_RUNTIME_FILES]) {
    const path = join(root, file)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, 'fixture build output\n')
  }
  mkdirSync(join(root, 'node_modules'), { recursive: true })
}

/**
 * The container CLI seam, recorded. `create` stores the exact spec it was
 * handed; `inspect` reports it back as one Apple ManagedContainer, so every
 * verification path reads the same evidence the runtime would return.
 */
export function makeBackend() {
  const calls = []
  const containers = new Map()
  const workers = new Set()
  let serial = 0
  const managedContainer = (locator, c) => ({
    raw: JSON.stringify([{
      configuration: {
        id: locator,
        creationDate: c.creationDate,
        mounts: (c.mounts ?? c.spec.mounts).map((m) => ({
          source: m.source ?? null,
          destination: m.target,
          type: { [m.type]: {} },
          options: m.readOnly ? ['ro'] : [],
        })),
        publishedPorts: (c.ports ?? c.spec.ports).map((p) => ({
          containerPort: p.containerPort,
          hostPort: p.hostPort,
          hostAddress: p.hostAddress,
          proto: p.protocol ?? p.proto,
          count: p.count ?? 1,
        })),
        resources: c.resources ?? { cpus: c.spec.resources.cpus, memoryInBytes: c.spec.resources.memoryBytes },
        image: { reference: c.spec.image, descriptor: { digest: c.digest ?? DIGEST } },
      },
      status: { state: c.state },
    }]),
  })
  return {
    calls,
    containers,
    workers,
    onCreate: null,
    count: (verb) => calls.filter((entry) => entry[0] === verb).length,
    async create(spec) {
      calls.push(['create', structuredClone(spec)])
      serial += 1
      const entry = { spec: structuredClone(spec), state: 'running', creationDate: 1_700_000_000 + serial * 61 }
      containers.set(spec.containerName, entry)
      this.onCreate?.(spec, entry)
    },
    async stop(locator) {
      calls.push(['stop', locator])
      const c = containers.get(locator)
      if (c) c.state = 'stopped'
    },
    async remove(locator) {
      calls.push(['remove', locator])
      containers.delete(locator)
    },
    async start(locator) {
      calls.push(['start', locator])
      const c = containers.get(locator)
      if (c) c.state = 'running'
    },
    async inspect(locator) {
      calls.push(['inspect', locator])
      const c = containers.get(locator)
      return c ? managedContainer(locator, c) : null
    },
    async stats(locator) {
      calls.push(['stats', locator])
      return [{ id: locator, memoryUsageBytes: 0, cpuUsageUsec: 0 }]
    },
    async imageEvidence(tag) {
      calls.push(['imageEvidence', tag])
      return { tag, digest: DIGEST }
    },
    async terminalRpc(locator, verb, request) {
      calls.push(['terminalRpc', verb, locator, request])
      if (verb === 'create') {
        workers.add(request.terminalId)
        return { ok: true, terminalId: request.terminalId }
      }
      if (verb === 'rpc' && request.verb === 'status') {
        return { ok: true, state: workers.has(request.terminalId) ? 'active' : 'ended' }
      }
      return { ok: true }
    },
  }
}
