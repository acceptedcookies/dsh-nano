/** Shared live-probe plumbing for scripts/. Fail-closed: every helper throws
 *  before touching the remote when the required opt-ins or targets are absent.
 *  Only explicit profile + session + an exclusive `mktemp -d` root under the
 *  probed remote cwd are accepted — no business paths, no guessing. */

import { spawn } from 'node:child_process'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { createProfileStore } from '../../src/host/profiles.js'
import { ensureKnownHostsFile } from '../../src/providers/devin/bootstrap.js'
import { resolveIdentityFile, buildSshArgv, execSsh } from '../../src/providers/devin/ssh.js'
import { parseRemoteSessionId } from '../../src/providers/devin/session-id.js'
import { WorkspaceError } from '../../src/host/errors.js'

function refuse(message) {
  throw new WorkspaceError('workspace-unavailable', message, { httpStatus: 503 })
}

/** Gate + explicit target. Both profile and session must be named — there is
 *  no defaulting to the active profile for a live remote probe. */
export function probeTarget(env = process.env) {
  if (env.DNCS_LIVE_WORKSPACE !== '1') refuse('DNCS_LIVE_WORKSPACE=1 is required')
  const sessionId = env.DNCS_PROBE_SESSION
  if (!sessionId) refuse('DNCS_PROBE_SESSION is required; refusing to guess a target')
  const profileId = env.DNCS_PROBE_PROFILE
  if (!profileId) refuse('DNCS_PROBE_PROFILE is required; refusing to guess an account')
  const home = env.DSH_HOME || join(homedir(), '.dsh-dev')
  process.env.DSH_HOME = home
  const store = createProfileStore()
  const profile = store.get(profileId)
  if (!profile) refuse(`no profile ${profileId}`)
  return {
    sessionId,
    profile,
    home,
    identityFile: env.DNCS_SSH_IDENTITY || resolveIdentityFile({ home }),
    knownHostsFile: ensureKnownHostsFile(home),
    expectedFingerprint: env.DNCS_EXPECTED_FINGERPRINT,
  }
}

/** The named session and org must resolve under the named profile before any
 *  SSH work starts: a token whose /v3/self disagrees with the profile org, or
 *  a session that parses to a different id, means we would be probing the
 *  wrong account or the wrong VM. */
export async function assertProbeIdentity({ api, profile, sessionId }) {
  const expected = parseRemoteSessionId(sessionId)
  const self = await api.self(profile)
  /* The only org field the API actually returns — same field config.test
   * checks; no other key name is accepted as a stand-in. */
  if (self?.devin_sessions_org_id !== profile.orgId) {
    refuse(`self reports org ${self?.devin_sessions_org_id ?? 'none'}, not profile org ${profile.orgId}`)
  }
  const got = await api.getSession(profile, expected.bare)
  const actual = parseRemoteSessionId(got?.session_id ?? got?.id ?? '')
  if (actual.bare !== expected.bare) {
    refuse(`session id mismatch: asked ${expected.prefixed}, got ${actual.prefixed}`)
  }
  return { remote: expected, self }
}

/** Exclusive private root: `mktemp -d` under the trusted probed cwd only. The
 *  returned path must be exactly `<cwd>/dncs-probe-<8 alnum>` — anything else
 *  is treated as a hostile or broken mktemp and refused. */
export async function claimPrivateRoot({ sessionId, identityFile, knownHostsFile, expectedFingerprint, probe, spawnImpl = spawn, signal }) {
  const cwd = String(probe?.probe?.find(p => p.argv[0] === 'pwd')?.stdout ?? '').trim()
  if (!cwd.startsWith('/')) refuse('probe did not return an absolute remote cwd')
  const mk = await execSsh(buildSshArgv({
    identityFile, knownHostsFile, sessionId,
    remoteArgv: ['mktemp', '-d', `${cwd}/dncs-probe-XXXXXXXX`],
  }), { spawnImpl, signal, timeoutMs: 20000 })
  const root = mk.stdout.trim()
  const escaped = cwd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (mk.code !== 0 || !new RegExp(`^${escaped}/dncs-probe-[A-Za-z0-9]{8}$`).test(root)) {
    refuse('could not allocate an exclusive remote workspace root')
  }
  return root
}
