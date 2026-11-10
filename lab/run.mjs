#!/usr/bin/env node
/**
 * dsh-performance-review lab runner (spec §6.6 / §7, execution ledger B1–B3).
 *
 * Drives the REAL Chromium via ego-browser (not Playwright — see README.md),
 * on the REAL dsh-dev.local instance. One invocation per scenario writes
 * lab/out/<stamp>-<scenario>.json + .md. `on` arm builds/compares a committed
 * baseline. Exit codes: 0 pass, 1 budget failure, 2 version/report mismatch.
 *
 * Usage:
 *   node lab/run.mjs --scenario all --arm on --write-baseline
 *   node lab/run.mjs --scenario all --arm on
 *   node lab/run.mjs --scenario idle-10s --arm on --inject-failure
 *   node lab/run.mjs --scenario observer-purity --arm purity
 *   node lab/run.mjs --measure-footprint
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const LAB = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(LAB, '..')
const OUT = join(LAB, 'out')
const BASELINE = join(LAB, 'baseline', 'baseline.json')
const CONFIG = join(LAB, 'config.local.json')

const args = process.argv.slice(2)
const flag = (name, fallback = null) => {
  const i = args.indexOf(`--${name}`)
  return i === -1 ? fallback : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true)
}
const has = name => args.includes(`--${name}`)

const scenarioArg = flag('scenario', 'all')
const arm = flag('arm', 'on')
const injectFailure = has('inject-failure')
const injectDelay = has('inject-delay')
const writeBaseline = has('write-baseline')
const measureFootprint = has('measure-footprint')
const repeats = Math.max(1, Number(flag('repeats', 1)) || 1)

mkdirSync(OUT, { recursive: true })
const cfg = JSON.parse(readFileSync(existsSync(CONFIG) ? CONFIG : join(LAB, 'config.example.json'), 'utf8'))
cfg.egoBrowserBin = cfg.egoBrowserBin.replace(/^~/, homedir())
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)

const log = (...a) => console.log('[lab]', ...a)
const readJson = p => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : null)

/** Build a standalone IIFE of the DNPR client for the purity arm. */
function buildStandalone() {
  const esbuild = join(ROOT, 'dsh-nano-explorer-extra', 'node_modules', '.bin', 'esbuild')
  const out = join(OUT, 'perf-review-standalone.js')
  const r = spawnSync(esbuild, [
    join(ROOT, 'packages', 'dsh-performance-review', 'src', 'client.js'),
    '--bundle', '--format=iife', '--global-name=__perfReviewLib', '--platform=browser',
    `--outfile=${out}`,
  ], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(`standalone build failed: ${r.stderr}`)
  return readFileSync(out, 'utf8')
}

/** B2: exact DNPR byte footprint in NDEE's client bundle (normal vs aliased stub). */
function footprint() {
  const pkg = join(ROOT, 'dsh-nano-explorer-extra')
  const esbuild = join(pkg, 'node_modules', '.bin', 'esbuild')
  const stub = join(OUT, 'no-review-stub.mjs')
  writeFileSync(stub, [
    "export const LIB_VERSION = 'no-review'",
    'const api = { span:(n,f)=>f(), track:()=>({wrap:f=>f,attach(){},detach(){},resetLive(){}}), count(){}, profiler:c=>c }',
    'export function ensurePerfReview(){ return { join:()=>api, configure(){}, report:()=>({}), reset(){}, resetCounters(){} } }',
    'export function firstVisibleRoot(){ return null }',
  ].join('\n'))
  const common = [
    'src/client/index.js', '--bundle', '--format=iife', '--global-name=__nxeExport',
    '--minify', '--platform=browser', '--external:react', '--external:react-dom',
    '--external:react-dom/client', '--external:@deepseek-ai/dsh-client-ui-primitives',
    '--define:__NXE_VERSION__="0.1.1"',
  ]
  const plain = join(OUT, 'client-with-review.js')
  const bare = join(OUT, 'client-no-review.js')
  for (const [extra, outfile] of [[[], plain], [[`--alias:dsh-performance-review/client=${stub}`], bare]]) {
    const r = spawnSync(esbuild, [...common, ...extra, `--outfile=${outfile}`], { cwd: pkg, encoding: 'utf8' })
    if (r.status !== 0) throw new Error(`footprint build failed: ${r.stderr}`)
  }
  const withB = statSync(plain).size
  const withoutB = statSync(bare).size
  const result = {
    measuredAt: new Date().toISOString(),
    package: 'dsh-nano-explorer-extra',
    withReviewBytes: withB,
    withoutReviewBytes: withoutB,
    dnprFootprintBytes: withB - withoutB,
    note: 'Exact byte delta of one client bundle. Other three plugins are NOT measured here; do not extrapolate without building them.',
  }
  writeFileSync(join(OUT, `${stamp}-footprint.json`), JSON.stringify(result, null, 2))
  log('footprint', JSON.stringify(result))
  return result
}

/** Version fingerprint. */
function pluginVersions() {
  const out = {}
  for (const name of cfg.plugins ?? []) {
    const p = join(ROOT, name, 'package.json')
    if (existsSync(p)) out[name] = JSON.parse(readFileSync(p, 'utf8')).version
  }
  return out
}
function dshVersion() {
  const r = spawnSync(cfg.dshBin ?? 'dsh', ['--version'], { encoding: 'utf8' })
  return (r.stdout || '').trim().split(/\s+/)[0] || null
}

/** L1: median of numeric samples, ignoring absent values. */
function median(values) {
  const v = values.filter(x => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b)
  if (v.length === 0) return null
  const m = Math.floor(v.length / 2)
  return v.length % 2 ? v[m] : Math.round((v[m - 1] + v[m]) / 2 * 10) / 10
}
const getAt = (obj, path) => path.reduce((a, k) => (a == null ? undefined : a[k]), obj)
function setAt(obj, path, value) {
  let cur = obj
  for (let i = 0; i < path.length - 1; i += 1) {
    cur = cur?.[path[i]]
    if (cur == null) return
  }
  if (value !== null) cur[path[path.length - 1]] = value
}

/**
 * L1: a single p75 swings 72–800 ms on this machine (§12.1), so judging on
 * one run is unsound. With --repeats N, take the per-metric MEDIAN across N
 * independent browser runs and judge on that, while keeping every raw run's
 * key readings in `repeatRuns` for audit.
 */
function mergeRepeats(payloads) {
  const first = payloads[0]
  const merged = JSON.parse(JSON.stringify(first))
  const firstReport = first.report
  // Purity arm has no page report — nothing to median, keep the first reading.
  if (!firstReport) {
    merged.notes = [...(merged.notes ?? []), `repeats=${payloads.length}: purity arm 无页面报告，不取中位数。`]
    return {
      payload: merged,
      repeatRuns: payloads.map((p, i) => ({ run: i + 1, purity: p.purity ?? null })),
    }
  }
  const paths = [
    ['page', 'nativeInpP75'], ['page', 'nativeInpCount'],
    ['page', 'inputDelayP95'], ['page', 'processingP95'], ['page', 'presentationP95'],
    ['page', 'loafCount'], ['page', 'blockingMs'], ['page', 'forcedLayoutMs'],
    ['page', 'nanoCombined', 'scriptMs'], ['page', 'nanoCombined', 'blockingMs'],
    ['page', 'nanoCombined', 'clientJsBytes'], ['page', 'nanoCombined', 'loafCount'],
    ['page', 'nanoCombined', 'comboResources'],
  ]
  for (const [id, plugin] of Object.entries(firstReport?.plugins ?? {})) {
    for (const p of ['native.spanMsP95', 'native.trackMsP95', 'native.samples.spans',
      'native.samples.callbacks', 'own.inpP75', 'own.inpCount', 'scriptMs']) {
      paths.push(['plugins', id, ...p.split('.')])
    }
    for (const name of Object.keys(plugin.tracks ?? {})) {
      for (const k of ['callbacks', 'live', 'callbackMs']) paths.push(['plugins', id, 'tracks', name, k])
    }
    for (const name of Object.keys(plugin.spans ?? {})) {
      for (const k of ['n', 'p50', 'p95', 'maxMs']) paths.push(['plugins', id, 'spans', name, k])
    }
    for (const name of Object.keys(plugin.hostSpan ?? {})) {
      for (const k of ['n', 'p50', 'p95']) paths.push(['plugins', id, 'hostSpan', name, k])
    }
  }
  for (const path of paths) {
    setAt(merged.report, path, median(payloads.map(p => getAt(p.report, path))))
  }
  merged.report.meta = { ...(merged.report.meta ?? {}), repeats: payloads.length }
  const repeatRuns = payloads.map((p, i) => ({
    run: i + 1,
    nativeInpP75: getAt(p.report, ['page', 'nativeInpP75']),
    inputDelayP95: getAt(p.report, ['page', 'inputDelayP95']),
    processingP95: getAt(p.report, ['page', 'processingP95']),
    presentationP95: getAt(p.report, ['page', 'presentationP95']),
    nativeInpCount: getAt(p.report, ['page', 'nativeInpCount']),
    scenario: p.scenario,
  }))
  merged.notes = [...(merged.notes ?? []), `repeats=${payloads.length}: 判定使用各指标中位数；原始每轮读数见 repeatRuns。`]
  return { payload: merged, repeatRuns }
}

/** One ego-browser invocation -> parsed payload, or null. Retries transient
 *  browser/navigation failures so a hiccup is not reported as a broken run. */
function runOnce(scenario, actualArm, script) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    log(`run scenario=${scenario} arm=${actualArm}${attempt > 1 ? ` (attempt ${attempt})` : ''}`)
    const r = spawnSync(cfg.egoBrowserBin, ['nodejs', '-e', script], {
      encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, PATH: `${homedir()}/.local/bin:${process.env.PATH ?? ''}` },
    })
    const combined = `${r.stdout ?? ''}\n${r.stderr ?? ''}`
    const line = combined.split('\n').find(l => l.startsWith('LAB_REPORT_JSON='))
    if (!line) {
      log(`attempt ${attempt} failed: no LAB_REPORT_JSON. stderr=${(r.stderr || '').slice(-400)}`)
    } else {
      const payload = JSON.parse(line.slice('LAB_REPORT_JSON='.length))
      if (payload.error) {
        log(`attempt ${attempt} failed in browser: ${payload.error}`)
      } else {
        return payload
      }
    }
    if (attempt < 3) spawnSync('/bin/sleep', ['3'])
  }
  return null
}

