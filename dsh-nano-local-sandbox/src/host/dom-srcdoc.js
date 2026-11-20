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
 * Fidelity trade-offs, stated honestly:
 *  - scripts, inline handlers and javascript: URLs are removed — the preview
 *    must never re-run page code;
 *  - relative URLs are rebased on the live page URL so CSS/img/font resolve;
 *  - form state is not carried over (values are attributes, not live props).
 */

import { proxyBaseFor, RES_PREFIX } from './res-proxy.js'

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

/** Absolute http(s) URL → its same-origin proxy path. Anything else is left alone. */
function proxify(value) {
  const text = String(value || '')
  const match = /^(https?):\/\/([^/?#]+)(.*)$/i.exec(text)
  if (!match) return text
  return `${RES_PREFIX}/${match[1].toLowerCase()}/${match[2]}${match[3] || '/'}`
}

/**
 * Rewrite absolute http(s) URLs in load-bearing attributes onto the proxy.
 *
 * A <base> alone cannot save an absolutely-addressed subresource: an http: URL
 * written out in full stays http: and is still mixed content. Only attributes
 * that trigger a fetch are touched — text content that happens to mention a URL
 * is left verbatim, and relative values are untouched because <base> already
 * resolves them inside proxy space.
 */
function rewriteAbsoluteUrls(html) {
  return String(html)
    // srcset is a comma-separated candidate list; each candidate is "url [descriptor]".
    .replace(/(\ssrcset\s*=\s*)(["'])([^"']*)\2/gi, (whole, lead, quote, value) => {
      const rewritten = value.split(',').map((candidate) => {
        const trimmed = candidate.trim()
        if (!trimmed) return trimmed
        const [urlPart, ...descriptor] = trimmed.split(/\s+/)
        return [proxify(urlPart), ...descriptor].join(' ')
      }).join(', ')
      return `${lead}${quote}${rewritten}${quote}`
    })
    .replace(/(\s(?:src|href|poster|data|action)\s*=\s*)(["'])([^"']*)\2/gi,
      (whole, lead, quote, value) => `${lead}${quote}${proxify(value)}${quote}`)
}

/**
 * Build the document the pane's iframe renders.
 * `proxy: false` keeps every reference on its real URL: a host that does not
 * serve /res must not point the document at it, or every subresource (https
 * ones included) fails instead of only the mixed-content ones.
 * @param {{ url?: string, html?: string }} page
 * @param {{ proxy?: boolean }} [options]
 * @returns {{ srcdoc: string, url: string, base: string, bytes: number, stripped: object }}
 */
export function buildSrcDoc(page, { proxy = true } = {}) {
  const url = typeof page?.url === 'string' ? page.url : ''
  const { html: raw, stripped } = sanitizeHtml(page?.html)
  if (!proxy) {
    const head = url ? `<base href="${attr(url)}">` : ''
    const srcdoc = /<head[^>]*>/i.test(raw)
      ? raw.replace(/<head([^>]*)>/i, `<head$1>${head}`)
      : `<!doctype html><html><head>${head}</head><body>${raw}</body></html>`
    return { srcdoc, url, base: url, bytes: srcdoc.length, stripped }
  }
  const html = rewriteAbsoluteUrls(raw)
  // Rebase on the PROXY form of the page URL, not the page URL itself. The
  // srcdoc iframe inherits the host's (https) origin, so a direct http: base
  // makes every relative asset mixed content — the exact bug that showed an
  // unstyled skeleton. Resolving inside proxy space keeps the whole document
  // same-origin with the pane while the host does the http fetch.
  const base = proxyBaseFor(url) || url
  const head = base ? `<base href="${attr(base)}">` : ''
  let srcdoc
  if (/<head[^>]*>/i.test(html)) {
    srcdoc = html.replace(/<head([^>]*)>/i, `<head$1>${head}`)
  } else {
    srcdoc = `<!doctype html><html><head>${head}</head><body>${html}</body></html>`
  }
  return { srcdoc, url, base, bytes: srcdoc.length, stripped }
}
