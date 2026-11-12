/**
 * Bundle entry for lib/route-guard.js (T-O-13 / P1-04).
 *
 * index.js is unbundled and the development instance copies lib/ but not
 * node_modules, so the guard and the baked route table are bundled into a
 * single relative import here. index.js also imports ./lib/route-table.js
 * (a verbatim copy of ./route-table.js) directly.
 */
export {
  createGuard,
  registerRoutes,
  RouteGuardError,
  sendJson,
  readJsonBody,
} from 'dsh-host-route-guard'
export { ROUTE_TABLE, PLUGIN } from './route-table.js'
