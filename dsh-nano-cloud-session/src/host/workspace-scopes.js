/** In-memory WorkspaceScope registry: identity, generation, single-flight, barrier. */

import { randomBytes, randomUUID } from 'node:crypto'
import { parseRemoteSessionId } from '../providers/devin/session-id.js'
import { PROVIDER_KEY } from '../providers/devin/profile-codec.js'
import { WorkspaceError } from './errors.js'
import { HTTP_STATUS_FOR_REASON } from '../contracts/workspace-family.js'

function logicalKey(providerKey, profileId, remoteSessionId) {
  return `${providerKey}\0${profileId}\0${remoteSessionId}`
}

function newId() {
  return randomBytes(18).toString('base64url')
}

function fail(reason, message) {
  throw new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 })
}

export function createWorkspaceScopes({ configEpochOf } = {}) {
  const byId = new Map()
  const byLogical = new Map()
  const inflight = new Map()
  const waiters = new Set()

  const snapshot = (scope) => ({
    scopeId: scope.id,
    providerKey: scope.providerKey,
    profileId: scope.profileId,
    remoteSessionId: scope.remoteSessionId,
    generation: scope.generation,
    configEpoch: scope.configEpoch,
    root: scope.root,
    api: scope.api,
    resources: scope.resources,
    nativeView: scope.nativeView,
    remoteSessionStatus: scope.remoteSessionStatus,
    permissions: { ...scope.permissions },
    inspect: scope.inspect,
  })

  const get = (scopeId) => {
    const scope = byId.get(String(scopeId ?? ''))
    if (!scope || scope.invalid) fail('workspace-scope-expired', 'workspace scope is not valid')
    return scope
  }

  const invalidate = (scope, reason = 'workspace-scope-expired') => {
    scope.invalid = true
    scope.generation = `${scope.generation}:dead`
    scope.resources = 'closing'
    try { scope.abort.abort({ reason }) } catch { /* already aborted */ }
    for (const waiter of [...scope.barriers]) {
      try { waiter(reason) } catch { /* ignore */ }
    }
    scope.barriers.clear()
  }

  return {
    snapshot,
    get,
    getIf(scopeId) { return byId.get(String(scopeId ?? '')) ?? null },
    list() { return [...byId.values()].filter(s => !s.invalid).map(snapshot) },

    logicalKey(profile, remote) {
      const id = parseRemoteSessionId(remote)
      return logicalKey(PROVIDER_KEY, profile.id, id.prefixed)
    },

    async connect(profile, body, factory) {
      const remote = parseRemoteSessionId(body.session_id ?? body.remoteSessionId)
      const key = logicalKey(PROVIDER_KEY, profile.id, remote.prefixed)
      const epoch = configEpochOf ? configEpochOf() : 0
      const existing = byLogical.get(key)
      if (existing && !existing.invalid && existing.configEpoch === epoch && existing.resources === 'ready') {
        return snapshot(existing)
      }
      const running = inflight.get(key)
      if (running) return running
      const work = (async () => {
        const abort = new AbortController()
        const scope = {
          id: newId(),
          providerKey: PROVIDER_KEY,
          profileId: profile.id,
          remoteSessionId: remote.prefixed,
          remote: remote,
          generation: randomUUID(),
          configEpoch: epoch,
          root: null,
          api: 'checking',
          resources: 'connecting',
          nativeView: 'unavailable',
          remoteSessionStatus: null,
          permissions: Object.freeze({
            fsWrite: body.authorize?.includes?.('fs.write') === true,
            process: body.authorize?.includes?.('process.start') === true,
            forward: body.authorize?.includes?.('forward') === true,
          }),
          inspect: null,
          handles: new Map(),
          tunnels: new Map(),
          barriers: new Set(),
          abort,
          invalid: false,
          profileSnapshot: Object.freeze({
            id: profile.id,
            orgId: profile.orgId,
            baseUrl: profile.baseUrl,
            secret: profile.secret,
          }),
        }
        byId.set(scope.id, scope)
        byLogical.set(key, scope)
        try {
          const result = await factory(scope, { signal: abort.signal, body })
          if (scope.invalid) fail('workspace-scope-expired', 'workspace scope expired during connect')
          if (result?.root) scope.root = result.root
          if (result?.inspect) scope.inspect = result.inspect
          if (result?.remoteSessionStatus) scope.remoteSessionStatus = result.remoteSessionStatus
          scope.api = result?.api ?? 'ready'
          scope.resources = result?.resources ?? 'ready'
          scope.nativeView = result?.nativeView ?? 'unavailable'
          return snapshot(scope)
        } catch (error) {
          invalidate(scope, error?.reason ?? 'workspace-failed')
          byId.delete(scope.id)
          if (byLogical.get(key) === scope) byLogical.delete(key)
          await scope.cleanup?.().catch(() => {})
          throw error
        } finally {
          inflight.delete(key)
        }
      })()
      inflight.set(key, work)
      const tracked = work.catch(error => error)
      waiters.add(tracked)
      tracked.finally(() => waiters.delete(tracked))
      return work
    },

    status(scopeId) { return snapshot(get(scopeId)) },

    async disconnect(scopeId) {
      const scope = get(scopeId)
      invalidate(scope, 'disconnect')
      byId.delete(scope.id)
      const key = logicalKey(scope.providerKey, scope.profileId, scope.remoteSessionId)
      if (byLogical.get(key) === scope) byLogical.delete(key)
      await scope.cleanup?.().catch(() => {})
      return { ok: true }
    },

    invalidateProfile(profileId) {
      for (const scope of [...byId.values()]) {
        if (scope.profileId === profileId && !scope.invalid) invalidate(scope, 'workspace-scope-expired')
      }
    },

    invalidateAll() {
      for (const scope of [...byId.values()]) invalidate(scope, 'workspace-scope-expired')
      byId.clear()
      byLogical.clear()
    },

    track(scope, promise) {
      waiters.add(promise)
      promise.finally(() => waiters.delete(promise))
      return promise
    },

    async drain() {
      await Promise.allSettled([...waiters])
    },

    requireReady(scopeId, { write = false, process = false, forward = false } = {}) {
      const scope = get(scopeId)
      if (scope.resources !== 'ready') fail('workspace-unavailable', 'workspace resources are not ready')
      if (write && !scope.permissions.fsWrite) fail('workspace-denied', 'fs write is not authorized')
      if (process && !scope.permissions.process) fail('workspace-denied', 'process execution is not authorized')
      if (forward && !scope.permissions.forward) fail('workspace-denied', 'port forward is not authorized')
      return scope
    },
  }
}
