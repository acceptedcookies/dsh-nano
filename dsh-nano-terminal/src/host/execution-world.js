/** Optional H-EXEC consumer. Does not import DNCS. */

export function resolveExecutionWorld(ctx, sessionId) {
  const owner = typeof ctx.get === 'function' ? ctx.get('workspaceExecution') : ctx.workspaceExecution
  const binding = sessionId && owner && typeof owner.get === 'function' ? owner.get(sessionId) : null
  /* A session the carrier marked as remote but whose formal binding is gone
   * is still remote: defaulting to the host subprocess would silently run a
   * "cloud" terminal on the local machine. Fail closed instead. */
  if (sessionId && binding == null) {
    const header = (typeof ctx.get === 'function' ? ctx.get('sessions') : ctx.sessions)?.get?.(sessionId)?.header
    if (header?.executionWorld === 'unbound-remote') {
      return { kind: 'remote', identity: String(sessionId), generation: 'unbound', root: null, subprocess: null, signal: undefined, unbound: true }
    }
  }
  /* A binding record — even a partial one without a subprocess — means the
   * session is remote-owned; falling through to the host lane would silently
   * run a "cloud" terminal on this machine. */
  if (binding != null) {
    return {
      kind: 'remote',
      identity: binding.identity ?? String(sessionId),
      generation: binding.generation,
      root: binding.root ?? null,
      subprocess: binding.subprocess,
      signal: binding.signal,
      unbound: !(binding.subprocess && binding.generation),
    }
  }
  return {
    kind: 'local',
    identity: 'local',
    generation: 'local',
    root: null,
    subprocess: ctx.subprocess,
    signal: undefined,
  }
}

/* Allowlist, not denylist: a remote process inherits nothing the caller
 * did not need — anything beyond display basics is opt-in upstream. */
const REMOTE_ENV_ALLOW = new Set(['TERM', 'LANG', 'LC_ALL', 'COLORTERM'])

export function remoteChildEnv(baseEnv) {
  const env = {}
  for (const key of REMOTE_ENV_ALLOW) {
    if (typeof baseEnv[key] === 'string') env[key] = baseEnv[key]
  }
  return env
}
