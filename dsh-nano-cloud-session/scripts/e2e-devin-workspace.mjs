#!/usr/bin/env node
/** Live pairing E2E for design-1119 §11.4. Explicit opt-in only. Never `npm test`.
 *  Required: DNCS_LIVE_WORKSPACE=1 DNCS_PROBE_SESSION=devin-…
 *  Optional: DNCS_SSH_IDENTITY, DSH_HOME (default ~/.dsh-dev for API profile),
 *            DNCS_EXPECTED_FINGERPRINT when known_hosts is empty.
 */
if (process.env.DNCS_LIVE_WORKSPACE !== '1') {
  console.error('not-run: set DNCS_LIVE_WORKSPACE=1 to execute this script')
  process.exit(2)
}

import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir, homedir } from 'node:os'
import { join } from 'node:path'
import { publishArtifact, probeWorkspace, ensureKnownHostsFile, artifactPath } from '../src/providers/devin/bootstrap.js'
import { resolveIdentityFile, knownHostsPath, buildSshArgv, spawnSsh } from '../src/providers/devin/ssh.js'
import { createMcpClient } from '../src/providers/devin/mcp-client.js'
import { createProfileStore } from '../src/host/profiles.js'
import { createDevinApi } from '../src/providers/devin/api.js'

const sessionId = process.env.DNCS_PROBE_SESSION
if (!sessionId) {
  console.error('DNCS_PROBE_SESSION is required; refusing to guess a target')
  process.exit(2)
}

const home = process.env.DSH_HOME || join(homedir(), '.dsh-dev')
process.env.DSH_HOME = home
const identityFile = process.env.DNCS_SSH_IDENTITY || resolveIdentityFile({ home })
const knownHostsFile = ensureKnownHostsFile(home)
const expectedFingerprint = process.env.DNCS_EXPECTED_FINGERPRINT
const evidence = {
  sessionIdPrefix: String(sessionId).slice(0, 18),
  steps: [],
  notRun: [],
}

function record(step, status, extra = {}) {
  evidence.steps.push({ step, status, ...extra })
}

const localDir = mkdtempSync(join(tmpdir(), 'dncs-t22-local-'))
writeFileSync(join(localDir, 'sentinel.txt'), 'LOCAL-UNCHANGED')

try {
  const store = createProfileStore()
  const profile = store.active()
  const api = createDevinApi()
  if (!profile) {
    record(1, 'not-run', { reason: 'no-active-profile' })
  } else {
    const self = await api.self(profile)
    const remote = String(sessionId).replace(/^devin-/, '')
    const session = await api.getSession(profile, remote)
    record(1, 'pass', {
      principal: self.principal_type,
      orgMatch: self.devin_sessions_org_id === profile.orgId,
      sessionStatus: session?.status ?? null,
      api: 'ready',
    })
  }

  const inspect = await probeWorkspace({
    sessionId, identityFile, knownHostsFile, expectedFingerprint,
  })
  record(1, 'pass', {
    sshUser: inspect.probe.find(row => row.argv[0] === 'id')?.stdout,
    sshRoot: inspect.probe.find(row => row.argv[0] === 'pwd')?.stdout,
    node: inspect.node.replace(/cog_[A-Za-z0-9_-]+/g, 'cog_***'),
  })

  const published = await publishArtifact({
    sessionId, identityFile, knownHostsFile, expectedFingerprint,
    artifact: artifactPath(), spawnImpl: spawn,
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
    const dir = `dncs-1119-t22`
    try { await client.call('fs.mkdir', { path: dir }) } catch { /* exists */ }
    const payload = Buffer.from(`dncs-1119-t22 ${new Date().toISOString()}`).toString('base64')
    await client.call('fs.write', { path: `${dir}/sentinel.txt`, bytes: payload, createOnly: false })
    const read = await client.call('fs.read', { path: `${dir}/sentinel.txt`, offset: 0, length: 256 })
    const listed = await client.call('fs.list', { path: dir, limit: 20 })
    assertLocalUnchanged()
    record(2, 'pass', {
      tools: tools.length,
      root: facts.root,
      os: facts.os,
      wrote: Buffer.from(read.bytes, 'base64').toString().slice(0, 40),
      entries: listed.entries?.length ?? 0,
      hash: published.hash,
      pty: facts.pty,
      forward: facts.forward,
    })

    try {
      const git = await client.call('process.start', { argv: ['git', 'status', '--porcelain'], cwd: '.' })
      await client.call('process.wait', { processHandle: git.processHandle, timeoutMs: 8000 })
      const gitOut = await client.call('process.read', { processHandle: git.processHandle, stdoutOffset: 0, limit: 2048 })
      record(3, 'pass', {
        covered: 'git-status-only',
        git: Buffer.from(gitOut.stdout, 'base64').toString().slice(0, 200),
        pty: 'not-run: H-EXEC SubprocessTerminalHandle missing',
      })
      evidence.notRun.push({ step: 3, item: 'pty-resize-exit', reason: 'NATIVE_UNAVAILABLE' })
    } catch (error) {
      record(3, 'fail', { reason: error.message.slice(0, 200) })
    }

    evidence.notRun.push({ step: 4, item: 'loopback-http-ws-preview', reason: 'no official port-access owner on 0.2.2-rc.1' })
    record(4, 'not-run', { reason: 'NATIVE_UNAVAILABLE' })

    if (profile) {
      evidence.notRun.push({ step: 5, item: 'native-chat-sentinel-cross-check', reason: 'H-CHAT missing; ACU spend not authorized' })
      record(5, 'not-run', { reason: 'NATIVE_UNAVAILABLE' })
      const messages = await api.getMessages(profile, String(sessionId).replace(/^devin-/, ''), { first: 20 })
      record(6, 'pass', {
        covered: 'messages-page-only',
        messageCount: messages?.items?.length ?? messages?.messages?.length ?? 0,
      })
    } else {
      record(5, 'not-run', { reason: 'no-active-profile' })
      record(6, 'not-run', { reason: 'no-active-profile' })
    }

    client.close()
    const inspect2 = await probeWorkspace({ sessionId, identityFile, knownHostsFile, expectedFingerprint })
    record(7, 'pass', {
      covered: 'reconnect-pwd-only',
      reconnectPwd: inspect2.probe.find(row => row.argv[0] === 'pwd')?.stdout,
    })

    const child2 = spawnSsh(buildSshArgv({
      identityFile, knownHostsFile, sessionId,
      remoteArgv: [nodeBin, published.remoteFile, '--root', root],
    }), { spawnImpl: spawn })
    const client2 = createMcpClient(child2)
    try {
      await client2.initialize()
      await client2.call('fs.remove', { path: `${dir}/sentinel.txt` })
      record(8, 'pass', { cleaned: `${dir}/sentinel.txt` })
    } finally {
      client2.close()
    }
  } finally {
    try { client.close() } catch { /* ignore */ }
  }
} catch (error) {
  record('aborted', 'fail', { reason: String(error.message ?? error).slice(0, 300), fingerprint: error.fingerprint })
  console.log(JSON.stringify(evidence, null, 2))
  process.exit(1)
} finally {
  rmSync(localDir, { recursive: true, force: true })
}

function assertLocalUnchanged() {
  const text = readFileSync(join(localDir, 'sentinel.txt'), 'utf8')
  if (text !== 'LOCAL-UNCHANGED') throw new Error('local sentinel changed')
}

console.log(JSON.stringify(evidence, null, 2))
void knownHostsPath
