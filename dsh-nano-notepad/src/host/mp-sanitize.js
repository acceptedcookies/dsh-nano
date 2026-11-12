/**
 * sanitizeMpHtml — host-side sanitizer for the WeChat rich-text body (P3-03).
 *
 * The policy table (ALLOWED/DROP elements, attrs, schemes, style props) and
 * the serializer live in the shared `dsh-html-policy` build-time package so
 * the client DOM renderer and this host pass make identical keep/drop
 * decisions (T-O-9). esbuild inlines it into `lib/mp-sanitize.js`; the
 * unbundled index.js imports that artifact relatively — the dev instance
 * copies lib/ but not node_modules, so no bare specifier may survive.
 *
 * The renderer still owns the mp-specific transforms, all preserved
 * verbatim inside the serializer:
 *   - data-src → src promotion on <img> (+ no-referrer/lazy/async);
 *   - visibility:hidden → visibility: visible lazy-reveal sweep;
 *   - entity-aware style splitting (`url(&quot;…&quot;)` intact).
 */
import { sanitizeHtml } from 'dsh-html-policy'

/** @param {string} html */
export function sanitizeMpHtml(html) {
  return sanitizeHtml(html)
}
