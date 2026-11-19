import { randomUUID } from 'node:crypto'
import { appendHistory } from './state-service.js'
import { policyFingerprint, tupleFromPolicy } from './policy-adapter.js'

/**
 * Per-session instance bookkeeping: identity, port allocation, policy
 * fingerprint, idle sweep.
 *
 * Three optional hooks let the caller decide what a container actually looks
 * like, so this module stays free of platform nouns and of any profile
 * recipe:
 *  - `imageFor(profile, instance)`  → runtime image reference
 *  - `portSpecFor(instance)`        → `[{publish}]` rows for `container run -p`
 *  - `mountsFor(instance, tuple)`   → `[{arg}]` rows for `container run --mount`
 * Without them the registry still works for tests (no image, no ports).
 */
export function createInstanceRegistry({ backend, profile, volumeFor, now = () => Date.now(), ids, imageFor, portSpecFor, mountsFor } = {}) {
  const instances = new Map()

  function endpointsFor(published) {
    return {
      engine: published?.engine ?? null,
      cdp: published?.cdp ?? null,
      mcp: published?.mcp ?? null,
    }
  }

  async function ensure({ sessionId, policy, adopt = null }) {
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
      endpoints: endpointsFor(adopt?.endpoints),
      stateVolume: volumeFor(instanceId),
      artifacts: {
        identity: profile.build.digest,
        hash: profile.build.digest,
        consumed_at: new Date(now()).toISOString(),
      },
      attached: false,
      lastAttach: now(),
      containerName: adopt?.containerName || `dnls-${instanceId}`,
    }
    if (adopt?.skipCreate) {
      instances.set(instanceId, instance)
      return { ok: true, status: 201, instance }
    }
    await backend.create({
      containerName: instance.containerName,
      image: typeof imageFor === 'function' ? imageFor(profile, instance) : profile.build.base,
      resources: profile.runtime.isolation.resources,
      mounts: typeof mountsFor === 'function' ? mountsFor(instance, tuple) : mounts,
      ports: typeof portSpecFor === 'function' ? portSpecFor(instance) : [],
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

  /** Public, serializable view — never leaks mounts or stateVolume paths. */
  function list() {
    return [...instances.values()].map((row) => ({
      instanceId: row.instanceId,
      profileId: row.profileId,
      sessionId: row.sessionId,
      phase: row.phase,
      containerName: row.containerName,
      endpoints: row.endpoints,
      attached: row.attached,
      lastAttach: row.lastAttach,
    }))
  }

  return { ensure, reconcile, sweep, recordHistory, list, instances }
}
