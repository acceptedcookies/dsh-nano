/** Bundled so the host entry does not import dsh-performance-review at runtime. */
import { readFileSync } from 'node:fs'
import { ensurePerfReviewHost, LIB_VERSION } from 'dsh-performance-review/host'

function pluginVersion() {
  try {
    // lib/perf-host.js sits next to package.json after bundling.
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
  } catch {
    return '0.0.0'
  }
}

const host = ensurePerfReviewHost()
const review = host.hostJoin('nano-kitesurf', { version: pluginVersion(), libVersion: LIB_VERSION })

export function hostSpan(name, fn, ctx = null) {
  return review.hostSpan(name, fn, ctx)
}

/** Per-name cumulative counter (P1-4) — usage-style tallies next to spans. */
export function perfCount(name, n = 1) {
  return review.count(name, n)
}

/** Explicit perf switch — apply() calls it with config.perfReview. */
export function setPerfEnabled(value) {
  host.setEnabled(value === true)
}

export function perfSnapshot(mode) {
  return mode === 'window' ? host.takeWindow() : host.snapshot()
}
