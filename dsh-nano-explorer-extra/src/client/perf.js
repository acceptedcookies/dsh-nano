/**
 * Performance instrumentation wiring for nano-explorer-extra.
 *
 * The singleton is page-wide (`window.__perfReview`); this module only names
 * this plugin's root and version so attribution can tell our rows from the
 * native UI's. With the flag off every helper is an identity wrapper — fn is
 * called directly, no marks, no clocks (spec §6.2).
 */

import React from 'react'
import {
  ensurePerfReview,
  firstVisibleRoot,
  LIB_VERSION,
} from 'dsh-performance-review/client'

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
  // Pass THIS bundle copy's version: the singleton belongs to whichever copy
  // loaded first, so its own LIB_VERSION would hide version skew (§10.4.4 / A3).
  libVersion: LIB_VERSION,
  react: React,
  root: explorerRoot,
})

// A1: the page report cannot read host.json on its own. Poll this plugin's
// host route (non-destructive cumulative snapshot); the lab passes an exact
// per-scenario window snapshot to report() instead. First implant wins, so
// four bundles do not start four pollers. Disabled pages do nothing.
ensurePerfReview().configure({ hostSnapshotUrl: '/nano-explorer-extra/perf-review/host?mode=snapshot' })
