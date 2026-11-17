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
