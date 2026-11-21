/**
 * dnls.control/1 bridge health publication — guest writer, package-owned.
 * Baked root-owned 0555 at /opt/dnls/ so host `container exec --user 0:0`
 * can run it; it never lives on the node-writable /mcp-bridge.mjs path.
 * The document lives in a root-owned, non-group-writable dir; the bridge
 * projects only {contractVersion,state,health,observedAt} publicly.
 */
import { closeSync, lstatSync, openSync, readFileSync, renameSync, writeSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HEALTH_DIR = '/run'
const HEALTH_FILE = 'dnls-public-health.json'
const HEALTH_KEYS = ['contractVersion', 'envId', 'sandboxId', 'generation', 'epoch', 'seq', 'observedAt', 'state', 'health']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$/
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/

const healthError = (message) => Object.assign(new Error(message), { errorId: 'dnls.health.publish' })

function healthDocOf(doc, { envId, sandboxId }) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw healthError('not an object')
  const keys = Object.keys(doc).sort()
  if (keys.length !== HEALTH_KEYS.length || !HEALTH_KEYS.every((k) => keys.includes(k))) throw healthError('doc shape')
  if (doc.contractVersion !== 'dnls.control/1' || doc.state !== 'running' || doc.health !== 'unknown') throw healthError('doc values')
  if (doc.envId !== envId || doc.sandboxId !== sandboxId) throw healthError('foreign identity')
  if (typeof doc.generation !== 'string' || (!UUID.test(doc.generation) && !SAFE_ID.test(doc.generation))) throw healthError('generation')
  if (typeof doc.epoch !== 'string' || !UUID.test(doc.epoch)) throw healthError('epoch')
  if (!Number.isSafeInteger(doc.seq) || doc.seq < 1) throw healthError('seq')
  if (typeof doc.observedAt !== 'string' || !ISO_TIME.test(doc.observedAt)) throw healthError('observedAt')
  return doc
}

/** The health dir must be a real directory owned by the expected uid and writable by no one else. */
function trustedHealthDir(dir, uid) {
  const st = lstatSync(dir)
  if (!st.isDirectory() || st.uid !== uid || (st.mode & 0o022) !== 0) throw healthError('untrusted health dir')
}

/**
 * The stored baseline. ENOENT is a clean first publish; a present but
 * unreadable or malformed file is not evidence either way — callers decide:
 * the writer fails closed, the read-only projection reports no document.
 */
function storedHealth(dir, { strict = false } = {}) {
  let text
  try {
    text = readFileSync(join(dir, HEALTH_FILE), 'utf8')
  } catch (error) {
    if (error?.code === 'ENOENT') return null
    if (strict) throw healthError('unreadable health file')
    return null
  }
  try {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('shape')
    return parsed
  } catch {
    if (strict) throw healthError('malformed health file')
    return null
  }
}

/**
 * Validate and atomically replace the public health document. The first
 * publish must be seq 1; same generation+epoch requires strictly
 * increasing seq; a fresh host epoch may rebind only at seq 1 — lifecycle
 * locks mean an old host writer cannot legitimately restart at 1.
 * A corrupt or denied existing file fails closed, never overwritten blind.
 */
export function publishHealth(doc, { dir = HEALTH_DIR, envId, sandboxId, uid = 0 } = {}) {
  if (typeof envId !== 'string' || typeof sandboxId !== 'string') throw healthError('identity required')
  trustedHealthDir(dir, uid)
  healthDocOf(doc, { envId, sandboxId })
  const last = storedHealth(dir, { strict: true })
  if (!last) {
    if (doc.seq !== 1) throw healthError('first publish must be seq 1')
  } else {
    // A stored baseline must itself be a fully valid doc for this identity
    // — a syntactically valid partial object (e.g. seq missing) is corrupt
    // evidence, never a baseline to compare against.
    healthDocOf(last, { envId, sandboxId })
    if (last.generation !== doc.generation) {
      throw healthError('foreign generation')
    }
    if (last.epoch === doc.epoch) {
      if (doc.seq <= last.seq) throw healthError('seq replay')
    } else if (doc.seq !== 1) {
      throw healthError('epoch rebind')
    }
  }
  const tmp = join(dir, `.${HEALTH_FILE}.${randomUUID()}.tmp`)
  const fd = openSync(tmp, 'wx', 0o644)
  try {
    writeSync(fd, JSON.stringify(doc))
  } finally {
    closeSync(fd)
  }
  renameSync(tmp, join(dir, HEALTH_FILE))
  return { ok: true }
}

/**
 * `node public-health.mjs`: the host owner's guest channel. Deployment IDs
 * come from /proc/1/environ (never logged or projected); the doc arrives on
 * bounded stdin. Output is a single {ok} line; identity never echoes.
 */
export async function runPublishHealth({ environ = '/proc/1/environ', dir = HEALTH_DIR, input, out, uid = 0 } = {}) {
  const emit = out ?? ((line) => process.stdout.write(`${line}\n`))
  const deny = (code) => { emit('{"ok":false}'); process.exitCode = 1; return { ok: false, error: code } }
  let ids = null
  try {
    ids = Object.fromEntries(
      readFileSync(environ).toString('utf8').split('\0')
        .filter((entry) => entry.startsWith('DNLS_ENV_ID=') || entry.startsWith('DNLS_SANDBOX_ID='))
        .map((entry) => [entry.slice(0, entry.indexOf('=')), entry.slice(entry.indexOf('=') + 1)]),
    )
  } catch { /* absent or unreadable environ is fail-closed */ }
  if (!ids?.DNLS_ENV_ID || !ids?.DNLS_SANDBOX_ID) return deny('identity')
  let body = ''
  for await (const chunk of (input ?? process.stdin)) {
    body += chunk
    if (body.length > 64 * 1024) return deny('input')
  }
  try {
    const doc = JSON.parse(body)
    publishHealth(doc, { dir, envId: ids.DNLS_ENV_ID, sandboxId: ids.DNLS_SANDBOX_ID, uid })
    emit('{"ok":true}')
    return { ok: true }
  } catch {
    return deny('publish')
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await runPublishHealth()
}
