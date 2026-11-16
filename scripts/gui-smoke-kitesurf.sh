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
#   3. no build-id mismatch marker ([data-nks-build="mismatch"])
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

// Expand the right workspace pane. The Kitesurf tab carries its aria-label.
await page.evaluate(() => {
  const hit = [...document.querySelectorAll('button,[role=tab]')]
    .find(n => /kitesurf/i.test(n.getAttribute('aria-label') || n.title || ''));
  if (hit) hit.click();
});
await page.waitForTimeout(3500);

await check('1. Kitesurf pane mounts', () => !!document.querySelector('[data-nano-kitesurf="1"]'));
await check('2. mode label is a known state', () => {
  const node = document.querySelector('[data-nks-mode]');
  return !!node && ['empty', 'html', 'img'].includes(node.getAttribute('data-nks-mode'));
});
// The build-id marker lives in the settings dialog footer; open it first so
// this check is not vacuously true.
await page.evaluate(() => document.querySelector('[data-nks-settings]')?.click());
await page.waitForTimeout(1800);
await check('3. no client/host build mismatch', () => !document.querySelector('[data-nks-build="mismatch"]'));
// Close the dialog again (取消) before touching the page routes.
await page.evaluate(() => {
  const btn = [...document.querySelectorAll('.nano-dialog-card button')]
    .find(b => /取消|Cancel/.test(b.textContent || ''));
  if (btn) btn.click();
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
  selftest.total === 11 && failing.every(id => allowedEmpty.has(id)));

try { await api('/nano-local-sandbox/open', { url: 'https://example.com' }); } catch { /* reported below */ }
await page.waitForTimeout(4000);
let dom = {};
try { dom = await api('/nano-local-sandbox/dom'); } catch { dom = {}; }
report('6. /dom returns a renderable srcdoc',
  dom.ok === true && typeof dom.srcdoc === 'string' && dom.srcdoc.length > 200);

console.log(fails.length === 0 ? '\nKITESURF-GUI-SMOKE PASS' : '\nKITESURF-GUI-SMOKE FAIL: ' + fails.join(' | '));
process.exit(fails.length === 0 ? 0 : 1);
EOF
