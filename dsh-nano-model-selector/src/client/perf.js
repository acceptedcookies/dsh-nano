/**
 * Performance instrumentation wiring for nano-model-selector.
 *
 * The page-wide singleton is `Symbol.for("dsh.perfReview.v2")`; this module only names this
 * plugin's root and version so attribution can tell our rows from native UI.
 * With the flag off every helper is an identity wrapper — fn is called
 * directly, no marks, no clocks (spec §6.2). NDEE owns the host-snapshot poll,
 * so we deliberately do NOT call ensurePerfReview().configure() here.
 */

import React from 'react'
import { ensurePerfReview } from 'dsh-performance-review/client'
import { BUCKETS, DECL_HASH } from '../../lib/perf-declaration.js'

export const OWN_ID = 'nano-model-selector'

// The component installs the root getter (it owns `open` and the panel/trigger
// refs). Until then root() returns null. Returning the composer textarea is
// forbidden and no layout reads happen here (spec §6.7).
let rootGetter = null
export const setModelSelectorRoot = fn => { rootGetter = typeof fn === 'function' ? fn : null }
const root = () => (rootGetter === null ? null : rootGetter())

export const perf = ensurePerfReview().join(OWN_ID, {
  version: typeof __NMS_VERSION__ === 'string' ? __NMS_VERSION__ : undefined,
  buckets: BUCKETS,
  decl: DECL_HASH,
  hostRoute: '/nano-model-selector/perf-review/host',
  // Pass THIS bundle copy's version: the singleton belongs to whichever copy
  react: React,
  root,
})

/** Optional: wrap the panel component with <React.Profiler> (spec §6.3). */
export const profiler = perf.profiler
