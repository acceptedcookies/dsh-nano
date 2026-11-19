/** i18n tables: zh/en key sets must stay symmetric AND every literal `t('…')`
 *  used in the client source must resolve in the table. The source scan is the
 *  part that catches drift after a rename — a hardcoded key list only ever
 *  re-asserts itself. */
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { DICTIONARIES, makeI18n } from '../src/client/i18n.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) yield* walk(path)
    else if (/\.(jsx?|mjs)$/.test(entry)) yield path
  }
}

/** Keys the renderer builds dynamically (`t(\`state.${k}\`)`); enumerated so a
 *  renamed variant cannot silently fall back to its own key. */
const DYNAMIC = [
  'time.now', 'time.minutes', 'time.hours', 'time.days', 'time.months', 'time.years',
  'filter.status.ok', 'filter.status.failed', 'filter.status.running', 'filter.status.awaiting',
  'filter.type.prompt', 'filter.type.goal', 'filter.type.message', 'filter.type.shell',
  'filter.type.file', 'filter.type.web', 'filter.type.tool', 'filter.type.todo',
  'filter.type.subagent', 'filter.type.wait', 'filter.type.turn', 'filter.type.job',
  'filter.type.lifecycle',
]

describe('makeI18n', () => {
  it('zh and en expose identical key sets', () => {
    const zh = Object.keys(DICTIONARIES.zh).sort()
    const en = Object.keys(DICTIONARIES.en).sort()
    assert.deepEqual(zh, en, 'zh/en dictionaries diverge')
    assert.ok(zh.length > 20, `copy table suspiciously small: ${zh.length}`)
  })

  it('every literal t(\'…\') in src/client resolves in both locales', () => {
    const used = new Set()
    for (const path of walk(join(root, 'src', 'client'))) {
      const text = readFileSync(path, 'utf8')
      for (const match of text.matchAll(/\bt\('([a-zA-Z][\w.]*)'\)/g)) used.add(match[1])
    }
    assert.ok(used.size > 10, `source scan found only ${used.size} keys — regex drifted?`)
    const zh = makeI18n(() => 'zh')
    const en = makeI18n(() => 'en')
    for (const key of [...used, ...DYNAMIC]) {
      assert.notEqual(zh(key), key, `zh missing "${key}"`)
      assert.notEqual(en(key), key, `en missing "${key}"`)
    }
  })

  it('unknown key returns the key, en fallback for unknown locale', () => {
    const t = makeI18n(() => 'fr')
    assert.equal(t('nope'), 'nope')
    assert.equal(t('view.progress'), 'Progress')
  })

  it('menu.openProgress exists in both locales (tab-menu label)', () => {
    assert.equal(makeI18n(() => 'zh')('menu.openProgress'), '打开 Progress')
    assert.equal(makeI18n(() => 'en')('menu.openProgress'), 'Open Progress')
  })

  it('placeholders the renderer replaces are present in the copy', () => {
    for (const locale of ['zh', 'en']) {
      const t = makeI18n(() => locale)
      for (const key of ['time.minutes', 'toolbar.matched', 'detail.truncated']) {
        assert.match(t(key), /\{n\}/, `${locale}.${key} must carry {n}`)
      }
      assert.match(t('toolbar.matched'), /\{n\}[\s\S]*\{total\}/, `${locale}.toolbar.matched needs {n} and {total}`)
    }
  })
})
