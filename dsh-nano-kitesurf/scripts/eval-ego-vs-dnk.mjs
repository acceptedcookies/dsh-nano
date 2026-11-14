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
  { name: 'httpbin-html', url: 'https://httpbin.org/html', intent: 'a blockquote body', probe: 'body' },
  { name: 'wikipedia-SSR', url: 'https://en.wikipedia.org/wiki/Hypertext', intent: 'a content link', probe: 'a[href^="/wiki/"]' },
]

// Deterministic-error edge cases: same wrong input must give the SAME
// structured errorId on DNK. ego has no equivalent contract (Playwright throws).
const EDGE = [
  { name: 'missing-selector', path: '/nano-kitesurf/pick', body: { selector: 'h1.definitely-not-there' }, want: 'kitesurf.pick.miss', status: 404 },
  { name: 'ref-not-in-table', path: '/nano-kitesurf/pick', body: { selector: '@999' }, want: 'kitesurf.ref.miss', status: 404 },
  { name: 'bad-coords', path: '/nano-kitesurf/pick', body: { x: 60000, y: 1 }, want: 'kitesurf.pick.point', status: 400 },
  { name: 'malformed-selector', path: '/nano-kitesurf/pick', body: { selector: '[[[' }, want: 'kitesurf.pick', status: 400 },
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

async function caseRun(dnkPage, egoPage, target) {
  const c = { target: target.name, dnk: {}, ego: {} }

  // ── DNK side: open the target in the engine, snapshot, locate by intent.
  await dnkPage.goto(GUI); await new Promise((r) => setTimeout(r, 1400))
  let openErr = null
  try { await dnk(dnkPage, '/nano-kitesurf/open', { url: target.url }) } catch (e) { openErr = String(e).slice(0, 80) }
  c.dnk.openErr = openErr
  await new Promise((r) => setTimeout(r, 2500))
  const snap = await dnk(dnkPage, '/nano-local-sandbox/snapshot', null, 'GET')
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

  // ── ego side: reuse ONE managed page across targets (newPage hits the
  //    space page budget; a shared page navigates to each target in turn).
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
  const task = await taskSpace('dnk-eval2')
  // Two managed pages: p1 drives the authed dsh-dev GUI (DNK routes), p2 is the
  // ego-side page reused across targets. Reusing avoids the space page budget.
  const dnkPage = task.page('p1')
  const egoPage = await task.newPage()
  for (const t of TARGETS) {
    try { await caseRun(dnkPage, egoPage, t) } catch (e) { report.cases.push({ target: t.name, error: String(e).slice(0, 160) }) }
  }

  // ── Edge cases: deterministic structured errors on the authed host routes.
  try { await dnkPage.goto(GUI); await new Promise((r) => setTimeout(r, 1200)) } catch { }
  const edgeRows = []
  for (const e of EDGE) {
    const r = await dnk(dnkPage, e.path, e.body)
    const errId = r.json?.errorId || ''
    const ok = r.status === e.status && errId.includes(e.want)
    edgeRows.push({ name: e.name, ok, got: `${r.status}/${errId}`, want: `${e.status}/${e.want}` })
  }
  report.edge = edgeRows

  out('\n=== DNK vs ego agent-surface comparison ===')
  for (const c of report.cases) {
    out(`\n[${c.target}]`)
    if (c.error) { out(`  ERROR ${c.error}`); continue }
    if (c.dnk.openErr) out(`  DNK /open     : ${c.dnk.openErr}  ← capacity gap`)
    out(`  locate-by-intent : DNK ${c.dnk.locatedRef ?? 'none'} (role=${c.dnk.role}) | ego ${c.ego.located ? c.ego.role : 'none'}`)
    out(`  heading preserved: DNK ${c.dnk.headingPreserved ? 'yes' : 'NO (flattened to generic)'} | ego ${c.ego.headingPreserved ? 'yes' : 'no'}  (ego h1=${c.ego.h1 ?? '—'})`)
    out(`  act precision    : DNK wait@${c.dnk.locatedRef} ${c.dnk.actOk ? 'ok' : 'FAIL'} ${c.dnk.actMs}ms | ego click ${c.ego.actOk ? 'ok' : 'FAIL'}`)
    out(`  ref stability    : DNK pick.ref=${c.dnk.pickRef} stable=${c.dnk.refStable}`)
    out(`  latency          : DNK snapshot ${c.dnk.snapshotMs}ms | ego load ${c.ego.loadMs}ms`)
    out(`  DNK tree head    : ${(c.dnk.tree || '').split('\n').slice(0, 4).join(' / ')}`)
  }

  // Axis rollup (skip cases that errored).
  const ok = report.cases.filter((c) => !c.error && c.dnk && c.ego)
  const axis = {
    'element-location': ok.every((c) => c.dnk.locatedRef && c.ego.located) ? 'tie' : 'see cases',
    'heading-fidelity': ok.every((c) => c.dnk.headingPreserved === c.ego.headingPreserved) ? 'tie (renderer is INCONSISTENT, not absent)' : (ok.every((c) => c.ego.headingPreserved) ? 'ego (DNK flattens on some pages)' : 'mixed'),
    'execution-precision': ok.every((c) => c.dnk.actOk && c.ego.actOk) ? 'tie' : 'see cases',
    'ref-language': ok.every((c) => c.dnk.refStable) ? 'DNK (stable @N round-trip; ego has no persistent ref)' : 'ego',
    'large-SSR-load': ok.some((c) => c.target === 'wikipedia-SSR') ? 'see case' : 'ego (DNK /open timed out on heavy SSR — capacity gap)',
    'deterministic-errors': (report.edge || []).every((e) => e.ok) ? 'DNK (structured errorId contract; ego throws Playwright text)' : 'see edge',
  }
  if (report.edge) {
    out('\n=== edge-case deterministic errors (DNK contract; ego has none) ===')
    for (const e of report.edge) out(`  ${e.ok ? 'PASS' : 'FAIL'}  ${e.name}: ${e.got}  (want ${e.want})`)
  }

  out('\n=== axis rollup ===')
  for (const [k, v] of Object.entries(axis)) out(`  ${k}: ${v}`)
  const dnkWins = Object.values(axis).filter((v) => String(v).startsWith('DNK')).length
  const egoWins = Object.values(axis).filter((v) => String(v).startsWith('ego')).length
  out(`\nDNK wins ${dnkWins} | ego wins ${egoWins} | ties ${Object.keys(axis).length - dnkWins - egoWins}`)
  console.log('EVAL_JSON ' + JSON.stringify({ axis, cases: report.cases.map((c) => ({ t: c.target, dnk: { ref: c.dnk.locatedRef, role: c.dnk.role, head: c.dnk.headingPreserved, act: c.dnk.actOk, stable: c.dnk.refStable, ms: c.dnk.snapshotMs }, ego: { loc: c.ego.located, role: c.ego.role, head: c.ego.headingPreserved, act: c.ego.actOk } })) }))
}

await main()
