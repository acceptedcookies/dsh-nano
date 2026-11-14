/**
 * a11y-lite snapshot — the shared element-ref language between human picks and
 * agent tools (P0-5).
 *
 * A single injected `Runtime.evaluate` walks the rendered DOM once and returns
 * a compact semantic tree plus a ref table `{ "@N": { role, name, selector } }`.
 * The same walker runs for the human annotate view and for `sandbox.snapshot`,
 * so a ref the pane shows is a ref an agent can hand to wait/pick/evaluate/edit.
 *
 * Kitesurf rewrites pages (example.com renders as SVG + <p>, no <h1>), so the
 * walker reads the RENDERED DOM — never the source HTML — and derives role from
 * the element's own tag/attrs rather than an assumed semantic map.
 */

/** Maximum nodes emitted into the tree; deeper markup folds into `truncated`. */
const MAX_NODES = 200

/**
 * Injected expression. Runs inside the engine page; MUST be self-contained
 * (no closure over host scope, no template interpolation of host values).
 * Returns a JSON string so the host needs only one evaluate round-trip.
 *
 * Emits: { tree, refs, truncated, url, title }
 *   tree — indented lines "<@N|-> <role> <name?> <text?>" ; non-ref nodes "…"
 *   refs — { "@1": { role, name, text, selector } }
 *   selector — a stable CSS path (nth-of-type chain), the same string /pick
 *              would produce, so human pick and agent ref resolve identically.
 */
const SNAPSHOT_EXPRESSION = String.raw`(function () {
  var MAX = ${/* injected below */0};
  var refs = {};
  var lines = [];
  var counter = 0;
  var out = { truncated: false };

  function visible(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.tagName === 'INPUT' && el.type === 'hidden') return false;
    var style = null;
    try { style = getComputedStyle(el); } catch (e) { return true; }
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse') return false;
    if (style.opacity === '0') return false;
    var r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0;
  }

  function roleOf(el) {
    var tag = el.tagName;
    var explicit = el.getAttribute && el.getAttribute('role');
    if (explicit) return explicit;
    var map = {
      A: 'link', BUTTON: 'button', INPUT: 'input', TEXTAREA: 'textbox',
      SELECT: 'combobox', IMG: 'img', FORM: 'form', NAV: 'navigation',
      MAIN: 'main', HEADER: 'banner', FOOTER: 'contentinfo', ASIDE: 'complementary',
      H1: 'heading', H2: 'heading', H3: 'heading', H4: 'heading', H5: 'heading', H6: 'heading',
      UL: 'list', OL: 'list', LI: 'listitem', TABLE: 'table', LABEL: 'label', SVG: 'svg',
      DIALOG: 'dialog', SECTION: 'section', ARTICLE: 'article', DETAILS: 'details',
      OPTION: 'option', VIDEO: 'video', AUDIO: 'audio', CANVAS: 'canvas', IFRAME: 'iframe'
    };
    if (tag === 'INPUT') {
      var t = (el.type || '').toLowerCase();
      if (t === 'checkbox') return 'checkbox';
      if (t === 'radio') return 'radio';
      if (t === 'submit' || t === 'button' || t === 'reset') return 'button';
      if (t === 'range') return 'slider';
      if (t === 'search') return 'searchbox';
      if (t === 'password' || t === 'email' || t === 'text' || t === 'tel' || t === 'url' || t === 'number' || !t) return 'textbox';
    }
    return map[tag] || 'generic';
  }

  function nameOf(el) {
    var a = el.getAttribute && (el.getAttribute('aria-label') || el.getAttribute('alt') || el.getAttribute('title') || el.getAttribute('placeholder') || el.getAttribute('value') || el.getAttribute('name'));
    if (a) return String(a).trim().slice(0, 80);
    return '';
  }

  function textOf(el) {
    var t = (el.innerText || el.textContent || '').replace(/\s+/g, ' ').trim();
    return t.slice(0, 80);
  }

  function selectorOf(el) {
    if (el.id && /^[A-Za-z][-A-Za-z0-9_:.]*$/.test(el.id)) return '#' + el.id;
    var parts = [];
    var n = el;
    var hops = 0;
    while (n && n.nodeType === 1 && hops < 12) {
      var p = n.parentElement;
      if (!p) { parts.unshift(n.tagName.toLowerCase()); break; }
      var idx = 1;
      var sib = n.previousElementSibling;
      while (sib) { if (sib.tagName === n.tagName) idx += 1; sib = sib.previousElementSibling; }
      var sibs = 0;
      var s2 = p.firstElementChild;
      while (s2) { if (s2.tagName === n.tagName) sibs += 1; s2 = s2.nextElementSibling; }
      var seg = n.tagName.toLowerCase() + (sibs > 1 ? ':nth-of-type(' + idx + ')' : '');
      parts.unshift(seg);
      if (p === document.body) break;
      n = p; hops += 1;
    }
    return parts.join('>');
  }

  function interactive(role) {
    return /^(link|button|input|textbox|checkbox|radio|combobox|slider|searchbox|option|form|details|dialog|video|audio|iframe|canvas)$/.test(role);
  }

  function walk(el, depth) {
    if (counter >= MAX || !el) { if (el) out.truncated = true; return; }
    counter += 1;
    var vis = visible(el);
    var role = roleOf(el);
    var name = nameOf(el);
    var kids = el.children ? Array.prototype.slice.call(el.children) : [];
    var isRoot = depth === 0;
    if (!vis && !isRoot) { counter -= 1; return; } // skip invisible subtree
    var hasRef = interactive(role) || role === 'heading' || role === 'img' || role === 'main' || role === 'navigation' || role === 'listitem';
    var ref = '';
    if (hasRef) {
      var id = '@' + (Object.keys(refs).length + 1);
      refs[id] = { role: role, name: name, text: textOf(el), selector: selectorOf(el) };
      ref = id + ' ';
    }
    var text = textOf(el);
    var line = new Array(depth + 1).join('  ') + ref + role + (name ? ' "' + name + '"' : '') + (text && text !== name ? ' | ' + text : '');
    if (!isRoot) lines.push(line.slice(0, 160));
    for (var i = 0; i < kids.length && counter < MAX; i += 1) walk(kids[i], depth + 1);
    if (i < kids.length) out.truncated = true;
  }

  walk(document.body || document.documentElement, 0);
  return JSON.stringify({
    tree: lines.join('\n'),
    refs: refs,
    truncated: out.truncated,
    url: location.href,
    title: document.title,
    count: Object.keys(refs).length
  });
})()`

/** Resolve the injected expression with a concrete node cap. */
export function snapshotExpression(maxNodes = MAX_NODES) {
  return SNAPSHOT_EXPRESSION.replace('var MAX = 0;', `var MAX = ${Math.max(1, Math.min(Number(maxNodes) || MAX_NODES, 500))};`)
}
