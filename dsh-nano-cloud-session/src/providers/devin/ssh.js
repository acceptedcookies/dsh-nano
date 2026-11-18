/** Devin-only SSH connector. Argv-only, no shell interpolation, no -A/-R/-N-only. */

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
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
  if (strictHostKeyChecking === 'no') {
    throw new WorkspaceError('invalid-request', 'StrictHostKeyChecking=no is forbidden', { httpStatus: 422 })
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

export function execSsh(argv, { spawnImpl = spawn, timeoutMs = 20000, input } = {}) {
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
    child.stdout?.on('data', chunk => stdout.push(chunk))
    child.stderr?.on('data', chunk => stderr.push(chunk))
    child.on('error', error => {
      clearTimeout(timer)
      if (!settled) {
        settled = true
        reject(new WorkspaceError('workspace-failed', error.message, { httpStatus: 502 }))
      }
    })
    child.on('close', (code, signal) => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      resolve({
        code: code ?? 1,
        signal: signal ?? null,
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
