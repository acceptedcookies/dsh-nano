/** Devin-only SSH connector. Argv-only, no shell interpolation, no -A/-R/-N-only. */

import { spawn } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { DEVIN_SSH_GATEWAY, DEVIN_SSH_PORT, parseRemoteSessionId } from './session-id.js'
import { WorkspaceError } from '../../host/errors.js'

const FORBIDDEN_OPT = /StrictHostKeyChecking=no|^-A$|^-R$|^-N$/

export function dedicatedKeyPath(home = process.env.DSH_HOME || homedir()) {
  return join(home, 'nano-cloud-session-ssh')
}

export function knownHostsPath(home = process.env.DSH_HOME || homedir()) {
  return join(home, 'nano-cloud-session-known-hosts')
}

export function systemIdentityPath() {
  return join(homedir(), '.ssh', 'id_ed25519')
}

export function resolveIdentityFile({ home, identityFile } = {}) {
  if (identityFile) {
    if (identityFile.includes('\0') || identityFile.includes('\n')) {
      throw new WorkspaceError('invalid-request', 'identityFile is invalid', { httpStatus: 422 })
    }
    return identityFile
  }
  const dedicated = dedicatedKeyPath(home)
  if (existsSync(dedicated)) return dedicated
  const system = systemIdentityPath()
  if (existsSync(system)) return system
  throw new WorkspaceError('workspace-unavailable', 'no SSH identity file', { httpStatus: 503 })
}

export function fallbackIdentityFile(current, { identityFile } = {}) {
  if (identityFile) return null
  const system = systemIdentityPath()
  if (current && current !== system && existsSync(system)) return system
  return null
}

/** Build ssh argv. `remoteArgv` is sent as a single remote command string only
 *  after each token is verified to contain no shell metacharacters. */
export function buildSshArgv({
  identityFile,
  knownHostsFile,
  sessionId,
  remoteArgv,
  pty = false,
  localForwards = [],
  extraOptions = [],
  strictHostKeyChecking = 'yes',
} = {}) {
  const id = parseRemoteSessionId(sessionId)
  if (strictHostKeyChecking !== 'yes') {
    throw new WorkspaceError('invalid-request', 'StrictHostKeyChecking must be yes; pin the fingerprint first', { httpStatus: 422 })
  }
  for (const opt of extraOptions) {
    const text = String(opt)
    if (FORBIDDEN_OPT.test(text) || /ForwardAgent=yes|ForwardX11=yes|PermitLocalCommand=yes/.test(text)) {
      throw new WorkspaceError('invalid-request', 'forbidden SSH option', { httpStatus: 422 })
    }
  }
  if (!identityFile || identityFile.startsWith('-')) {
    throw new WorkspaceError('invalid-request', 'identityFile is invalid', { httpStatus: 422 })
  }
  if (!knownHostsFile || knownHostsFile.startsWith('-')) {
    throw new WorkspaceError('invalid-request', 'knownHostsFile is invalid', { httpStatus: 422 })
  }
  const argv = ['ssh']
  if (pty) argv.push('-tt')
  argv.push(
    '-i', identityFile,
    '-o', 'IdentitiesOnly=yes',
    '-o', 'BatchMode=yes',
    '-o', 'ForwardAgent=no',
    '-o', 'ForwardX11=no',
    '-o', 'PermitLocalCommand=no',
    '-o', `UserKnownHostsFile=${knownHostsFile}`,
    '-o', 'GlobalKnownHostsFile=/dev/null',
    '-o', `StrictHostKeyChecking=${strictHostKeyChecking}`,
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=6',
    '-p', String(DEVIN_SSH_PORT),
  )
  for (const opt of extraOptions) argv.push('-o', String(opt))
  for (const forward of localForwards) {
    const local = Number(forward.local)
    const remote = Number(forward.remote)
    if (!Number.isInteger(local) || local < 0 || local > 65535) {
      throw new WorkspaceError('invalid-request', 'invalid local forward port', { httpStatus: 422 })
    }
    if (!Number.isInteger(remote) || remote < 1 || remote > 65535) {
      throw new WorkspaceError('invalid-request', 'invalid remote forward port', { httpStatus: 422 })
    }
    argv.push('-L', `127.0.0.1:${local}:127.0.0.1:${remote}`)
  }
  argv.push('-l', id.gatewayUser, DEVIN_SSH_GATEWAY)
  if (remoteArgv && remoteArgv.length > 0) {
    for (const token of remoteArgv) {
      if (typeof token !== 'string' || token === '' || !/^[A-Za-z0-9._/=+-]+$/.test(token)) {
        throw new WorkspaceError('invalid-request', 'refusing unsafe remote argv token', { httpStatus: 422 })
      }
    }
    argv.push(remoteArgv.join(' '))
  }
  if (argv.includes('-A') || argv.includes('-R') || argv.includes('-N')) {
    throw new WorkspaceError('invalid-request', 'forbidden SSH flag', { httpStatus: 422 })
  }
  return argv
}

