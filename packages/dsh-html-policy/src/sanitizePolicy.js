/**
 * sanitizePolicy — pure decision function + shared string serializer,
 * shared by the two renderers (P3-01, T-O-9).
 *
 *   sanitizePolicy({ kind:'element',   name })            → 'keep'|'unwrap'|'drop'
 *   sanitizePolicy({ kind:'attr',      name, value, el }) → 'keep'|'drop'
 *   sanitizePolicy({ kind:'style-prop',name, value })     → 'keep'|'drop'
 *   sanitizePolicy({ kind:'url',       name, value, el }) → 'keep'|'drop'
 *
 * The function is PURE: no DOM, no IO, no state. The client DOMParser
 * renderer makes per-node decisions through it; the host path consumes the
 * same tables through {@link sanitizeHtml}, the string serializer below,
 * so their keep/drop sets stay identical.
 */
import {
  ALLOWED_ELEMENTS,
  ALLOWED_ATTRS,
  ALLOWED_SCHEMES,
  ALLOWED_STYLE_PROPS,
  DROP_ELEMENTS,
  isDropAttr,
  isDropScheme,
  elementAction,
  attrPolicy,
  urlPolicy,
  sanitizeStyle,
  styleDecls,
  decodeEntities,
} from './policy.js'

export function sanitizePolicy({ kind, name, value, el } = {}) {
  switch (kind) {
    case 'element':
      return elementAction(name)
    case 'attr':
      return attrPolicy(el, name, value)
    case 'url':
      return urlPolicy(name, value, el)
    case 'style-prop': {
      const n = String(name).toLowerCase()
      if (n === 'position') return 'drop'
      return ALLOWED_STYLE_PROPS.has(n) ? 'keep' : 'drop'
    }
    default:
      throw new Error(`dsh-html-policy: unknown sanitizePolicy kind "${kind}"`)
  }
}

/* ------------------------------------------------------------------ *
 * sanitizeHtml — the shared string serializer.                          *
 *                                                                       *
 * Tokenizes tags / comments / text, applies the policy to every         *
 * element and attribute, and re-emits sanitized markup. It is the host  *
 * renderer (sanitizeMpHtml) verbatim — including its historical         *
 * transforms, so the output byte-parity matches the legacy regex pass:  *
 *                                                                       *
 *   - data-src promotion on <img> (src + no-referrer/lazy/async) with   *
 *     the same "later duplicate attrs collapse" effect the DOM has;     *
 *   - visibility:hidden → visibility: visible tail sweep;               *
 *   - unclosed drop-elements swallow to EOF (old </script regex did).   *
 * ------------------------------------------------------------------ */

/** HTML void elements — never have a close tag to wait for. */
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
])

/**
 * Attribute-value escaping for re-emission. The output may contain ONLY
 * entity-encoded markup characters: a decoded `<`/`>`/`"`/`&` is written
 * back as `&lt;`/`&gt;`/`&quot;`/`&amp;`. This is the mXSS gate — an
 * attribute value must never be able to reconstruct markup when the
 * sanitized fragment is re-parsed (the classic `</noscript><img …>` title
 * escape from the battery corpus). DOM-visible values are unchanged:
 * `&amp;` decodes back to `&`.
 */
