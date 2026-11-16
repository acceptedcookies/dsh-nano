/**
 * WaterLine render test — the `live` indicator regression.
 *
 * Why this exists: `f63f6cf` added `live ? …` inside the gauge but never made
 * `live` a prop of the component, and never touched i18n. The result was a
 * `ReferenceError: live is not defined` thrown the moment the async-compaction
 * history dialog opened — visible in the desktop UI as a bare error string with
 * no context. Nothing in the build catches an undeclared identifier, so the
 * render path itself has to be exercised.
 *
 * The component is pure: it only calls `React.createElement`. Rendering it
 * means calling it with props and walking the returned element tree, so no DOM
 * and no react-dom are needed — `react` is aliased to a minimal createElement
 * stub.
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const require = createRequire(join(root, 'package.json'))

let esbuild = null
try { esbuild = require('esbuild') } catch { /* optional layer: skip below */ }

const COPY = {
  historyFillAtDecision: 'at decision',
  historyLive: 'live',
  historyWaterAria: 'Fill {fill}, buffer line {buffer}, safety line {safety}',
}

/** Bundle the component with `react` replaced by a createElement-only stub. */
async function loadWaterLine() {
  const dir = mkdtempSync(join(tmpdir(), 'dnms-waterline-'))
  const stub = join(dir, 'react-stub.mjs')
  writeFileSync(stub, [
    'export const createElement = (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } })',
    'export const Fragment = Symbol.for("react.fragment")',
  ].join('\n'))
  const out = join(dir, 'water-line.mjs')
  esbuild.buildSync({
    absWorkingDir: root,
    entryPoints: ['src/client/WaterLine.jsx'],
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'transform',
    alias: { react: stub },
    outfile: out,
  })
  const mod = await import(pathToFileURL(out).href)
  return { WaterLine: mod.WaterLine, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

/** Depth-first search for a node carrying a className. */
function findClass(node, className) {
  if (node === null || typeof node !== 'object') return false
  const props = node.props ?? {}
  if (typeof props.className === 'string' && props.className.split(/\s+/).includes(className)) return true
  return (props.children ?? []).flat(Infinity).some(child => findClass(child, className))
}

const baseProps = { fill: 0.5, health: 0.5, buffer: 0.65, safety: 0.9, copy: COPY }

test('WaterLine renders without throwing and honours the live prop', { skip: esbuild === null }, async () => {
  const { WaterLine, cleanup } = await loadWaterLine()
  try {
    // The exact call the dialog makes while an episode is armed/running.
    const liveTree = WaterLine({ ...baseProps, live: true })
    assert.equal(findClass(liveTree, 'nms-hist-live'), true, 'the live indicator must render when live is true')
    assert.equal(findClass(liveTree, 'nms-hist-live-dot'), true, 'the indicator carries its dot')

    // Idle: no indicator.
    const idleTree = WaterLine({ ...baseProps, live: false })
    assert.equal(findClass(idleTree, 'nms-hist-live'), false, 'no indicator while idle')

    // Omitting the prop must be legal (defaults to idle) — this is the shape
    // that used to throw ReferenceError.
    assert.doesNotThrow(() => WaterLine({ ...baseProps }), 'live must have a default, not be a free variable')
  } finally {
    cleanup()
  }
})

test('WaterLine still renders the water axis and track', { skip: esbuild === null }, async () => {
  const { WaterLine, cleanup } = await loadWaterLine()
  try {
    const tree = WaterLine({ ...baseProps })
    assert.equal(findClass(tree, 'nms-hist-axis'), true)
    assert.equal(findClass(tree, 'nms-hist-water-track'), true)
    assert.equal(findClass(tree, 'nms-hist-water-fill'), true)
  } finally {
    cleanup()
  }
})
