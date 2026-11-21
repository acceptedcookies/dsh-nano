/**
 * dnls.control/1 — the managed object-surface contract version (T-O-50).
 * Discovery is target-less and read-only: it lists implemented declared
 * capability ids and grants no authority over any object.
 */

export const CONTRACT_VERSION = 'dnls.control/1'

export function discovery(capabilities) {
  return { contractVersion: CONTRACT_VERSION, capabilities: [...capabilities] }
}
