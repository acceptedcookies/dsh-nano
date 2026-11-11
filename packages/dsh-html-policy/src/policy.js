/**
 * dsh-html-policy — shared HTML allowlist policy (26-nov-security-fix /
 * P3-01, T-O-9).
 *
 * One policy table drives BOTH renderers:
 *   - client  `sanitizeRichHtml` (DOMParser-based, dsh-nano-notepad)
 *   - host    `sanitizeMpHtml`   (regex/serializer,  dsh-nano-notepad)
 *
 * The FORCED-DROP sets define the attack surface (active elements, event
 * handlers, active URL schemes) — they apply regardless of the allowlist.
 * The ALLOWED_* tables define what survives; everything else is dropped
 * (attrs) or unwrapped (elements). `position` is always forced to `static`.
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
  if (scheme === 'data' && !ALLOWED_DATA_IMAGE_RE.test(String(url))) return true
  return false
}

/* ------------------------------------------------------------------ *
 * Allowlist (P3-01) — element/attr/scheme/style tables shared by both  *
 * renderers. Keep the DOM-facing literals camelCase where SVG demands   *
 * it (`animateTransform`); renderers compare through the lower-case    *
 * mirror sets exported below.                                         *
 * ------------------------------------------------------------------ */

/** Elements whose tag survives sanitization (children always processed). */
export const ALLOWED_ELEMENTS = new Set([
  'a', 'p', 'br', 'span', 'div', 'section', 'article',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'em', 'strong', 'b', 'i', 'u', 's', 'del', 'ins',
  'table', 'thead', 'tbody', 'tr', 'td', 'th',
  'img', 'figure', 'figcaption', 'hr',
  'svg', 'g', 'image', 'animateTransform',
])

/**
 * Elements kept verbatim outside the public allowlist — they exist only so
 * a renderer-local transform can run. `foreignObject` must survive until the
 * client's verbatim `<svg><foreignObject>` → `<image>` rewrite (mp image
 * slider); dropping it in the host pass would break that fix.
 */
export const PASSTHROUGH_ELEMENTS = new Set(['foreignobject'])

/** Attribute names that survive on any allowed element (drop-list approach). */
export const ALLOWED_ATTRS = new Set([
  'href', 'src', 'alt', 'title', 'colspan', 'rowspan',
  'width', 'height', 'style', 'class',
  'referrerpolicy', 'loading', 'decoding',
  'preserveaspectratio', 'xlink:href',
])

/** Schemes allowed on URL-bearing attributes (href/src/xlink:href). */
export const ALLOWED_SCHEMES = new Set(['http', 'https'])

/**
 * The only `data:` URI that may reach a resource attribute — a raster image
 * payload. Restricted to `src`/`xlink:href` on `<img>`/`<image>` so it can
 * never become a navigation target (data:text/html stays in DROP_SCHEMES).
 */
export const ALLOWED_DATA_IMAGE_RE = /^data:image\/(png|jpeg|gif|webp);base64,/i

/** Attributes that may carry a data:image URI. */
export const DATA_IMAGE_ATTRS = new Set(['src', 'xlink:href'])

/** Elements whose src-like attributes may carry a data:image URI. */
export const DATA_IMAGE_ELEMENTS = new Set(['img', 'image'])

/**
 * Allowed CSS property names — the union of the two historical whitelists
 * (`MP_SAFE_STYLE` from the client renderer and `MP_STYLE_ALLOW` from the
 * host regex pass; they were already identical). `position` is NOT listed:
 * it is handled by forcing `position: static` onto sanitized output.
 */
export const ALLOWED_STYLE_PROPS = new Set([
  'color',
  'font-size', 'font-weight', 'font-style', 'font-family',
  'text-align', 'line-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'background', 'background-color', 'background-image', 'background-size',
  'background-position', 'background-repeat',
  'border', 'border-radius',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-width', 'border-top-style', 'border-top-color',
  'border-right-width', 'border-right-style', 'border-right-color',
  'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
  'border-left-width', 'border-left-style', 'border-left-color',
  'letter-spacing', 'text-indent', 'text-decoration', 'text-decoration-line',
  'width', 'max-width', 'height',
  'display', 'vertical-align', 'box-sizing',
  'overflow', 'overflow-x', 'overflow-y',
  'white-space', 'word-wrap', 'word-break',
  'opacity', 'float', 'clear',
])

