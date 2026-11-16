/**
 * Performance instrumentation wiring for nano-notepad.
 *
 * The singleton is page-wide (`Symbol.for("dsh.perfReview.v2")`); this module only names
 * this plugin's root and version so attribution can tell our rows from the
 * native UI's. With the flag off every helper is an identity wrapper — fn is
 * called directly, no marks, no clocks (spec §6.2). We deliberately do NOT
 * call `configure()`: nano-explorer-extra already owns the host-snapshot poll
 * and a second one would double-poll (§6.1/A1).
 */

import React from 'react'
import { ensurePerfReview } from 'dsh-performance-review/client'
import { BUCKETS, DECL_HASH } from '../../lib/perf-declaration.js'

export const OWN_ID = 'nano-notepad'

/**
 * The `.np-layer` host element only exists inside mountNotepad (panel.js), so
 * the panel registers a provider once it mounts. root() returns null until
 * then, and null whenever the panel is closed (§6.7). It never performs a
 * layout read: visibility comes from state.ui.open + isConnected (§6.3).
 * @type {(() => Element | null) | null}
 */
let rootProvider = null

/**
 * Called by the panel with a function that returns the `.np-layer` host while
 * open, and null otherwise. Passing null clears it (e.g. on unmount).
 * @param {(() => Element | null) | null} fn
 */
export function setNotepadRoot(fn) {
  rootProvider = typeof fn === 'function' ? fn : null
}

const notepadRoot = () => (rootProvider === null ? null : rootProvider())

export const perf = ensurePerfReview().join(OWN_ID, {
  version: typeof __NOTEPAD_VERSION__ === 'string' ? __NOTEPAD_VERSION__ : undefined,
  buckets: BUCKETS,
  decl: DECL_HASH,
  hostRoute: '/nano-notepad/perf-review/host',
  react: React,
  root: notepadRoot,
})
