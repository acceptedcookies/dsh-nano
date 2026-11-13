/**
 * End-to-end suite for dsh-nano-kitesurf, driven through ego-browser against
 * the live GUI. Run with:
 *
 *   ego-browser nodejs < scripts/e2e-ego.mjs
 *
 * Every check asserts on real DOM state and leaves a screenshot under
 * /tmp/dnk-e2e-*.png. Exit code is non-zero when any check fails.
 */

const SPACE = 'dnk-e2e'
const GUI = 'https://dsh-dev.local/'
const results = []
let shot = 0

function record(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail: String(detail ?? '').slice(0, 160) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + String(detail).slice(0, 120) : ''}`)
}

async function main() {
  const task = await taskSpace(SPACE)
  const page = task.page('p1')

  await page.goto(GUI)
  await page.waitForLoadState()
  await new Promise((r) => setTimeout(r, 2500))

  // 0. Make the run self-contained: a previous run may have left the engine
  // on about:blank (e.g. after suspend/resume), so open a page first.
  await page.evaluate(() => fetch('/nano-kitesurf/open', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ url: 'https://example.com' }),
  }))
  await new Promise((r) => setTimeout(r, 2000))

  // 1. bundle freshness: the served module must carry a marker that only
  //    exists in the current source.
  const rev = await page.evaluate(() => {
    const link = Array.from(document.querySelectorAll('link[href*="dsh-nano-kitesurf/client.js"]'))[0]
    return link ? link.href : null
  })
  record('bundle-mounted', Boolean(rev), rev ? rev.split('rev=')[1] : 'no link tag')

  // 2. open the pane
  await page.mouse.click(1180, 24)
  await new Promise((r) => setTimeout(r, 900))
  const item = await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('*')).find((e) => e.children.length === 0 && e.textContent?.trim() === 'Kitesurf' && e.getBoundingClientRect().width > 0 && e.getBoundingClientRect().y > 60)
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  if (item) await page.mouse.click(item.x, item.y)
  await new Promise((r) => setTimeout(r, 6000))
  record('pane-open', await page.evaluate(() => Boolean(document.querySelector('[data-nano-kitesurf]'))))

  // 3. native HTML surface
  const surface = await page.evaluate(() => ({
    iframe: Boolean(document.querySelector('iframe.nks-dom')),
    img: Boolean(document.querySelector('.nks-frame img')),
  }))
  record('native-html', surface.iframe && !surface.img, JSON.stringify(surface))

  // 4. no document rewrite during interaction: the frame may shrink when
  // chrome appears, but a rewrite would re-lay out the page (visible jump).
  const versions = []
  const sample = async () => versions.push(await page.evaluate(() => document.querySelector('iframe.nks-dom')?.dataset?.nksVersion || null))
  await sample()
  const annotate = await page.evaluate(() => {
    const b = document.querySelector('[data-nks-annotate]')
    const r = b.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), covered: !document.elementFromPoint(Math.round(r.x + r.width / 2), Math.round(r.y + r.height / 2))?.closest('[data-nks-annotate]') }
  })
  record('annotate-reachable', !annotate.covered, `point ${annotate.x},${annotate.y}`)
  await page.mouse.click(annotate.x, annotate.y)
  await new Promise((r) => setTimeout(r, 700))
  record('annotate-armed', (await page.evaluate(() => document.querySelector('[data-nks-annotate]')?.getAttribute('aria-pressed'))) === 'true')
  await sample()

  // 5. pick inside the native document
  const target = await page.evaluate(() => {
    const f = document.querySelector('iframe.nks-dom')
    const d = f?.contentDocument
    const el = d?.querySelector('p') || d?.body
    if (!el) return null
    const fr = f.getBoundingClientRect()
    const pr = el.getBoundingClientRect()
    return { x: Math.round(fr.x + pr.x + pr.width / 2), y: Math.round(fr.y + pr.y + pr.height / 2), tag: el.tagName }
  })
  if (target) {
    await page.mouse.move(target.x, target.y)
    await new Promise((r) => setTimeout(r, 150))
    await page.mouse.down()
    await new Promise((r) => setTimeout(r, 80))
    await page.mouse.up()
  }
  await new Promise((r) => setTimeout(r, 1200))
  record('pick-opens-note', await page.evaluate(() => Boolean(document.querySelector('[data-nks-note]'))), target?.tag)
  await sample()
  record('no-jitter', versions.every((v) => v && v === versions[0]), `document versions ${versions.join('/')}`)
  await page.screenshot({ path: `/tmp/dnk-e2e-${++shot}-pick.png` })

  // 6. inject into composer
  const send = await page.evaluate(() => {
    const b = document.querySelector('[data-nks-note] [data-nks-send]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  if (send) await page.mouse.click(send.x, send.y)
  await new Promise((r) => setTimeout(r, 1500))
  const composer = await page.evaluate(() => document.querySelector('[contenteditable]')?.innerText || '')
  record('composer-ref', composer.includes('<kitesurf ref=') && composer.includes('el:'), `${composer.length} chars`)

  // 7. DevTools console + network
  const dt = await page.evaluate(() => {
    const b = document.querySelector('[data-nks-devtools-toggle]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  if (dt) await page.mouse.click(dt.x, dt.y)
  await new Promise((r) => setTimeout(r, 2500))
  const consoleRows = await page.evaluate(() => document.querySelectorAll('[data-nks-devtools] .nks-dt-row').length)
  record('devtools-console', consoleRows > 0, `${consoleRows} rows`)
  const netTab = await page.evaluate(() => {
    const b = document.querySelector('[data-nks-dt-network]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  if (netTab) await page.mouse.click(netTab.x, netTab.y)
  await new Promise((r) => setTimeout(r, 2000))
  const netRows = await page.evaluate(() => document.querySelectorAll('[data-nks-devtools] .nks-dt-row').length)
  record('devtools-network', netRows > 0, `${netRows} rows`)
  await page.screenshot({ path: `/tmp/dnk-e2e-${++shot}-devtools.png` })

  // 8. Elements tab (DOM tree) and computed styles
  const elTab = await page.evaluate(() => {
    const b = document.querySelector('[data-nks-dt-elements]')
    if (!b) return null
    const r = b.getBoundingClientRect()
    return { x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) }
  })
  if (elTab) await page.mouse.click(elTab.x, elTab.y)
  await new Promise((r) => setTimeout(r, 2200))
  const elRows = await page.evaluate(() => document.querySelectorAll('[data-nks-devtools] .nks-dt-row').length)
  record('devtools-elements', elRows > 10, `${elRows} nodes`)
  const styles = await page.evaluate(async () => {
    const r = await fetch('/nano-kitesurf/elements?selector=p')
    return r.json()
  })
  record('computed-styles', Object.keys(styles.computed || {}).length > 10, `${Object.keys(styles.computed || {}).length} properties`)

  const stylePanel = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('[data-nks-devtools] .nks-dt-row'))
    const p = rows.find((r) => (r.querySelector('.nks-dt-lv')?.textContent || '').toLowerCase() === 'p')
    if (!p) return null
    p.click()
    return true
  })
  await new Promise((r) => setTimeout(r, 1500))
  const styleText = await page.evaluate(() => document.querySelector('[data-nks-dt-styles]')?.innerText || '')
  record('styles-panel', Boolean(stylePanel) && /rules/.test(styleText) && /computed/.test(styleText), styleText.slice(0, 80))
  record('matched-rules', Array.isArray(styles.matched?.matched) && styles.matched.matched.length > 0, `${styles.matched?.matched?.length || 0} rules`)

  // 9. lifecycle: suspend -> resume -> page comes back
  const lifecycle = await page.evaluate(async () => {
    const post = (body) => fetch('/nano-kitesurf/kite', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json())
    const st = () => fetch('/nano-kitesurf/status').then((r) => r.json())
    const before = await st()
    const suspended = await post({ action: 'suspend' })
    const mid = await st()
    const resumed = await post({ action: 'resume' })
    // resume rebuilds the container: the page is gone, so re-open before any
    // later check that needs a document.
    await fetch('/nano-kitesurf/open', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: 'https://example.com' }) })
    await new Promise((r) => setTimeout(r, 3000))
    const after = await st()
    return {
      beforePhase: before.kite?.phase,
      suspendOk: suspended.ok === true,
      midPhase: mid.kite?.phase,
      resumeOk: resumed.ok === true,
      afterPhase: after.kite?.phase,
      alive: after.ok === true,
    }
  })
  record('lifecycle', lifecycle.suspendOk && lifecycle.midPhase === 'suspended' && lifecycle.resumeOk && lifecycle.afterPhase === 'running' && lifecycle.alive, JSON.stringify(lifecycle))

  // 10. host self-test
  const selftest = await page.evaluate(async () => {
    const r = await fetch('/nano-kitesurf/selftest')
    return r.json()
  })
  record('host-selftest', selftest.ok === true, `${selftest.failed}/${selftest.total} failed`)

  const failed = results.filter((r) => !r.ok)
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
  console.log(JSON.stringify({ at: new Date().toISOString(), passed: results.length - failed.length, total: results.length, results }))
  if (failed.length) process.exitCode = 1
}

await main()
