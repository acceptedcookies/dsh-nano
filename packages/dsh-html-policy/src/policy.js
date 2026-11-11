/**
 * dsh-html-policy — shared HTML allowlist constants (26-nov-security-fix /
 * P1-07 skeleton, T-O-9).
 *
 * One policy table drives BOTH renderers:
 *   - client  `sanitizeRichHtml` (DOMParser-based, dsh-nano-notepad)
 *   - host    `sanitizeMpHtml`   (regex/serializer,  dsh-nano-notepad)
 *
 * PHASE 1 SKELETON: the ALLOWED_* tables are intentionally empty placeholders.
 * Phase 3 (P3-01) fills them from the frozen plan:
 *   ALLOWED_ELEMENTS   ← a,p,br,span,div,section,article,h1-h6,ul,ol,li,
 *                        blockquote,pre,code,em,strong,b,i,u,s,del,ins,
 *                        table,thead,tbody,tr,td,th,img,figure,figcaption,hr,
 *                        svg,g,image,animateTransform
 *   ALLOWED_ATTRS      ← href,src,alt,title,colspan,rowspan,width,height,
 *                        style,class,referrerpolicy,loading,decoding,
 *                        preserveAspectRatio,xlink:href
 *   ALLOWED_SCHEMES    ← https?, plus data:image/(png|jpeg|gif|webp);base64,
 *                        for src only
 *   ALLOWED_STYLE_PROPS← MP_SAFE_STYLE ∪ MP_STYLE_ALLOW union, with
 *                        `position` forced to static
 *
 * The FORCED-DROP sets below are complete NOW (they define the attack surface,
 * not layout): active elements, event-handler/source-doc attributes, and
 * active URL schemes are dropped regardless of the allowlist content.
 */

/* ---- forced drop: elements (active / structural escapes) ---- */
export const DROP_ELEMENTS = new Set([
  'script', 'iframe', 'object', 'embed', 'base', 'meta',
  'form', 'input', 'button', 'textarea', 'select', 'link', 'style',
])

/**
 * Attributes dropped unconditionally:
 *   - `on*`           — every event handler attribute
 *   - `srcdoc`        — iframe source document
 */
export function isDropAttr(name) {
  const n = String(name).toLowerCase()
  return n.startsWith('on') || n === 'srcdoc'
}

/** Schemes dropped unconditionally: javascript:, data:text, vbscript:, file:. */
export const DROP_SCHEMES = new Set(['javascript', 'data:text', 'vbscript', 'file'])

/**
 * Check a URL's scheme against DROP_SCHEMES.
 * `data:image/...` (the image-safe data URI) is NOT dropped here; the
 * ALLOWED_SCHEMES table decides whether it is permitted.
 */
export function isDropScheme(url) {
  const m = /^\s*([a-zA-Z][a-zA-Z0-9+.-]*)\s*:/.exec(String(url))
  if (!m) return false // scheme-relative / fragment / path — allowed pending table
  const scheme = m[1].toLowerCase()
  if (DROP_SCHEMES.has(scheme)) return true
  // `data:` is only dropped for non-image payloads (data:text/html etc.).
  if (scheme === 'data' && !/^data:image\/(png|jpeg|gif|webp);base64,/i.test(String(url))) return true
  return false
}

/* ---- allowlist placeholders (Phase 3 / P3-01 fills the content) ---- */

/** @type {Set<string>} allowed element names — EMPTY until P3-01. */
export const ALLOWED_ELEMENTS = new Set([
  // Phase 3 fills (see JSDoc above).
])

/** @type {Set<string>} allowed attribute names — EMPTY until P3-01. */
export const ALLOWED_ATTRS = new Set([
  // Phase 3 fills.
])

/** @type {Set<string>} allowed URL schemes for href/src — EMPTY until P3-01. */
export const ALLOWED_SCHEMES = new Set([
  // Phase 3 fills (https, http, data:image/*).
])

/** @type {Set<string>} allowed CSS property names — EMPTY until P3-01. */
export const ALLOWED_STYLE_PROPS = new Set([
  // Phase 3 fills from MP_SAFE_STYLE ∪ MP_STYLE_ALLOW; `position` forced static.
])

/** Elements kept but stripped of all children content? (reserved for Phase 3) */
export const TEXT_ONLY_ELEMENTS = new Set([])