async function main() {
  if (measureFootprint) { footprint(); return 0 }

  const { SCENARIOS, scenarioScript } = await import('./scenarios.mjs')
  const { evaluate, versionsFrom, versionsMatch } = await import('./budgets.mjs')
  const { renderMarkdown } = await import('../packages/dsh-performance-review/src/markdown.js')

  const want = scenarioArg === 'all' ? SCENARIOS : [scenarioArg]
  const needsStandalone = arm === 'purity' || want.includes('observer-purity')
  const standalone = needsStandalone ? buildStandalone() : ''
  let baselineStore = readJson(BASELINE)
  const firstRun = writeBaseline || baselineStore === null
  const results = []
  let baselineWritten = false

  for (const scenario of want) {
    const actualArm = scenario === 'observer-purity' ? 'purity' : arm
    const script = scenarioScript(cfg, scenario, actualArm, standalone)
    const payloads = []
    for (let i = 0; i < repeats; i += 1) {
      if (repeats > 1) log(`  repeat ${i + 1}/${repeats}`)
      const p = runOnce(scenario, actualArm, script)
      if (p) payloads.push(p)
    }
    if (payloads.length === 0) {
      results.push({ scenario, arm: actualArm, error: 'no report from browser' })
      continue
    }
    let payload = payloads[0]
    let repeatRuns = null
    if (payloads.length > 1) {
      const merged = mergeRepeats(payloads)
      payload = merged.payload
      repeatRuns = merged.repeatRuns
    }
    // B3 injection: apply AFTER merging so the injected value is not diluted.
    // D2 removed the standing card-wake observer, so that row no longer exists
    // on an idle page — recreate a minimal row to simulate that exact regression.
    if (injectFailure && payload.report?.plugins?.['nano-explorer-extra']) {
      const plugin = payload.report.plugins['nano-explorer-extra']
      plugin.tracks ??= {}
      plugin.tracks['card-wake'] = {
        kind: 'mutation', callbacks: 0, live: 0, callbackMs: 0,
        ...(plugin.tracks['card-wake'] ?? {}),
        callbacks: 999999,
      }
      payload.notes = [...(payload.notes ?? []), 'INJECT-FAILURE: card-wake.callbacks forced to 999999 (simulated standing-observer regression)']
    }
    // L0 injection: verify the NEW attributable red line fires exit 1.
    if (injectDelay && payload.report?.page) {
      payload.report.page.inputDelayP95 = 999
      payload.notes = [...(payload.notes ?? []), 'INJECT-DELAY: page.inputDelayP95 forced to 999']
    }
    const report = payload.report
    const versions = versionsFrom(report, { ...cfg, dshVersion: dshVersion() }, pluginVersions())

    if (firstRun && actualArm === 'on') {
      // Baseline: store the raw report per scenario (accumulate across scenarios).
      if (baselineStore === null) {
        baselineStore = { meta: { versions, generatedAt: new Date().toISOString() }, reports: {} }
      }
      baselineStore.reports[scenario] = report
      baselineStore.meta.versions = versions
      baselineStore.meta.generatedAt = new Date().toISOString()
      mkdirSync(dirname(BASELINE), { recursive: true })
      writeFileSync(BASELINE, JSON.stringify(baselineStore, null, 2))
      baselineWritten = true
      log(`baseline written for ${scenario}`)
    }

    const verdict = evaluate(report, firstRun ? null : baselineStore, {
      scenario, arm: actualArm, purity: payload.purity, firstRun: firstRun && actualArm === 'on',
    })
    // Version mismatch → exit 2 (do not judge with a stale baseline).
    let versionMismatch = false
    if (!firstRun && actualArm === 'on' && baselineStore?.meta?.versions) {
      versionMismatch = !versionsMatch(versions, baselineStore.meta.versions)
      if (versionMismatch) verdict.failures.push({
        pluginId: 'measurement', metric: 'versions', value: JSON.stringify(versions),
        limit: JSON.stringify(baselineStore.meta.versions), reason: 'baseline version fingerprint mismatch',
      })
    }

    const jsonPath = join(OUT, `${stamp}-${scenario}-${actualArm}.json`)
    const mdPath = join(OUT, `${stamp}-${scenario}-${actualArm}.md`)
    const bundle = {
      scenario, arm: actualArm, generatedAt: new Date().toISOString(),
      repeats, repeatRuns,
      versions, notes: payload.notes ?? [], steps: payload.steps ?? {},
      domMeta: payload.domMeta ?? null, hostSnapshot: payload.hostSnapshot ?? null,
      purity: payload.purity ?? null, verdict, report,
    }
    writeFileSync(jsonPath, JSON.stringify(bundle, null, 2))
    let md = report
      ? renderMarkdown(report)
      : `# perf-review · ${scenario} · arm=${actualArm}\n\nPurity arm: no page report.\n`
    md += `\n## scenario\n\n- arm: ${actualArm}\n- repeats: ${repeats}${repeats > 1 ? '（判定使用各指标中位数）' : ''}\n- steps: ${JSON.stringify(bundle.steps)}\n- domMeta: ${JSON.stringify(bundle.domMeta)}\n- hostWindow: ${payload.hostSnapshot?.window === true}\n`
    if (repeatRuns) {
      md += `\n## repeat runs\n\n| run | nativeInpP75 | inputDelayP95 | processingP95 | presentationP95 | n |\n|---|---|---|---|---|---|\n`
      for (const r of repeatRuns) {
        md += `| ${r.run} | ${r.nativeInpP75 ?? '—'} | ${r.inputDelayP95 ?? '—'} | ${r.processingP95 ?? '—'} | ${r.presentationP95 ?? '—'} | ${r.nativeInpCount ?? 0} |\n`
      }
    }
    md += `\n## budget verdict\n\n- pass: **${verdict.pass && !versionMismatch}**\n- checks: ${verdict.checks}\n`
    for (const n of verdict.notes) md += `- note: ${n}\n`
    if (verdict.failures.length > 0) {
      md += `\n### failures (exit code 1)\n\n`
      md += `| pluginId | metric | value | limit | reason |\n|---|---|---|---|---|\n`
      for (const f of verdict.failures) md += `| ${f.pluginId} | ${f.metric} | ${f.value} | ${f.limit} | ${f.reason} |\n`
    }
    if (bundle.notes.length) md += `\n### browser notes\n\n${bundle.notes.map(n => `- ${n}`).join('\n')}\n`
    writeFileSync(mdPath, md)
    log(`${scenario}: pass=${verdict.pass && !versionMismatch} checks=${verdict.checks} failures=${verdict.failures.length} md=${mdPath}`)
    results.push({ scenario, arm: actualArm, verdict, versionMismatch, mdPath, jsonPath })
  }

  const versionFail = results.some(r => r.versionMismatch)
  const budgetFail = results.some(r => r.error || (r.verdict && !r.verdict.pass))
  console.log('\n[lab] ==== summary ====')
  for (const r of results) {
    const ok = !r.error && r.verdict?.pass && !r.versionMismatch
    console.log(`[lab] ${r.scenario.padEnd(18)} ${r.arm.padEnd(7)} ${r.error ? 'ERROR' : (ok ? 'PASS' : 'FAIL')} failures=${r.verdict?.failures?.length ?? 0}`)
    for (const f of (r.verdict?.failures ?? [])) console.log(`[lab]   → ${f.pluginId} ${f.metric}: ${f.value} (limit ${f.limit}) — ${f.reason}`)
  }
  if (baselineWritten) console.log('[lab] first run: baseline written, budgets NOT judged (spec §7).')
  const code = versionFail ? 2 : (budgetFail ? 1 : 0)
  console.log(`[lab] exit=${code}`)
  return code
}

const code = await main()
process.exit(code)
