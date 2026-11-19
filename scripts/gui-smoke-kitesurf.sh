#!/bin/bash
# gui-smoke-kitesurf.sh — post-deploy smoke for the Kitesurf pane.
#
# NOT part of scripts/test-all.mjs: it drives a live GUI through ego-browser and
# needs a running host + a logged-in ?token URL. Run after deploying DNK/DNLS to
# any live instance (dsh.local, dsh-dev.local, or the desktop app).
#
# Usage:
#   SMOKE_URL='https://dsh-dev.local/?token=…' scripts/gui-smoke-kitesurf.sh
#
# Checks (each is a regression we actually shipped):
#   1. pane root [data-nano-kitesurf="1"] mounts
#   2. mode label is one of empty/html/img (never undefined)
#   3. the pane carries no build-id reconciliation ([data-nks-build])
#   4. /nano-local-sandbox/ports returns healthy + per-plane checks
#   5. /nano-local-sandbox/selftest runs 11 checks (only the two page-empty ones may fail)
#   6. /nano-local-sandbox/open then /dom returns a non-empty srcdoc (HTML mode works)
# Exit 0 on all-pass, 1 otherwise.
set -euo pipefail

URL="${SMOKE_URL:-}"
if [ -z "$URL" ]; then
  echo "SMOKE_URL not set — expected a logged-in GUI URL with ?token=…" >&2
  exit 2
fi

ego-browser nodejs <<EOF
// Relative paths keep the page's own origin + auth cookie (absolute URL
// fetches from the token page can lose the session on some hosts).
const base = '';
const url = "${SMOKE_URL}" + ("${SMOKE_URL}".includes('?') ? '&' : '?') + 'nocache=' + Date.now();
const task = await taskSpace('kitesurf-smoke');
const page = await task.newPage();
const fails = [];
await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(e => fails.push('goto: ' + e));
await page.waitForTimeout(7000);

