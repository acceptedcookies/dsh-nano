/** Domain scheduler for workspace connect + MCP resource ops. */

import { RESOURCE_CODECS, RESOURCE_OPERATION_IDS, HTTP_STATUS_FOR_REASON } from '../contracts/workspace-family.js'
import { WorkspaceError } from './errors.js'
import { resolveIdentityFile, knownHostsPath, buildSshArgv, spawnSsh, fallbackIdentityFile } from '../providers/devin/ssh.js'
import { probeWorkspace, publishArtifact, ensureKnownHostsFile } from '../providers/devin/bootstrap.js'
import { createMcpClient } from '../providers/devin/mcp-client.js'
import { resolveNativeChat } from '../host-adapters/native-chat.js'
import { HOST_ADAPTER_UNAVAILABLE } from '../host-adapters/execution.js'
import { mcpToolsList } from '../contracts/workspace-family.js'

function fail(reason, message) {
  throw new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 })
}

export function freezeWorkspaceRoot(probed, requested) {
  const base = String(probed ?? '').replace(/\/+$/, '').trim()
  const want = requested == null || requested === '' ? base : String(requested).replace(/\/+$/, '').trim()
  if (!base.startsWith('/')) fail('workspace-unavailable', 'probe pwd did not return an absolute root')
  if (!want.startsWith('/')) fail('invalid-request', 'workspace root must be an absolute path')
  if (!/^[A-Za-z0-9._/=+-]+$/.test(want) || /(^|\/)\.\.(\/|$)/.test(want)) {
    fail('invalid-request', 'workspace root contains unsafe characters')
  }
  if (want !== base && !want.startsWith(`${base}/`)) {
    fail('workspace-denied', 'workspace root must be the probed cwd or a subdirectory')
  }
  return want
}

const WRITE_OPS = new Set(['fs.write', 'fs.mkdir', 'fs.rename', 'fs.remove'])
const PROCESS_OPS = new Set(['process.start', 'process.terminate'])

export function createResourceService({ scopes, api, home, spawnImpl, artifactPath }) {
  const connectScope = async (scope, { body, signal }) => {
    const profile = scope.profileSnapshot
    let session
    try {
      session = await api.getSession(profile, scope.remote.bare)
      scope.api = 'ready'
      scope.remoteSessionStatus = session?.status ?? null
    } catch (error) {
      if (error?.reason === 'forbidden-or-invisible') {
        fail('workspace-denied', error.message)
      }
      scope.api = 'unavailable'
      fail('workspace-unavailable', error?.message ?? 'API identity check failed')
    }
    if (body.identityFile) fail('invalid-request', 'identityFile cannot be supplied by the client')
    let identityFile = resolveIdentityFile({ home })
    const knownHostsFile = ensureKnownHostsFile(home)
    const expectedFingerprint = typeof body.expectedFingerprint === 'string' ? body.expectedFingerprint : undefined
    scope.resources = 'verifying'
    const probeWith = (file) => probeWorkspace({
      sessionId: scope.remoteSessionId,
      identityFile: file,
      knownHostsFile,
      spawnImpl,
      expectedFingerprint,
    })
    let inspect
    try {
      inspect = await probeWith(identityFile)
    } catch (error) {
      const fallback = fallbackIdentityFile(identityFile)
      if (fallback && error?.reason === 'workspace-unavailable') {
        identityFile = fallback
        inspect = await probeWith(identityFile)
      } else {
        throw error
      }
    }
    const probed = String(inspect.probe.find(p => p.argv[0] === 'pwd')?.stdout ?? '').trim()
    const root = freezeWorkspaceRoot(probed, body.root)
    const published = await publishArtifact({
      sessionId: scope.remoteSessionId,
      identityFile,
      knownHostsFile,
      spawnImpl,
      expectedFingerprint,
      artifact: artifactPath,
    })
    const nodeBin = inspect.node.startsWith('/') ? inspect.node.split(' ')[0] : 'node'
    const argv = buildSshArgv({
      identityFile,
      knownHostsFile,
      sessionId: scope.remoteSessionId,
      remoteArgv: [nodeBin, published.remoteFile, '--root', root],
    })
    const child = spawnSsh(argv, { spawnImpl })
    const client = createMcpClient(child)
    scope.cleanup = async () => {
      client.close()
    }
    if (signal?.aborted) {
      client.close()
      fail('workspace-scope-expired', 'connect aborted')
    }
    await client.initialize()
    const listed = await client.listTools()
    const names = new Set(listed.map(t => t.name))
    for (const tool of mcpToolsList()) {
      if (!names.has(tool.name)) fail('workspace-failed', `remote tool surface mismatch: missing ${tool.name}`)
    }
    const remoteInspect = await client.call('workspace.inspect', {})
    const confirmed = root.replace(/\/+$/, '')
    const remoteRoot = String(remoteInspect.root ?? '').replace(/\/+$/, '')
    if (remoteRoot !== confirmed && !remoteRoot.startsWith(`${confirmed}/`) && !confirmed.startsWith(`${remoteRoot}/`)) {
      fail('workspace-failed', 'remote root does not match the confirmed path')
    }
    scope.mcp = client
    scope.child = child
    return {
      root: remoteInspect.root ?? root,
      inspect: {
        ...inspect,
        remote: { ...remoteInspect, ...HOST_ADAPTER_UNAVAILABLE },
      },
      api: 'ready',
      resources: 'ready',
      nativeView: 'unavailable',
      remoteSessionStatus: session?.status ?? null,
      ...HOST_ADAPTER_UNAVAILABLE,
    }
  }

  return {
    connectFactory: (scope, ctx) => connectScope(scope, ctx),
    async call(scopeId, op, input) {
      if (!RESOURCE_OPERATION_IDS.includes(op)) fail('invalid-request', `unknown resource op ${op}`)
      const body = input ?? {}
      const {
        op: _op, scopeId: _scopeId, profileId: _profileId, generation,
        ...fields
      } = body
      const decoded = RESOURCE_CODECS[op].decode(fields)
      const scope = scopes.requireReady(scopeId, {
        write: WRITE_OPS.has(op),
        process: PROCESS_OPS.has(op),
      })
      if (generation !== undefined && generation !== scope.generation) {
        fail('workspace-scope-expired', 'generation mismatch')
      }
      if (!scope.mcp) fail('workspace-unavailable', 'MCP client is not attached')
      const work = scope.mcp.call(op, decoded)
      return scopes.track(scope, work)
    },
    nativeChatStatus(ctx) {
      return resolveNativeChat(ctx)
    },
  }
}
