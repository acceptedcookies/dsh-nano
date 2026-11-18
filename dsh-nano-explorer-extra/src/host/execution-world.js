/** Optional H-EXEC consumer. Does not import DNCS. Local behaviour is unchanged
 *  when the host has no workspaceExecution binding. */

export function resolveExecutionWorld(ctx, sessionId, root) {
  const owner = typeof ctx.get === 'function' ? ctx.get('workspaceExecution') : ctx.workspaceExecution
  const binding = sessionId && owner && typeof owner.get === 'function' ? owner.get(sessionId) : null
  if (binding?.fs && binding?.generation) {
    return {
      kind: 'remote',
      identity: binding.identity ?? String(sessionId),
      generation: binding.generation,
      root: binding.root ?? root,
      fs: binding.fs,
      subprocess: binding.subprocess,
    }
  }
  return {
    kind: 'local',
    identity: 'local',
    generation: 'local',
    root,
    fs: ctx.fs,
    subprocess: ctx.subprocess,
  }
}

export function worldCacheKey(world, suffix = '') {
  return `${world.kind}:${world.identity}:${world.generation}:${world.root ?? ''}:${suffix}`
}