export function spawnSsh(argv, { spawnImpl = spawn, env, stdio = 'pipe' } = {}) {
  if (!Array.isArray(argv) || argv[0] !== 'ssh') {
    throw new WorkspaceError('invalid-request', 'ssh argv must start with ssh', { httpStatus: 422 })
  }
  const childEnv = { PATH: env?.PATH ?? process.env.PATH }
  delete childEnv.SSH_AUTH_SOCK
  for (const key of Object.keys(env ?? {})) {
    if (key.startsWith('DSH_') || key.includes('TOKEN') || key.includes('SECRET') || key === 'SSH_AUTH_SOCK') continue
    if (key === 'HOME' || key === 'USER' || key === 'LANG' || key === 'LC_ALL') childEnv[key] = env[key]
  }
  return spawnImpl(argv[0], argv.slice(1), { env: childEnv, stdio })
}

export function fingerprintEd25519(b64) {
  const raw = Buffer.from(String(b64), 'base64')
  return `SHA256:${createHash('sha256').update(raw).digest('base64').replace(/=+$/, '')}`
}

export function parseKeyscanLine(line) {
  const parts = String(line).trim().split(/\s+/).filter(Boolean)
  let i = 0
  if (parts[0] && !parts[0].startsWith('ssh-') && !parts[0].startsWith('ecdsa-')) i = 1
  const kind = parts[i]
  const b64 = parts[i + 1]
  if (!kind || !b64) throw new WorkspaceError('workspace-unavailable', 'invalid host key line', { httpStatus: 503 })
  return { kind, b64, fingerprint: fingerprintEd25519(b64) }
}

export function knownHostPinned(knownHostsFile, host = DEVIN_SSH_GATEWAY) {
  return pinnedGatewayKey(knownHostsFile, host) != null
}

export function pinnedGatewayKey(knownHostsFile, host = DEVIN_SSH_GATEWAY) {
  if (!existsSync(knownHostsFile)) return null
  const line = readFileSync(knownHostsFile, 'utf8').split('\n').find(row => row.includes(host) && /ssh-ed25519|ecdsa-sha2/.test(row))
  if (!line) return null
  return parseKeyscanLine(line)
}

export async function scanGatewayKey({ spawnImpl = spawn } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnImpl('ssh-keyscan', ['-t', 'ed25519', '-T', '10', DEVIN_SSH_GATEWAY], {
      stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH },
    })
    const out = []
    child.stdout?.on('data', chunk => out.push(chunk))
    child.stderr?.on('data', () => {})
    child.on('error', error => reject(new WorkspaceError('workspace-failed', error.message, { httpStatus: 502 })))
    child.on('close', () => {
      try {
        const text = Buffer.concat(out).toString('utf8')
        const line = text.split('\n').find(row => row.includes('ssh-ed25519'))
        if (!line) {
          reject(new WorkspaceError('workspace-unavailable', 'could not scan gateway host key', { httpStatus: 503 }))
          return
        }
        resolve(parseKeyscanLine(line))
      } catch (error) { reject(error) }
    })
  })
}

