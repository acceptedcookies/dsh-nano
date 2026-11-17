/**
 * Performance instrumentation for dsh-nano-terminal.
 *
 * Same wiring shape as nano-notepad's src/client/perf.js: the page-wide
 * singleton lives at Symbol.for('dsh.perfReview.v2'); this file only names our
 * plugin root + version so attribution can tell our rows from the host UI's.
 * With the flag off every helper is an identity wrapper (spec §6.2).
 *
 * We deliberately do NOT call configure(): the host-snapshot poll is owned by
 * whichever plugin registered first; a second owner would double-poll.
 */

import React from 'react'
import { ensurePerfReview } from 'dsh-performance-review/client'
import { BUCKETS, DECL_HASH } from '../../lib/perf-declaration.js'

export const OWN_ID = 'nano-terminal'

let rootProvider = null

/** Called by NanoTerm with a function returning the mounted `.dnt-root` (or null). */
export function setTerminalRoot(fn) {
  rootProvider = typeof fn === 'function' ? fn : null
}

const terminalRoot = () => (rootProvider === null ? null : rootProvider())

export const perf = ensurePerfReview().join(OWN_ID, {
  version: typeof __DNT_VERSION__ === 'string' ? __DNT_VERSION__ : undefined,
  buckets: BUCKETS,
  decl: DECL_HASH,
  hostRoute: '/dsh-nano-terminal/perf-review/host',
  react: React,
  root: terminalRoot,
})
