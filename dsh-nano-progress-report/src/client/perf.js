/**
 * Performance instrumentation wiring for nano-progress-report.
 *
 * The singleton is page-wide (`Symbol.for("dsh.perfReview.v2")`); this module
 * only names this plugin's root and version so attribution can tell our rows
 * from the native UI's. With the flag off every helper is an identity
 * wrapper — fn is called directly, no marks, no clocks.
 */
import React from 'react'
import {
  ensurePerfReview,
  firstVisibleRoot,
} from 'dsh-performance-review/client'
import { BUCKETS, DECL_HASH } from '../../lib/perf-declaration.js'

export const OWN_ID = 'nano-progress-report'

/** Attribution root for event ownership: the mounted Progress pane. */
const progressRoot = () => firstVisibleRoot(document.querySelectorAll('[data-npr]'))

export const perf = ensurePerfReview().join(OWN_ID, {
  version: typeof __NPR_VERSION__ === 'string' ? __NPR_VERSION__ : undefined,
  buckets: BUCKETS,
  decl: DECL_HASH,
  react: React,
  root: progressRoot,
})
