/** Host half. Notes stay in the browser database, so this side only supplies defaults. */

export const name = 'nano-notepad'
export const inject = ['webServer']

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

function asString(s) { const q = JSON.stringify(String(s)); return q.slice(1, -1).replace(/"/g, '\\"') }

/** Native macOS save dialog: ask the Finder for a target path, then write it. */
function nativeSave({ name, content }) {
  return new Promise(resolve => {
    if (process.platform !== 'darwin') { resolve({ ok: false, reason: 'unsupported' }); return }
    const base = name.endsWith('.md') ? name.slice(0, -3) : name
    const script = `try\nset f to choose file name with prompt "存储为" default name "${asString(base)}"\nPOSIX path of f\non error\n"__cancelled__"\nend try`
    import('node:child_process').then(({ execFile }) => {
      execFile('/usr/bin/osascript', ['-e', script], { timeout: 600000, maxBuffer: 64 * 1024 }, async (err, stdout) => {
        const out = String(stdout || '').trim()
        if (err && !out) { resolve({ ok: false, reason: 'failed', message: String(err.message || err).slice(0, 200) }); return }
        if (!out || out === '__cancelled__' || /user canceled|User canceled|已取消/i.test(String(err?.message || ''))) { resolve({ ok: false, reason: 'cancelled' }); return }
        try {
          const fs = await import('node:fs/promises')
          const target = out.endsWith('.md') ? out : `${out}.md`
          await fs.writeFile(target, content, 'utf8')
          resolve({ ok: true, path: target })
        } catch (werr) {
          resolve({ ok: false, reason: 'failed', message: String(werr.message || werr).slice(0, 200) })
        }
      })
    })
  })
}

/** @param {import('@deepseek-ai/cordis').Context} ctx */
export function apply(ctx) {
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: SAVE_ROUTE,
    handler: async (req, res) => {
      if (req.method !== 'POST') { res.setHeader('allow', 'POST'); sendJson(res, 405, { ok: false, reason: 'method' }); return }
      try {
        const body = await jsonBody(req)
        const result = await nativeSave({ name: body.name, content: body.content })
        sendJson(res, result.ok ? 200 : result.reason === 'cancelled' ? 200 : 500, result)
      } catch (error) {
        sendJson(res, 500, { ok: false, reason: 'failed', message: String(error.message || error).slice(0, 200) })
      }
    },
  }), 'nano-notepad: save route')
}
