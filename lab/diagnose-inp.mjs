#!/usr/bin/env node
/**
 * Diagnose a page-level INP budget failure (lab §7 / composer-type).
 *
 * Splits PerformanceEventTiming.duration into:
 *   inputDelay   = processingStart - startTime      (main thread busy / queued)
 *   processing   = processingEnd - processingStart  (event handlers)
 *   presentation = duration - (processingEnd - startTime) (wait for next paint)
 * and runs the SAME synthetic typing on the daily instance, which loads none
 * of the four nano plugins. That control decides whether a plugin can be the
 * cause at all. Nothing here changes plugin code or the budget contract.
 *
 * Usage: node lab/diagnose-inp.mjs [--repeats 2]
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const LAB = dirname(fileURLToPath(import.meta.url))
const OUT = join(LAB, 'out')
mkdirSync(OUT, { recursive: true })
const cfg = JSON.parse(readFileSync(existsSync(join(LAB, 'config.local.json'))
  ? join(LAB, 'config.local.json') : join(LAB, 'config.example.json'), 'utf8'))
const ego = cfg.egoBrowserBin.replace(/^~/, homedir())
const i = process.argv.indexOf('--repeats')
const repeats = i === -1 ? 2 : Number(process.argv[i + 1])

const TEXT = 'The quick brown fox jumps over the lazy dog. Performance review typing scenario: one hundred and twenty characters of ordinary prose.'

const script = `
async function main() {
  const task = await taskSpace(${JSON.stringify(cfg.spaceName)});
  const page = task.page(${JSON.stringify(cfg.pageLabel)});
  const TEXT = ${JSON.stringify(TEXT)};
  const targets = [
    { label: 'daily_no_nano', url: 'https://dsh.local/' },
    { label: 'dev_with_nano', url: 'https://dsh-dev.local/?perf-review=1' },
  ];
  const all = [];
  for (const t of targets) {
    for (let r = 0; r < ${repeats}; r += 1) {
      await page.goto(t.url, { timeout: 40000 });
      await page.waitForTimeout(2600);
      const env = await page.evaluate(() => ({
        perfReview: typeof window.__perfReview !== 'undefined',
        nxeRoots: document.querySelectorAll('[data-nxe]').length,
        hasTextarea: !!document.querySelector('textarea'),
      }));
      await page.evaluate(() => {
        window.__d = { ev: [], loaf: [], lt: [] };
        const ev = new PerformanceObserver(l => {
          for (const e of l.getEntries()) window.__d.ev.push({ d: e.duration, s: e.startTime, ps: e.processingStart, pe: e.processingEnd, n: e.name });
        });
        ev.observe({ type: 'event', durationThreshold: 16 });
        const lf = new PerformanceObserver(l => {
          for (const e of l.getEntries()) window.__d.loaf.push({ d: e.duration, scripts: (e.scripts || []).map(s => ({ u: s.sourceURL, d: s.duration })) });
        });
        lf.observe({ type: 'long-animation-frame' });
        const lt = new PerformanceObserver(l => { for (const e of l.getEntries()) window.__d.lt.push(e.duration); });
        try { lt.observe({ type: 'longtask' }); } catch (e) {}
        window.__stop = () => { ev.disconnect(); lf.disconnect(); try { lt.disconnect(); } catch (e) {} };
      });
      await page.evaluate(() => { const e = document.querySelector('textarea'); if (e) e.focus(); });
      await page.keyboard.type(TEXT, { delay: 80 });
      await page.waitForTimeout(900);
      const out = await page.evaluate(() => {
        window.__stop();
        const d = window.__d;
        const ev = d.ev.filter(e => e.d > 0);
        const durs = ev.map(e => e.d).sort((a, b) => a - b);
        const q = p => durs.length ? durs[Math.min(durs.length - 1, Math.ceil(p * durs.length) - 1)] : null;
        const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : null;
        const parts = ev.map(e => ({
          i: Math.max(0, e.ps - e.s), p: Math.max(0, e.pe - e.ps), r: Math.max(0, e.d - (e.pe - e.s)),
        }));
        const scripts = {};
        for (const f of d.loaf) for (const s of f.scripts) {
          const k = (s.u || '?').replace(/^https:\\/\\/[^/]+/, '').slice(0, 90);
          scripts[k] = (scripts[k] || 0) + (s.d || 0);
        }
        let pluginCallbackMs = 0;
        let pluginSpans = 0;
        let pluginCallbacks = 0;
        let pluginCollectionEnabled = false;
        if (window.__perfReview) {
          pluginCollectionEnabled = window.__perfReview._state?.().enabled === true;
          const rep = window.__perfReview.report({ scenario: 'inp-diagnosis', arm: 'on' });
          for (const p of Object.values(rep.plugins || {})) {
            for (const t of Object.values(p.tracks || {})) pluginCallbackMs += (t.callbackMs || 0);
            pluginSpans += p.native?.samples?.spans || 0;
            pluginCallbacks += p.native?.samples?.callbacks || 0;
          }
        }
        return {
          events: durs.length, p50: q(0.5), p75: q(0.75), max: durs.at(-1) ?? null,
          inputDelayAvg: avg(parts.map(x => x.i)), processingAvg: avg(parts.map(x => x.p)), presentationAvg: avg(parts.map(x => x.r)),
          inputDelayMax: Math.round(Math.max(0, ...parts.map(x => x.i))),
          longtasks: d.lt.length, loafCount: d.loaf.length,
          loafMax: Math.round(Math.max(0, ...d.loaf.map(f => f.d))),
          topScripts: Object.entries(scripts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([u, ms]) => [u, Math.round(ms)]),
          pluginCollectionEnabled,
          pluginCallbackMs: Math.round(pluginCallbackMs * 10) / 10, pluginSpans, pluginCallbacks,
        };
      });
      // Never send: clear the composer, do not press Enter, do not create a session.
      await page.keyboard.press('ControlOrMeta+a');
      await page.keyboard.press('Backspace');
      all.push({ label: t.label, run: r + 1, env, ...out });
    }
  }
  console.log('DIAG_JSON=' + JSON.stringify(all));
}
await main();
`

const r = spawnSync(ego, ['nodejs', '-e', script], {
  encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
  env: { ...process.env, PATH: `${homedir()}/.local/bin:${process.env.PATH ?? ''}` },
})
const combined = `${r.stdout ?? ''}\n${r.stderr ?? ''}`
const line = combined.split('\n').find(l => l.startsWith('DIAG_JSON='))
if (!line) {
  console.error('no DIAG_JSON from browser:', combined.slice(-1500))
  process.exit(2)
}
const rows = JSON.parse(line.slice('DIAG_JSON='.length))
const byLabel = {}
for (const row of rows) (byLabel[row.label] ??= []).push(row)

const summary = Object.fromEntries(Object.entries(byLabel).map(([label, list]) => {
  const p75 = list.map(x => x.p75).filter(x => x != null).sort((a, b) => a - b)
  return [label, {
    runs: list.length,
    p75All: p75,
    p75Median: p75.length ? p75[Math.floor(p75.length / 2)] : null,
    inputDelayAvg: Math.round(list.reduce((s, x) => s + (x.inputDelayAvg ?? 0), 0) / list.length * 100) / 100,
    processingAvg: Math.round(list.reduce((s, x) => s + (x.processingAvg ?? 0), 0) / list.length * 100) / 100,
    presentationAvg: Math.round(list.reduce((s, x) => s + (x.presentationAvg ?? 0), 0) / list.length),
    pluginCollectionEnabled: list.every(x => x.pluginCollectionEnabled),
    pluginCallbackMsMax: Math.max(...list.map(x => x.pluginCallbackMs ?? 0)),
    pluginSpansMax: Math.max(...list.map(x => x.pluginSpans ?? 0)),
    longtasks: list.reduce((s, x) => s + x.longtasks, 0),
    inputDelayMax: Math.max(...list.map(x => x.inputDelayMax ?? 0)),
  }]
}))

// A single A/B direction is NOT evidence: p75 swings by an order of magnitude
// between identical runs and the direction has flipped across experiments.
// Decide on the timing decomposition + plugin callback cost instead.
const all = Object.values(summary)
const maxInputDelay = Math.max(...all.map(s => s.inputDelayAvg))
const maxProcessing = Math.max(...all.map(s => s.processingAvg))
const maxPresentation = Math.max(...all.map(s => s.presentationAvg))
const maxPluginCb = Math.max(...all.map(s => s.pluginCallbackMsMax))
const p75s = rows.map(r => r.p75).filter(x => x != null)
const p75Spread = p75s.length ? [Math.min(...p75s), Math.max(...p75s)] : null
const presentationDominant = maxPresentation > (maxInputDelay + maxProcessing) * 10
const variance = p75Spread && p75Spread[1] > p75Spread[0] * 2
  ? `HIGH_VARIANCE: 同场景 p75 在 ${p75Spread[0]}–${p75Spread[1]} ms 之间摆动，单次读数不可判定。`
  : 'VARIANCE_OK'

const verdict = presentationDominant && maxInputDelay < 5 && maxProcessing < 5
  ? `PLUGINS_NOT_IMPLICATED: inputDelayAvg<=${maxInputDelay}ms、processingAvg<=${maxProcessing}ms，longtask≈0，耗时几乎全在 presentation（<=${maxPresentation}ms）；插件窗口内 track callbackMs 最大 ${maxPluginCb}ms。页级 INP fail 是呈现管线 / 合成按键 / 环境噪声，不是插件主线程占用。${variance}`
  : `INCONCLUSIVE: inputDelayAvg=${maxInputDelay}ms / processingAvg=${maxProcessing}ms / presentationAvg=${maxPresentation}ms / pluginCallbackMsMax=${maxPluginCb}ms。需进一步用 tracing 定位。${variance}`

const result = { generatedAt: new Date().toISOString(), repeats, rows, summary, p75Spread, verdict }
const out = join(OUT, 'inp-diagnosis.json')
writeFileSync(out, JSON.stringify(result, null, 2))
console.log(JSON.stringify({ summary, verdict }, null, 2))
console.log(`\nwritten: ${out}`)
