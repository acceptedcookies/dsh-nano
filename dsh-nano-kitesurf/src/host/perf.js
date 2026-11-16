/** Bundled so the host entry does not import dsh-performance-review at runtime. */
import { readFileSync } from 'node:fs'
import { ensurePerfReviewHost } from 'dsh-performance-review/host'

function pluginVersion() {
  try {
    // lib/perf-host.js sits next to package.json after bundling.
    return JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version
  } catch {
    return '0.0.0'
  }
}

const host = ensurePerfReviewHost()
const review = host.hostJoin('nano-kitesurf', { version: pluginVersion() })

export function hostSpan(name, fn, ctx = null) {
  return review.hostSpan(name, fn, ctx)
}


