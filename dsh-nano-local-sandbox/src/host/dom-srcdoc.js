/**
 * Host-side srcdoc builder for the pane's native-HTML mode.
 *
 * OWNERSHIP (DNLS01 cutover, revised): this builder lives in [DNLS], not [DNK].
 * Rationale, recorded because it changes the cutover's original split:
 *  - script stripping is a security boundary; it must run in the host, on the
 *    trusted side of the pane, never in the document that renders untrusted
 *    page HTML;
 *  - the pane already binds its own picker directly onto the iframe document
 *    (`bindDomFrame` in the DNK client), so the old PICKER injection here was
 *    dead weight and is gone;
 *  - [DNK]'s `lib/dom.js` builder became unreachable after routes moved to
 *    [DNLS]; keeping a second copy there would break 单一真源.
 * What remains is exactly the host concern: sanitize + rebase.
 *
 * REAL ADDRESSES ONLY (T-O-66): the /res same-origin proxy and its rewriting
 * are retired. There is exactly one build — <base> is the page's real URL and
 * every subresource keeps its real address. A local http: page may render
 * unstyled inside the https pane (mixed content); that is the deterministic
 * behavior of HTML mode, and the styled surface is the engine render.
 *
 * Fidelity trade-offs, stated honestly:
 *  - scripts, inline handlers and javascript: URLs are removed — the preview
 *    must never re-run page code;
 *  - relative URLs are rebased on the live page URL so CSS/img/font resolve;
 *  - form state is not carried over (values are attributes, not live props).
 */

const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi
const BASE_TAG_RE = /<base\b[^>]*>/gi
// A meta refresh navigates the whole preview document; it is not content.
const META_REFRESH_RE = /<meta\b[^>]*http-equiv\s*=\s*["']?\s*refresh\s*["']?[^>]*>/gi
// Inline event handlers execute page code on interaction.
const ON_ATTR_RE = /\son[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
// javascript: in a URL attribute is script execution on click/navigation.
const JS_URL_RE = /\s(href|src|action|formaction|xlink:href)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*'|javascript:[^\s>]+)/gi

/** Escape a URL for safe interpolation into an attribute. */
function attr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/**
 * Remove everything that could execute script from a page's outerHTML.
 * Pure string work: no DOM, no new dependency, deterministic.
 * @param {string} html
 * @returns {{html: string, stripped: {scripts: number, base: number, metaRefresh: number, handlers: number, jsUrls: number}}}
 */
export function sanitizeHtml(html) {
  let text = typeof html === 'string' ? html : ''
  const stripped = { scripts: 0, base: 0, metaRefresh: 0, handlers: 0, jsUrls: 0 }
  const drop = (re, key) => {
    text = text.replace(re, () => { stripped[key] += 1; return '' })
  }
  drop(SCRIPT_RE, 'scripts')
  drop(BASE_TAG_RE, 'base')
  drop(META_REFRESH_RE, 'metaRefresh')
  drop(ON_ATTR_RE, 'handlers')
  drop(JS_URL_RE, 'jsUrls')
  return { html: text, stripped }
}

/**
 * Build the document the pane's iframe renders.
 * `base` is the page's real URL; subresource references are untouched.
 * @param {{ url?: string, html?: string }} page
 * @returns {{ srcdoc: string, url: string, base: string, bytes: number, stripped: object }}
 */
export function buildSrcDoc(page) {
  const url = typeof page?.url === 'string' ? page.url : ''
  const { html, stripped } = sanitizeHtml(page?.html)
  const head = url ? `<base href="${attr(url)}">` : ''
  const srcdoc = /<head[^>]*>/i.test(html)
    ? html.replace(/<head([^>]*)>/i, `<head$1>${head}`)
    : `<!doctype html><html><head>${head}</head><body>${html}</body></html>`
  return { srcdoc, url, base: url, bytes: srcdoc.length, stripped }
}
