/**
 * Authenticate to the desktop Electron host (127.0.0.1:54585) without a browser.
 * The host uses the same browser-session cookie scheme as `dsh web`
 * (see the extracted BrowserAuth implementation from app.asar, recorded in the
 * ledger): cookie name = dsh-auth- + base64url(sha256(authority)), value =
 * v1.<base64url(json)>.<base64url(hmacSha256(secret, body))>, signing secret is
 * the `client-connection/browser-session` grant in $DSH_HOME/.credentials.yaml.
 * This is a test-only local client; it never touches dsh.local.
 */
import { createHash, createHmac } from 'node:crypto'
import { readFileSync, existsSync } from 'node:fs'

const portFile = '/tmp/dasw-desktop-port'
const PORT = process.env.DASW_DESKTOP_PORT
  ?? (existsSync(portFile) ? readFileSync(portFile, 'utf8').trim() : '54585')
export const DESKTOP_ORIGIN = `http://127.0.0.1:${PORT}`
const HOST = `127.0.0.1:${PORT}`
const PREFIX = '/nano-shared-workspace'

const b64 = value => Buffer.from(value).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const b64decode = value => Buffer.from(value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - value.length % 4) % 4), 'base64')

/** The desktop home is fixed for this test node: never inherit the caller's
 *  DSH_HOME (the agent shell points at the daily home, a different secret). */
function signingSecret() {
  const home = process.env.DASW_DESKTOP_HOME ?? `${process.env.HOME}/.dsh-desktop`
  const text = readFileSync(`${home}/.credentials.yaml`, 'utf8')
  const block = /client-connection\/browser-session:[\s\S]*?secret:\s*(\S+)/.exec(text)
  if (block === null) throw new Error('desktop browser-session secret not found')
  const secret = b64decode(block[1])
  if (secret.byteLength !== 32) throw new Error('desktop browser-session secret is not 32 bytes')
  return secret
}

/** Signed browser-session cookie for the desktop host's own authority. */
export function desktopCookie(authority = HOST) {
  const secret = signingSecret()
  const name = `dsh-auth-${b64(createHash('sha256').update(authority).digest())}`
  const issuedAt = Date.now()
  // The desktop host uses a short cookieMaxAgeDays; a 30-day cookie is
  // rejected by `expiresAt - issuedAt > maxAgeMilliseconds`. One hour is safe.
  const payload = { version: 1, authority, issuedAt, expiresAt: issuedAt + 3600_000 }
  const body = b64(Buffer.from(JSON.stringify(payload)))
  const value = `v1.${body}.${b64(createHmac('sha256', secret).update(body).digest())}`
  return `${name}=${value}`
}

/** Fetch a desktop-host route with the signed cookie. */
export async function desktopFetch(path, init = {}) {
  const res = await fetch(`${DESKTOP_ORIGIN}${path}`, {
    ...init,
    headers: { cookie: desktopCookie(), ...(init.headers ?? {}) },
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, ok: res.ok, body }
}

/** Convenience: one NSW route on the desktop host. */
export const desktopNsw = (suffix, init) => desktopFetch(`${PREFIX}${suffix}`, init)
