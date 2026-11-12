#!/usr/bin/env node
/**
 * E0 (performance-beta.md §5): render-path probes for dsh-nano-explorer-extra.
 *
 * Three probes over the REAL dev page, driven by ego-browser (lab/README.md):
 *   1. MutationObserver on the VISIBLE [data-nxe-tree] — counts idle batches,
 *      accessory mounts/unmounts, attribute patches, row remounts.
 *   2. React fiber component identity — captured before and after the idle
 *      window; `fiberTypeStable=false` means createAccessory returned a new
 *      component type (remount root cause).
 *   3. performance resource timing — /nano-explorer-extra/ requests bucketed
 *      by route (whole-repo / scoped / ignored / stats / other).
 * Plus Long Animation Frames for context.
 *
 * keepMounted leaves one [data-nxe] pane per session; hidden panes do not
 * poll, so every DOM selection filters by visibility (§8.5 of the beta doc).
 *
 * Usage:
 *   node lab/diagnose-render.mjs                        → print + write lab/out/render-baseline.json
 *   node lab/diagnose-render.mjs --out after-e1.json    → write a named snapshot
 *   node lab/diagnose-render.mjs --check                → compare vs baseline, exit 1 on regression
 *   node lab/diagnose-render.mjs --workspace dsh-plugins --expand dsh-nano-explorer-extra,packages --idle 38000
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join, resolve, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { homedir } from 'node:os'

const LAB = dirname(fileURLToPath(import.meta.url))
const OUT = join(LAB, 'out')
mkdirSync(OUT, { recursive: true })
const cfg = JSON.parse(readFileSync(
  existsSync(join(LAB, 'config.local.json')) ? join(LAB, 'config.local.json') : join(LAB, 'config.example.json'), 'utf8'))
const ego = cfg.egoBrowserBin.replace(/^~/, homedir())

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 ? fallback : process.argv[i + 1]
}
const workspace = arg('workspace', basename(resolve(cfg.workspaceDir ?? '/Users/seanz/Documents/dsh-plugins')))
const expand = String(arg('expand', 'dsh-nano-explorer-extra,packages')).split(',').filter(Boolean)
const idleMs = Number(arg('idle', 38000)) || 38000
const outName = arg('out', 'render-baseline.json')
const check = process.argv.includes('--check')
const space = arg('space', 'nxe-perf-render')

const script = `
const WS_NAME = ${JSON.stringify(workspace)};
const EXPAND = ${JSON.stringify(expand)};
const IDLE_MS = ${idleMs};
async function main() {
  const task = await taskSpace(${JSON.stringify(space)});
  const page = task.page(${JSON.stringify(cfg.pageLabel ?? 'p1')});
  const BASE = ${JSON.stringify(cfg.baseUrl ?? 'https://dsh-dev.local')};
  const notes = [];
  const steps = {};
  const safe = async (label, fn) => {
    try { const r = await fn(); steps[label] = r === undefined ? "ok" : r; return r; }
    catch (e) { const m = String((e && e.message) || e); notes.push(label + ": " + m); steps[label] = "ERROR: " + m; return null; }
  };
  for (let i = 0; i < 4; i += 1) {
    try { await page.goto(BASE + "/", { timeout: 40000 }); await page.waitForLoadState("load"); break; }
    catch (e) { if (i === 3) throw e; await page.waitForTimeout(2500); }
  }
  // The TaskSpace page keeps an HTTP cache between runs; a re-deployed bundle must be fetched
  // fresh or the probe measures the previous build.
  await safe("hardReload", async () => { await page.reload({ timeout: 40000 }); await page.waitForLoadState("load") });
  await page.waitForTimeout(2500);
  await safe("bundleCheck", () => page.evaluate(() => ({ accCreate: window.__nxeAccCreate ?? null })));

  // ---- choose the session under the named workspace group ----
  const picked = await safe("pickSession", () => page.evaluate((name) => {
    const items = [...document.querySelectorAll('[role=treeitem]')];
    const gi = items.findIndex(e => (e.textContent || '').trim() === name || (e.textContent || '').trim().startsWith(name));
    if (gi === -1 || gi + 1 >= items.length) return { ok: false, found: gi };
    items[gi + 1].dispatchEvent(new MouseEvent('click', { bubbles: true }));
    return { ok: true, group: name };
  }, WS_NAME));
  await page.waitForTimeout(2500);
  await safe("openFiles", () => page.evaluate(() => {
    const t = [...document.querySelectorAll("[data-dockkit-tab]")].find(e => (e.textContent || "").trim().includes("文件"));
    if (t) { t.click(); return true; }
    return false;
  }));
  await page.waitForTimeout(2000);

  // ---- expand the named folders in the VISIBLE pane ----
  const expandResult = await safe("expand", () => page.evaluate((names) => {
    const panes = [...document.querySelectorAll('[data-nxe]')];
    const visible = panes.filter(p => p.closest('[hidden], [aria-hidden="true"]') === null);
    const tree = visible[0]?.querySelector('[data-nxe-tree]');
    if (!tree) return { ok: false, panes: panes.length };
    const done = [];
    for (const name of names) {
      const row = [...tree.querySelectorAll('li[data-files-entry]')].find(r =>
        r.querySelector(':scope > div > button span:last-child')?.textContent === name);
      if (!row) { done.push({ name, ok: false }); continue; }
      row.querySelector('button')?.click();
      done.push({ name, ok: true });
    }
    return { ok: true, done };
  }, EXPAND));
  await page.waitForTimeout(1800);

  // ---- install probes on the visible pane's tree ----
  const setup = await safe("installProbes", () => page.evaluate(() => {
    const panes = [...document.querySelectorAll('[data-nxe]')];
    const visible = panes.filter(p => p.closest('[hidden], [aria-hidden="true"]') === null);
    const root = visible[0];
    const tree = root?.querySelector('[data-nxe-tree]');
    if (!tree) return { ok: false };
    const s = window.__nxeProbe = { tree, batches: [], accMounted: 0, accUnmounted: 0, accAttr: 0, rowMounted: 0, rowUnmounted: 0, start: Date.now(), loaf: [] };
    let nextId = 1;
    for (const acc of tree.querySelectorAll('.nxe-acc')) acc.__nxeTag = nextId++;
    let batch = null;
    const flush = () => { if (batch) { s.batches.push(batch); batch = null } };
    const obs = new MutationObserver(records => {
      if (!batch) { batch = { at: Date.now() - s.start, addedEls: 0, removedEls: 0, accAdd: 0, accRemove: 0, accAttr: 0, rowAdd: 0, rowRemove: 0 }; queueMicrotask(flush) }
      for (const r of records) {
        if (r.type === 'childList') {
          for (const n of r.addedNodes) if (n.nodeType === 1) {
            batch.addedEls++;
            if (n.matches?.('.nxe-acc')) { batch.accAdd++; if (!n.__nxeTag) { n.__nxeTag = nextId++; s.accMounted++ } }
            if (n.matches?.('li[data-files-entry]')) { batch.rowAdd++; s.rowMounted++ }
          }
          for (const n of r.removedNodes) if (n.nodeType === 1) {
            batch.removedEls++;
            if (n.matches?.('.nxe-acc')) { batch.accRemove++; if (n.__nxeTag) s.accUnmounted++ }
            if (n.matches?.('li[data-files-entry]')) { batch.rowRemove++; s.rowUnmounted++ }
          }
        } else if (r.type === 'attributes' && r.target.matches?.('.nxe-acc')) { batch.accAttr++; s.accAttr++ }
      }
    });
    obs.observe(tree, { childList: true, subtree: true, attributes: true });
    s.observer = obs;
    try {
      const lo = new PerformanceObserver(list => { for (const e of list.getEntries()) s.loaf.push(Math.round(e.duration)); });
      lo.observe({ type: 'long-animation-frame' });
      s.loafObserver = lo;
    } catch (e) { s.loafError = String(e); }
    const acc = tree.querySelector('.nxe-acc');
    let typeBefore = null;
    if (acc) {
      const key = Object.keys(acc).find(k => k.startsWith('__reactFiber$'));
      let node = acc[key];
      while (node && typeof node.type !== 'function') node = node.return;
      typeBefore = node?.type ?? null;
    }
    s.typeBefore = typeBefore;
    performance.clearResourceTimings();
    return {
      ok: true,
      path: root.querySelector('[data-nxe-path]')?.textContent ?? null,
      rows: tree.querySelectorAll('li[data-files-entry]').length,
      accs: tree.querySelectorAll('.nxe-acc').length,
      openButtons: tree.querySelectorAll('.nxe-acc button.nxe-open').length,
      svgs: tree.querySelectorAll('.nxe-acc svg').length,
      panesTotal: panes.length,
    };
  }));
  if (!setup?.ok) {
    console.log("DIAG_JSON=" + JSON.stringify({ error: "probe install failed", setup, steps, notes }));
    return;
  }

  await page.waitForTimeout(IDLE_MS);

  const result = await safe("collect", () => page.evaluate(() => {
    const s = window.__nxeProbe;
    s.observer.disconnect();
    s.loafObserver?.disconnect();
    const acc = s.tree.querySelector('.nxe-acc');
    let typeAfter = null;
    if (acc) {
      const key = Object.keys(acc).find(k => k.startsWith('__reactFiber$'));
      let node = acc[key];
      while (node && typeof node.type !== 'function') node = node.return;
      typeAfter = node?.type ?? null;
    }
    const entries = performance.getEntriesByType('resource').filter(e => e.name.includes('/nano-explorer-extra/'));
    const routes = {};
    for (const e of entries) {
      const url = new URL(e.name);
      const scoped = url.searchParams.get('path') !== null;
      const only = url.searchParams.get('only');
      const key = url.pathname.replace('/nano-explorer-extra/', '') + (only ? '?only=' + only : scoped ? '?path=<dir>' : '');
      (routes[key] ??= { count: 0, totalMs: 0, at: [] }).count++;
      routes[key].totalMs += Math.round(e.duration);
      routes[key].at.push(Math.round(e.startTime));
    }
    const panes = [...document.querySelectorAll('[data-nxe]')];
    const visible = panes.filter(p => p.closest('[hidden], [aria-hidden="true"]') === null);
    return {
      stillVisiblePath: visible[0]?.querySelector('[data-nxe-path]')?.textContent ?? null,
      treeConnected: s.tree.isConnected,
      rows: s.tree.querySelectorAll('li[data-files-entry]').length,
      accs: s.tree.querySelectorAll('.nxe-acc').length,
      accMounted: s.accMounted, accUnmounted: s.accUnmounted, accAttr: s.accAttr,
      rowMounted: s.rowMounted, rowUnmounted: s.rowUnmounted,
      fiberTypeStable: s.typeBefore !== null && s.typeBefore === typeAfter,
      batches: s.batches.map(b => ({ at: b.at, add: b.addedEls, rem: b.removedEls, accAdd: b.accAdd, accRem: b.accRemove, accAttr: b.accAttr, rowAdd: b.rowAdd, rowRem: b.rowRemove })),
      loaf: s.loaf, loafError: s.loafError ?? null,
      routes, requestCount: entries.length,
      accCreateCalls: window.__nxeAccCreate ?? 0,
      accRenders: window.__nxeAccRender ?? 0,
      accReactMounts: window.__nxeAccMount ?? 0,
      accReactUnmounts: window.__nxeAccUnmount ?? 0,
    };
  }));
  console.log("DIAG_JSON=" + JSON.stringify({ setup, result, steps, notes }));
}
try { await main(); } catch (e) {
  console.log("DIAG_JSON=" + JSON.stringify({ error: String((e && e.message) || e) }));
}
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
const run = JSON.parse(line.slice('DIAG_JSON='.length))
run.generatedAt = new Date().toISOString()
run.idleMs = idleMs
run.workspace = workspace
run.expand = expand

if (check) {
  const basePath = join(OUT, 'render-baseline.json')
  if (!existsSync(basePath)) { console.error('no baseline at', basePath); process.exit(2) }
  const base = JSON.parse(readFileSync(basePath, 'utf8'))
  const rows = [
    ['accMounted', base.result?.accMounted, run.result?.accMounted, 'less'],
    ['accUnmounted', base.result?.accUnmounted, run.result?.accUnmounted, 'less'],
    ['batches', base.result?.batches?.length, run.result?.batches?.length, 'less'],
    ['rowMounted', base.result?.rowMounted, run.result?.rowMounted, 'le'],
    ['fiberTypeStable', base.result?.fiberTypeStable, run.result?.fiberTypeStable, 'bool-true'],
    ['status whole', base.result?.routes?.status?.count, run.result?.routes?.status?.count, 'report'],
    ['status scoped', base.result?.routes?.['status?path=<dir>']?.count, run.result?.routes?.['status?path=<dir>']?.count, 'less'],
    ['scoped totalMs', base.result?.routes?.['status?path=<dir>']?.totalMs, run.result?.routes?.['status?path=<dir>']?.totalMs, 'less'],
  ]
  let regression = false
  console.log('=== render diagnostics: baseline → current ===')
  for (const [name, before, after, mode] of rows) {
    let verdict = ''
    if (mode === 'less') {
      verdict = after < before ? 'IMPROVED' : (after === before ? 'same' : 'REGRESSED')
      if (after > before) regression = true
    } else if (mode === 'bool-true') {
      verdict = after === true ? 'ok' : (before === after ? 'same' : 'CHANGED')
      if (before === true && after !== true) regression = true
    } else if (mode === 'le') {
      verdict = after <= before ? 'ok' : 'REGRESSED'
      if (after > before) regression = true
    } else verdict = 'info'
    console.log(`  ${name.padEnd(16)} ${String(before).padEnd(8)} → ${String(after).padEnd(8)} ${verdict}`)
  }
  const outPath = join(OUT, `render-check-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
  writeFileSync(outPath, JSON.stringify({ baseline: base.result, current: run }, null, 2))
  console.log('written:', outPath)
  process.exit(regression ? 1 : 0)
}

const outPath = join(OUT, outName)
writeFileSync(outPath, JSON.stringify(run, null, 2))
console.log(JSON.stringify({
  rows: run.result?.rows, accs: run.result?.accs,
  batches: run.result?.batches?.length,
  accMounted: run.result?.accMounted, accUnmounted: run.result?.accUnmounted,
  fiberTypeStable: run.result?.fiberTypeStable,
  routes: run.result?.routes, loaf: run.result?.loaf?.length,
}, null, 2))
console.log('written:', outPath)
