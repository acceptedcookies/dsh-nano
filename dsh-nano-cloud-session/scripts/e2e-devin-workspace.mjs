#!/usr/bin/env node
/** Live pairing E2E for design-1119 §11.4. Explicit opt-in only. Never `npm test`.
 *  Required: DNCS_LIVE_WORKSPACE=1 DNCS_PROBE_SESSION=devin-… DNCS_PROBE_PROFILE=<profile-id>
 *  Optional: DNCS_SSH_IDENTITY, DSH_HOME (default ~/.dsh-dev),
 *            DNCS_EXPECTED_FINGERPRINT when known_hosts is empty.
 *
 *  Bounds: the remote root is an exclusive `mktemp -d` under the probed cwd —
 *  never a business path. Writes are create-only, nothing pre-existing is
 *  deleted, and the output is boolean facts only (no paths, tokens or bytes).
 */
if (process.env.DNCS_LIVE_WORKSPACE !== '1') {
  console.error('not-run: set DNCS_LIVE_WORKSPACE=1 to execute this script')
  process.exit(2)
}

import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publishArtifact, probeWorkspace, artifactPath } from '../src/providers/devin/bootstrap.js'
import { buildSshArgv, spawnSsh } from '../src/providers/devin/ssh.js'
import { createMcpClient } from '../src/providers/devin/mcp-client.js'
import { createDevinApi } from '../src/providers/devin/api.js'
import { probeTarget, assertProbeIdentity, claimPrivateRoot } from './lib/probe-target.mjs'

const evidence = { steps: [], notRun: [] }
const record = (step, ok, extra = {}) => evidence.steps.push({ step, ok, ...extra })

const localDir = mkdtempSync(join(tmpdir(), 'dncs-e2e-local-'))
writeFileSync(join(localDir, 'sentinel.txt'), 'LOCAL-UNCHANGED')
const localUnchanged = () => readFileSync(join(localDir, 'sentinel.txt'), 'utf8') === 'LOCAL-UNCHANGED'

try {
  const { sessionId, profile, identityFile, knownHostsFile, expectedFingerprint } = probeTarget()
  const api = createDevinApi()

  /* Identity must resolve under the named profile before any SSH: same
   * session id and same org, both checked by parseRemoteSessionId. */
  const { remote } = await assertProbeIdentity({ api, profile, sessionId })
  record('api-identity', true)

  const inspect = await probeWorkspace({ sessionId, identityFile, knownHostsFile, expectedFingerprint })
  const nodeBin = inspect.node.startsWith('/') ? inspect.node.split(' ')[0] : 'node'
  record('ssh-probe', inspect.probe.every(row => row.code === 0) && inspect.node.length > 0)

  const root = await claimPrivateRoot({
    sessionId, identityFile, knownHostsFile, expectedFingerprint, probe: inspect,
  })
  record('exclusive-root', typeof root === 'string' && root.length > 0)

  const published = await publishArtifact({
    sessionId, identityFile, knownHostsFile, expectedFingerprint,
    artifact: artifactPath(), spawnImpl: spawn,
  })
  record('publish', typeof published.hash === 'string' && published.hash.length === 64)

  const spawnBridge = () => createMcpClient(spawnSsh(buildSshArgv({
    identityFile, knownHostsFile, sessionId,
    remoteArgv: [nodeBin, published.remoteFile, '--root', root],
  }), { spawnImpl: spawn }))

  const client = spawnBridge()
  try {
    await client.initialize()
    const tools = await client.listTools()
    const facts = await client.call('workspace.inspect', {})
    record('mcp-handshake', tools.length > 0 && facts.root === root)

    const payload = Buffer.from(`dncs-e2e ${new Date().toISOString()}`).toString('base64')
    await client.call('fs.write', { path: 'sentinel.txt', bytes: payload, createOnly: true })
    const read = await client.call('fs.read', { path: 'sentinel.txt', offset: 0, length: 256 })
    record('fs-write-read', Buffer.from(read.bytes, 'base64').toString('base64') === payload)

    /* Harmless exec proof: pwd, never a claimed business verification. */
    const proc = await client.call('process.start', { argv: ['pwd'], cwd: '.' })
    await client.call('process.wait', { processHandle: proc.processHandle, timeoutMs: 8000 })
    const out = await client.call('process.read', { processHandle: proc.processHandle, stdoutOffset: 0, limit: 2048 })
    record('exec-pwd', Buffer.from(out.stdout, 'base64').toString().trim() === root)

    record('local-unchanged', localUnchanged())

    evidence.notRun.push({ step: 'pty', reason: 'NATIVE_UNAVAILABLE' })
    evidence.notRun.push({ step: 'loopback-preview', reason: 'NATIVE_UNAVAILABLE' })
    evidence.notRun.push({ step: 'native-chat', reason: 'NATIVE_UNAVAILABLE' })

    const messages = await api.getMessages(profile, remote.bare, { first: 20 })
    record('rest-messages', Array.isArray(messages?.items ?? messages?.messages ?? messages))
  } finally {
    await client.close()
  }

  /* A second, fresh bridge re-reads the same state: the first session's
   * writes persist on the remote fs, nothing local was touched. */
  const client2 = spawnBridge()
  try {
    await client2.initialize()
    const again = await client2.call('fs.read', { path: 'sentinel.txt', offset: 0, length: 256 })
    record('second-session-read', Buffer.from(again.bytes, 'base64').toString().startsWith('dncs-e2e '))
    record('local-unchanged-2', localUnchanged())
  } finally {
    await client2.close()
  }
} catch (error) {
  record('aborted', false, { reason: String(error?.reason ?? error?.message ?? error).slice(0, 200) })
  console.log(JSON.stringify(evidence, null, 2))
  process.exit(1)
} finally {
  rmSync(localDir, { recursive: true, force: true })
}

console.log(JSON.stringify(evidence, null, 2))
const failed = evidence.steps.filter(s => s.ok !== true)
process.exit(failed.length ? 1 : 0)
