import { resolve, sep } from 'node:path'

/**
 * Image build goes through ctx.sandbox.confine or fails closed.
 * This module never calls a naked spawn, npm, or curl.
 */
export async function buildImage({ ctx, profileDir, checkout, argv }) {
  const naked = { spawn: 0, execFile: 0, npm: 0, curl: 0 }
  const root = resolve(profileDir)
  const target = resolve(checkout)
  const inside = target === root || target.startsWith(root + sep)
  if (String(checkout).includes('..') || !inside) {
    return { ok: false, status: 400, error: 'checkout-path', confined: 0, naked, argv: null }
  }
  if (typeof ctx?.sandbox?.confine !== 'function') {
    const error = new Error('ctx.sandbox.confine is required')
    error.naked = naked
    error.confined = 0
    throw error
  }
  const command = argv ?? ['container', 'build', '-t', 'kitesurf-engine', profileDir]
  const confined = await ctx.sandbox.confine(command)
  return { ok: true, status: 200, confined: 1, naked, argv: confined?.argv ?? command }
}
