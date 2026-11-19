/** View-layer guards.
 *
 *  These are the anti-fake-green checks for the low-key Progress rebuild:
 *  they fail when someone reintroduces a hand-drawn glyph, a raw colour
 *  literal, a tinted band, a bold "hero" row, or swaps the host primitives
 *  back out for bespoke chrome. Everything here is a source-level fact — it
 *  cannot be satisfied by a mock.
 *
 *  The visual contract is the Devin Progress reference (a flat execution log
 *  plus a quiet Tasks footer), rendered with host primitives only. */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { formatRelative, relTime, UNIT_KEY } from '../src/client/time-format.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = rel => readFileSync(join(root, rel), 'utf8')
const exists = rel => existsSync(join(root, rel))

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.(jsx?|mjs)$/.test(entry)) yield path
  }
}

// Copy stub that carries {n} so the number substitution is observable.
const t = key => `{${key}}(n={n})`

describe('relative time formatting (host bucketing, local words)', () => {
  it('formats every host bucket', () => {
    assert.equal(formatRelative({ unit: 'now', n: 0 }, t), '{time.now}(n={n})')
    assert.equal(formatRelative({ unit: 'minutes', n: 5 }, t), '{time.minutes}(n=5)')
    assert.equal(formatRelative({ unit: 'hours', n: 3 }, t), '{time.hours}(n=3)')
    assert.equal(formatRelative({ unit: 'days', n: 2 }, t), '{time.days}(n=2)')
    assert.equal(formatRelative({ unit: 'months', n: 4 }, t), '{time.months}(n=4)')
    assert.equal(formatRelative({ unit: 'years', n: 1 }, t), '{time.years}(n=1)')
    for (const unit of ['minutes', 'hours', 'days', 'months', 'years']) {
      assert.ok(UNIT_KEY[unit], `no copy key for host unit ${unit}`)
    }
  })

  it('returns empty for unknown buckets, undated rows and a missing bucket fn', () => {
    assert.equal(formatRelative({ unit: 'centuries', n: 2 }, t), '')
    assert.equal(formatRelative(null, t), '')
    assert.equal(relTime(0, Date.now(), t, () => ({ unit: 'now', n: 0 })), '')
    assert.equal(relTime(undefined, Date.now(), t, () => ({ unit: 'now', n: 0 })), '')
    assert.equal(relTime(Date.now() - 1000, Date.now(), t, undefined), '')
  })

  it('delegates bucketing to the injected host function', () => {
    const seen = []
    const buckets = (at, now) => { seen.push([at, now]); return { unit: 'days', n: 9 } }
    assert.equal(relTime(1234, 5678, t, buckets), '{time.days}(n=9)')
    assert.deepEqual(seen, [[1234, 5678]])
  })
})

