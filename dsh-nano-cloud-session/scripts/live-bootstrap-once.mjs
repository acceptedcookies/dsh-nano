#!/usr/bin/env node
/** One-shot authorized bootstrap against an explicitly selected Devin VM.
 *  Required: DNCS_LIVE_WORKSPACE=1 DNCS_PROBE_SESSION=devin-… DNCS_PROBE_PROFILE=<profile-id>
 *  Optional: DNCS_SSH_IDENTITY, DSH_HOME,
 *            DNCS_EXPECTED_FINGERPRINT.
 *  The remote root is an exclusive `mktemp -d` under the probed cwd — never a
 *  business path. All writes are create-only; nothing is deleted. */
import { spawn } from 'node:child_process'
import { publishArtifact, probeWorkspace, artifactPath } from '../src/providers/devin/bootstrap.js'
import { buildSshArgv, spawnSsh } from '../src/providers/devin/ssh.js'
import { createMcpClient } from '../src/providers/devin/mcp-client.js'
import { probeTarget, assertProbeIdentity, claimPrivateRoot } from './lib/probe-target.mjs'
import { createDevinApi } from '../src/providers/devin/api.js'

if (process.env.DNCS_LIVE_WORKSPACE !== '1' || !process.env.DNCS_PROBE_SESSION || !process.env.DNCS_PROBE_PROFILE) {
  console.error('need DNCS_LIVE_WORKSPACE=1, DNCS_PROBE_SESSION and DNCS_PROBE_PROFILE')
  process.exit(2)
}

const { sessionId, profile, identityFile, knownHostsFile, expectedFingerprint } = probeTarget()
/* Verify the named session/org resolves under the named profile before SSH. */
await assertProbeIdentity({ api: createDevinApi(), profile, sessionId })
const inspect = await probeWorkspace({ sessionId, identityFile, knownHostsFile, expectedFingerprint })
const root = await claimPrivateRoot({
  sessionId, identityFile, knownHostsFile, expectedFingerprint, probe: inspect,
})
const published = await publishArtifact({
  sessionId, identityFile, knownHostsFile, expectedFingerprint, artifact: artifactPath(), spawnImpl: spawn,
})
const nodeBin = inspect.node.startsWith('/') ? inspect.node.split(' ')[0] : 'node'
const argv = buildSshArgv({
  identityFile, knownHostsFile, sessionId,
  remoteArgv: [nodeBin, published.remoteFile, '--root', root],
})
const child = spawnSsh(argv, { spawnImpl: spawn })
const client = createMcpClient(child)
const facts = { ok: false }
try {
  await client.initialize()
  const tools = await client.listTools()
  const remote = await client.call('workspace.inspect', {})
  await client.call('fs.mkdir', { path: 'probe' })
  const payload = Buffer.from(`dncs-1119 ${new Date().toISOString()}`).toString('base64')
  await client.call('fs.write', { path: 'probe/sentinel.txt', bytes: payload, createOnly: true })
  const read = await client.call('fs.read', { path: 'probe/sentinel.txt', offset: 0, length: 256 })
  Object.assign(facts, {
    ok: tools.length > 0 && remote.root === root && read.bytes === payload,
    tools: tools.length,
    rootMatches: remote.root === root,
    bytesEqual: read.bytes === payload,
    hashMatches: published.hash.length === 64,
    reused: published.reused === true,
  })
} finally {
  await client.close()
}
console.log(JSON.stringify(facts, null, 2))
process.exit(facts.ok ? 0 : 1)
