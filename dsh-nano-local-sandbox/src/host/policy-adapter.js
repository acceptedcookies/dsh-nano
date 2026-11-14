import { createHash } from 'node:crypto'

/** SHA-256 of the four frozen keys, in this order. extraRoots are sorted. */
export function policyFingerprint({ sessionId, mode, workspaceRoot, extraRoots = [] }) {
  const json = JSON.stringify({
    sessionId,
    mode,
    workspaceRoot,
    extraRoots: [...extraRoots].map(String).sort(),
  })
  return createHash('sha256').update(json, 'utf8').digest('hex')
}

export function tupleFromPolicy(policy) {
  return {
    sessionId: policy.sessionId,
    mode: policy.mode,
    workspaceRoot: policy.workspaceRoot,
    extraRoots: policy.additionalWritableRoots ?? policy.extraRoots ?? [],
  }
}