const ESCAPE_ATTR_VALUE = { '&': '&amp;', '"': '&quot;', '<': '&lt;', '>': '&gt;' }
const escapeAttrValue = text => String(text).replace(/[&"<>]/g, ch => ESCAPE_ATTR_VALUE[ch])

/**
 * Split a `<tag …>` opener into name + attribute list.
 * The historical regex pass matched `name="v"` / `name='v'` / `name=v` /
 * bare `name`; `/` inside the attribute area is ignored (HTML tokenizer
 * semantics), so `<img src=x /onerror=y>` still yields an `onerror` attr.
 *
 * @returns {{name:string, attrs:{name:string,value:string,quoted:string|null,hasEq:boolean}[]}|null}
 */
function parseTag(inner) {
  const m = /^([a-zA-Z][a-zA-Z0-9:_-]*)/.exec(inner)
  if (!m) return null
  const name = m[1]
  const attrs = []
  let i = name.length
  const end = inner.length
  while (i < end) {
    /* whitespace or stray '/' between attributes */
    if (/\s/.test(inner[i]) || inner[i] === '/') { i += 1; continue }
    const nameMatch = /^[^\s=/>]+/.exec(inner.slice(i))
    if (!nameMatch) { i += 1; continue }
    const attrName = nameMatch[0]
    i += attrName.length
    /* optional = value */
    while (i < end && /\s/.test(inner[i])) i += 1
    let value = ''
    let quoted = null
    let hasEq = false
    if (inner[i] === '=') {
      hasEq = true
      i += 1
      while (i < end && /\s/.test(inner[i])) i += 1
      if (inner[i] === '"' || inner[i] === "'") {
        quoted = inner[i]
        i += 1
        const close = inner.indexOf(quoted, i)
        if (close === -1) { value = inner.slice(i); i = end }
        else { value = inner.slice(i, close); i = close + 1 }
      } else {
        const valMatch = /^[^\s>]*/.exec(inner.slice(i))
        value = valMatch[0]
        i += value.length
      }
    }
    attrs.push({ name: attrName, value, quoted, hasEq })
  }
  return { name, attrs }
}

/** Find the close tag `</name…>` that ends a dropped subtree; -1 = none. */
function findClose(html, from, name) {
  const re = new RegExp(`</${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*>`, 'gi')
  re.lastIndex = from
  const m = re.exec(html)
  return m ? m.index + m[0].length : -1
}

/** Emit one kept attribute, preserving the historical quoting shape. */
function emitAttr(attrName, value, quoted, hasEq, el) {
  const decoded = decodeEntities(value)
  const escaped = escapeAttrValue(decoded)
  if (!hasEq) return ` ${attrName}` // bare attribute: emit as-is
  if (quoted === "'") return ` ${attrName}='${escaped.replace(/'/g, '&#39;')}'`
  if (quoted === null) {
    /* Unquoted source value: keep unquoted when it stays a legal
       unquoted token, otherwise promote to double quotes. */
    return /^[^\s"'=<>`]+$/.test(decoded)
      ? ` ${attrName}=${decoded}`
      : ` ${attrName}="${escaped}"`
  }
  return ` ${attrName}="${escaped}"`
}

/**
 * Serialize `attrs` on `el` through the policy and re-emit.
 * `promoted` marks the data-src → src rewrite: the replacement runs the
 * URL policy on the DECODED value so an entity-encoded javascript: never
 * reaches src, exactly like the DOM renderer's getAttribute pipeline.
 */
function emitAttrs(name, attrs, promoted) {
  const emitted = new Set()
  let out = ''
  for (const attr of attrs) {
    const lower = attr.name.toLowerCase()
    /* data-src promotion on <img>: first data-src wins (DOM semantics of a
       duplicated attribute), later ones collapse away — byte-parity with
       the historical replaces. Non-img data-src is dropped wholesale. */
    if (lower === 'data-src') {
      if (name === 'img' && !promoted.done && attr.quoted !== null
          && urlPolicy('src', attr.value, 'img') === 'keep') {
        promoted.done = true
        for (const a of ['src', 'referrerpolicy', 'loading', 'decoding']) emitted.add(a)
        const q = attr.quoted === "'" ? "'" : '"'
        const decoded = decodeEntities(attr.value)
        const escaped = q === "'"
          ? escapeAttrValue(decoded).replace(/'/g, '&#39;')
          : escapeAttrValue(decoded)
        out += ` src=${q}${escaped}${q} referrerpolicy="no-referrer" loading="lazy" decoding="async"`
      }
      continue
    }
    if (emitted.has(lower)) continue // later duplicates collapse (first wins)
    if (attrPolicy(name, attr.name, attr.value) === 'drop') continue
    emitted.add(lower)
    if (lower === 'style') {
      const kept = sanitizeStyle(attr.value)
      /* Host semantics: an empty sanitized style removes the attribute.
         Historical quoting: the sanitized value is always emitted inside
         double quotes in the new serializer (values have " → ' mapped). */
      if (kept) out += ` style="${escapeAttrValue(kept)}"`
      continue
    }
    out += emitAttr(attr.name, attr.value, attr.quoted, attr.hasEq, name)
  }
  return out
}

/**
 * Sanitize a rich-text HTML fragment to a safe string. No DOM needed —
 * this is the host (`sanitizeMpHtml`) renderer AND the reference
 * implementation the client renderer is pinned to.
 * @param {string} html
 */
export function sanitizeHtml(html) {
  const input = String(html ?? '')
  let out = ''
  let pos = 0
  const len = input.length
  /* Tag/comment candidates: <!--…-->, </name…>, <name…>, or a bare '<'. */
  const TAG_RE = /<!--|<\/?[a-zA-Z]|</g
  let match
  while ((match = TAG_RE.exec(input)) !== null) {
    const start = match.index
    const tok = match[0]
    if (tok === '<') {
      /* '<' not followed by a letter or '!' — literal text. */
      out += input.slice(pos, start + 1)
      pos = start + 1
      continue
    }
    if (tok === '<!--') {
      /* Drop comments entirely (review 3456 F1): Chrome also terminates a
       * comment on `<!-->` and `--!>`, so emitting one verbatim lets a
       * smuggled `<img onerror>` escape the comment early and run in any
       * single-pass consumer. Comments carry no rendered content — drop the
       * whole span, copy the text before it, skip to the comment close. */
      const close = input.indexOf('-->', start + 4)
      const end = close === -1 ? len : close + 3
      out += input.slice(pos, start) // text before the comment, verbatim
      pos = end
      TAG_RE.lastIndex = end
      continue
    }
    /* Find '>' not inside a quoted attribute value. */
    let i = start + tok.length
    let quote = null
    let gt = -1
    while (i < len) {
      const ch = input[i]
      if (quote === null && ch === '>') { gt = i; break }
      if (quote === null && (ch === '"' || ch === "'")) quote = ch
      else if (ch === quote) quote = null
      i += 1
    }
    if (gt === -1) {
      /* Unclosed tag at EOF: swallow it (old regex left it; dropping is safer). */
      out += input.slice(pos, start)
      pos = len
      break
    }
    const inner = input.slice(start + tok.length, gt)
    const isClose = tok.startsWith('</')
    const selfClose = !isClose && /\/\s*$/.test(inner)
    /* The tag name sits inside tok (`<a` / `</a`); re-attach it to inner. */
    out += input.slice(pos, start)
    const parsed = parseTag(tok.slice(isClose ? 2 : 1) + inner)
    if (!parsed) { pos = gt + 1; TAG_RE.lastIndex = gt + 1; continue }
    const name = parsed.name.toLowerCase()
    const action = elementAction(name)
    if (isClose) {
      /* Close tags: emitted only for 'keep' elements (drop/unwrap already
         removed the opener; the matching close is consumed/skipped). */
      if (action === 'keep') out += `</${parsed.name}>`
      pos = gt + 1
      TAG_RE.lastIndex = gt + 1
      continue
    }
    if (action === 'drop') {
      /* Swallow the subtree to the matching close (voids: nothing to wait
         for; unclosed: to EOF — same reach the old script regex had). */
      if (!selfClose && !VOID_ELEMENTS.has(name)) {
        const closeEnd = findClose(input, gt + 1, name)
        pos = closeEnd === -1 ? len : closeEnd
      } else {
        pos = gt + 1
      }
      TAG_RE.lastIndex = pos
      continue
    }
    if (action === 'keep') {
      const promoted = { done: false }
      const attrs = emitAttrs(name, parsed.attrs, promoted)
      out += `<${parsed.name}${attrs}${selfClose ? ' /' : ''}>`
    }
    /* 'unwrap': emit nothing — children flow on and get sanitized. */
    pos = gt + 1
    TAG_RE.lastIndex = gt + 1
  }
  out += input.slice(pos)
  /* The lazy-reveal sweep the host pass always ran LAST, verbatim. */
  return out.replace(/visibility\s*:\s*hidden/gi, 'visibility: visible')
}

export {
  ALLOWED_ELEMENTS,
  ALLOWED_ATTRS,
  ALLOWED_SCHEMES,
  ALLOWED_STYLE_PROPS,
  DROP_ELEMENTS,
  isDropAttr,
  isDropScheme,
}
