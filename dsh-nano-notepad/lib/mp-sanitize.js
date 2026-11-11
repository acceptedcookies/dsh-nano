// ../packages/dsh-html-policy/src/policy.js
var DROP_ELEMENTS = /* @__PURE__ */ new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "base",
  "meta",
  "form",
  "input",
  "button",
  "textarea",
  "select",
  "link",
  "style"
]);
function isDropAttr(name) {
  const n = String(name).toLowerCase();
  return n.startsWith("on") || n === "srcdoc";
}
var ALLOWED_ELEMENTS = /* @__PURE__ */ new Set([
  "a",
  "p",
  "br",
  "span",
  "div",
  "section",
  "article",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "em",
  "strong",
  "b",
  "i",
  "u",
  "s",
  "del",
  "ins",
  "table",
  "thead",
  "tbody",
  "tr",
  "td",
  "th",
  "img",
  "figure",
  "figcaption",
  "hr",
  "svg",
  "g",
  "image",
  "animateTransform"
]);
var PASSTHROUGH_ELEMENTS = /* @__PURE__ */ new Set(["foreignobject"]);
var ALLOWED_ATTRS = /* @__PURE__ */ new Set([
  "href",
  "src",
  "alt",
  "title",
  "colspan",
  "rowspan",
  "width",
  "height",
  "style",
  "class",
  "referrerpolicy",
  "loading",
  "decoding",
  "preserveaspectratio",
  "xlink:href"
]);
var ALLOWED_SCHEMES = /* @__PURE__ */ new Set(["http", "https"]);
var ALLOWED_DATA_IMAGE_RE = /^data:image\/(png|jpeg|gif|webp);base64,/i;
var DATA_IMAGE_ATTRS = /* @__PURE__ */ new Set(["src", "xlink:href"]);
var DATA_IMAGE_ELEMENTS = /* @__PURE__ */ new Set(["img", "image"]);
var ALLOWED_STYLE_PROPS = /* @__PURE__ */ new Set([
  "color",
  "font-size",
  "font-weight",
  "font-style",
  "font-family",
  "text-align",
  "line-height",
  "margin",
  "margin-top",
  "margin-right",
  "margin-bottom",
  "margin-left",
  "padding",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "background",
  "background-color",
  "background-image",
  "background-size",
  "background-position",
  "background-repeat",
  "border",
  "border-radius",
  "border-top",
  "border-right",
  "border-bottom",
  "border-left",
  "border-top-width",
  "border-top-style",
  "border-top-color",
  "border-right-width",
  "border-right-style",
  "border-right-color",
  "border-bottom-width",
  "border-bottom-style",
  "border-bottom-color",
  "border-left-width",
  "border-left-style",
  "border-left-color",
  "letter-spacing",
  "text-indent",
  "text-decoration",
  "text-decoration-line",
  "width",
  "max-width",
  "height",
  "display",
  "vertical-align",
  "box-sizing",
  "overflow",
  "overflow-x",
  "overflow-y",
  "white-space",
  "word-wrap",
  "word-break",
  "opacity",
  "float",
  "clear"
]);
var NAMED_ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  colon: ":",
  Tab: "	",
  tab: "	",
  NewLine: "\n",
  newline: "\n"
};
function decodeEntities(text) {
  return String(text).replace(
    /&(#[0-9]+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (all, body) => {
      if (body[0] === "#") {
        const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code >= 0 && code <= 1114111 ? String.fromCodePoint(code) : all;
      }
      return Object.hasOwn(NAMED_ENTITIES, body) ? NAMED_ENTITIES[body] : all;
    }
  );
}
function urlPolicy(attr, value, el = "") {
  const raw = String(value ?? "");
  const cleaned = decodeEntities(raw).replace(/[\x00-\x20\x7f]+/g, "");
  const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(cleaned);
  if (scheme) {
    const s = scheme[1].toLowerCase();
    if (ALLOWED_SCHEMES.has(s)) return "keep";
    if (s === "data" && ALLOWED_DATA_IMAGE_RE.test(cleaned) && DATA_IMAGE_ATTRS.has(String(attr).toLowerCase()) && DATA_IMAGE_ELEMENTS.has(String(el).toLowerCase())) return "keep";
    return "drop";
  }
  return "keep";
}
function styleDecls(value) {
  const out = [];
  let buf = "";
  const text = String(value ?? "");
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === ";") {
      const entity = /&[a-zA-Z#\d]*$/.test(buf);
      if (!entity) {
        if (buf.trim()) out.push(buf.trim());
        buf = "";
        continue;
      }
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}
var EVIL_STYLE_VALUE = /(?:javascript|vbscript|expression|data\s*:\s*(?!image\/))/i;
function sanitizeStyle(cssText, { mapDecl } = {}) {
  const kept = [];
  for (const decl of styleDecls(cssText)) {
    const colon = decl.indexOf(":");
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim();
    const name = prop.toLowerCase();
    let value = decl.slice(colon + 1).trim();
    if (!name || name === "position") continue;
    if (!ALLOWED_STYLE_PROPS.has(name)) continue;
    const decoded = decodeEntities(value);
    if (decoded.includes(";")) continue;
    const probe = decoded.replace(/[\x00-\x20\x7f]+/g, "");
    if (EVIL_STYLE_VALUE.test(probe) || /[<>]/.test(decoded)) continue;
    if (mapDecl) {
      const mapped = mapDecl(name, decoded);
      if (mapped === null) continue;
      value = mapped;
    } else {
      value = decoded;
    }
    value = value.replace(/[\x00-\x1f\x7f]+/g, "").replace(/"/g, "'");
    kept.push(`${prop}: ${value}`);
  }
  if (kept.length === 0) return "";
  return `${kept.join("; ")}; position: static`;
}
var ALLOWED_ELEMENTS_LC = new Set([...ALLOWED_ELEMENTS].map((s) => s.toLowerCase()));
function elementAction(name) {
  const n = String(name).toLowerCase();
  if (DROP_ELEMENTS.has(n)) return "drop";
  if (ALLOWED_ELEMENTS_LC.has(n) || PASSTHROUGH_ELEMENTS.has(n)) return "keep";
  return "unwrap";
}
function attrPolicy(el, name, value) {
  const n = String(name).toLowerCase();
  if (isDropAttr(n)) return "drop";
  if (!ALLOWED_ATTRS.has(n)) return "drop";
  if (n === "href" || n === "src" || n === "xlink:href") {
    return urlPolicy(n, value, el);
  }
  return "keep";
}

// ../packages/dsh-html-policy/src/sanitizePolicy.js
var VOID_ELEMENTS = /* @__PURE__ */ new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var ESCAPE_ATTR_VALUE = { "&": "&amp;", '"': "&quot;", "<": "&lt;", ">": "&gt;" };
var escapeAttrValue = (text) => String(text).replace(/[&"<>]/g, (ch) => ESCAPE_ATTR_VALUE[ch]);
function parseTag(inner) {
  const m = /^([a-zA-Z][a-zA-Z0-9:_-]*)/.exec(inner);
  if (!m) return null;
  const name = m[1];
  const attrs = [];
  let i = name.length;
  const end = inner.length;
  while (i < end) {
    if (/\s/.test(inner[i]) || inner[i] === "/") {
      i += 1;
      continue;
    }
    const nameMatch = /^[^\s=/>]+/.exec(inner.slice(i));
    if (!nameMatch) {
      i += 1;
      continue;
    }
    const attrName = nameMatch[0];
    i += attrName.length;
    while (i < end && /\s/.test(inner[i])) i += 1;
    let value = "";
    let quoted = null;
    let hasEq = false;
    if (inner[i] === "=") {
      hasEq = true;
      i += 1;
      while (i < end && /\s/.test(inner[i])) i += 1;
      if (inner[i] === '"' || inner[i] === "'") {
        quoted = inner[i];
        i += 1;
        const close = inner.indexOf(quoted, i);
        if (close === -1) {
          value = inner.slice(i);
          i = end;
        } else {
          value = inner.slice(i, close);
          i = close + 1;
        }
      } else {
        const valMatch = /^[^\s>]*/.exec(inner.slice(i));
        value = valMatch[0];
        i += value.length;
      }
    }
    attrs.push({ name: attrName, value, quoted, hasEq });
  }
  return { name, attrs };
}
function findClose(html, from, name) {
  const re = new RegExp(`</${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*>`, "gi");
  re.lastIndex = from;
  const m = re.exec(html);
  return m ? m.index + m[0].length : -1;
}
function emitAttr(attrName, value, quoted, hasEq, el) {
  const decoded = decodeEntities(value);
  const escaped = escapeAttrValue(decoded);
  if (!hasEq) return ` ${attrName}`;
  if (quoted === "'") return ` ${attrName}='${escaped.replace(/'/g, "&#39;")}'`;
  if (quoted === null) {
    return /^[^\s"'=<>`]+$/.test(decoded) ? ` ${attrName}=${decoded}` : ` ${attrName}="${escaped}"`;
  }
  return ` ${attrName}="${escaped}"`;
}
function emitAttrs(name, attrs, promoted) {
  const emitted = /* @__PURE__ */ new Set();
  let out = "";
  for (const attr of attrs) {
    const lower = attr.name.toLowerCase();
    if (lower === "data-src") {
      if (name === "img" && !promoted.done && attr.quoted !== null && urlPolicy("src", attr.value, "img") === "keep") {
        promoted.done = true;
        for (const a of ["src", "referrerpolicy", "loading", "decoding"]) emitted.add(a);
        const q = attr.quoted === "'" ? "'" : '"';
        const decoded = decodeEntities(attr.value);
        const escaped = q === "'" ? escapeAttrValue(decoded).replace(/'/g, "&#39;") : escapeAttrValue(decoded);
        out += ` src=${q}${escaped}${q} referrerpolicy="no-referrer" loading="lazy" decoding="async"`;
      }
      continue;
    }
    if (emitted.has(lower)) continue;
    if (attrPolicy(name, attr.name, attr.value) === "drop") continue;
    emitted.add(lower);
    if (lower === "style") {
      const kept = sanitizeStyle(attr.value);
      if (kept) out += ` style="${escapeAttrValue(kept)}"`;
      continue;
    }
    out += emitAttr(attr.name, attr.value, attr.quoted, attr.hasEq, name);
  }
  return out;
}
function sanitizeHtml(html) {
  const input = String(html ?? "");
  let out = "";
  let pos = 0;
  const len = input.length;
  const TAG_RE = /<!--|<\/?[a-zA-Z]|</g;
  let match;
  while ((match = TAG_RE.exec(input)) !== null) {
    const start = match.index;
    const tok = match[0];
    if (tok === "<") {
      out += input.slice(pos, start + 1);
      pos = start + 1;
      continue;
    }
    if (tok === "<!--") {
      const close = input.indexOf("-->", start + 4);
      const end = close === -1 ? len : close + 3;
      out += input.slice(pos, start);
      pos = end;
      TAG_RE.lastIndex = end;
      continue;
    }
    let i = start + tok.length;
    let quote = null;
    let gt = -1;
    while (i < len) {
      const ch = input[i];
      if (quote === null && ch === ">") {
        gt = i;
        break;
      }
      if (quote === null && (ch === '"' || ch === "'")) quote = ch;
      else if (ch === quote) quote = null;
      i += 1;
    }
    if (gt === -1) {
      out += input.slice(pos, start);
      pos = len;
      break;
    }
    const inner = input.slice(start + tok.length, gt);
    const isClose = tok.startsWith("</");
    const selfClose = !isClose && /\/\s*$/.test(inner);
    out += input.slice(pos, start);
    const parsed = parseTag(tok.slice(isClose ? 2 : 1) + inner);
    if (!parsed) {
      pos = gt + 1;
      TAG_RE.lastIndex = gt + 1;
      continue;
    }
    const name = parsed.name.toLowerCase();
    const action = elementAction(name);
    if (isClose) {
      if (action === "keep") out += `</${parsed.name}>`;
      pos = gt + 1;
      TAG_RE.lastIndex = gt + 1;
      continue;
    }
    if (action === "drop") {
      if (!selfClose && !VOID_ELEMENTS.has(name)) {
        const closeEnd = findClose(input, gt + 1, name);
        pos = closeEnd === -1 ? len : closeEnd;
      } else {
        pos = gt + 1;
      }
      TAG_RE.lastIndex = pos;
      continue;
    }
    if (action === "keep") {
      const promoted = { done: false };
      const attrs = emitAttrs(name, parsed.attrs, promoted);
      out += `<${parsed.name}${attrs}${selfClose ? " /" : ""}>`;
    }
    pos = gt + 1;
    TAG_RE.lastIndex = gt + 1;
  }
  out += input.slice(pos);
  return out.replace(/visibility\s*:\s*hidden/gi, "visibility: visible");
}

// src/host/mp-sanitize.js
function sanitizeMpHtml(html) {
  return sanitizeHtml(html);
}
export {
  sanitizeMpHtml
};
