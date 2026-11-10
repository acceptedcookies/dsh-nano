/**
 * Performance instrumentation wiring for nano-shared-workspace.
 *
 * The singleton is page-wide (`window.__perfReview`); this module only names
 * this plugin's root and version so attribution can tell our rows from the
 * native UI's. With the flag off every helper is an identity wrapper — fn is
 * called directly, no marks, no clocks (spec §6.2). This plugin has no host
 * snapshot route of its own, so it leaves the page-wide snapshot source to the
 * first implant (first join wins) and starts no poller here.
 */

import React from 'react'
import { ensurePerfReview, LIB_VERSION } from 'dsh-performance-review/client'

export const OWN_ID = 'nano-shared-workspace'

export const perf = ensurePerfReview().join(OWN_ID, {
  version: typeof __NSW_VERSION__ === 'string' ? __NSW_VERSION__ : undefined,
  // This bundle copy's own library version, so a skewed observer copy shows up
  // in the report's contributors (spec §3.3 / §10.4.4).
  libVersion: LIB_VERSION,
  react: React,
  // The graft host is the section's outermost DOM element. querySelector only —
  // no layout reads (spec §6.3); null while the sidebar is unmounted.
  root: () => document.querySelector('[data-nano-shared-workspace]'),
})
