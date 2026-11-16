// NUE1117-T11: NanoMenu is the host Menu; no self-drawn list.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { capClass, menuHeight, toHostItems } from '../src/menu-model.js'
import { readSrc } from './_lib.mjs'

const MENU = readSrc('menu.js')
const DOM = readSrc('dom.js')

test('menu.js takes Menu from the host primitives', () => {
  assert.match(MENU, /import \{ Menu \} from '@deepseek-ai\/dsh-client-ui-primitives'/)
  assert.match(MENU, /h\(Menu, \{/)
})

test('no self-drawn class names and no own listeners', () => {
  assert.doesNotMatch(MENU, /nano-menu/)
  assert.doesNotMatch(MENU, /addEventListener/)
  assert.doesNotMatch(DOM, /addEventListener/)
})

test('NanoMenu takes no theme / z', () => {
  const params = /export function NanoMenu\(\{([^}]*)\}\)/.exec(MENU)[1]
  assert.doesNotMatch(params, /\btheme\b/)
  assert.doesNotMatch(params, /\bz\b/)
  assert.match(params, /\bportal\b/)
})

test('openNanoMenu: a container means portal:false inside it; direction up maps to side top', () => {
  assert.match(DOM, /portal: container === undefined/)
  assert.match(DOM, /mount\(container \?\? document\.body\)/)
  assert.match(MENU, /side: direction === 'up' \? 'top' : 'bottom'/)
})

test('menuHeight', () => {
  assert.equal(menuHeight([]), 8)
  assert.equal(menuHeight([{ id: 'a' }, { id: 's', separator: true }, { id: 'b' }]), 73)
})

test('rows map to host items, keeping separators and danger', () => {
  assert.deepEqual(toHostItems([
    { id: 'a', label: 'A', run() {} },
    { id: 's', separator: true },
    { id: 'd', label: 'Delete', tone: 'danger', run() {} },
  ]), [
    { id: 'a', label: 'A', icon: undefined, danger: false, disabled: false },
    { type: 'separator', id: 's' },
    { id: 'd', label: 'Delete', icon: undefined, danger: true, disabled: false },
  ])
})

test('maxHeight picks the largest preset not above it', () => {
  assert.equal(capClass(undefined), undefined)
  assert.equal(capClass(140), 'nano-cap-120')
  assert.equal(capClass(176), 'nano-cap-160')
  assert.equal(capClass(50), 'nano-cap-120')
  assert.equal(capClass(9999), 'nano-cap-480')
})
