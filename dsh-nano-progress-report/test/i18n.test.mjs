/** i18n tables: zh/en key sets must stay symmetric (one true source: i18n.js). */
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { makeI18n } from '../src/client/i18n.js'

describe('makeI18n', () => {
  it('zh and en expose identical key sets', () => {
    const zh = makeI18n(() => 'zh')
    const en = makeI18n(() => 'en')
    const keys = ['view.progress', 'view.progressDesc', 'head.refresh',
      'filter.placeholder', 'filter.clear', 'flow.loadOlder', 'flow.loadingOlder',
      'flow.empty', 'flow.emptyFiltered', 'row.expand', 'row.collapse',
      'status.ok', 'status.failed', 'status.running', 'status.awaiting',
      'tasks.title', 'tasks.empty', 'tasks.done', 'jobs.title', 'jobs.empty',
      'state.idle', 'state.running', 'session.unavailable', 'menu.openProgress']
    for (const key of keys) {
      assert.notEqual(zh(key), key, `zh missing ${key}`)
      assert.notEqual(en(key), key, `en missing ${key}`)
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
})
