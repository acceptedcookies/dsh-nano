/**
 * Generate the ego-browser `nodejs` script for one lab scenario.
 *
 * ego-browser (not Playwright) is the real Chromium driver on this machine —
 * see the deviation note in lab/README.md. The generated script runs in the
 * ego-browser Node.js host, NEVER in the web Page; all DOM work goes through
 * page.evaluate(). It prints exactly one `LAB_REPORT_JSON=<json>` line.
 */

const SCENARIOS = [
  'idle-10s',
  'composer-type',
  'files-expand',
  'notepad-type',
  'model-open',
  'shared-open',
  'observer-purity',
]

export { SCENARIOS }

/**
 * @param {object} cfg - lab/config.local.json
 * @param {string} scenario
 * @param {string} arm - on | off | purity
 * @param {string} iife - standalone DNPR client bundle source (purity arm)
 * @returns {string} JavaScript source for `ego-browser nodejs -e`
 */
export function scenarioScript(cfg, scenario, arm, iife = '') {
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
  const STANDALONE = ${S(iife)};
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
  const openFiles = () => evalInPage(() => {
    const t = [...document.querySelectorAll("[data-dockkit-tab]")].find(e => (e.textContent || "").trim().includes("文件"));
    if (t) { t.click(); return true; }
    return false;
  });
  const hostWindow = () => evalInPage(async (route) => {
    try {
      const r = await fetch(route + "?mode=window", { credentials: "same-origin", cache: "no-store" });
      return await r.json();
    } catch (e) { return null; }
  }, HOST_ROUTE);

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
      window.__perfReview = lib.createPerfReview({ forceEnabled: true });
      window.__perfReview.join("purity-probe");
      await new Promise(r => setTimeout(r, 2000));
      const report = window.__perfReview.report({ scenario: "observer-purity", arm: "purity" });
      return {
        loafCount: report.page.loafCount,
        observerErrors: report.structure.observerErrors,
        observersMissing: report.structure.observersMissing,
        enabled: report.enabled,
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
  const enabledNow = await safe("probeEnabled", () => evalInPage(() => window.__perfReview?._state?.().enabled ?? null));
  if (ARM === "on" && enabledNow !== true) {
    await gotoWithRetry(BASE + "/");
    await gotoWithRetry(BASE + "/?perf-review=1");
  }
  // The SPA mounts its panels after the load event; give the shell one bounded beat so
  // the Files tab / composer exist before scenario steps run.
  await page.waitForTimeout(1800);
  await safe("resetWindow", () => evalInPage(() => {
    window.__perfReview?.reset?.();
    window.__perfReview?.resetCounters?.();
    return window.__perfReview?._state?.().enabled ?? null;
  }));
  await safe("hostWindowStart", hostWindow); // drain: exact per-scenario window starts here

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
  } else if (SCENARIO === "files-expand") {
    await safe("openFiles", openFiles);
    await page.waitForTimeout(1800);
    await safe("expand3", () => evalInPage(() => {
      const root = document.querySelector("[data-nxe]");
      if (!root) return 0;
      const rows = [...root.querySelectorAll("button")].filter(e => {
        const text = (e.textContent || "").trim();
        const cls = (e.className || "").toString();
        return text.length > 0 && /action/i.test(cls) && !/hidden/i.test(cls);
      });
      let n = 0;
      for (const e of rows.slice(0, 3)) { e.click(); n += 1; }
      return n;
    }));
    await page.waitForTimeout(2500);
  } else if (SCENARIO === "notepad-type") {
    await safe("shortcut", async () => {
      await page.keyboard.press("Meta+e");
      await page.waitForTimeout(250);
      await page.keyboard.press("1");
      return "meta+e then 1";
    });
    await page.waitForTimeout(900);
    const focused = await safe("focusNotepad", () => evalInPage(() => {
      const e = document.querySelector(".np-layer textarea, [data-nano-notepad] textarea, textarea");
      if (!e) return false;
      e.focus();
      return true;
    }));
    if (focused) await safe("type", () => page.keyboard.type("Notepad performance scenario: a short note typed into the floating panel, then we wait for the debounce.", { delay: 60 }));
    await page.waitForTimeout(2000);
  } else if (SCENARIO === "model-open") {
    await safe("openTrigger", () => evalInPage(() => {
      const e = document.querySelector(".nms-trigger");
      if (!e) return false;
      e.click();
      return true;
    }));
    await page.waitForTimeout(900);
    await safe("typeSearch", () => page.keyboard.type("gpt", { delay: 90 }));
    await page.waitForTimeout(600);
    await safe("close", () => page.keyboard.press("Escape"));
    await page.waitForTimeout(600);
  } else if (SCENARIO === "shared-open") {
    await safe("expandShared", () => evalInPage(() => {
      const e = [...document.querySelectorAll("button")].find(b => /展开共享工作区|展开/.test(b.getAttribute("aria-label") || ""));
      if (!e) return false;
      e.click();
      return true;
    }));
    await page.waitForTimeout(2500);
  }

  // ---------------- collect ----------------
  const hostSnapshot = await safe("hostWindowEnd", hostWindow);
  const meta = await safe("domMeta", () => evalInPage(() => ({
    nxeRoots: document.querySelectorAll("[data-nxe]").length,
    visibleNxeRoots: [...document.querySelectorAll("[data-nxe]")].filter(e => e.closest('[hidden],[aria-hidden="true"]') === null).length,
    dockkitPanes: document.querySelectorAll("[data-dockkit-tab]").length,
    url: location.href,
  })));

  const report = await safe("report", () => evalInPage((payload) => {
    if (!window.__perfReview) return null;
    return window.__perfReview.report(
      { scenario: SCENARIO_PLACEHOLDER, arm: SCENARIO_ARM_PLACEHOLDER, gitSha: null },
      payload,
    );
  }, hostSnapshot));

  console.log("LAB_REPORT_JSON=" + JSON.stringify({ scenario: SCENARIO, arm: ARM, report, hostSnapshot, notes, steps, domMeta: meta }));
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
`.replace('SCENARIO_PLACEHOLDER', S(scenario))
   .replace('SCENARIO_ARM_PLACEHOLDER', S(arm))
}
