/** H-CHAT thin consumer. 0.2.2-rc.1 has no external-session view that can
 *  skip full Agent obligations (cancel/idle/steer). Missing → NATIVE_UNAVAILABLE. */

export function resolveNativeChat(ctx) {
  const owner = typeof ctx.get === 'function' ? ctx.get('externalChat') : ctx.externalChat
  if (owner && typeof owner.open === 'function' && owner.capabilities?.externalProjection === true) {
    return { available: true, owner }
  }
  return {
    available: false,
    reason: 'NATIVE_UNAVAILABLE',
    message: 'host has no formal external Chat view (H-CHAT); native projection is unavailable',
    evidence: {
      package: '@deepseek-ai/dsh-agent@0.2.2-rc.1',
      note: 'agents.enter requires a full Agent; fake Agent is forbidden (F22)',
    },
  }
}
