/** Devin provider mapping: capability references into the two families.
 *  Not a runtime registry and not a second inputSchema author. */

import { SESSION_FAMILY } from '../../contracts/session-family.js'
import { WORKSPACE_FAMILY, RESOURCE_OPERATION_IDS } from '../../contracts/workspace-family.js'

export const PROVIDER_KEY = 'devin'
export const PLUGIN = 'dsh-nano-cloud-session'
export const DISPLAY = Object.freeze({
  id: 'devin',
  label: { zh: 'Devin Cloud', en: 'Devin Cloud' },
  defaultBaseUrl: 'https://api.devin.ai',
})

const sessionOps = Object.keys(SESSION_FAMILY.operations)
const workspaceOps = Object.keys(WORKSPACE_FAMILY.operations)

export const DEVIN_DEFINITION = Object.freeze({
  providerKey: PROVIDER_KEY,
  plugin: PLUGIN,
  display: DISPLAY,
  families: Object.freeze({
    session: SESSION_FAMILY.contractId,
    workspace: WORKSPACE_FAMILY.contractId,
  }),
  handlers: Object.freeze({
    api: sessionOps.filter(id => id !== 'config.ssh-key'),
    ssh: ['config.ssh-key', ...workspaceOps],
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
