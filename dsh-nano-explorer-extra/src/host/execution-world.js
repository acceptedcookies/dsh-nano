/** Optional H-EXEC consumer. Does not import DNCS. Local behaviour is unchanged
 *  when the host has no workspaceExecution binding. */

export function resolveExecutionWorld(ctx, sessionId, root) {
  const owner = typeof ctx.get === 'function' ? ctx.get('workspaceExecution') : ctx.workspaceExecution
  const binding = sessionId && owner && typeof owner.get === 'function' ? owner.get(sessionId) : null
  /* Any binding record means the session is remote-owned — a partial record
   * missing fs/generation must not fall through to the host-local world. */
  if (binding != null) {
    return {
      kind: 'remote',
      identity: binding.identity ?? String(sessionId),
      generation: binding.generation,
      root: binding.root ?? root,
      fs: binding.fs,
      subprocess: binding.subprocess,
      watch: binding.watch,
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

/** Remote-marked sessions must not fall back to the host cwd. */
export function assertBoundWorld(header, world) {
  if (header?.executionWorld === 'unbound-remote' && world.kind !== 'remote') {
    throw new Error('this session has no working directory')
  }
}
