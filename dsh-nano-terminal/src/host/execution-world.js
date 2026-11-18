/** Optional H-EXEC consumer. Does not import DNCS. */

export function resolveExecutionWorld(ctx, sessionId) {
  const owner = typeof ctx.get === 'function' ? ctx.get('workspaceExecution') : ctx.workspaceExecution
  const binding = sessionId && owner && typeof owner.get === 'function' ? owner.get(sessionId) : null
  if (binding?.subprocess && binding?.generation) {
    return {
      kind: 'remote',
      identity: binding.identity ?? String(sessionId),
      generation: binding.generation,
      root: binding.root ?? null,
      subprocess: binding.subprocess,
      signal: binding.signal,
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

export function remoteChildEnv(baseEnv) {
  const env = { ...baseEnv }
  delete env.DNT_API
  delete env.SSH_AUTH_SOCK
  for (const key of Object.keys(env)) {
    if (key.startsWith('DSH_') && /TOKEN|SECRET|KEY/.test(key)) delete env[key]
  }
  return env
}
