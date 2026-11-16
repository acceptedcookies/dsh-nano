/**
 * Generate the ego-browser `nodejs` script for one lab scenario.
 *
 * ego-browser (not Playwright) is the real Chromium driver on this machine —
 * see the deviation note in lab/README.md. The generated script runs in the
 * ego-browser Node.js host, NEVER in the web Page; all DOM work goes through
 * page.evaluate(). It prints exactly one `LAB_REPORT_JSON=<json>` line.
 *
 * Scenario and budget names come from each plugin's src/perf/declaration.json
 * (T-O-PRE1116-09.8). This file names only the page-level scenarios.
 */
import { loadDeclarations, PAGE_SCENARIOS, scenarioList } from './declarations.mjs'

export const SCENARIOS = Object.freeze(scenarioList(loadDeclarations()))

export { PAGE_SCENARIOS }

/**
 * @param {object} cfg - lab/config.local.json
 * @param {string} scenario
 * @param {string} arm - on | off | purity
 * @param {string} iife - standalone DNPR client bundle PATH (purity arm)
 * @param {string|null} driver - absolute path of a plugin scenario driver
 * @returns {string} JavaScript source for `ego-browser nodejs -e`
 */
export function scenarioScript(cfg, scenario, arm, iife = '', driver = null) {
  const S = JSON.stringify
  return `
const LAB_SCENARIO = ${S(scenario)};
const LAB_ARM = ${S(arm)};
async function main() {
  const task = await taskSpace(${S(cfg.spaceName)});
  const page = task.page(${S(cfg.pageLabel)});
  const BASE = ${S(cfg.baseUrl)};
  const HOST_ROUTE = ${S(cfg.hostRoute)};
  const SCENARIO = ${S(scenario)};
  const ARM = ${S(arm)};
  const DRIVER = ${S(driver ?? '')};
  const STANDALONE = ${S(iife)} ? (await import('node:fs')).readFileSync(${S(iife)}, 'utf8') : '';
  const notes = [];
  const steps = {};

  const safe = async (label, fn) => {
    try { const r = await fn(); steps[label] = r === undefined ? "ok" : r; return r; }
    catch (e) { const m = String((e && e.message) || e); notes.push(label + ": " + m); steps[label] = "ERROR: " + m; return null; }
  };
  const gotoWithRetry = async (url) => {
    for (let i = 0; i < 4; i += 1) {
      try { await page.goto(url, { timeout: 40000 }); await page.waitForLoadState("load"); return; }
      catch (e) { if (i === 3) throw e; await page.waitForTimeout(2500); }
    }
  };
  const evalInPage = (fn, arg) => arg === undefined ? page.evaluate(fn) : page.evaluate(fn, arg);
  const wait = (ms) => page.waitForTimeout(ms);
  const openFiles = () => evalInPage(() => {
    const t = [...document.querySelectorAll("[data-dockkit-tab]")].find(e => (e.textContent || "").trim().includes("文件"));
    if (t) { t.click(); return true; }
    return false;
  });
  // Read the host view. Without a cursor: cumulative; with one: rows newer
  // than the cursor. Never drains (T-O-PRE1116-08.8).
  const hostRead = (since) => evalInPage(async (payload) => {
    try {
      const url = payload.since ? payload.route + "?since=" + encodeURIComponent(payload.since) : payload.route;
      const r = await fetch(url, { credentials: "same-origin", cache: "no-store" });
      return await r.json();
    } catch (e) { return null; }
  }, { route: HOST_ROUTE, since: since ?? null });

  // ---------------- purity arm: only the observer on a blank page ----------------
  if (ARM === "purity") {
    await gotoWithRetry("about:blank");
    await safe("injectStandalone", () => evalInPage((src) => {
      const s = document.createElement("script");
      s.textContent = src;
      document.head.appendChild(s);
      return typeof window.__perfReviewLib;
    }, STANDALONE));
    const purity = await safe("purityReport", () => evalInPage(async () => {
      const lib = window.__perfReviewLib;
      if (!lib || typeof lib.createPerfReview !== "function") return { error: "standalone lib missing" };
      const singleton = lib.createPerfReview({ forceEnabled: true });
      singleton.join("purity-probe");
      await new Promise(r => setTimeout(r, 2000));
      const report = singleton.read({ scenario: "observer-purity", arm: "purity" });
      return {
        loafCount: report.page.loafCount,
        observerErrors: report.structure.observerErrors,
        observersMissing: report.structure.observersMissing,
        enabled: report.page.enabled,
      };
    }));
    console.log("LAB_REPORT_JSON=" + JSON.stringify({ scenario: SCENARIO, arm: ARM, report: null, purity, notes, steps }));
    return;
  }

  // ---------------- on / off arms: the real dsh-dev page ----------------
  const url = BASE + (ARM === "on" ? "/?perf-review=1" : "/");
  await gotoWithRetry(url);
  // A cold browser has no auth cookie; the bare URL goes through the token
  // broker and drops the query. Retry once through the bare URL if needed.
  const enabledNow = await safe("probeEnabled", () => evalInPage(() => {
    const r = window[Symbol.for("dsh.perfReview.v2")];
    return r?._state?.().enabled ?? null;
  }));
  if (ARM === "on" && enabledNow !== true) {
    await gotoWithRetry(BASE + "/");
    await gotoWithRetry(BASE + "/?perf-review=1");
  }
  // The SPA mounts its panels after the load event; give the shell one bounded beat so
  // the Files tab / composer exist before scenario steps run.
  await page.waitForTimeout(1800);
  await safe("cutWindow", () => evalInPage(() => {
    const r = window[Symbol.for("dsh.perfReview.v2")];
    if (!r) return null;
    r.cutWindow();
    return r._state?.().enabled ?? null;
  }));
  const hostStart = await safe("hostWindowStart", () => hostRead(null));

  // ---------------- scenario steps ----------------
  if (SCENARIO === "idle-10s") {
    await safe("openFiles", openFiles);
    await page.waitForTimeout(10000);
  } else if (SCENARIO === "composer-type") {
    await safe("openFiles", openFiles);
    await page.waitForTimeout(1200);
    const focused = await safe("focusComposer", () => evalInPage(() => {
      const e = document.querySelector("textarea[data-composer], textarea[data-chat-input], textarea");
      if (!e) return false;
      e.focus();
      return { found: true, tag: e.tagName, data: [...e.attributes].filter(a => a.name.startsWith("data-")).map(a => a.name).slice(0, 5) };
    }));
    if (focused) {
      await safe("type", () => page.keyboard.type(
        "The quick brown fox jumps over the lazy dog. Performance review typing scenario: one hundred and twenty characters of ordinary prose.",
        { delay: 80 }));
    }
    await page.waitForTimeout(1200);
  } else if (DRIVER) {
    const mod = await import((await import("node:url")).pathToFileURL(DRIVER).href);
    await mod.default({ page, safe, evalInPage, wait });
  }

  // ---------------- collect ----------------
  const hostView = await safe("hostWindowEnd", () => hostRead(hostStart?.next ?? null));
  const meta = await safe("domMeta", () => evalInPage(() => ({
    nxeRoots: document.querySelectorAll("[data-nxe]").length,
    visibleNxeRoots: [...document.querySelectorAll("[data-nxe]")].filter(e => e.closest('[hidden],[aria-hidden="true"]') === null).length,
    dockkitPanes: document.querySelectorAll("[data-dockkit-tab]").length,
    url: location.href,
  })));

  const report = await safe("report", () => evalInPage((payload) => {
    const r = window[Symbol.for("dsh.perfReview.v2")];
    if (!r) return null;
    return r.read({
      scenario: payload.scenario,
      arm: payload.arm,
      host: payload.host ?? undefined,
    });
  }, { scenario: SCENARIO, arm: ARM, host: hostView }));

  console.log("LAB_REPORT_JSON=" + JSON.stringify({ scenario: SCENARIO, arm: ARM, report, hostSnapshot: hostView, notes, steps, domMeta: meta }));
}

try {
  await main();
} catch (e) {
  // Never leave the runner without a parseable line: a failed navigation or
  // a browser hiccup must be reportable (and retried) instead of vanishing.
  console.log("LAB_REPORT_JSON=" + JSON.stringify({
    scenario: LAB_SCENARIO, arm: LAB_ARM, report: null,
    error: String((e && e.message) || e), notes: [], steps: {},
  }));
}
`
}
