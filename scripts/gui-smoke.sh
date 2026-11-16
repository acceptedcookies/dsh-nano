#!/bin/bash
# gui-smoke.sh — optional post-deploy smoke for the model selector slot.
#
# NOT part of scripts/test-all.mjs — it drives a live GUI through ego-browser
# and therefore needs a running host + a valid ?token URL. Run by hand after
# installing or updating DNMS on any live instance (dsh.local, dsh-dev.local,
# or the desktop app).
#
# Usage:
#   SMOKE_URL='https://dsh-dev.local/?token=…' scripts/gui-smoke.sh
#
# Checks (each is a regression we actually shipped):
#   1. .nms-trigger exists                — slot mounted
#   2. click trigger → .nms-panel opens   — render path alive
#   3. click badge → .nms-compact renders — compact panel mount (the #310 kill)
#   4. no "⚠ Minified React error" text   — slot boundary didn't have to fire
# Exit 0 on all-pass, 1 otherwise.
set -euo pipefail

URL="${SMOKE_URL:-}"
if [ -z "$URL" ]; then
  echo "SMOKE_URL not set — expected a logged-in GUI URL with ?token=…" >&2
  exit 2
fi

ego-browser nodejs <<EOF
const url = "${SMOKE_URL}" + ("${SMOKE_URL}".includes('?') ? '&' : '?') + 'nocache=' + Date.now();
const task = await taskSpace('gui-smoke');
const page = await task.newPage();
const fails = [];
await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(e => fails.push('goto: ' + e));
await page.waitForTimeout(9000);

const check = async (name, fn) => {
  const ok = await page.evaluate(fn).catch(() => false);
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name);
  if (!ok) fails.push(name);
  return ok;
};

await check('1. .nms-trigger mounted', () => !!document.querySelector('.nms-trigger'));

const hasBadge = await page.evaluate(() => !!document.querySelector('.nms-compact-badge'));
if (hasBadge) {
  await page.click('.nms-compact-badge').catch(() => {});
  await page.waitForTimeout(2500);
  await check('2. badge opens compact panel', () => !!document.querySelector('.nms-compact'));
  // close panel then click trigger — must land on model list, not compact
  await page.evaluate(() => [...document.querySelectorAll('.nms-top button')].find(b => b.getAttribute('aria-label') === '关闭')?.click());
  await page.waitForTimeout(600);
  await page.click('.nms-trigger').catch(() => {});
  await page.waitForTimeout(1500);
  await check('3. trigger lands on model list (not compact)', () =>
    !!document.querySelector('.nms-model-row') && !document.querySelector('.nms-compact'));
} else {
  await page.click('.nms-trigger').catch(() => {});
  await page.waitForTimeout(1500);
  await check('2. trigger opens model panel', () => !!document.querySelector('.nms-panel'));
}

await check('4. no slot-boundary error text', () => !document.body.innerText.includes('⚠ Minified React error'));

console.log(fails.length === 0 ? '\nGUI-SMOKE PASS' : '\nGUI-SMOKE FAIL: ' + fails.join(' | '));
process.exit(fails.length === 0 ? 0 : 1);
EOF
