/** Host half. Notes stay in the browser database, so this side only supplies defaults. */

export const name = 'nano-notepad'
export const inject = ['webServer', 'connection', 'subprocess']

export const Config = {
  '~standard': {
    version: 1,
    vendor: 'dsh-nano-notepad',
    validate(value) {
      const source = value && typeof value === 'object' ? value : {}
      const number = (key, fallback, min, max) => {
        const candidate = source[key]
        if (candidate === undefined) return fallback
        if (typeof candidate !== 'number' || !Number.isInteger(candidate) || candidate < min || candidate > max) {
          return { issue: `${key} must be an integer from ${min} to ${max}` }
        }
        return candidate
      }
      const fields = {
        saveDelayMs: number('saveDelayMs', 800, 200, 5000),
        commitIntervalSec: number('commitIntervalSec', 60, 15, 3600),
        versionLimit: number('versionLimit', 50, 5, 500),
        imageLimitBytes: number('imageLimitBytes', 5 * 1024 * 1024, 256 * 1024, 20 * 1024 * 1024),
      }
      const issues = Object.entries(fields)
        .filter(([, field]) => field && field.issue)
        .map(([, field]) => ({ message: field.issue }))
      if (issues.length > 0) return { issues }
      const view = source.defaultView ?? 'rendered'
      const theme = source.theme ?? 'system'
      if (view !== 'rendered' && view !== 'source') issues.push({ message: 'defaultView must be rendered or source' })
      if (!['dark', 'light', 'system'].includes(theme)) issues.push({ message: 'theme must be dark, light, or system' })
      if (issues.length > 0) return { issues }
      return {
        value: {
          saveDelayMs: fields.saveDelayMs,
          commitIntervalSec: fields.commitIntervalSec,
          versionLimit: fields.versionLimit,
          imageLimitBytes: fields.imageLimitBytes,
          defaultView: view,
          theme,
        },
      }
    },
  },
}

const SAVE_ROUTE = '/nano-notepad/save'
const MAX_SAVE_BYTES = 8 * 1024 * 1024
const DIALOG_TIMEOUT_MS = 600000
const MAX_NAME_BYTES = 512

async function jsonBody(req) {
  const chunks = []
  let total = 0
  for await (const chunk of req) {
    total += chunk.length
    if (total > MAX_SAVE_BYTES) throw new Error('request body is too large')
    chunks.push(chunk)
  }
  if (total === 0) return {}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'))
}

function sendJson(res, status, payload) {
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(JSON.stringify(payload))
}

function messageOf(value) { return value instanceof Error ? value.message : String(value) }

/**
 * The AppleScript program the save dialog runs. The proposed filename is passed
 * as `argv` item 1 — never interpolated into the source — so a hostile name is
 * inert text instead of a string-literal breakout (review-01 R2).
 */
const SAVE_SCRIPT = [
  'on run argv',
  'try',
  'set dflt to item 1 of argv',
  'set loc to ""',
  'if (count of argv) > 1 then set loc to item 2 of argv',
  'if loc is not "" then',
  'set f to choose file name with prompt "存储为" default name dflt default location (POSIX file loc)',
  'else',
  'set f to choose file name with prompt "存储为" default name dflt',
  'end if',
  'POSIX path of f',
  'on error',
  '"__cancelled__"',
  'end try',
  'end run',
].join('\n')

/** The name the dialog proposes: extension stripped, empty/oversized refused. */
function dialogBase(name) {
  if (typeof name !== 'string') throw new Error('name must be a string')
  const trimmed = name.endsWith('.md') ? name.slice(0, -3) : name
  if (trimmed === '' || trimmed.length > MAX_NAME_BYTES) throw new Error('name must be 1..512 characters')
  return trimmed
}

/**
 * Ask Finder for a target path, then write the note there. `osascript` runs the
 * static {@link SAVE_SCRIPT} with the name on argv, so nothing the caller sends
 * is ever compiled as AppleScript.
 */
/** Directories the dialog accepts as its start point: absolute, exists, is a dir. */
async function validStartDir(dir) {
  if (typeof dir !== 'string' || !dir.startsWith('/') || dir.includes('\0')) return ''
  try {
    const fs = await import('node:fs/promises')
    return (await fs.stat(dir)).isDirectory() ? dir : ''
  } catch { return '' }
}