export function pinGatewayKey(knownHostsFile, scanned, expectedFingerprint) {
  if (!expectedFingerprint || scanned.fingerprint !== expectedFingerprint) {
    const error = new WorkspaceError('workspace-denied', 'host key fingerprint confirmation required', { httpStatus: 403 })
    error.fingerprint = scanned.fingerprint
    error.keyKind = scanned.kind
    throw error
  }
  mkdirSync(dirname(knownHostsFile), { recursive: true })
  const entry = `${DEVIN_SSH_GATEWAY} ${scanned.kind} ${scanned.b64}\n`
  const prev = existsSync(knownHostsFile) ? readFileSync(knownHostsFile, 'utf8') : ''
  const kept = prev.split('\n').filter(line => line.trim() && !line.includes(DEVIN_SSH_GATEWAY))
  writeFileSync(knownHostsFile, `${kept.join('\n')}${kept.length ? '\n' : ''}${entry}`, { mode: 0o600 })
  chmodSync(knownHostsFile, 0o600)
}

export async function ensurePinnedGateway({ knownHostsFile, expectedFingerprint, spawnImpl }) {
  const pinned = pinnedGatewayKey(knownHostsFile)
  const scanned = await scanGatewayKey({ spawnImpl }).catch(error => {
    if (pinned) return null
    throw error
  })
  if (pinned && (!scanned || scanned.b64 === pinned.b64)) return { pinned: true, fingerprint: pinned.fingerprint }
  if (scanned && pinned && scanned.b64 !== pinned.b64) {
    if (!expectedFingerprint) {
      const error = new WorkspaceError('workspace-denied', 'gateway host key changed; confirmation required', { httpStatus: 403 })
      error.fingerprint = scanned.fingerprint
      error.keyKind = scanned.kind
      throw error
    }
  }
  if (!scanned) {
    const error = new WorkspaceError('workspace-denied', 'host key fingerprint confirmation required', { httpStatus: 403 })
    throw error
  }
  if (!expectedFingerprint) {
    const error = new WorkspaceError('workspace-denied', 'host key fingerprint confirmation required', { httpStatus: 403 })
    error.fingerprint = scanned.fingerprint
    error.keyKind = scanned.kind
    throw error
  }
  pinGatewayKey(knownHostsFile, scanned, expectedFingerprint)
  return { pinned: true, fingerprint: scanned.fingerprint }
}

export function execSsh(argv, { spawnImpl = spawn, timeoutMs = 20000, input, signal } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawnSsh(argv, { spawnImpl })
    const stdout = []
    const stderr = []
    let settled = false
    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      if (!settled) {
        settled = true
        reject(new WorkspaceError('workspace-unavailable', 'ssh exec timed out', { httpStatus: 503 }))
      }
    }, timeoutMs)
    const onAbort = () => {
      try { child.kill('SIGKILL') } catch { /* already gone */ }
      if (!settled) {
        settled = true
        clearTimeout(timer)
        reject(new WorkspaceError('workspace-scope-expired', 'ssh exec aborted', { httpStatus: 409 }))
      }
    }
    if (signal?.aborted) { onAbort(); return }
    signal?.addEventListener?.('abort', onAbort, { once: true })
    const finish = fn => value => {
      signal?.removeEventListener?.('abort', onAbort)
      if (!settled) { settled = true; fn(value) }
    }
    child.stdout?.on('data', chunk => stdout.push(chunk))
    child.stderr?.on('data', chunk => stderr.push(chunk))
    child.on('error', error => {
      clearTimeout(timer)
      finish(reject)(new WorkspaceError('workspace-failed', error.message, { httpStatus: 502 }))
    })
    child.on('close', (code, sig) => {
      clearTimeout(timer)
      finish(resolve)({
        code: code ?? 1,
        signal: sig ?? null,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8').slice(0, 4000),
      })
    })
    if (input != null) {
      child.stdin.write(input)
      child.stdin.end()
    } else {
      child.stdin?.end()
    }
  })
}
