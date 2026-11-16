// NUE1117-T09: numeric layers live only in layers.js and match DESIGN.md §4.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { join } from 'node:path'
import { LAYER_CSS, NANO_LAYER, NANO_SPACE } from '../src/layers.js'
import { REPO, hits, read, sourceFiles } from './_lib.mjs'

const NUMERIC_Z = /z-index\s*:\s*\d|zIndex/

test('menu outranks the host Modal and the window bands exist', () => {
  assert.ok(NANO_LAYER.menu > 1000)
  assert.equal(NANO_LAYER.window, 1200)
  assert.equal(NANO_LAYER.windowRaised, 1210)
  assert.deepEqual([...NANO_SPACE], [4, 8, 12, 16, 20, 24])
})

test('layers.js emits one custom property per layer and spacing step', () => {
  assert.match(LAYER_CSS, /--nano-layer-menu: 1100;/)
  assert.match(LAYER_CSS, /--nano-layer-window-raised: 1210;/)
  assert.match(LAYER_CSS, /--nano-space-6: 24px;/)
})

test('no numeric z-index / zIndex outside layers.js', () => {
  const files = sourceFiles().filter(({ path }) => !path.endsWith('layers.js'))
  assert.ok(files.length > 0)
  assert.deepEqual(hits(files, NUMERIC_Z), [])
  assert.equal(hits([{ path: 'fixture.js', text: 'a { z-index: 30 }\nstyle.zIndex = 5' }], NUMERIC_Z).length, 2)
})

test('DESIGN.md §4 registers the same values', () => {
  const design = read(join(REPO, 'docs', 'specs', 'dsh-nano-ui', 'DESIGN.md'))
  for (const [name, value] of Object.entries(NANO_LAYER)) {
    assert.match(design, new RegExp(`\\| \`${name}\` \\| ${value} \\|`), `${name} = ${value}`)
  }
})
