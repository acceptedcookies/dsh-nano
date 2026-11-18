/** Domain scheduler for workspace connect + MCP resource ops. */

import { RESOURCE_CODECS, RESOURCE_OPERATION_IDS, HTTP_STATUS_FOR_REASON } from '../contracts/workspace-family.js'
import { WorkspaceError } from './errors.js'
import { resolveIdentityFile, knownHostsPath, buildSshArgv, spawnSsh } from '../providers/devin/ssh.js'
import { probeWorkspace, publishArtifact, ensureKnownHostsFile } from '../providers/devin/bootstrap.js'
import { createMcpClient } from '../providers/devin/mcp-client.js'
import { resolveNativeChat } from '../host-adapters/native-chat.js'
import { mcpToolsList } from '../contracts/workspace-family.js'

function fail(reason, message) {
  throw new WorkspaceError(reason, message, { httpStatus: HTTP_STATUS_FOR_REASON[reason] ?? 502 })
}

const WRITE_OPS = new Set(['fs.write', 'fs.mkdir', 'fs.rename', 'fs.remove'])
const PROCESS_OPS = new Set(['process.start', 'process.terminate'])

export function createResourceService({ scopes, api, home, spawnImpl, artifactPath }) {
  const connectScope = async (scope, { body, signal }) => {
    const profile = scope.profileSnapshot
    let session
    try {
      session = await api.getSession(profile, scope.remoteSessionId)
      scope.api = 'ready'
      scope.remoteSessionStatus = session?.status ?? null
    } catch (error) {
      if (error?.reason === 'forbidden-or-invisible') {
        fail('workspace-denied', error.message)
      }
      scope.api = 'unavailable'
      fail('workspace-unavailable', error?.message ?? 'API identity check failed')
    }
    const identityFile = resolveIdentityFile({ home, identityFile: body.identityFile })
    const knownHostsFile = ensureKnownHostsFile(home)
    const acceptHostKey = body.acceptHostKey === true
    scope.resources = 'verifying'
    const inspect = await probeWorkspace({
      sessionId: scope.remoteSessionId,
      identityFile,
      knownHostsFile,
      spawnImpl,
      acceptHostKey,
    })
    const root = String(body.root ?? inspect.probe.find(p => p.argv[0] === 'pwd')?.stdout ?? '').trim()
    if (!root || !root.startsWith('/')) fail('invalid-request', 'workspace root must be an absolute path')
    if (!/^[A-Za-z0-9._/=+-]+$/.test(root)) fail('invalid-request', 'workspace root contains unsafe characters')
    const published = await publishArtifact({
      sessionId: scope.remoteSessionId,
      identityFile,
      knownHostsFile,
      spawnImpl,
      acceptHostKey,
      artifact: artifactPath,
    })
    const nodeBin = inspect.node.startsWith('/') ? inspect.node.split(' ')[0] : 'node'
    const argv = buildSshArgv({
      identityFile,
      knownHostsFile,
      sessionId: scope.remoteSessionId,
      strictHostKeyChecking: acceptHostKey ? 'accept-new' : 'yes',
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
    if (remoteInspect.root !== root && !String(remoteInspect.root).startsWith(root)) {
      /* realpath may resolve the root; require it still names the confirmed tree */
      if (!String(remoteInspect.root).includes(root.split('/').pop())) {
        fail('workspace-failed', 'remote root does not match the confirmed path')
      }
    }
    scope.mcp = client
    scope.child = child
    return {
      root: remoteInspect.root ?? root,
      inspect: { ...inspect, remote: remoteInspect },
      api: 'ready',
      resources: 'ready',
      nativeView: 'unavailable',
      remoteSessionStatus: session?.status ?? null,
    }
  }

  return {
    connectFactory: (scope, ctx) => connectScope(scope, ctx),
    async call(scopeId, op, input) {
      if (!RESOURCE_OPERATION_IDS.includes(op)) fail('invalid-request', `unknown resource op ${op}`)
      const decoded = RESOURCE_CODECS[op].decode(input ?? {})
      const scope = scopes.requireReady(scopeId, {
        write: WRITE_OPS.has(op),
        process: PROCESS_OPS.has(op),
      })
      if (scope.generation !== (input?.generation ?? scope.generation)) {
        fail('workspace-scope-expired', 'generation mismatch')
      }
      if (!scope.mcp) fail('workspace-unavailable', 'MCP client is not attached')
      return scope.mcp.call(op, decoded)
    },
    nativeChatStatus(ctx) {
      return resolveNativeChat(ctx)
    },
  }
}
