#!/usr/bin/env node
/**
 * dnls relay credential delivery — guest writer, package-owned (T-O-63).
 *
 * Baked root-owned 0555 at /opt/dnls/ so host `container exec --user 0:0`
 * can run it, same pattern as public-health.mjs. The DNLS host generates one
 * random token per container generation; this helper is the ONLY channel
 * that lands it inside the guest — never argv, never the published HTTP
 * port, never the node-writable /mcp-bridge.mjs path.
 *
 * The file /run/dnls-relay-credential.json is written node:node 0400 so only
 * the bridge (USER node) reads it. The token is never echoed to stdout,
 * never logged, and grants no permission — it only proves that a relay
 * connection came from the DNLS host process.
 */
import { chownSync, closeSync, openSync, readFileSync, renameSync, writeSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const CRED_DIR = '/run'
const CRED_FILE = 'dnls-relay-credential.json'
// The image's unprivileged runtime user: identical to Dockerfile `USER node`
// (debian node:22 node user is uid/gid 1000). Delivery fails closed rather
// than leaving a credential a non-bridge principal could read.
const BRIDGE_UID = 1000
const BRIDGE_GID = 1000
const RELAY_TOKEN = /^[A-Za-z0-9_-]{43}$/
const INPUT_MAX = 4 * 1024

const credError = (message) => Object.assign(new Error(message), { errorId: 'dnls.credential.publish' })

/**
 * Validate and atomically replace the credential file. Only `{v:1, token}` is
 * a credential doc; the token itself is never copied into any error or
 * reply. A malformed input fails closed — the previous file (if any) stays
 * the bridge's current credential until a valid delivery replaces it.
 */
export function publishRelayCredential(doc, { dir = CRED_DIR, uid = BRIDGE_UID, gid = BRIDGE_GID } = {}) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw credError('not an object')
  const keys = Object.keys(doc).sort()
  if (keys.length !== 2 || !keys.includes('v') || !keys.includes('token')) throw credError('doc shape')
  if (doc.v !== 1 || !RELAY_TOKEN.test(doc.token)) throw credError('doc values')
  const tmp = join(dir, `.${CRED_FILE}.${randomUUID()}.tmp`)
  const fd = openSync(tmp, 'wx', 0o400)
  try {
    writeSync(fd, JSON.stringify({ v: 1, token: doc.token }))
  } finally {
    closeSync(fd)
  }
  try {
    chownSync(tmp, uid, gid)
  } catch (error) {
    throw credError(`owner handoff: ${error?.message || error}`)
  }
  renameSync(tmp, join(dir, CRED_FILE))
  return { ok: true }
}

/**
 * `node relay-credential.mjs`: the host owner's guest channel. The doc
 * arrives on bounded stdin; output is a single {ok} line. The token never
 * echoes — not on success, not in an error string.
 */
export async function runPublishRelayCredential({ dir = CRED_DIR, input, out, uid = BRIDGE_UID, gid = BRIDGE_GID } = {}) {
  const emit = out ?? ((line) => process.stdout.write(`${line}\n`))
  const deny = () => { emit('{"ok":false}'); process.exitCode = 1; return { ok: false } }
  let body = ''
  try {
    for await (const chunk of (input ?? process.stdin)) {
      body += chunk
      if (body.length > INPUT_MAX) return deny()
    }
    publishRelayCredential(JSON.parse(body), { dir, uid, gid })
    emit('{"ok":true}')
    return { ok: true }
  } catch {
    return deny()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runPublishRelayCredential()
}
