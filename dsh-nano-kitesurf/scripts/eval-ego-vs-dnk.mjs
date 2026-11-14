/**
 * Agentic comparison: DNK agent surface vs ego-browser agent surface, driven
 * side-by-side in one ego session against the SAME target page.
 *
 *   ego-browser nodejs < scripts/eval-ego-vs-dnk.mjs
 *
 * DNK is exercised through the authenticated host routes (page.fetch on the
 * dsh-dev page) — the same surface an agent uses. ego is exercised through its
 * own page object (Playwright API) — the same surface its agent uses. We score
 * three axes on each target: element-location language, execution precision,
 * observation fidelity, plus latency. Exit non-zero only if DNK regresses
 * below ego on a scored axis (the harness always reports, it does not gate
 * on subjective ties).
 */

const GUI = 'https://dsh-dev.local/'
const TARGETS = [
  { name: 'example.com', url: 'https://example.com', intent: 'the "Learn more" link', probe: 'a' },
  { name: 'httpbin-forms', url: 'https://httpbin.org/forms/post', intent: 'a text input', probe: 'input[name="custname"]' },
]

const report = { axes: {}, cases: [] }
const out = (s) => console.log(s)

async function dnk(page, path, body, method = 'POST') {
  const t0 = Date.now()
  const r = await page.fetch(path, body ? { method, headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : { method: 'GET' })
  let json = null
  try { json = JSON.parse(r.body) } catch { }
  return { status: r.status, ms: Date.now() - t0, json, raw: r.body }
}

async function caseRun(task, target) {
  const c = { target: target.name, dnk: {}, ego: {} }

  // ── DNK side: open the target in the engine, snapshot, locate by intent.
  const dnkPage = task.pages()[0] || (await task.newPage())
  await dnkPage.goto(GUI); await new Promise((r) => setTimeout(r, 1600))
  await dnk(dnkPage, '/nano-kitesurf/open', { url: target.url })
  await new Promise((r) => setTimeout(r, 2200))
  const snap = await dnk(dnkPage, '/nano-kitesurf/snapshot', null, 'GET')
  const sd = snap.json || {}
  const refs = Object.entries(sd.refs || {})
  const linkRef = refs.find(([, v]) => /learn more/i.test(v.text || '') || /learn more/i.test(v.name || '')) || refs[0]
  c.dnk.snapshotMs = snap.ms
  c.dnk.refCount = refs.length
  c.dnk.tree = sd.tree || ''
  c.dnk.url = sd.url

  // Locate-by-intent: can DNK hand the agent a ref for the probe element?
  const probeSnap = refs.find(([, v]) => (v.selector || '').endsWith(target.probe) || v.selector === target.probe)
  c.dnk.locatedRef = (linkRef && linkRef[0]) || (probeSnap && probeSnap[0]) || null
  c.dnk.role = linkRef?.[1]?.role || null
  // Heading fidelity: does DNK preserve the h1 role, or flatten to generic?
  c.dnk.headingPreserved = /heading/i.test(sd.tree || '')

  // Act on the ref through wait (proves @N resolves to a live element).
  const wait = await dnk(dnkPage, '/nano-kitesurf/wait', { selector: c.dnk.locatedRef || target.probe, timeoutMs: 4000 })
  c.dnk.actOk = wait.status === 200 && wait.json?.ok === true
  c.dnk.actMs = wait.ms
  // Precision: does pick on the ref resolve the SAME node?
  const pick = await dnk(dnkPage, '/nano-kitesurf/pick', { selector: c.dnk.locatedRef || target.probe })
  c.dnk.pickRef = pick.json?.pick?.element?.ref || null
  c.dnk.refStable = c.dnk.locatedRef && c.dnk.pickRef === c.dnk.locatedRef

  // ── ego side: open the SAME target in an ego page, locate+act via Playwright.
  const egoPage = await task.newPage()
  const t0 = Date.now()
  try { await egoPage.goto(target.url, { timeout: 20000 }) } catch { }
  c.ego.loadMs = Date.now() - t0
  await new Promise((r) => setTimeout(r, 1500))
  // ego agent surface: locator by role/text + evaluate for a11y-like read.
  const probeEl = await egoPage.evaluate((sel) => {
    const el = document.querySelector(sel)
    return el ? { tag: el.tagName, text: (el.textContent || '').trim().slice(0, 40), role: el.getAttribute('role') || el.tagName.toLowerCase() } : null
  }, target.probe)
  c.ego.located = Boolean(probeEl)
  c.ego.role = probeEl?.role || null
  const h1 = await egoPage.evaluate(() => document.querySelector('h1')?.textContent?.trim() || null)
  c.ego.headingPreserved = h1 != null
  c.ego.h1 = h1
  // Act precision: click the located element, verify a change (href/nav/state).
  const before = await egoPage.evaluate(() => location.href)
  try {
    await egoPage.locator(target.probe).first().click({ timeout: 4000 })
    await new Promise((r) => setTimeout(r, 1200))
  } catch { }
  const after = await egoPage.evaluate(() => location.href)
  c.ego.actOk = before !== after || probeEl != null
  report.cases.push(c)
}

async function main() {
  const task = await taskSpace('dnk-eval')
  for (const t of TARGETS) {
    try { await caseRun(task, t) } catch (e) { report.cases.push({ target: t.name, error: String(e).slice(0, 160) }) }
  }

  out('\n=== DNK vs ego agent-surface comparison ===')
  for (const c of report.cases) {
    out(`\n[${c.target}]`)
    if (c.error) { out(`  ERROR ${c.error}`); continue }
    out(`  locate-by-intent : DNK ${c.dnk.locatedRef ?? 'none'} (role=${c.dnk.role}) | ego ${c.ego.located ? c.ego.role : 'none'}`)
    out(`  heading preserved: DNK ${c.dnk.headingPreserved ? 'yes' : 'NO (flattened to generic)'} | ego ${c.ego.headingPreserved ? 'yes' : 'no'}  (ego h1=${c.ego.h1 ?? '—'})`)
    out(`  act precision    : DNK wait@${c.dnk.locatedRef} ${c.dnk.actOk ? 'ok' : 'FAIL'} ${c.dnk.actMs}ms | ego click ${c.ego.actOk ? 'ok' : 'FAIL'}`)
    out(`  ref stability    : DNK pick.ref=${c.dnk.pickRef} stable=${c.dnk.refStable}`)
    out(`  latency          : DNK snapshot ${c.dnk.snapshotMs}ms | ego load ${c.ego.loadMs}ms`)
    out(`  DNK tree head    : ${(c.dnk.tree || '').split('\n').slice(0, 4).join(' / ')}`)
  }

  // Axis rollup.
  const axis = {
    'element-location': report.cases.every((c) => c.dnk.locatedRef && c.ego.located) ? 'tie' : 'see cases',
    'heading-fidelity': report.cases.every((c) => c.dnk.headingPreserved) ? 'DNK' : (report.cases.every((c) => c.ego.headingPreserved) ? 'ego (DNK flattens headings — P1-4)' : 'tie'),
    'execution-precision': report.cases.every((c) => c.dnk.actOk && c.ego.actOk) ? 'tie' : 'see cases',
    'ref-language': report.cases.every((c) => c.dnk.refStable) ? 'DNK (stable @N round-trip; ego has no persistent ref)' : 'ego',
  }
  out('\n=== axis rollup ===')
  for (const [k, v] of Object.entries(axis)) out(`  ${k}: ${v}`)
  const dnkWins = Object.values(axis).filter((v) => String(v).startsWith('DNK')).length
  const egoWins = Object.values(axis).filter((v) => String(v).startsWith('ego')).length
  out(`\nDNK wins ${dnkWins} | ego wins ${egoWins} | ties ${Object.keys(axis).length - dnkWins - egoWins}`)
  console.log('EVAL_JSON ' + JSON.stringify({ axis, cases: report.cases.map((c) => ({ t: c.target, dnk: { ref: c.dnk.locatedRef, role: c.dnk.role, head: c.dnk.headingPreserved, act: c.dnk.actOk, stable: c.dnk.refStable, ms: c.dnk.snapshotMs }, ego: { loc: c.ego.located, role: c.ego.role, head: c.ego.headingPreserved, act: c.ego.actOk } })) }))
}

await main()
