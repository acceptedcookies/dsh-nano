/** Probe + hash-named artifact publish. Does not install runtimes. */

import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { WorkspaceError } from '../../host/errors.js'
import { buildSshArgv, execSsh, spawnSsh, resolveIdentityFile, knownHostsPath } from './ssh.js'
import { parseRemoteSessionId } from './session-id.js'

const FIXED_PROBE = Object.freeze([
  ['uname', '-s', '-m'],
  ['pwd'],
  ['id', '-un'],
])

export function artifactPath() {
  return fileURLToPath(new URL('../../../lib/remote/devin-workspace.mjs', import.meta.url))
}

export function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function sshOpts(sessionId, { identityFile, knownHostsFile, acceptHostKey }) {
  return {
    identityFile,
    knownHostsFile,
    sessionId,
    strictHostKeyChecking: acceptHostKey ? 'accept-new' : 'yes',
  }
}

export async function probeWorkspace({ sessionId, identityFile, knownHostsFile, spawnImpl, acceptHostKey = false }) {
  const id = parseRemoteSessionId(sessionId)
  const facts = { gatewayUser: id.gatewayUser, gatewayHost: id.gatewayHost }
  const runs = []
  for (const remoteArgv of FIXED_PROBE) {
    const argv = buildSshArgv({ ...sshOpts(sessionId, { identityFile, knownHostsFile, acceptHostKey }), remoteArgv })
    const result = await execSsh(argv, { spawnImpl, timeoutMs: 20000 })
    runs.push({ argv: remoteArgv, code: result.code, stdout: result.stdout.trim().slice(0, 200) })
    if (result.code !== 0) {
      throw new WorkspaceError('workspace-unavailable', `probe ${remoteArgv[0]} failed`, { httpStatus: 503 })
    }
  }
  const nodeCandidates = [
    ['node', '-v'],
    ['/home/ubuntu/.nvm/versions/node/v24.22.2/bin/node', '-v'],
  ]
  let node = ''
  for (const remoteArgv of nodeCandidates) {
    try {
      const argv = buildSshArgv({ ...sshOpts(sessionId, { identityFile, knownHostsFile, acceptHostKey }), remoteArgv })
      const result = await execSsh(argv, { spawnImpl, timeoutMs: 20000 })
      if (result.code === 0 && result.stdout.includes('v')) {
        node = `${remoteArgv[0]} ${result.stdout.trim()}`.slice(0, 200)
        break
      }
    } catch { /* try next candidate */ }
  }
  facts.probe = runs
  facts.node = node
  if (!node.includes('v')) {
    throw new WorkspaceError('workspace-unavailable', 'remote Node >=20 is required', { httpStatus: 503 })
  }
  const version = /v(\d+)/.exec(node)
  if (version && Number(version[1]) < 20) {
    throw new WorkspaceError('workspace-unavailable', 'remote Node >=20 is required', { httpStatus: 503 })
  }
  return facts
}

function scpArgv({ identityFile, knownHostsFile, sessionId, local, remote, acceptHostKey }) {
  const id = parseRemoteSessionId(sessionId)
  if (remote.startsWith('-') || /[\n\r;|&`$]/.test(remote)) {
    throw new WorkspaceError('invalid-request', 'unsafe remote path', { httpStatus: 422 })
  }
  return [
    'scp',
    '-i', identityFile,
    '-o', 'IdentitiesOnly=yes',
    '-o', 'BatchMode=yes',
    '-o', 'ForwardAgent=no',
    '-o', `UserKnownHostsFile=${knownHostsFile}`,
    '-o', 'GlobalKnownHostsFile=/dev/null',
    '-o', `StrictHostKeyChecking=${acceptHostKey ? 'accept-new' : 'yes'}`,
    '-P', '22',
    local,
    `${id.gatewayUser}@${id.gatewayHost}:${remote}`,
  ]
}

export async function publishArtifact({ sessionId, identityFile, knownHostsFile, spawnImpl = spawn, acceptHostKey = false, artifact = artifactPath() }) {
  if (!existsSync(artifact)) {
    throw new WorkspaceError('workspace-unavailable', 'remote bridge artifact is missing', { httpStatus: 503 })
  }
  const hash = hashFile(artifact)
  const remoteDir = `.dncs-bridge/${hash}`
  const remoteFile = `${remoteDir}/devin-workspace.mjs`
  const mkdirArgv = buildSshArgv({
    identityFile, knownHostsFile, sessionId,
    strictHostKeyChecking: acceptHostKey ? 'accept-new' : 'yes',
    remoteArgv: ['mkdir', '-p', remoteDir],
  })
  const made = await execSsh(mkdirArgv, { spawnImpl })
  if (made.code !== 0) throw new WorkspaceError('workspace-failed', 'could not create artifact dir', { httpStatus: 502 })
  const argv = scpArgv({ identityFile, knownHostsFile, sessionId, local: artifact, remote: remoteFile, acceptHostKey })
  const result = await new Promise((resolve, reject) => {
    const child = spawnImpl(argv[0], argv.slice(1), { stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH } })
    const stderr = []
    child.stderr.on('data', c => stderr.push(c))
    child.on('close', code => resolve({ code, stderr: Buffer.concat(stderr).toString('utf8') }))
    child.on('error', reject)
  })
  if (result.code !== 0) {
    throw new WorkspaceError('workspace-failed', 'artifact upload failed', { httpStatus: 502 })
  }
  const check = await execSsh(buildSshArgv({
    identityFile, knownHostsFile, sessionId,
    strictHostKeyChecking: acceptHostKey ? 'accept-new' : 'yes',
    remoteArgv: ['sha256sum', remoteFile],
  }), { spawnImpl })
  if (!check.stdout.includes(hash)) {
    throw new WorkspaceError('workspace-failed', 'artifact hash mismatch', { httpStatus: 502 })
  }
  return { hash, remoteFile, remoteDir }
}

export function ensureKnownHostsFile(home, { seed } = {}) {
  const path = knownHostsPath(home)
  mkdirSync(dirname(path), { recursive: true })
  if (!existsSync(path) && seed) writeFileSync(path, `${seed}\n`, { mode: 0o600 })
  if (existsSync(path)) chmodSync(path, 0o600)
  return path
}

export { resolveIdentityFile, knownHostsPath }
