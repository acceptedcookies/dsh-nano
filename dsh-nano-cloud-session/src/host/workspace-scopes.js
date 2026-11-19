/** In-memory WorkspaceScope registry: identity, generation, single-flight, barrier. */

import { randomBytes, randomUUID } from 'node:crypto'
import { parseRemoteSessionId } from '../providers/devin/session-id.js'
import { PROVIDER_KEY } from '../providers/devin/profile-codec.js'
import { WorkspaceError } from './errors.js'
import { HTTP_STATUS_FOR_REASON } from '../contracts/workspace-family.js'

/** Ready lookup and single-flight share one identity: a different epoch,
 *  requested root, or permission grant is a different scope entirely. */
function scopeTuple(providerKey, profileId, remoteSessionId, epoch, root, permissions) {
  return JSON.stringify([
    providerKey, profileId, remoteSessionId, epoch, root ?? null,
    permissions.fsWrite === true, permissions.process === true, permissions.forward === true,
  ])
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
    if (scope.invalid) return
    scope.invalid = true
    scope.generation = `${scope.generation}:dead`
    scope.resources = 'closing'
    /* Indexes drop synchronously: a dead scope must be unjoinable and a new
     * connect for the same key must not attach to the retiring in-flight. */
    if (byId.get(scope.id) === scope) byId.delete(scope.id)
    if (scope.key && byLogical.get(scope.key) === scope) byLogical.delete(scope.key)
    if (scope.key && inflight.get(scope.key) === scope.inflight) inflight.delete(scope.key)
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

    async connect(profile, body, factory, { grants } = {}) {
      const remote = parseRemoteSessionId(body.session_id ?? body.remoteSessionId)
      const epoch = configEpochOf ? configEpochOf(profile.id) : 0
      const permissions = {
        fsWrite: grants?.fsWrite === true,
        process: grants?.process === true,
        forward: grants?.forward === true,
      }
      const key = scopeTuple(PROVIDER_KEY, profile.id, remote.prefixed, epoch, body.root, permissions)
      const existing = byLogical.get(key)
      if (existing && !existing.invalid && existing.resources === 'ready') {
        return snapshot(existing)
      }
      const running = inflight.get(key)
      if (running) return running
      let pendingScope = null
      const work = (async () => {
        const abort = new AbortController()
        const scope = {
          id: newId(),
          key,
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
          /* Grants come only from the trusted in-process caller, never the
           * request body; everything defaults to denied. */
          permissions: Object.freeze(permissions),
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
        pendingScope = scope
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
          await scope.cleanup?.().catch(() => {})
          throw error
        } finally {
          if (inflight.get(key) === work) inflight.delete(key)
        }
      })()
      inflight.set(key, work)
      if (pendingScope) pendingScope.inflight = work
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
      if (byLogical.get(scope.key) === scope) byLogical.delete(scope.key)
      await scope.cleanup?.().catch(() => {})
      return { ok: true }
    },

    async invalidateProfile(profileId) {
      const jobs = []
      for (const scope of [...byId.values()]) {
        if (scope.profileId === profileId && !scope.invalid) {
          invalidate(scope, 'workspace-scope-expired')
          jobs.push(Promise.resolve().then(() => scope.cleanup?.()).catch(() => {}))
        }
      }
      await Promise.all(jobs)
    },

    async invalidateRemote(profileId, remoteSessionId) {
      const jobs = []
      for (const scope of [...byId.values()]) {
        if (scope.profileId === profileId && scope.remoteSessionId === remoteSessionId && !scope.invalid) {
          invalidate(scope, 'workspace-scope-expired')
          jobs.push(Promise.resolve().then(() => scope.cleanup?.()).catch(() => {}))
        }
      }
      await Promise.all(jobs)
    },

    async invalidateAll() {
      const jobs = [...byId.values()].map(scope => {
        invalidate(scope, 'workspace-scope-expired')
        return Promise.resolve().then(() => scope.cleanup?.()).catch(() => {})
      })
      byId.clear()
      byLogical.clear()
      await Promise.all(jobs)
    },

    /* Wrap the caller's promise so a result produced after invalidation is
     * never delivered: stale reads reject as expired, mutating calls as
     * outcome-unknown. No unhandled `.finally` chain is created. */
    track(scope, promise, { mutating = false } = {}) {
      const gen = scope.generation
      const reason = mutating ? 'workspace-outcome-unknown' : 'workspace-scope-expired'
      const result = Promise.resolve(promise).then(value => {
        if (scope.invalid || scope.generation !== gen) {
          throw new WorkspaceError(reason, 'scope ended before the call settled', { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 })
        }
        return value
      })
      waiters.add(result)
      const drop = () => { waiters.delete(result) }
      void result.then(drop, drop)
      return result
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
