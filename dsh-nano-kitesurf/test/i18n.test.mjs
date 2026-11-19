import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { copyFor } from '../src/client/i18n.js'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')

test('zh and en copy have the same non-empty keys', () => {
  const zh = copyFor('zh')
  const en = copyFor('en')
  const zhKeys = Object.keys(zh).sort()
  const enKeys = Object.keys(en).sort()
  assert.deepEqual(enKeys, zhKeys)
  for (const key of zhKeys) {
    assert.equal(typeof zh[key], 'string', `zh.${key}`)
    assert.equal(typeof en[key], 'string', `en.${key}`)
    assert.notEqual(zh[key].trim(), '', `zh.${key} is blank`)
    assert.notEqual(en[key].trim(), '', `en.${key} is blank`)
  }
})

test('the pane source has no user-facing Chinese outside the copy table', () => {
  const source = readFileSync(join(root, 'src/client/index.js'), 'utf8')
  const code = source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
  const hits = [...code.matchAll(/(['"`])([^'"`]*[\u4e00-\u9fff][^'"`]*)\1/g)].map((match) => match[2])
  assert.deepEqual(hits, [])
})

test('en copy has no CJK leftovers and zh/en share the same placeholder shape', () => {
  const zh = copyFor('zh')
  const en = copyFor('en')
  for (const [key, value] of Object.entries(en)) {
    assert.equal(/[一-鿿]/.test(value), false, `en.${key} carries Chinese: ${value.slice(0, 60)}`)
  }
  // {n}/{url} placeholders are filled at runtime; a key that interpolates in
  // zh but renders literally in en is a user-visible bug.
  for (const key of Object.keys(zh)) {
    const zhPh = [...String(zh[key]).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    const enPh = [...String(en[key]).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
    assert.deepEqual(enPh, zhPh, `placeholder mismatch on ${key}: zh=${zhPh} en=${enPh}`)
  }
})

test('no copy row claims "normal/正常/success" for a page state', () => {
  // G30: the pane must never imply a page rendered fine from a label alone —
  // "loading"/"down"/"failed" are states, not verdicts.
  for (const [lang, copy] of [['zh', copyFor('zh')], ['en', copyFor('en')]]) {
    for (const [key, value] of Object.entries(copy)) {
      if (/loading|wait|busy|stale|down|fail|error|health|status|plane|env/i.test(key)) {
        assert.equal(/正常/.test(value), false, `zh.${key} claims 正常`)
        assert.equal(/\b(normal|succeeded)\b/i.test(value), false, `en.${key} claims normal/succeeded`)
      }
    }
  }
})

test('fill-style placeholders in copy match the fill() grammar ({name}, not %s/${})', () => {
  for (const [lang, copy] of [['zh', copyFor('zh')], ['en', copyFor('en')]]) {
    for (const [key, value] of Object.entries(copy)) {
      assert.equal(/%s|%d|\$\{/.test(value), false, `${lang}.${key} uses a non-fill placeholder`)
      const braces = String(value).match(/\{[^}]*\}/g) || []
      for (const brace of braces) assert.match(brace, /^\{\w+\}$/, `${lang}.${key} malformed placeholder ${brace}`)
    }
  }
})

test('plugin locale cards describe the same product in both languages', () => {
  const zh = JSON.parse(readFileSync(join(root, 'locale/zh.json'), 'utf8'))
  const en = JSON.parse(readFileSync(join(root, 'locale/en.json'), 'utf8'))
  assert.equal(zh.meta.title, 'Kitesurf')
  assert.equal(en.meta.title, 'Kitesurf')
  assert.match(zh.meta.description, /开发者工具/)
  assert.match(en.meta.description, /DevTools/)
  assert.notEqual(zh.meta.description.trim(), '')
  assert.notEqual(en.meta.description.trim(), '')
})
