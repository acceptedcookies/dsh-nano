/** Devin provider mapping: capability references into the two families.
 *  Not a runtime registry and not a second inputSchema author. */

import { SESSION_FAMILY } from '../../contracts/session-family.js'
import { WORKSPACE_FAMILY, RESOURCE_OPERATION_IDS } from '../../contracts/workspace-family.js'
export { PROVIDER_KEY, PLUGIN, DISPLAY } from './display.js'
import { PROVIDER_KEY, PLUGIN, DISPLAY } from './display.js'

const sessionOps = Object.keys(SESSION_FAMILY.operations)
const workspaceOps = Object.keys(WORKSPACE_FAMILY.operations)

/* Honest facets: which ops are host-local bookkeeping, which need the native
 * chat surface, which ride the SSH lane, and which hit the carrier REST API.
 * The lists partition the family — every op is in exactly one lane. */
const localOps = Object.freeze([
  'config.list', 'config.save', 'config.remove', 'config.activate', 'config.security',
  'session.workspace_shell',
])
const nativeOps = Object.freeze(['session.native_open'])
const sshOps = Object.freeze(['config.ssh-key', 'ssh.info', ...workspaceOps])

export const DEVIN_DEFINITION = Object.freeze({
  providerKey: PROVIDER_KEY,
  plugin: PLUGIN,
  display: DISPLAY,
  families: Object.freeze({
    session: SESSION_FAMILY.contractId,
    workspace: WORKSPACE_FAMILY.contractId,
  }),
  handlers: Object.freeze({
    local: localOps,
    native: nativeOps,
    ssh: sshOps,
    api: Object.freeze(sessionOps.filter(id => !localOps.includes(id) && !nativeOps.includes(id) && !sshOps.includes(id))),
  }),
  resourceOperations: RESOURCE_OPERATION_IDS,
  constraints: Object.freeze({
    localPlatform: 'darwin',
    remoteOs: 'linux',
    remoteNode: '>=20',
    gateway: 'ssh.devin.ai',
  }),
})

export function assertKnownProvider(providerKey) {
  if (providerKey !== PROVIDER_KEY) {
    const error = new Error(`unknown provider ${providerKey}`)
    error.reason = 'invalid-request'
    throw error
  }
  return PROVIDER_KEY
}

export function operationSurface() {
  return Object.freeze({
    session: sessionOps.slice(),
    workspace: workspaceOps.slice(),
    mcp: RESOURCE_OPERATION_IDS.slice(),
  })
}