/** Elements kept but stripped of all children content? (reserved) */
export const TEXT_ONLY_ELEMENTS = new Set([])

/* ------------------------------------------------------------------ *
 * URL decision — the shared gate for href/src/xlink:href.              *
 * ------------------------------------------------------------------ */

/** Named entities that can smuggle scheme characters or whitespace. */
const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  colon: ':', Tab: '\t', tab: '\t', NewLine: '\n', newline: '\n',
}

/**
 * Decode the entity forms that matter for URL inspection: numeric character
 * references plus the named entities above. Unknown `&name;` sequences are
 * left untouched — they cannot spell a scheme (only refs produce letters).
 */
export function decodeEntities(text) {
  return String(text).replace(/&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (all, body) => {
      if (body[0] === '#') {
        const code = body[1] === 'x' || body[1] === 'X'
          ? parseInt(body.slice(2), 16)
          : parseInt(body.slice(1), 10)
        return Number.isFinite(code) && code >= 0 && code <= 0x10ffff
          ? String.fromCodePoint(code)
          : all
      }
      return Object.hasOwn(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : all
    })
}

/**
 * Decide whether a URL attribute value may survive.
 *
 * Normalization before the scheme check is what the browser will actually
 * see: entity-encoded (`&#106;avascript:`) and whitespace-embedded
 * (`java\tscript:`) spellings are decoded and stripped before matching, so
 * obfuscated schemes cannot slip past.
 *
 * @param {string} attr - 'href' | 'src' | 'xlink:href'
 * @param {string} value - raw attribute value (entity-encoded allowed)
 * @param {string} [el] - element name for data:image gating
 * @returns {'keep'|'drop'}
 */
export function urlPolicy(attr, value, el = '') {
  const raw = String(value ?? '')
  const cleaned = decodeEntities(raw).replace(/[\x00-\x20\x7f]+/g, '')
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(cleaned)
  if (scheme) {
    const s = scheme[1].toLowerCase()
    if (ALLOWED_SCHEMES.has(s)) return 'keep'
    if (s === 'data' && ALLOWED_DATA_IMAGE_RE.test(cleaned)
        && DATA_IMAGE_ATTRS.has(String(attr).toLowerCase())
        && DATA_IMAGE_ELEMENTS.has(String(el).toLowerCase())) return 'keep'
    return 'drop'
  }
  /* Schemeless URLs: relative paths, fragments, query strings, and the
     protocol-relative `//host` form mp uses for image hosts — all inert
     wrt script execution, so they keep (matches the historical renderers). */
  return 'keep'
}

/* ------------------------------------------------------------------ *
 * sanitizeStyle — declaration-level style filter.                       *
 * ------------------------------------------------------------------ */

/**
 * Split `prop: value` declarations on `;` without cutting inside an entity:
 * WeChat writes `url(&quot;…&quot;)` into inline styles, and a naive
 * split(';') truncates the URL at the entity's own semicolon. (Ported
 * verbatim from the host renderer's mpStyleSplit.)
 */
export function styleDecls(value) {
  const out = []
  let buf = ''
  const text = String(value ?? '')
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === ';') {
      const entity = /&[a-zA-Z#\d]*$/.test(buf)
      if (!entity) { if (buf.trim()) out.push(buf.trim()); buf = ''; continue }
    }
    buf += ch
  }
  if (buf.trim()) out.push(buf.trim())
  return out
}

/** Declarations whose VALUE could smuggle active content. */
const EVIL_STYLE_VALUE = /(?:javascript|vbscript|expression|data\s*:\s*(?!image\/))/i

/**
 * Filter a `style` attribute value down to allowed declarations.
 *
 * - properties outside ALLOWED_STYLE_PROPS are dropped;
 * - every `position` declaration is dropped and a single
 *   `position: static` is appended at the END (the historical renderers did
 *   exactly this ordering);
 * - a declaration is dropped when its decoded value embeds an active
 *   scheme/expression, or carries `<`/`>` (never legit in CSS here);
 * - `"` in values is rewritten to `'` so re-emitting inside a
 *   double-quoted attribute cannot break out (url(&quot;…&quot;) parity);
 * - `mapDecl(name, value)` may return a replacement value or `null` to
 *   drop the declaration (client dark-theme remap hook).
 *
 * Returns '' when nothing survives — callers decide whether an empty
 * style attribute stays (host: removed; client: 'position: static').
 *
 * @param {string} cssText
 * @param {{mapDecl?: (name:string, value:string) => (string|null)}} [opts]
 */
