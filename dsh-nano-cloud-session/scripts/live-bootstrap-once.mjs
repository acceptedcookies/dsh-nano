#!/usr/bin/env node
/** One-shot authorized bootstrap against the owner-named Devin VM. */
import { spawn } from 'node:child_process'
import { publishArtifact, probeWorkspace, ensureKnownHostsFile, artifactPath } from '../src/providers/devin/bootstrap.js'
import { resolveIdentityFile, knownHostsPath, buildSshArgv, spawnSsh } from '../src/providers/devin/ssh.js'
import { createMcpClient } from '../src/providers/devin/mcp-client.js'

const sessionId = process.env.DNCS_PROBE_SESSION
if (!sessionId || process.env.DNCS_LIVE_WORKSPACE !== '1') {
  console.error('need DNCS_LIVE_WORKSPACE=1 and DNCS_PROBE_SESSION')
  process.exit(2)
}
const home = process.env.DSH_HOME || process.env.HOME
const identityFile = process.env.DNCS_SSH_IDENTITY || resolveIdentityFile({ home })
const knownHostsFile = ensureKnownHostsFile(home)
const expectedFingerprint = process.env.DNCS_EXPECTED_FINGERPRINT
const inspect = await probeWorkspace({ sessionId, identityFile, knownHostsFile, expectedFingerprint })
const published = await publishArtifact({
  sessionId, identityFile, knownHostsFile, expectedFingerprint, artifact: artifactPath(), spawnImpl: spawn,
})
const nodeBin = inspect.node.startsWith('/') ? inspect.node.split(' ')[0] : 'node'
const root = '/home/ubuntu/repos/dsh-nano'
const argv = buildSshArgv({
  identityFile, knownHostsFile, sessionId,
  remoteArgv: [nodeBin, published.remoteFile, '--root', root],
})
const child = spawnSsh(argv, { spawnImpl: spawn })
const client = createMcpClient(child)
try {
  await client.initialize()
  const tools = await client.listTools()
  const facts = await client.call('workspace.inspect', {})
  const dir = `dncs-1119-probe`
  try { await client.call('fs.mkdir', { path: dir }) } catch { /* exists */ }
  const payload = Buffer.from(`dncs-1119 ${new Date().toISOString()}`).toString('base64')
  const written = await client.call('fs.write', { path: `${dir}/sentinel.txt`, bytes: payload, createOnly: false })
  const read = await client.call('fs.read', { path: `${dir}/sentinel.txt`, offset: 0, length: 256 })
  console.log(JSON.stringify({
    tools: tools.length,
    root: facts.root,
    os: facts.os,
    runtime: facts.runtime,
    pty: facts.pty,
    forward: facts.forward,
    wrote: written,
    read: Buffer.from(read.bytes, 'base64').toString(),
    hash: published.hash,
  }, null, 2))
} finally {
  client.close()
}
void knownHostsPath
