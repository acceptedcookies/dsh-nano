/**
 * Bundle entry for lib/route-guard.js (T-O-13 / P1-04).
 *
 * index.js is unbundled and the development instance copies lib/ but not
 * node_modules, so the guard is bundled into a relative import here.
 * The ledger-baked table is lib/bindings.js, imported by index.js directly.
 */
export {
  createGuard,
  registerRoutes,
  RouteGuardError,
  sendJson,
  readJsonBody,
} from 'dsh-host-route-guard'
