/**
 * dsh-host-route-guard — build-time route registration entry.
 * Consumed via esbuild into each plugin's lib/ bundle; never resolved at
 * runtime (devDependency per T-O-13). See ./route-guard.js for the contract.
 */
export {
  createGuard,
  registerRoutes,
  inventoryMarkdown,
  RouteGuardError,
  sendJson,
  readJsonBody,
} from './route-guard.js'
