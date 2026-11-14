/** SSH lane helper for the devin carrier (spike V-11 facts):
 *
 *  - The gateway requires an ENROLLED key for approval-free access; enrolment
 *    is account-level and MANUAL (paste the pubkey in Devin settings → SSH
 *    keys). There is no enrolment API — the host's job ends at generating a
 *    dedicated keypair and handing the pubkey + commands to the client.
 *  - `-N` is dropped by the gateway ("Timed out waiting for an SSH channel"):
 *    a forward must ride a command channel (ssh -L … host '<command>').
 *
 *  The keypair lives at ${DSH_HOME}/nano-cloud-session-ssh{,.pub} (0600),
 *  generated once via the system ssh-keygen — a private key format we do not
 *  hand-roll. Terminal UX itself belongs to DNT; this module only produces
 *  the material and the command strings.
 */

import { existsSync, readFileSync, statSync, chmodSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { join } from 'node:path'

const KEY_BASENAME = 'nano-cloud-session-ssh'

function home() { return process.env.DSH_HOME || process.env.HOME || '.' }
function keyPath() { return join(home(), KEY_BASENAME) }

/** Ensure the dedicated ed25519 keypair exists; returns material + paths. */
export function ensureSshKeypair() {
  const priv = keyPath()
  const pub = `${priv}.pub`
  if (!existsSync(priv) || !existsSync(pub)) {
    execFileSync('ssh-keygen', ['-t', 'ed25519', '-f', priv, '-N', '', '-C', `dsh-dncs-${Date.now()}`],
      { stdio: ['ignore', 'ignore', 'pipe'] })
  }
  chmodSync(priv, 0o600)
  const publicKey = readFileSync(pub, 'utf8').trim()
  return {
    privateKeyPath: priv,
    publicKey,
    mode: (statSync(priv).mode & 0o777).toString(8),
  }
}

/** Build the command strings the client copies. sessionId = 'devin-…'. */
export function sshCommands(sessionId, keypair) {
  const id = String(sessionId)
  const key = keypair.privateKeyPath
  return {
    shell: `ssh -i ${key} ${id}@ssh.devin.ai`,
    forward: `ssh -i ${key} -L <local>:127.0.0.1:<remote> ${id}@ssh.devin.ai '<command 保持 channel 开放>'`,
  }
}
