/** View-layer guards.
 *
 *  These are the anti-fake-green checks for the UI rebuild: they fail when
 *  someone reintroduces a hand-drawn glyph, a raw colour literal, a hand-written
 *  status header, or swaps the host primitives back out for bespoke chrome.
 *  Everything here is a source-level fact — it cannot be satisfied by a mock. */
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it } from 'node:test'
import { formatRelative, relTime, UNIT_KEY } from '../src/client/time-format.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = rel => readFileSync(join(root, rel), 'utf8')

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

  it('the hand-written status header is gone', () => {
    const body = read('src/client/view/ProgressBody.jsx')
    const css = read('src/client/styles.js')
    for (const banned of ['npr-head', 'npr-panel', 'npr-filter-chip']) {
      assert.ok(!body.includes(banned), `ProgressBody still renders .${banned}`)
      assert.ok(!css.includes(`.${banned}`), `styles.js still defines .${banned}`)
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

  it('the timeline is host AnimatedRows and the filter is host Input', () => {
    expect('src/client/view/ProgressBody.jsx', ['AnimatedRows', 'Input', 'rowKeys', 'resetKey'])
  })

  it('the drawer is a host SegmentedControl over a pointer-resizable grip', () => {
    expect('src/client/view/Drawer.jsx', ['SegmentedControl', "role: 'separator'", 'setPointerCapture'])
  })

  it('tasks and jobs use host StateDot semantics', () => {
    expect('src/client/view/TasksView.jsx', ['StateDot'])
    expect('src/client/view/JobsView.jsx', ['StateDot'])
    expect('src/client/icons.js', ['TODO_DOT', 'JOB_DOT'])
  })

  it('row colours are token-driven, one rule per event kind', () => {
    const css = read('src/client/styles.js')
    for (const type of ['prompt', 'message', 'shell', 'file', 'web', 'tool', 'todo', 'subagent', 'wait', 'turn', 'job', 'lifecycle']) {
      assert.match(css, new RegExp(`\\.npr-icon\\[data-type="${type}"\\]|\\.npr-t-${type}`),
        `no colour identity for type ${type}`)
    }
    // Human input must be the filled/branded one.
    assert.match(css, /\.npr-icon\[data-type="prompt"\][\s\S]*?var\(--dsw-alias-brand-primary\)/)
  })
})