function nativeSave(ctx, { name, content, dir }) {
  return new Promise(async resolve => {
    if (process.platform !== 'darwin') { resolve({ ok: false, reason: 'unsupported' }); return }
    const base = dialogBase(name)
    const startDir = await validStartDir(dir)
    const finish = async (err, stdout) => {
      const out = String(stdout || '').trim()
      if (err && !out) { resolve({ ok: false, reason: 'failed', message: messageOf(err).slice(0, 200) }); return }
      if (!out || out === '__cancelled__' || /user canceled|已取消/i.test(messageOf(err ?? ''))) {
        resolve({ ok: false, reason: 'cancelled' })
        return
      }
      try {
        // The path is user-chosen via the native dialog, so it may lie outside the
        // workspace; `ctx.fs` would fence it, so the write stays on the platform
        // file seam the dialog itself authorizes.
        const fs = await import('node:fs/promises')
        const target = out.endsWith('.md') ? out : `${out}.md`
        await fs.writeFile(target, content, 'utf8')
        resolve({ ok: true, path: target })
      } catch (werr) {
        resolve({ ok: false, reason: 'failed', message: messageOf(werr).slice(0, 200) })
      }
    }
    const subprocess = ctx.get('subprocess')
    if (subprocess !== undefined && subprocess !== null) {
      void runViaSubprocess(subprocess, base, startDir).then(
        ({ stdout }) => finish(null, stdout),
        error => finish(error, ''),
      )
      return
    }
    void import('node:child_process').then(({ execFile }) => {
      execFile('/usr/bin/osascript', ['-e', SAVE_SCRIPT, base, startDir], { timeout: DIALOG_TIMEOUT_MS, maxBuffer: 64 * 1024 },
        (err, stdout) => { void finish(err, stdout) })
    })
  })
}

/**
 * Run the dialog through the managed subprocess seam (byte caps, graceful
 * terminate, abort) instead of a raw `execFile`.
 */
async function runViaSubprocess(subprocess, base, startDir) {
  const program = await subprocess.resolveExecutable('osascript', undefined, undefined)
  const child = subprocess.spawn({
    argv: [program, '-e', SAVE_SCRIPT, base, startDir],
    cwd: process.env.HOME ?? '/',
    env: {},
    graceMs: 5000,
    stdio: {
      stdin: 'ignore',
      stdout: { maxBytes: 64 * 1024 },
      stderr: { maxBytes: 16 * 1024 },
    },
  })
  try {
    const outcome = await child.done
    const stdout = child.collected.stdout.readFrom(0).text
    const stderr = child.collected.stderr.readFrom(0).text
    if (outcome.exitCode !== 0 && stdout.trim() === '') {
      throw new Error(stderr.split(/\r?\n/u).find(line => line.trim() !== '') ?? `osascript exited ${outcome.exitCode}`)
    }
    return { stdout }
  } finally {
    child.terminate()
    await child.waitForExit().catch(() => {})
  }
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: SAVE_ROUTE,
    handler: async (req, res) => {
      // Every write-capable route sits behind the connection's request admission
      // (Host/Origin fence + authenticated Peer); without it any web page or LAN
      // client could drive the native save dialog (review-01 R1).
      const rejection = ctx.get('connection')?.requestRejection(req)
      if (rejection !== undefined) { res.statusCode = rejection; res.end(); return }
      if (req.method !== 'POST') { res.setHeader('allow', 'POST'); sendJson(res, 405, { ok: false, reason: 'method' }); return }
      const type = String(req.headers['content-type'] ?? '')
      if (!type.toLowerCase().startsWith('application/json')) { sendJson(res, 415, { ok: false, reason: 'content-type' }); return }
      try {
        const body = await jsonBody(req)
        const result = await nativeSave(ctx, { name: body.name, content: body.content, dir: body.dir })
        sendJson(res, result.ok ? 200 : result.reason === 'cancelled' ? 200 : 500, result)
      } catch (error) {
        sendJson(res, 500, { ok: false, reason: 'failed', message: messageOf(error).slice(0, 200) })
      }
    },
  }), 'nano-notepad: save route')
}
