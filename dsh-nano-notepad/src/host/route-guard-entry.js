/**
 * Bundle entry for lib/web-registrar.js (CF1115 / P1-04).
 *
 * index.js is unbundled and the development instance copies lib/ but not
 * node_modules, so the createWebRegistrar facade (which unidirectionally
 * reuses the single dsh-host-route-guard implementation) is bundled into a
 * single relative import here. index.js also imports ./lib/bindings.js (the
 * baked binding ledger) directly.
 */
export { createWebRegistrar, BindingError } from 'dsh-interface/host'
export { BINDING_TABLE, PLUGIN } from '../../lib/bindings.js'
