/**
 * dsh-html-policy — shared HTML allowlist policy (build-time).
 * Bundled into lib/client.js (DOM renderer) and a host lib/ artifact
 * (regex renderer) via esbuild; devDependency per T-O-13.
 */
export {
  ALLOWED_ELEMENTS,
  ALLOWED_ATTRS,
  ALLOWED_SCHEMES,
  ALLOWED_STYLE_PROPS,
  TEXT_ONLY_ELEMENTS,
  DROP_ELEMENTS,
  DROP_SCHEMES,
  isDropAttr,
  isDropScheme,
} from './policy.js'
export { sanitizePolicy } from './sanitizePolicy.js'
