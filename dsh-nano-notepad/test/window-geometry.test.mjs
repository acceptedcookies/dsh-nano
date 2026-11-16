/**
 * Window geometry that a source read can actually police.
 *
 * Optional. Not a release gate: this package has no `test` script, and
 * `scripts/test-all.mjs` only runs packages that declare one. Run it with
 * `node --test dsh-nano-notepad/test/*.test.mjs`.
 *
 * A viewport `@media` once sized `.np-window` off the page. A 396px notepad
 * on a wide page still stacked its file tree, and the tree then stretched the
 * window to the viewport. Toggling the tree reflowed it back to full screen.
 * These assertions fail if that shape comes back. They do not measure pixels;
 * `test/live/window-size.live.mjs` does, and only when [dsh-dev] is up.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const panel = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../src/client/panel.js'), 'utf8')

/** Balanced `{...}` blocks opened by `@<name`, outermost only. */
function atBlocks(source, name) {
  const blocks = []
  const needle = `@${name}`
  let from = 0
  while (from < source.length) {
    const at = source.indexOf(needle, from)
    if (at < 0) break
    const open = source.indexOf('{', at)
    if (open < 0) break
    let depth = 0
    let end = open
    for (; end < source.length; end++) {
      if (source[end] === '{') depth++
      else if (source[end] === '}' && --depth === 0) break
    }
    blocks.push({ head: source.slice(at, open).trim(), body: source.slice(open + 1, end) })
    from = end + 1
  }
  return blocks
}

/** `selector { decls }` pairs inside one at-rule body. Nested at-rules are skipped. */
function rules(body) {
  const found = []
  let i = 0
  while (i < body.length) {
    const open = body.indexOf('{', i)
    if (open < 0) break
    const selector = body.slice(i, open)
    if (/@(media|container|keyframes|supports)/.test(selector)) {
      let depth = 0
      let end = open
      for (; end < body.length; end++) {
        if (body[end] === '{') depth++
        else if (body[end] === '}' && --depth === 0) { end++; break }
      }
      i = end
      continue
    }
    const close = body.indexOf('}', open)
    if (close < 0) break
    found.push({ selector: selector.trim(), decls: body.slice(open + 1, close) })
    i = close + 1
  }
  return found
}

/** The selector styles `.np-window` itself, not a descendant such as `.np-window .np-cloud`. */
function sizesWindow(selector) {
  return selector.split(',').some(part => /^\.np-window(?![\w-])(?!\s+\S)/.test(part.trim()))
}

test('a viewport @media never sizes .np-window', () => {
  const hits = []
  for (const block of atBlocks(panel, 'media')) {
    for (const rule of rules(block.body)) {
      if (!sizesWindow(rule.selector)) continue
      if (/\b(width|height|inset)\s*:/.test(rule.decls)) hits.push(`${block.head} ${rule.selector.trim()}`)
    }
  }
  assert.deepEqual(hits, [], 'window width, height and inset belong on the window or in @container np, not on the page')
})

test('the narrow stack is a container query and does not rewrite the window box', () => {
  assert.equal(atBlocks(panel, 'media').some(block => /max-width:\s*760px/.test(block.head)), false)
  const narrow = atBlocks(panel, 'container').filter(block => /\bnp\b/.test(block.head) && /max-width:\s*560px/.test(block.head))
  assert.ok(narrow.length >= 1, 'the <=560px stack must be @container np')
  assert.ok(narrow.some(block => /\.np-body\s*\{[^}]*flex-direction:\s*column/.test(block.body)))
  for (const block of narrow) {
    for (const rule of rules(block.body)) {
      if (!sizesWindow(rule.selector)) continue
      assert.doesNotMatch(rule.decls, /\b(width|height|inset)\s*:/, `${block.head} still rewrites the window box`)
    }
  }
})

test('.np-window is the np container, so the query measures the window', () => {
  const rules = [...panel.matchAll(/\.np-window\s*\{([^}]*)\}/g)]
  const box = rules.find(rule => /container-name:\s*np/.test(rule[1]))
  assert.ok(box, '.np-window must name the np container')
  assert.match(box[1], /container-type:\s*inline-size/)
})

test('applyWindowSize writes the viewport only while maximized', () => {
  const start = panel.indexOf('function applyWindowSize()')
  assert.ok(start >= 0)
  const open = panel.indexOf('{', start)
  let depth = 0
  let end = open
  for (; end < panel.length; end++) {
    if (panel[end] === '{') depth++
    else if (panel[end] === '}' && --depth === 0) break
  }
  const body = panel.slice(open + 1, end)
  const maximized = body.indexOf('if (state.maximized)')
  const back = body.indexOf('return', maximized)
  assert.ok(maximized >= 0 && back > maximized)
  const rest = body.slice(back)
  assert.doesNotMatch(rest, /panel\.style\.(width|height)\s*=\s*`\$\{window\.inner/)
  assert.match(rest, /panel\.style\.width\s*=\s*`\$\{clamp\(state\.ui\.panelW/)
  assert.match(rest, /panel\.style\.height\s*=\s*`\$\{clamp\(state\.ui\.panelH/)
})

test('a file carries a 16px kind letter before its name, or ?', () => {
  assert.match(panel, /const kindMark = \{ draft: 'D', note: 'N', knowledge: 'K', prompt: 'P', memory: 'M' \}/)
  assert.match(panel, /kindMark\[node\.cat\] \?\? '\?'/)
  const row = panel.match(/\$\{catBadge\}<span class="np-node-name">/)
  assert.ok(row, 'the kind letter must render before the file name')
  const chip = [...panel.matchAll(/\.np-cat\s*\{([^}]*)\}/g)].find(rule => /width:\s*16px/.test(rule[1]))
  assert.ok(chip, '.np-cat must be a 16px chip, the same box as the file icon')
  assert.match(chip[1], /height:\s*16px/)
})
