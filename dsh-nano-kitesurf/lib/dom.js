/**
 * Native-HTML rendering for the pane.
 *
 * The pane used to be a base64 screenshot inside an <img>. That is a raster
 * copy: no text selection, no native scroll, no :hover, and every interaction
 * needs a new capture. This module turns the engine's live DOM into a
 * self-contained document the pane renders in an <iframe srcDoc>, so the
 * browser does the layout — real HTML, real CSS, real scrolling — and picking
 * happens inside that document instead of by screen coordinates.
 *
 * Fidelity trade-offs, stated honestly:
 *  - scripts are stripped (the preview must never re-run page code);
 *  - relative URLs are rebased on the live page URL so CSS/img/font resolve;
 *  - form state is not carried over (values are attributes, not live props).
 * Picking, hover and text edits do not need any of that.
 */

const SCRIPT_RE = /<script\b[^>]*>[\s\S]*?<\/script>/gi
const BASE_TAG_RE = /<base\b[^>]*>/gi

/** Escape a URL for safe interpolation into an attribute. */
function attr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
}

/**
 * The in-document picker. Runs inside the iframe (sandboxed, no same-origin
 * access to the host): it reports element packets to the parent via
 * postMessage and draws its own hover/selection outline.
 */
const PICKER = `
(function () {
  var MODE = false;
  var last = null;
  var style = document.createElement('style');
  style.textContent = '.__nks_hover{outline:1.5px dashed #7aaaff !important;outline-offset:-1px}' +
    '.__nks_pick{outline:1.5px solid #7aaaff !important;outline-offset:-1px}';
  document.documentElement.appendChild(style);

  function cls(el) {
    var c = el.className;
    if (c && c.baseVal !== undefined) c = c.baseVal;
    return typeof c === 'string' ? c : '';
  }
  function selector(el) {
    var parts = [];
    var node = el;
    while (node && node.nodeType === 1 && parts.length < 8) {
      var tag = node.tagName.toLowerCase();
      if (node.id) { parts.unshift(tag + '#' + node.id); break; }
      var parent = node.parentElement;
      if (parent) {
        var same = 0, idx = 0;
        for (var i = 0; i < parent.children.length; i++) {
          var child = parent.children[i];
          if (child.tagName === node.tagName) { same++; if (child === node) idx = same; }
        }
        tag += same > 1 ? ':nth-of-type(' + idx + ')' : '';
      }
      parts.unshift(tag);
      node = parent;
    }
    return parts.join(' > ');
  }
  function packet(el, x, y) {
    var r = el.getBoundingClientRect();
    var cs = getComputedStyle(el);
    var styleIn = {};
    ['color','backgroundColor','fontSize','fontFamily','fontWeight','lineHeight','display','position','margin','padding','border','borderRadius','width','height','flexDirection','justifyContent','alignItems','gap','zIndex','overflow'].forEach(function (k) {
      var v = cs[k]; if (v) styleIn[k] = String(v);
    });
    var attrs = {};
    ['id','class','role','aria-label','aria-expanded','href','src','type','name','alt','title','placeholder'].forEach(function (k) {
      var v = k === 'class' ? cls(el) : el.getAttribute && el.getAttribute(k);
      if (typeof v === 'string' && v.trim()) attrs[k] = v.trim().slice(0, 120);
    });
    var anc = [], node = el.parentElement;
    while (node && anc.length < 6) {
      var c = cls(node).trim().split(/\\s+/).slice(0, 2).join('.');
      anc.push(node.tagName.toLowerCase() + (c ? '.' + c : ''));
      node = node.parentElement;
    }
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      className: cls(el).slice(0, 200),
      selector: selector(el),
      text: (el.innerText || '').trim().slice(0, 200),
      alt: el.getAttribute ? (el.getAttribute('alt') || '') : '',
      src: el.getAttribute ? (el.getAttribute('src') || '') : '',
      box: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) },
      style: styleIn,
      attrs: attrs,
      ancestors: anc,
      componentStack: null,
      parentSel: null,
      childSel: null,
      point: { x: Math.round(x), y: Math.round(y) },
    };
  }
  function clear() {
    if (last && last.classList) last.classList.remove('__nks_pick');
    last = null;
  }
  addEventListener('message', function (event) {
    var data = event.data || {};
    if (data.__nks !== 'mode') return;
    MODE = !!data.annotate;
    if (!MODE) {
      clear();
      document.querySelectorAll('.__nks_hover').forEach(function (n) { n.classList.remove('__nks_hover'); });
    }
  }, false);
  document.addEventListener('mousemove', function (e) {
    if (!MODE) return;
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    document.querySelectorAll('.__nks_hover').forEach(function (n) { n.classList.remove('__nks_hover'); });
    el.classList.add('__nks_hover');
  }, true);
  document.addEventListener('click', function (e) {
    if (!MODE) return;
    e.preventDefault();
    e.stopPropagation();
    var el = document.elementFromPoint(e.clientX, e.clientY);
    if (!el) return;
    clear();
    last = el;
    el.classList.add('__nks_pick');
    parent.postMessage({ __nks: 'pick', packet: packet(el, e.clientX, e.clientY) }, '*');
  }, true);
})();
`

/**
 * Build the document the iframe renders.
 * @param {{ url: string, html: string }} page
 * @returns {string}
 */
export function buildSrcDoc(page) {
  const url = typeof page?.url === 'string' ? page.url : ''
  let html = typeof page?.html === 'string' ? page.html : ''
  html = html.replace(SCRIPT_RE, '').replace(BASE_TAG_RE, '')
  // Rebase every relative asset on the real page URL.
  const head = url ? `<base href="${attr(url)}">` : ''
  const injected = `<script>${PICKER}</script>`
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${head}${injected}`)
  }
  return `<!doctype html><html><head>${head}${injected}</head><body>${html}</body></html>`
}
