/**
 * Two authenticated clients for DASW-1112 multi-user tests.
 * - dev (client A): dsh-dev.local through Caddy, using the curl cookie jar.
 * - desktop (client B): Electron host on loopback, using a signed browser-session
 *   cookie minted from the desktop home's own secret (see desktop-auth.mjs).
 * Never touches dsh.local.
 */
import { readFileSync } from 'node:fs'
import { desktopFetch, DESKTOP_ORIGIN } from './desktop-auth.mjs'

// Local Caddy uses a private CA; this test client talks only to 127.0.0.1.
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
const DEV_ORIGIN = 'https://dsh-dev.local'
const PREFIX = '/nano-shared-workspace'
const JAR = '/tmp/dasw-dev.cookies'

function devCookie() {
  const jar = readFileSync(JAR, 'utf8')
  const line = jar.split('\n').find(row => /dsh-auth-/.test(row) && !/^\s*(#\s*(Netscape|This|https)|$)/.test(row))
  if (line === undefined) throw new Error(`no dsh-auth cookie in ${JAR}; log in with dsh-dev status token first`)
  const cols = line.split('\t')
  return `${cols[5]}=${cols[6]}`
}

async function call(origin, path, init, cookie) {
  const res = await fetch(`${origin}${path}`, {
    ...init,
    headers: { cookie, ...(init?.headers ?? {}) },
  })
  const text = await res.text()
  let body
  try { body = JSON.parse(text) } catch { body = text }
  return { status: res.status, ok: res.ok, body }
}

export const devFetch = (path, init) => call(DEV_ORIGIN, path, init, devCookie())
export const devNsw = (suffix, init) => devFetch(`${PREFIX}${suffix}`, init)
export const desktopNsw = (suffix, init) => desktopFetch(`${PREFIX}${suffix}`, init)
export { DESKTOP_ORIGIN, DEV_ORIGIN }

/** POST JSON to a NSW route on one of the two clients. */
export const post = (client, suffix, data) => client(suffix, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(data ?? {}),
})

export function check(name, condition, detail = '') {
  const ok = condition === true
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === '' ? '' : ` :: ${detail}`}`)
  if (!ok) process.exitCode = 1
}