describe('no hand-drawn UI', () => {
  it('no inline <svg> or svg element creation anywhere in src/client', () => {
    for (const path of walk(join(root, 'src', 'client'))) {
      const text = readFileSync(path, 'utf8')
      assert.doesNotMatch(text, /<svg|['"]svg['"]|path\s+d=|d="M[\d.]/,
        `${path} draws its own glyph — use a catalog Icon* instead`)
    }
  })

  it('no raw colour literals or unicode glyph buttons in the stylesheet', () => {
    const css = read('src/client/styles.js')
    assert.doesNotMatch(css, /#[0-9a-fA-F]{3,8}\b/, 'hex colour in styles.js — use a --dsw-alias-* token')
    assert.doesNotMatch(css, /\brgba?\s*\(/, 'rgb()/rgba() in styles.js — use a --dsw-alias-* token')
  })

  it('the old hand-written header, goal band and grouping chrome are gone', () => {
    const body = read('src/client/view/ProgressBody.jsx')
    const css = read('src/client/styles.js')
    for (const banned of ['npr-head', 'npr-panel', 'npr-filter-chip', 'npr-goal', 'npr-group', 'npr-status', 'npr-drawer']) {
      assert.ok(!body.includes(banned), `ProgressBody still renders .${banned}`)
      assert.ok(!css.includes(`.${banned}`), `styles.js still defines .${banned}`)
    }
    for (const gone of ['Group.jsx', 'GoalHeader.jsx', 'Drawer.jsx']) {
      assert.ok(!exists(`src/client/view/${gone}`), `${gone} must not come back — the panel is flat`)
    }
  })

  it('every row type maps to a catalog icon', () => {
    const icons = read('src/client/icons.js')
    // Names we import must exist in the generated catalog (the same file
    // check-client-rules validates against). Skipped when the catalog is
    // absent, e.g. running from a packed tarball.
    const catalogPath = join(root, '..', 'packages', 'dsh-nano-ui', 'catalog', 'icons.json')
    if (!existsSync(catalogPath)) return
    const catalog = readFileSync(catalogPath, 'utf8')
    const imported = [...icons.matchAll(/Icon[A-Za-z0-9]+/g)].map(m => m[0])
    assert.ok(imported.length >= 10, 'icon facade imports too few glyphs')
    for (const name of new Set(imported)) {
      assert.ok(catalog.includes(`"${name}"`), `${name} is not in the host icon catalog`)
    }
  })
})

describe('official primitives drive the chrome', () => {
  const expect = (file, needles) => {
    const text = read(file)
    for (const needle of needles) {
      assert.ok(text.includes(needle), `${file} must use ${needle}`)
    }
  }

  it('rows are host DisclosureRow, not bespoke row markup', () => {
    expect('src/client/view/Row.jsx', ['DisclosureRow', 'headerAccessory', 'expandOnRowClick'])
  })

  it('the timeline is host AnimatedRows and the search is host Input', () => {
    expect('src/client/view/ProgressBody.jsx', ['AnimatedRows', 'Input', 'rowKeys', 'resetKey'])
  })

  it('the task bar is a host DisclosureRow over a pointer-resizable grip', () => {
    expect('src/client/view/TasksSection.jsx', ['DisclosureRow', "role: 'separator'", 'setPointerCapture', "'progressbar'", "'tasks-head'", 'expandOnRowClick: false', 'stopPropagation'])
    // No segmented control: the footer is one list, with a text switch only
    // when the host actually reports jobs.
    assert.ok(!read('src/client/view/TasksSection.jsx').includes('SegmentedControl'))
  })

  it('tasks use host state glyphs and never invent timestamps', () => {
    expect('src/client/view/TasksView.jsx', ['IconCheckCircleFillRegular', 'StateDot'])
    const view = read('src/client/view/TasksView.jsx')
    assert.ok(!/\brelTime\b|relativeTime|completed\s+\d/.test(view), 'TodoItem carries no time — do not fake one')
  })

  it('the header action is still host Button + Tooltip', () => {
    expect('src/client/view/HeaderAction.jsx', ['Button', 'Tooltip', 'IconFlatListOutlineRegular'])
  })
})

describe('low-key visual contract', () => {
  const css = read('src/client/styles.js')

  it('the search keeps the host field on a quiet 34px line', () => {
    assert.match(css, /\.npr-toolbar\s*\{[^}]*height:\s*34px/s)
    const searchRule = /\[data-nano-progress-report\] \.npr-search\s*\{([^}]*)\}/s.exec(css)
    assert.ok(searchRule, 'no scoped .npr-search sizing rule')
    assert.doesNotMatch(searchRule[1], /border(-\w+)?:/, 'do not redraw the host field chrome')
    assert.doesNotMatch(searchRule[1], /background:/, 'do not redraw the host field chrome')
  })

  it('rows carry no tinted band, no left bar and no bold weight', () => {
    assert.doesNotMatch(css, /\.npr-row\[data-type="prompt"\]/, 'human input must not own a background')
    assert.doesNotMatch(css, /\.npr-row\[data-status="failed"\][^{]*\{[^}]*background/s, 'failed rows must not own a background')
    assert.doesNotMatch(css, /inset\s+2px/, 'no left status bars')
    assert.doesNotMatch(css, /font-weight:\s*(600|700)\b/, 'no bold rows')
  })

  it('the leading glyph is uniform tertiary; only failure recolours it', () => {
    const iconRule = /\.npr-icon\s*\{([^}]*)\}/s.exec(css)
    assert.ok(iconRule, 'no .npr-icon rule')
    assert.match(iconRule[1], /color:\s*var\(--dsw-alias-label-tertiary\)/)
    assert.match(css, /\.npr-row\[data-status="failed"\] \.npr-icon[^{]*\{[^}]*state-error-primary/s)
    const chip = /\.npr-icon\[data-type="prompt"\][^{]*\{([^}]*)\}/s.exec(css)
    assert.equal(chip, null, 'prompt icon must not get a chip')
  })

  it('text hierarchy: conversation primary, machinery secondary, boundaries tertiary', () => {
    assert.match(css, /\.npr-t-prompt, \.npr-t-message\s*\{[^}]*label-primary/s)
    assert.match(css, /\.npr-t-shell\s*\{[^}]*label-secondary/s)
    assert.match(css, /\.npr-t-wait, \.npr-t-turn, \.npr-t-job\s*\{[^}]*label-tertiary/s)
    assert.match(css, /\.npr-t-lifecycle\s*\{[^}]*label-dimmed/s)
  })

  it('a turn is a prompt at the edge and steps behind a hairline', () => {
    const turn = read('src/client/view/Turn.jsx')
    assert.match(turn, /npr-turn-body/, 'Turn must render the indented body')
    assert.match(turn, /level/, 'Turn must hand rows their level')
    assert.match(css, /\.npr-turn-body\s*\{[^}]*margin-left:/s)
    assert.match(css, /\.npr-turn-body\s*\{[^}]*border-left:/s)
    assert.match(read('src/client/view/Row.jsx'), /'data-level': level/)
  })

  it('the task footer is one quiet 30px header over layer-1', () => {
    assert.match(css, /\.npr-taskbar\s*\{[^}]*background:\s*var\(--dsw-alias-bg-layer-1\)/s)
    assert.match(css, /\.npr-taskbar-head \[data-disclosure-row\]\s*\{[^}]*min-height:\s*30px/s)
    assert.match(css, /\.npr-task\s*\{[^}]*min-height:\s*26px/s)
  })
})

describe('workbench-only placement', () => {
  it('Progress never registers a conversation.view tab', () => {
    const index = read('src/client/index.js')
    assert.ok(!index.includes("'conversation.view'"), 'chat interface must not get a second Progress tab')
    assert.ok(index.includes("'sidebar.right.pane.tab'"), 'workbench pane seat still required')
    const body = read('src/client/view/ProgressBody.jsx')
    assert.ok(!body.includes('data-variant'), 'no view-variant branch in the body')
    assert.ok(!body.includes('props.variant'), 'the body takes no variant prop')
  })

  it('the time is a fixed right-hand column, not a title suffix', () => {
    const css = read('src/client/styles.js')
    assert.match(css, /\.npr-row-time\s*\{[^}]*min-width:\s*56px/s)
    assert.match(css, /\.npr-row-time\s*\{[^}]*text-align:\s*right/s)
    assert.match(css, /\.npr-row-tail\s*\{[^}]*margin-left:\s*auto/s)
    assert.match(css, /\[data-has-accessory\] \[data-disclosure-row\]\s*\{[^}]*flex:\s*1 1 auto/s)
  })
})
