#!/usr/bin/env node
/**
 * eval-page-ladder.mjs — five levels of page complexity against a live engine.
 *
 * The question this answers is "which pages can this engine actually render",
 * not "is the network up". Each level differs only in what the page asks the
 * renderer to do, so a failure at level N and success at N-1 is a renderer
 * limit, not a site-specific quirk.
 *
 *   L1  static HTML, no script
 *   L2  HTML + CSS + a tiny classic script
 *   L3  server-rendered article with real JS (Wikipedia)
 *   L4  framework SPA with a large bundle (react.dev)
 *   L5  heavy bundle + fonts + canvas (archy.studio)
 *
 * Usage (needs a logged-in dsh page; run inside ego-browser):
 *   ego-browser nodejs < scripts/eval-page-ladder.mjs
 *
 * The script prints one line per level and a summary. It never fails the
 * process: a ladder is a measurement, not a gate.
 */

/** Wait between levels: a navigation retires the previous page script, and
 *  starting the next one mid-retire kills it. */
const SETTLE_MS = 3000
/** How long one level may take before it counts as a failure. */
const LEVEL_TIMEOUT_MS = 40000
const POLL_MS = 2000

export const LEVELS = Object.freeze([
  { level: 1, name: 'static-html', url: 'https://example.com' },
  { level: 2, name: 'html+css+script', url: 'https://www.iana.org/help/example-domains' },
  { level: 3, name: 'article+js', url: 'https://en.wikipedia.org/wiki/Kitesurfing' },
  { level: 4, name: 'spa', url: 'https://react.dev/' },
  { level: 5, name: 'heavy', url: 'https://archy.studio' },
])

/**
 * @param {object} page - an ego-browser Page already logged into dsh
 * @param {Array<{level:number,name:string,url:string}>} [levels]
 * @returns {Promise<Array<{level:number,name:string,url:string,ok:boolean,ms:number,bytes:number,error?:string}>>}
 */
export async function runLadder(page, levels = LEVELS) {
  const post = async (path, body) => {
    const response = await page.fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    return { status: response.status, body: JSON.parse(response.body || '{}') }
  }
  const rows = []
  for (const entry of levels) {
    await page.waitForTimeout(SETTLE_MS)
    const started = Date.now()
    await post('/nano-local-sandbox/open', { url: entry.url })
    let landed = null
    while (Date.now() - started < LEVEL_TIMEOUT_MS) {
      await page.waitForTimeout(POLL_MS)
      const dom = JSON.parse((await page.fetch('/nano-local-sandbox/dom')).body || '{}')
      if (dom.url && dom.url !== 'about:blank') {
        landed = { url: dom.url, bytes: String(dom.srcdoc || '').length }
        break
      }
    }
    rows.push({
      ...entry,
      ok: Boolean(landed),
      ms: Date.now() - started,
      bytes: landed?.bytes ?? 0,
      error: landed ? undefined : 'blank after timeout',
    })
  }
  return rows
}

/** Human-readable report; the summary line is the part worth pasting. */
export function formatLadder(rows) {
  const lines = rows.map((row) => `L${row.level} ${row.name.padEnd(16)} ${row.ok ? `OK   ${(row.ms / 1000).toFixed(0)}s ${row.bytes}B` : 'FAIL blank'}`)
  const passed = rows.filter((row) => row.ok).length
  const firstFail = rows.find((row) => !row.ok)
  lines.push('')
  lines.push(`${passed}/${rows.length} levels rendered${firstFail ? ` — first failure at L${firstFail.level} (${firstFail.name})` : ''}`)
  return lines.join('\n')
}

// Run when executed directly (ego-browser nodejs < this file).
if (typeof taskSpace === 'function') {
  const task = await taskSpace('dnk-ladder')
  const pages = await task.pages()
  const page = pages[pages.length - 1]
  console.log(formatLadder(await runLadder(page)))
}