const report = (name, ok) => {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
  if (!ok) fails.push(name);
  return ok;
};
// Check bodies run in the PAGE context; data collected in Node must be judged
// in Node (a closure over Node variables cannot be serialised to the browser).
const check = async (name, fn) => report(name, await page.evaluate(fn).catch(() => false));
const api = async (path, body) => {
  const res = await page.fetch(base + path, body === undefined ? undefined : {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  return JSON.parse(res.body || '{}');
};

// Expand the right workspace pane. Kitesurf opens from the "开始" (start)
// launcher card, not a pinned tab — a closed tab is removed from the strip.
// Fall back to a pinned tab if one is still pinned.
await page.evaluate(() => {
  const pinned = [...document.querySelectorAll('button,[role=tab]')]
    .find(n => /kitesurf/i.test(n.getAttribute('aria-label') || n.title || n.textContent || ''));
  if (pinned) { pinned.click(); return; }
  // Host-DOM graft ([class*=_addTab]) violates the workspace rule: hash-class
  // discovery couples the smoke to host internals. Accessible-name lookup only.
  const add = [...document.querySelectorAll('button,[role=tab]')]
    .find(b => /新标签页|new tab/i.test(b.getAttribute('aria-label') || b.title || b.textContent || ''));
  if (add) add.click();
});
await page.waitForTimeout(1200);
await page.evaluate(() => {
  const hit = [...document.querySelectorAll('*')]
    .find(n => (n.textContent || '').trim() === 'Kitesurf');
  if (hit) hit.click();
});
await page.waitForSelector('[data-nano-kitesurf="1"]', { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(800);

await check('1. Kitesurf pane mounts', () => !!document.querySelector('[data-nano-kitesurf="1"]'));
await check('2. mode label is a known state', () => {
  const node = document.querySelector('[data-nks-mode]');
  return !!node && ['empty', 'html', 'img'].includes(node.getAttribute('data-nks-mode'));
});
// The build-id marker lives in the settings dialog footer; open it first so
// this check is not vacuously true.
await page.evaluate(() => document.querySelector('[data-nks-settings]')?.click());
await page.waitForTimeout(1800);
// The pane must not compare its build against the host's: they are different
// packages, so the comparison only ever produced false alarms. Its absence is
// the regression guard.
await check('3. no build-id reconciliation in the pane', () =>
  !document.querySelector('[data-nks-build]'));
// Close the dialog again (取消) before touching the page routes.
await page.evaluate(() => {
  const dialog = document.querySelector('.nano-overlay [role="dialog"]');
  const close = dialog?.querySelector('button[aria-label="关闭"]')
    || [...(dialog?.querySelectorAll('button') || [])].find(b => /取消|Cancel/.test(b.textContent || ''));
  close?.click();
});
await page.waitForTimeout(600);

let ports = {};
try { ports = await api('/nano-local-sandbox/ports'); } catch { ports = {}; }
const planes = ports && ports.checks ? Object.entries(ports.checks) : [];
console.log('      ports: ' + JSON.stringify(ports.checks || null));
report('4. /ports healthy with per-plane checks',
  Boolean(ports) && ports.healthy === true && planes.length >= 5
  && planes.every(([k, v]) => v && (v.ok === true || (k === 'dom' && v.skipped === true))));

let selftest = {};
try { selftest = await api('/nano-local-sandbox/selftest'); } catch { selftest = {}; }
const failing = (selftest.checks || []).filter(c => !c.ok).map(c => c.id);
const allowedEmpty = new Set(['page-not-blank', 'dom-renderable']);
console.log('      selftest: ' + (selftest.failed ?? '?') + '/' + (selftest.total ?? '?') + ' fails=' + JSON.stringify(failing));
report('5. /selftest runs 11 real checks',
  selftest.total === 11
    && Array.isArray(selftest.checks) && selftest.checks.length === 11
    && failing.every(id => allowedEmpty.has(id)));

try { await api('/nano-local-sandbox/open', { url: 'https://example.com' }); } catch { /* reported below */ }
await page.waitForTimeout(4000);
let dom = {};
try { dom = await api('/nano-local-sandbox/dom'); } catch { dom = {}; }
report('6. /dom returns a renderable srcdoc',
  dom.ok === true && typeof dom.srcdoc === 'string' && dom.srcdoc.length > 200);

await check('7. heartbeat lives in the address bar, not the page centre', () => {
  const box = document.querySelector('.nks-address-box');
  return !document.querySelector('.nks-load') && !!box && box.hasAttribute('data-loading');
});

await page.evaluate(() => document.querySelector('[data-nks-devtools-toggle]')?.click());
await page.waitForTimeout(400);
await page.evaluate(() => {
  const hit = [...document.querySelectorAll('.nks-dt button')].find((b) => /Network/.test(b.textContent || ''));
  if (hit) hit.click();
});
await page.waitForTimeout(2200);
await check('8. Network exposes type/size/time/waterfall and labelled filters', () => {
  const bar = document.querySelector('[data-nks-dt-filterbar]');
  const rows = [...document.querySelectorAll('.nks-dt-body .nks-dt-row')];
  return !!bar && !!bar.querySelector('[data-nks-dt-search]')
    && bar.textContent.includes('仅失败') && bar.textContent.includes('禁用缓存')
    && rows.some((row) => row.querySelector('.nks-dt-type')?.textContent.trim())
    && rows.some((row) => row.querySelector('.nks-dt-size')?.textContent.trim())
    && rows.some((row) => row.querySelector('.nks-dt-dur')?.textContent.trim())
    && !!document.querySelector('.nks-dt-body .nks-dt-wf i');
});

await page.evaluate(() => document.querySelector('[data-nks-devtools-toggle]')?.click());
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector('[data-nks-nav-toggle]')?.click());
await page.waitForTimeout(900);
const tabCount = await page.evaluate(() => document.querySelectorAll('.nks-nav-tab').length);
let tabHover = false;
if (tabCount > 0) {
  const before = await page.evaluate(() => getComputedStyle(document.querySelector('.nks-nav-tab')).backgroundColor);
  try {
    await page.hover('.nks-nav-tab:nth-child(1)');
    await page.waitForTimeout(300);
    tabHover = before !== await page.evaluate(() => getComputedStyle(document.querySelector('.nks-nav-tab')).backgroundColor);
  } catch { /* reported below */ }
}
report('9. first/current tab gets a hover background', tabHover);

console.log(fails.length === 0 ? '\nKITESURF-GUI-SMOKE PASS' : '\nKITESURF-GUI-SMOKE FAIL: ' + fails.join(' | '));
process.exit(fails.length === 0 ? 0 : 1);
EOF
