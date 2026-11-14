import { randomUUID } from 'node:crypto'
import { appendHistory } from './state-service.js'
import { policyFingerprint, tupleFromPolicy } from './policy-adapter.js'

export function createInstanceRegistry({ backend, profile, volumeFor, now = () => Date.now(), ids } = {}) {
  const instances = new Map()
  let portCursor = 20000

  function endpointsFor() {
    const engine = portCursor
    const bridge = portCursor + 1
    portCursor += 2
    return {
      engine: `http://127.0.0.1:${engine}`,
      cdp: `ws://127.0.0.1:${engine}/devtools/browser`,
      mcp: `ws://127.0.0.1:${bridge}/mcp`,
      terminal: `ws://127.0.0.1:${engine}/term`,
    }
  }

  async function ensure({ sessionId, policy }) {
    if (profile.scope === 'session' && !sessionId) return { ok: false, status: 400 }
    const tuple = tupleFromPolicy({ ...policy, sessionId: sessionId ?? policy.sessionId })
    const fingerprint = policyFingerprint(tuple)
    const existing = [...instances.values()].find((row) => row.profileId === profile.id && row.sessionId === tuple.sessionId)
    if (existing) {
      if (existing.policyFingerprint === fingerprint) return { ok: true, status: 200, instance: existing }
      return {
        ok: false,
        status: 409,
        errorId: 'sandbox.instance.policy-stale',
        expectedFingerprint: fingerprint,
      }
    }
    if (instances.size >= profile.lifecycle.maxInstances) return { ok: false, status: 503 }
    const instanceId = ids?.length ? ids.shift() : randomUUID()
    const mounts = []
    if (tuple.workspaceRoot) mounts.push({ source: tuple.workspaceRoot, arg: tuple.workspaceRoot })
    for (const extra of tuple.extraRoots) mounts.push({ source: extra, arg: extra })
    const instance = {
      instanceId,
      profileId: profile.id,
      profileVersion: profile.version,
      scope: profile.scope,
      sessionId: tuple.sessionId,
      phase: 'idle',
      policyFingerprint: fingerprint,
      workspaceRoot: tuple.workspaceRoot ?? null,
      mounts,
      endpoints: endpointsFor(),
      stateVolume: volumeFor(instanceId),
      artifacts: {
        identity: profile.build.digest,
        hash: profile.build.digest,
        consumed_at: new Date(now()).toISOString(),
      },
      attached: false,
      lastAttach: now(),
      containerName: `dnls-${instanceId}`,
    }
    await backend.create({
      containerName: instance.containerName,
      image: profile.build.base,
      resources: profile.runtime.isolation.resources,
      mounts,
      ports: [],
    })
    instances.set(instanceId, instance)
    return { ok: true, status: 201, instance }
  }

  function reconcile(instanceId, observed) {
    const instance = instances.get(instanceId)
    if (!instance) return null
    if (observed.healthy && instance.phase === 'idle') instance.phase = 'running'
    else if (!observed.healthy && instance.phase === 'running') instance.phase = 'idle'
    return instance.phase
  }

  async function sweep() {
    const timeout = profile.lifecycle.idleTimeoutMs
    for (const instance of [...instances.values()]) {
      if (instance.attached) continue
      if (now() - instance.lastAttach < timeout) continue
      await backend.stop(instance.containerName)
      instances.delete(instance.instanceId)
    }
  }

  function recordHistory(instanceId, row) {
    return appendHistory(instances.get(instanceId).stateVolume, row)
  }

  return { ensure, reconcile, sweep, recordHistory, instances }
}
