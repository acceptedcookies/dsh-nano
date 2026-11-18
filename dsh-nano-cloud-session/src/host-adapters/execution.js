/** H-EXEC thin consumer. No private ctx.nanoCloudSession. No DNEE/DNT import. */

export function resolveExecutionBinding(ctx, identity) {
  const owner = typeof ctx.get === 'function' ? ctx.get('workspaceExecution') : ctx.workspaceExecution
  if (owner && typeof owner.get === 'function') {
    const binding = owner.get(identity)
    if (binding?.fs && binding?.subprocess && binding?.generation) {
      return { available: true, binding }
    }
  }
  return {
    available: false,
    reason: 'workspace-unavailable',
    message: 'host has no per-session remote execution binding (H-EXEC)',
    evidence: {
      packages: ['@deepseek-ai/dsh-fs', '@deepseek-ai/dsh-subprocess', '@deepseek-ai/dsh-api-workspace-files'],
      version: '0.2.2-rc.1',
      note: 'replaceable FileSystem/Subprocess exist; session-routed remote worlds do not',
    },
  }
}

export function localWorld(ctx) {
  return {
    kind: 'local',
    identity: 'local',
    generation: 'local',
    root: null,
    fs: ctx.fs,
    subprocess: ctx.subprocess,
  }
}

export const HOST_ADAPTER_UNAVAILABLE = Object.freeze({
  pty: Object.freeze({ supported: false, reason: 'NATIVE_UNAVAILABLE' }),
  forward: Object.freeze({ supported: false, reason: 'NATIVE_UNAVAILABLE' }),
})

export function worldFor(ctx, sessionId) {
  const remote = resolveExecutionBinding(ctx, sessionId)
  if (remote.available) {
    return { kind: 'remote', ...remote.binding }
  }
  const error = new Error(remote.message)
  error.reason = 'workspace-unavailable'
  error.httpStatus = 503
  throw error
}
