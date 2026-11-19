/** Probe + hash-named artifact publish. Does not install runtimes. */

import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { WorkspaceError } from '../../host/errors.js'
import { buildSshArgv, execSsh, resolveIdentityFile, knownHostsPath, ensurePinnedGateway } from './ssh.js'
import { parseRemoteSessionId } from './session-id.js'

const FIXED_PROBE = Object.freeze([
  ['uname', '-s', '-m'],
  ['pwd'],
  ['id', '-un'],
])

export function artifactPath() {
  const candidates = [
    fileURLToPath(new URL('./remote/devin-workspace.mjs', import.meta.url)),
    fileURLToPath(new URL('../remote/devin-workspace.mjs', import.meta.url)),
    fileURLToPath(new URL('../../../lib/remote/devin-workspace.mjs', import.meta.url)),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  return candidates[0]
}

export function hashFile(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function sshOpts(sessionId, { identityFile, knownHostsFile }) {
  return {
    identityFile,
    knownHostsFile,
    sessionId,
    strictHostKeyChecking: 'yes',
  }
}

export async function probeWorkspace({ sessionId, identityFile, knownHostsFile, spawnImpl, expectedFingerprint, signal }) {
  await ensurePinnedGateway({ knownHostsFile, expectedFingerprint, spawnImpl })
  const id = parseRemoteSessionId(sessionId)
  const facts = { gatewayUser: id.gatewayUser, gatewayHost: id.gatewayHost }
  const runs = []
  for (const remoteArgv of FIXED_PROBE) {
    const argv = buildSshArgv({ ...sshOpts(sessionId, { identityFile, knownHostsFile }), remoteArgv })
    const result = await execSsh(argv, { spawnImpl, timeoutMs: 20000, signal })
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
      const argv = buildSshArgv({ ...sshOpts(sessionId, { identityFile, knownHostsFile }), remoteArgv })
      const result = await execSsh(argv, { spawnImpl, timeoutMs: 20000, signal })
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

function scpArgv({ identityFile, knownHostsFile, sessionId, local, remote }) {
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
    '-o', 'StrictHostKeyChecking=yes',
    '-P', '22',
    local,
    `${id.gatewayUser}@${id.gatewayHost}:${remote}`,
  ]
}

export async function publishArtifact({ sessionId, identityFile, knownHostsFile, spawnImpl = spawn, expectedFingerprint, artifact = artifactPath(), signal }) {
  await ensurePinnedGateway({ knownHostsFile, expectedFingerprint, spawnImpl })
  if (!existsSync(artifact)) {
    throw new WorkspaceError('workspace-unavailable', 'remote bridge artifact is missing', { httpStatus: 503 })
  }
  const hash = hashFile(artifact)
  const remoteDir = `.dncs-bridge/${hash}`
  const remoteFile = `${remoteDir}/devin-workspace.mjs`
  const ssh = remoteArgv => execSsh(buildSshArgv({
    identityFile, knownHostsFile, sessionId, remoteArgv,
  }), { spawnImpl, signal })
  /* An already-published artifact is authoritative: identical hash → reuse
   * untouched; any other content at that path → refuse, never overwrite. */
  const existing = await ssh(['sha256sum', remoteFile])
  if (existing.code === 0) {
    const remoteHash = existing.stdout.trim().split(/\s+/)[0]
    if (remoteHash === hash) return { hash, remoteFile, remoteDir, reused: true }
    throw new WorkspaceError('workspace-failed', 'remote artifact hash conflict; refusing to overwrite', { httpStatus: 502 })
  }
  const made = await ssh(['mkdir', '-p', remoteDir])
  if (made.code !== 0) throw new WorkspaceError('workspace-failed', 'could not create artifact dir', { httpStatus: 502 })
  const mode = await ssh(['chmod', '700', remoteDir])
  if (mode.code !== 0) throw new WorkspaceError('workspace-failed', 'could not lock artifact dir mode 0700', { httpStatus: 502 })
  const mk = await ssh(['mktemp', `${remoteDir}/.upload.XXXXXXXX`])
  const remoteTmp = mk.stdout.trim()
  const escaped = remoteDir.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (mk.code !== 0 || !new RegExp(`^${escaped}/\\.upload\\.[A-Za-z0-9]{8}$`).test(remoteTmp)) {
    throw new WorkspaceError('workspace-failed', 'could not allocate an exclusive upload temp', { httpStatus: 502 })
  }
  /* Cleanup removes only the staging this call created, and only after it is
   * linked or proven redundant; on any other failure it stays on the remote
   * and the error names it so the residue is reported, not hidden. */
  const staged = message => new WorkspaceError('workspace-failed', `${message} (staging left at ${remoteTmp})`, { httpStatus: 502 })
  const dropStaging = () => ssh(['rm', '-f', remoteTmp])
  const argv = scpArgv({ identityFile, knownHostsFile, sessionId, local: artifact, remote: remoteTmp })
  const result = await new Promise((resolve, reject) => {
    const child = spawnImpl(argv[0], argv.slice(1), { stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH } })
    const stderr = []
    child.stderr.on('data', c => stderr.push(c))
    const onAbort = () => { try { child.kill('SIGKILL') } catch { /* gone */ } reject(new WorkspaceError('workspace-scope-expired', 'artifact upload aborted', { httpStatus: 409 })) }
    if (signal?.aborted) onAbort()
    else signal?.addEventListener?.('abort', onAbort, { once: true })
    child.on('close', code => {
      signal?.removeEventListener?.('abort', onAbort)
      resolve({ code, stderr: Buffer.concat(stderr).toString('utf8') })
    })
    child.on('error', error => {
      signal?.removeEventListener?.('abort', onAbort)
      reject(error)
    })
  })
  if (result.code !== 0) {
    throw staged('artifact upload failed')
  }
  const tmpMode = await ssh(['chmod', '600', remoteTmp])
  if (tmpMode.code !== 0) throw staged('could not restrict uploaded artifact mode 0600')
  /* Verify the staged bytes before linking — never publish unverified content. */
  const stagedHash = await ssh(['sha256sum', remoteTmp])
  if (stagedHash.code !== 0 || stagedHash.stdout.trim().split(/\s+/)[0] !== hash) {
    throw staged('uploaded artifact hash mismatch')
  }
  /* `ln` refuses to overwrite: a racer that published first is detected,
   * never clobbered. */
  const linked = await ssh(['ln', remoteTmp, remoteFile])
  if (linked.code !== 0) {
    const raced = await ssh(['sha256sum', remoteFile])
    const racedHash = raced.code === 0 ? raced.stdout.trim().split(/\s+/)[0] : null
    if (racedHash === hash) {
      await dropStaging()
      return { hash, remoteFile, remoteDir, reused: true }
    }
    throw staged('remote artifact hash conflict; refusing to overwrite')
  }
  const check = await ssh(['sha256sum', remoteFile])
  if (check.stdout.trim().split(/\s+/)[0] !== hash) {
    throw staged('artifact hash mismatch')
  }
  await dropStaging()
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
