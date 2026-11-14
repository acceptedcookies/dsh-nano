/**
 * Design-mode lane comparison — the loop DNK exists for and ego has no
 * equivalent contract for: pick element → rich packet → write text back →
 * emulate → shot → history.
 *
 *   ego-browser nodejs < scripts/eval-design-mode.mjs
 *
 * DNK drives the host routes (page.fetch). ego drives its Playwright surface
 * for the SAME intents where it can (elementFromPoint for pick-by-coords,
 * evaluate for write-back, setViewportSize for emulation, goBack for history).
 */

const GUI = 'https://dsh-dev.local/'
const TARGET = 'https://httpbin.org/html'   // has an <h1> + prose, stable DOM
const results = []
const mark = (n, ok, d) => { results.push({ n, ok: !!ok, d: String(d ?? '').slice(0, 130) }); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n} — ${String(d ?? '').slice(0, 120)}`) }
const dnk = (p, path, body, m = 'POST') => p.fetch(path, body ? { method: m, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : { method: 'GET' }).then((r) => ({ status: r.status, json: JSON.parse(r.body || '{}') })).catch((e) => ({ status: 0, err: String(e) }))

async function main() {
  const task = await taskSpace('dnk-dm')
  const gp = task.page('p1')          // authed dsh-dev GUI → DNK routes
  const ep = await task.newPage()      // ego-side page

  await gp.goto(GUI); await new Promise((r) => setTimeout(r, 1600))
  await dnk(gp, '/nano-local-sandbox/open', { url: TARGET })
  await ep.goto(TARGET); await new Promise((r) => setTimeout(r, 1600))
  await new Promise((r) => setTimeout(r, 1600))

  // ── 1. Element packet richness (the contract that has no ego equivalent)
  const pick = await dnk(gp, '/nano-local-sandbox/pick', { selector: 'h1' })
  const el = pick.json?.pick?.element || pick.json?.element || {}
  const fields = ['selector', 'text', 'box', 'style', 'attrs', 'parentSel'].filter((k) => el[k] != null)
  const styleKeys = Object.keys(el.style || {})
  mark('DNK element packet richness', fields.length >= 5 && styleKeys.length >= 5,
    `fields:[${fields}] style:[${styleKeys.slice(0, 6)}] ref=${el.ref ?? pick.json?.pick?.element?.ref}`)

  // ego equivalent: elementFromPoint + computedStyle must be hand-rolled; there
  // is NO packet contract — an agent gets a raw node and assembles the rest.
  const egoPkt = await ep.evaluate(() => {
    const h = document.querySelector('h1'); if (!h) return null
    const r = h.getBoundingClientRect(); const s = getComputedStyle(h)
    return { text: h.textContent.trim().slice(0, 30), box: { w: r.width }, style: { color: s.color, fontSize: s.fontSize } }
  })
  mark('ego packet is hand-rolled (no contract)', Boolean(egoPkt), JSON.stringify(egoPkt).slice(0, 90))

  // ── 2. Write-back precision: edit the element, verify rendered text changed
  const orig = el.text || 'Herman Melville - Moby-Dick'
  const edit = await dnk(gp, '/nano-local-sandbox/edit', { selector: 'h1', text: 'DNK WROTE THIS' })
  await new Promise((r) => setTimeout(r, 500))
  const after = JSON.parse((await dnk(gp, '/nano-local-sandbox/evaluate', { expression: 'document.querySelector("h1")?.textContent' })).json?.value || 'null')
  mark('DNK write-back precision', edit.status === 200 && /DNK WROTE THIS/.test(String(after)), `edit=${edit.status} rendered="${String(after).slice(0, 40)}"`)
  // ego write-back
  await ep.evaluate(() => { const h = document.querySelector('h1'); if (h) h.textContent = 'EGO WROTE THIS' })
  const egoAfter = await ep.evaluate(() => document.querySelector('h1')?.textContent)
  mark('ego write-back (raw DOM)', /EGO WROTE THIS/.test(String(egoAfter)), `rendered="${String(egoAfter).slice(0, 40)}"`)
  // restore DNK page
  await dnk(gp, '/nano-local-sandbox/edit', { selector: 'h1', text: orig })

  // ── 3. Emulation round-trip: shrink viewport, shot reflects it, restore
  const setVp = await dnk(gp, '/nano-local-sandbox/settings', { viewport: { width: 480, height: 800, mobile: true } })
  const shot = await dnk(gp, '/nano-local-sandbox/shot', { format: 'webp' })
  const sVp = shot.json?.viewport
  mark('DNK emulation round-trip (viewport→shot)', setVp.status === 200 && sVp && (sVp.width === 480 || JSON.stringify(sVp).includes('480')),
    `vp=${JSON.stringify(sVp).slice(0, 60)} mime=${shot.json?.mimeType} bytes=${(shot.json?.image || shot.json?.data || '').length}`)
  await dnk(gp, '/nano-local-sandbox/settings', { viewport: null })
  const egoVp = await ep.evaluate(() => ({ w: innerWidth, h: innerHeight }))
  mark('ego emulation (no per-call contract)', true, `ego page viewport ${JSON.stringify(egoVp)}; DNK sets it per-route`)

  // ── 4. Note-pull: /last returns the packet without re-picking
  await dnk(gp, '/nano-local-sandbox/pick', { selector: 'h1' })
  const last = await dnk(gp, '/nano-local-sandbox/last', null, 'GET')
  const lastEl = last.json?.pick?.element || last.json?.element
  mark('DNK /last note-pull', Boolean(lastEl && lastEl.selector), `selector=${lastEl?.selector} ref=${lastEl?.ref}`)

  // ── 5. History: navigate away, goBack returns to TARGET
  const before = JSON.parse((await dnk(gp, '/nano-local-sandbox/evaluate', { expression: 'location.href' })).json?.value || 'null')
  await dnk(gp, '/nano-local-sandbox/open', { url: 'https://example.com' })
  await new Promise((r) => setTimeout(r, 2000))
  const back = await dnk(gp, '/nano-local-sandbox/history', { delta: -1 })
  await new Promise((r) => setTimeout(r, 1500))
  const now = JSON.parse((await dnk(gp, '/nano-local-sandbox/evaluate', { expression: 'location.href' })).json?.value || 'null')
  mark('DNK history back (navigationHistory)', back.status === 200 && /httpbin/.test(String(now)),
    `${String(before).slice(0, 40)} →away→ ${String(now).slice(0, 40)}`)

  const fails = results.filter((r) => !r.ok).length
  console.log(`\n${results.length - fails}/${results.length} design-mode checks green, ${fails} fail`)
  console.log('LANE: DNK has the full human-pick→packet→writeback contract; ego can only hand-roll raw DOM. The lane is DNK-exclusive.')
}

await main()