export function sanitizeStyle(cssText, { mapDecl } = {}) {
  const kept = []
  for (const decl of styleDecls(cssText)) {
    const colon = decl.indexOf(':')
    if (colon === -1) continue
    const prop = decl.slice(0, colon).trim()
    const name = prop.toLowerCase()
    let value = decl.slice(colon + 1).trim()
    if (!name || name === 'position') continue
    if (!ALLOWED_STYLE_PROPS.has(name)) continue
    const decoded = decodeEntities(value)
    /* A `;` inside the DECODED value is a smuggled declaration boundary —
     * `&#59;` survives the styleDecls split as an "entity tail" then decodes
     * to a real `;`, folding an arbitrary `name:value` (e.g.
     * `position:fixed!important`) inside one allowlisted decl (review 3456
     * F2). Any decl whose decoded value contains `;` is dropped. */
    if (decoded.includes(';')) continue
    const probe = decoded.replace(/[\x00-\x20\x7f]+/g, '')
    if (EVIL_STYLE_VALUE.test(probe) || /[<>]/.test(decoded)) continue
    if (mapDecl) {
      const mapped = mapDecl(name, decoded)
      if (mapped === null) continue
      value = mapped
    } else {
      value = decoded
    }
    value = value.replace(/[\x00-\x1f\x7f]+/g, '').replace(/"/g, "'")
    kept.push(`${prop}: ${value}`)
  }
  if (kept.length === 0) return ''
  return `${kept.join('; ')}; position: static`
}

/* Lower-case mirrors for case-insensitive lookup (SVG camelCase members like
   animateTransform keep their DOM spelling in the public Sets). */
const ALLOWED_ELEMENTS_LC = new Set([...ALLOWED_ELEMENTS].map(s => s.toLowerCase()))

/**
 * Element decision shared by both renderers.
 * @returns {'drop'|'keep'|'unwrap'} drop removes the subtree, keep preserves
 * the tag (attrs still filtered), unwrap removes the tag but keeps children.
 */
export function elementAction(name) {
  const n = String(name).toLowerCase()
  if (DROP_ELEMENTS.has(n)) return 'drop'
  if (ALLOWED_ELEMENTS_LC.has(n) || PASSTHROUGH_ELEMENTS.has(n)) return 'keep'
  return 'unwrap'
}

/**
 * Attribute decision shared by both renderers.
 * @param {string} el - element name (lowercase)
 * @param {string} name - attribute name
 * @param {string} value - raw attribute value
 * @returns {'keep'|'drop'}
 */
export function attrPolicy(el, name, value) {
  const n = String(name).toLowerCase()
  if (isDropAttr(n)) return 'drop'
  if (!ALLOWED_ATTRS.has(n)) return 'drop'
  if (n === 'href' || n === 'src' || n === 'xlink:href') {
    return urlPolicy(n, value, el)
  }
  return 'keep'
}

/**
 * The single policy object the renderers consume (P3-01). Everything a
 * renderer needs to make an identical keep/drop decision lives here.
 */
export const POLICY = {
  allowedElements: ALLOWED_ELEMENTS,
  passthroughElements: PASSTHROUGH_ELEMENTS,
  dropElements: DROP_ELEMENTS,
  allowedAttrs: ALLOWED_ATTRS,
  allowedSchemes: ALLOWED_SCHEMES,
  dataImageRe: ALLOWED_DATA_IMAGE_RE,
  dataImageAttrs: DATA_IMAGE_ATTRS,
  dataImageElements: DATA_IMAGE_ELEMENTS,
  allowedStyleProps: ALLOWED_STYLE_PROPS,
  dropSchemes: DROP_SCHEMES,
  isDropAttr,
  isDropScheme,
  elementAction,
  attrPolicy,
  urlPolicy,
  sanitizeStyle,
  styleDecls,
  decodeEntities,
}
