/**
 * Performance instrumentation wiring for nano-explorer-extra.
 *
 * The singleton is page-wide (`Symbol.for("dsh.perfReview.v2")`); this module only names
 * this plugin's root and version so attribution can tell our rows from the
 * native UI's. With the flag off every helper is an identity wrapper — fn is
 * called directly, no marks, no clocks (spec §6.2).
 */

import React from 'react'
import {
  ensurePerfReview,
  firstVisibleRoot,
} from 'dsh-performance-review/client'
import { BUCKETS, DECL_HASH } from '../../lib/perf-declaration.js'

export const OWN_ID = 'nano-explorer-extra'

/**
 * Attribution root for event ownership (spec §6.7). keepMounted leaves one
 * `.nxe-root` per session on the page; hidden panes live under a
 * `[data-sidebar-right-pane]` host carrying `hidden`. `firstVisibleRoot`
 * picks the first connected, unhidden pane — and does it without layout reads.
 */
const explorerRoot = () => firstVisibleRoot(document.querySelectorAll('[data-nxe]'))

export const perf = ensurePerfReview().join(OWN_ID, {
  version: typeof __NXE_VERSION__ === 'string' ? __NXE_VERSION__ : undefined,
  buckets: BUCKETS,
  decl: DECL_HASH,
  hostRoute: '/nano-explorer-extra/perf-review/host',
  // Pass THIS bundle copy's version: the singleton belongs to whichever copy
  react: React,
  root: explorerRoot,
})
