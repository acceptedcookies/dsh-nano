#!/usr/bin/env node
/** Read-only Devin SSH probe. No bootstrap. Opt-in via env.
 *  DNCS_PROBE_SESSION  remote session id (devin-…)
 *  DNCS_SSH_IDENTITY   identity file (default: m3max id_ed25519 then dedicated key)
 *  DNCS_ACCEPT_HOSTKEY=1  allow accept-new into the dedicated known_hosts file
 */
import { probeWorkspace, ensureKnownHostsFile } from '../src/providers/devin/bootstrap.js'
import { resolveIdentityFile, knownHostsPath } from '../src/providers/devin/ssh.js'

const sessionId = process.env.DNCS_PROBE_SESSION
if (!sessionId) {
  console.error('DNCS_PROBE_SESSION is required; refusing to guess a target')
  process.exit(2)
}

const home = process.env.DSH_HOME || process.env.HOME
ensureKnownHostsFile(home)
const identityFile = process.env.DNCS_SSH_IDENTITY || resolveIdentityFile({ home })
const facts = await probeWorkspace({
  sessionId,
  identityFile,
  knownHostsFile: knownHostsPath(home),
  acceptHostKey: process.env.DNCS_ACCEPT_HOSTKEY === '1',
})
const redacted = {
  gatewayUser: facts.gatewayUser,
  gatewayHost: facts.gatewayHost,
  probe: facts.probe,
  node: facts.node.replace(/cog_[A-Za-z0-9_-]+/g, 'cog_***'),
}
console.log(JSON.stringify(redacted, null, 2))
