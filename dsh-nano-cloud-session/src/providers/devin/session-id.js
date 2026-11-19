/** Devin remote-session identity and SSH gateway user rules.
 *  Reject anything that could become an SSH option, host, or shell token. */

export const DEVIN_SSH_GATEWAY = 'ssh.devin.ai'
export const DEVIN_SSH_PORT = 22

const BARE_RE = /^[A-Za-z0-9][A-Za-z0-9-]{0,127}$/

export class SessionIdError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SessionIdError'
    this.reason = 'invalid-request'
    this.status = 422
  }
}

/** Parse a UI/API session id into bare, prefixed, and gateway user. */
export function parseRemoteSessionId(raw) {
  const value = String(raw ?? '').trim()
  if (value === '' || /[\s@'"\\;|&$`\n\r\t]/.test(value) || value.includes('://')) {
    throw new SessionIdError('session_id must be a Devin session id')
  }
  if (value.startsWith('-') || value.includes(' -') || /(^|[^A-Za-z0-9-])-o(?: |$)/.test(value)) {
    throw new SessionIdError('session_id must be a Devin session id')
  }
  const bare = value.startsWith('devin-') ? value.slice('devin-'.length) : value
  if (!BARE_RE.test(bare)) throw new SessionIdError('session_id must be a Devin session id')
  const prefixed = `devin-${bare}`
  return Object.freeze({
    bare,
    prefixed,
    gatewayUser: prefixed,
    gatewayHost: DEVIN_SSH_GATEWAY,
    gatewayPort: DEVIN_SSH_PORT,
  })
}

export function gatewayTarget(sessionId) {
  const id = typeof sessionId === 'object' && sessionId?.gatewayUser
    ? sessionId
    : parseRemoteSessionId(sessionId)
  return `${id.gatewayUser}@${DEVIN_SSH_GATEWAY}`
}
