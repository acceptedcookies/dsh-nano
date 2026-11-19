#!/usr/bin/env node
/** Five page shapes, not a release gate or a claim of an engine capability
 * limit. A result needs the requested document, an expected content marker,
 * and real screenshot bytes. Source HTTP failures and transport failures are
 * reported separately. Run in an authenticated dsh-dev ego-browser page:
 *   const { runLadder, formatLadder } = await import('/absolute/path/to/this/script.mjs')
 *   const task = await taskSpace('dnk-ladder')
 *   console.log(formatLadder(await runLadder(task.page('p1'))))
 */
export const LEVELS = Object.freeze([
  { level: 1, name: 'static-html', url: 'https://example.com', marker: 'Example Domain' },
  { level: 2, name: 'css-small-js', url: 'https://www.iana.org/help/example-domains', marker: 'Example Domains' },
  { level: 3, name: 'long-document', url: 'https://www.rfc-editor.org/rfc/rfc2616.html', marker: 'Hypertext Transfer Protocol' },
  { level: 4, name: 'react-hydration', url: 'https://react.dev/', marker: 'React' },
  { level: 5, name: 'animation-rich', url: 'https://archy.studio', marker: 'Archy' },
])

function targetMatches(requested, actual) {
  try { return new URL(requested).hostname.replace(/^www\./, '') === new URL(actual).hostname.replace(/^www\./, '') } catch { return false }
}

export async function runLadder(page, levels = LEVELS, onResult = () => {}) {
  const request = async (path, body) => {
    const r = await page.fetch(path, body === undefined ? { timeout: 90000 } : {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body), timeout: 90000,
    })
    return { status: r.status, body: JSON.parse(r.body || '{}') }
  }
  const rows = []
  for (const entry of levels) {
    const started = Date.now()
    const row = { ...entry, ok: false }
    try {
      await request('/nano-local-sandbox/console', { clear: true })
      const opened = await request('/nano-local-sandbox/open', { url: entry.url })
      row.openMs = Date.now() - started
      row.openStatus = opened.status
      if (!opened.body.ok) throw new Error(opened.body.error || opened.body.errorId || `HTTP ${opened.status}`)
      const dom = await request('/nano-local-sandbox/dom')
      row.landed = dom.body.url
      row.bytes = String(dom.body.srcdoc || '').length
      row.markerFound = String(dom.body.srcdoc || '').toLowerCase().includes(entry.marker.toLowerCase())
      const shot = await request('/nano-local-sandbox/shot', { format: 'png' })
      row.screenshotBytes = shot.body.data ? Math.floor(shot.body.data.length * 3 / 4) : 0
      // Decode the PNG IHDR: a shot must be a real frame, not a 3-byte blob
      // or a solid-color stub. IHDR starts at byte 16 of the base64 decode.
      row.pngSize = null
      if (shot.body.data) {
        try {
          const bin = atob(shot.body.data)
          // A PNG MUST start with the 8-byte signature; without it the IHDR
          // decode below reads random bytes as dimensions and can fake a pass.
          const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
          const sigOk = bin.length >= 24 && PNG_SIG.every((b, i) => bin.charCodeAt(i) === b)
          if (!sigOk) throw new Error('bad signature')
          const w = (bin.charCodeAt(16) << 24) | (bin.charCodeAt(17) << 16) | (bin.charCodeAt(18) << 8) | bin.charCodeAt(19)
          const h = (bin.charCodeAt(20) << 24) | (bin.charCodeAt(21) << 16) | (bin.charCodeAt(22) << 8) | bin.charCodeAt(23)
          // A 1x1 stub IS decodable but not a rendered page.
          row.pngSize = w > 8 && h > 8 ? `${w}x${h}` : `stub ${w}x${h}`
        } catch { row.pngSize = 'undecodable' }
      }
      // A DOM that is <title> only or an empty root is NOT a rendered page —
      // the pre-1119 ladder counted those as passes. Require real body
      // element content alongside the marker.
      row.domRoot = /<\s*body[\s>]/.test(dom.body.srcdoc || '') && /<[a-z][^>]*>[^<]|children|element/i.test(dom.body.srcdoc || '')
      const net = await request('/nano-local-sandbox/network')
      const document = [...(net.body.entries || [])].reverse().find(r => r.url?.replace(/\/$/, '') === entry.url.replace(/\/$/, '') && r.status != null)
      row.documentStatus = document?.status ?? null
      const consoleLog = await request('/nano-local-sandbox/console')
      row.consoleErrors = (consoleLog.body.entries || []).filter(r => /error|exception/i.test(r.level || '')).slice(-3).map(r => r.text)
      const status = await request('/nano-local-sandbox/status')
      row.cdpGeneration = status.body.cdpGeneration
      row.ok = dom.status === 200 && row.bytes > 400 && row.markerFound && row.domRoot === true
        && targetMatches(entry.url, row.landed) && row.screenshotBytes > 5000 && /^\d+x\d+$/.test(row.pngSize || '')
        && (row.documentStatus === null || row.documentStatus < 400)
      if (!row.ok) row.error = row.documentStatus >= 400 ? `source HTTP ${row.documentStatus}` : 'document/marker/screenshot check failed'
    } catch (error) { row.error = String(error.message || error) }
    row.ms = Date.now() - started
    rows.push(row)
    await onResult(row)
  }
  return rows
}

export function formatLadder(rows) {
  return rows.map(row => `L${row.level} ${row.name}: ${row.ok ? 'OK' : 'FAIL'} open=${row.openMs ?? '?'}ms total=${row.ms}ms DOM=${row.bytes ?? 0}B shot=${row.screenshotBytes ?? 0}B png=${row.pngSize ?? '?'} HTTP=${row.documentStatus ?? '?'} generation=${row.cdpGeneration ?? '?'} ${row.error || ''}`).join('\n')
}
