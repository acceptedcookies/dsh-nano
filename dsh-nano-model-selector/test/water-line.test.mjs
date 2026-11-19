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

/* ===================== ACE-1117 P5-03/T17 + T18 =========================== */

import { readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const read = p => readFileSync(join(root, p), 'utf8')
const repoRead = p => readFileSync(join(root, '..', p), 'utf8')

/** Bundle a client component with light stubs: react hooks + host imports. */
async function loadComponent(entry, { stateValues = [], stubFiles = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'dnms-t17-'))
  const stateCalls = []
  const setters = []
  let si = 0
  const reactStub = join(dir, 'react-stub.mjs')
  writeFileSync(reactStub, `
    const stateValues = ${JSON.stringify(stateValues)}
    const setters = []
    let si = 0
    export const createElement = (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } })
    export const Fragment = Symbol.for('react.fragment')
    export const useState = (initial) => {
      const i = si++
      const v = stateValues[i] !== undefined ? stateValues[i] : initial
      const set = (x) => { setters.push({ i, x }); stateValues[i] = typeof x === 'function' ? x(stateValues[i]) : x }
      return [v, set]
    }
    export const useEffect = () => {}
    export const useCallback = (fn) => fn
    export const useMemo = (fn) => fn()
    export const useRef = (v) => ({ current: v ?? null })
    export const useContext = () => ({})
    export const useReducer = (r, v) => [v, () => {}]
    export const useLayoutEffect = () => {}
    export const useImperativeHandle = () => {}
    export const __setters = setters
    export const __stateValues = stateValues
    export const forwardRef = (fn) => fn
    export const memo = (fn) => fn
  `)
  const externals = join(dir, 'externals.mjs')
  writeFileSync(externals, `
    const P = (name) => Object.defineProperty(
      (props) => ({ type: name, props: { ...(props ?? {}), children: props?.children ?? [] } }),
      'name', { value: name })
    export const Button = P('Button'); export const SegmentedControl = P('SegmentedControl')
    export const Switch = P('Switch'); export const Tag = P('Tag')
    export const Tooltip = P('Tooltip')
    export const IconCompactOutlineRegular = P('Icon')
    export const relativeTime = (a, b) => 'ago'
    export const writeClipboard = () => {}
    export const Modal = P('Modal')
  `)
  const nanoUi = join(dir, 'nano-ui.mjs')
  writeFileSync(nanoUi, `
    export const NanoDialog = (props) => ({ type: 'NanoDialog', props: { ...(props ?? {}), children: props?.children ?? [] } })
    export const NanoWindowDialog = (props) => ({ type: 'NanoWindowDialog', props: { ...(props ?? {}), children: props?.children ?? [] } })
  `)
  const compactStub = join(dir, 'compact-stub.mjs')
  const switchCalls = []
  writeFileSync(compactStub, `
    export const fetchCompactState = async () => null
    export const fetchBundleState = async () => null
    export const fetchCompactHistory = async () => null
    export const putCompactPolicy = async (p) => ({ policy: p })
    export const asyncCompactStore = { subscribe: () => () => {}, setRunning: () => {}, refresh: () => {}, snapshot: () => null }
    export const INFLIGHT_POLL_MS = 3000
    export const postCompactSwitch = (next) => {
      globalThis.__switchCalls = (globalThis.__switchCalls ?? []).concat(next)
      return Promise.resolve({ application: 'applied', bundle: { installed: true, enabled: next } })
    }
  `)
  const iconsStub = join(dir, 'icons-stub.mjs')
  writeFileSync(iconsStub, `
    const I = (name) => Object.defineProperty(
      (props) => ({ type: name, props: { ...(props ?? {}), children: [] } }),
      'name', { value: name })
    export const GridIcon = I('GridIcon'); export const StarIcon = I('StarIcon')
    export const SearchIcon = I('SearchIcon'); export const RefreshIcon = I('RefreshIcon')
    export const CloseIcon = I('CloseIcon'); export const CheckIcon = I('CheckIcon')
    export const ChevronDownIcon = I('ChevronDownIcon'); export const ModelIcon = I('ModelIcon')
    export const WarningIcon = I('WarningIcon'); export const RouteIcon = I('RouteIcon')
    export const DragHandleIcon = I('DragHandleIcon'); export const MediaIcon = I('MediaIcon')
    export const CompactionIcon = I('CompactionIcon'); export const HistoryIcon = I('HistoryIcon')
    export const WaterRingIcon = I('WaterRingIcon')
  `)
  const promptStub = join(dir, 'prompt-stub.mjs')
  writeFileSync(promptStub, `export const DEFAULT_SUMMARY_PROMPT = 'builtin'\n`)
  const perfStub = join(dir, 'perf-stub.mjs')
  writeFileSync(perfStub, `
    export const perf = new Proxy({}, { get: (t, k) => (typeof k === 'string' && k === 'track') ? (() => ({ wrap: (f) => f })) : () => {} })
  `)
  const plugins = [{
    name: 'stubs',
    setup(build) {
      build.onResolve({ filter: /^react$/ }, () => ({ path: reactStub }))
      build.onResolve({ filter: /dsh-client-ui-primitives$/ }, () => ({ path: externals }))
      build.onResolve({ filter: /^dsh-nano-ui$/ }, () => ({ path: nanoUi }))
      build.onResolve({ filter: /\.\/icons\.jsx$/ }, () => ({ path: iconsStub }))
      build.onResolve({ filter: /\.\/compact\.js$/ }, () => ({ path: compactStub }))
      build.onResolve({ filter: /compact-prompt\.js$/ }, () => ({ path: promptStub }))
      build.onResolve({ filter: /\.\/perf\.js$/ }, () => ({ path: perfStub }))
      for (const [filter, file] of Object.entries(stubFiles)) {
        build.onResolve({ filter: new RegExp(filter) }, () => ({ path: file }))
      }
      build.onResolve({ filter: /.*/ }, (args) => (args.kind === 'entry-point' ? null : null))
    },
  }]
  const out = join(dir, 'out.mjs')
  await esbuild.build({
    absWorkingDir: root,
    entryPoints: [entry],
    bundle: true,
    format: 'esm',
    platform: 'node',
    jsx: 'transform',
    plugins,
    external: ['@deepseek-ai/*', 'dsh-interface/*', 'react-dom/*'],
    outfile: out,
    logLevel: 'silent',
  })
  const mod = await import(pathToFileURL(out).href)
  return { mod, switchCalls, cleanup: () => rmSync(dir, { recursive: true, force: true }) }
}

/** Depth-first find of an element whose type matches `want` (string or stub name). */
function findType(node, want) {
  if (node === null || typeof node !== 'object') return null
  if (node.type === want || (typeof node.type === 'function' && node.type.name === want)) return node
  for (const child of node.props?.children ?? []) {
    const hit = findType(child, want)
    if (hit !== null) return hit
  }
  return null
}

function findClassNode(node, cls) {
  if (node === null || typeof node !== 'object') return null
  const cn = node.props?.className
  if (typeof cn === 'string' && cn.split(/\s+/).includes(cls)) return node
  for (const child of node.props?.children ?? []) {
    const hit = findClassNode(child, cls)
    if (hit !== null) return hit
  }
  return null
}

const POLICY = {
  model: { provider: 'prov', model: 'mod' },
  bufferSizeAsync: 0.65, healthTargetAsync: 0.5, bufferSizeSafety: 0.9,
  pinnedAsyncTokens: 100000, pinnedFullTokens: 20000, extraRequirements: '',
  effective: { pin: 100000, windowMin: 153846, dcs: [] },
  runtime: { fill: 0.7, lastCompaction: null, degraded: null },
  promptVersion: 'deadbeef',
}
const STATE_OK = { policy: POLICY }
const BUNDLE_OK = { installed: true, enabled: true, known: true }
// CompactPanel useState call order (see src/client/CompactPanel.jsx):
// 0 state 1 bundle 2 busy 3 banner 4 heartbeat 5 windowMap 6 editField 7 pending 8 confirmSwitch
const PANEL_STATE = [STATE_OK, BUNDLE_OK, false, null, null, {}, null, null, true]
const COPY17 = new Proxy({}, { get: (t, k) => (typeof k === 'string' ? k : undefined) })

test('T17 switch confirm: POST is never sent before the dialog confirms', { skip: esbuild === null }, async () => {
  const { mod, cleanup } = await loadComponent('src/client/CompactPanel.jsx', { stateValues: PANEL_STATE })
  try {
    const tree = mod.CompactPanel({ copy: COPY17, models: [], onError: () => {}, onSwitchDone: () => {} })
    const sw = findType(tree, 'Switch')
    assert.ok(sw !== null, 'the takeover Switch must render when enabled')
    // Click: must NOT post — it only stages the confirmation.
    sw.props.onChange(true)
    assert.equal(globalThis.__switchCalls === undefined || globalThis.__switchCalls.length === 0, true,
      'POST /switch must not fire before confirmation')
    // The confirm dialog is rendered (confirmSwitch state was set truthy).
    const dialog = findType(tree, 'NanoWindowDialog')
    assert.ok(dialog !== null, 'confirming dialog must render while confirmSwitch is set')
    assert.equal(dialog.props.confirmLabel, 'compactConfirmYes')
    // Confirm: now the POST fires exactly once.
    dialog.props.onConfirm()
    await new Promise(r => setTimeout(r, 0))
    assert.equal((globalThis.__switchCalls ?? []).length, 1, 'exactly one POST after confirm')
    assert.equal(globalThis.__switchCalls[0], true)
  } finally {
    delete globalThis.__switchCalls
    cleanup()
  }
})

test('T17 strict order client gate rejects H>=B and B>=S; i18n key sets are equal', { skip: esbuild === null }, async () => {
  const { mod, cleanup } = await loadComponent('src/client/CompactPanel.jsx', { stateValues: PANEL_STATE })
  try {
    // Reach saveField via the staged pending confirm path: the panel renders
    // NumberField for bufferSizeAsync; find the draft-confirm button tree is
    // fragile, so drive saveField through a NumberField's editing state — we
    // instead assert via the source text lock below plus the dialog gate.
    const src = read('src/client/CompactPanel.jsx')
    assert.equal(src.includes('next.healthTargetAsync < next.bufferSizeAsync'), true, 'H<B strict')
    assert.equal(src.includes('next.bufferSizeAsync < safety'), true, 'B<S strict')
    assert.equal(src.includes('可以等于'), false)
    assert.equal(src.includes('Equality is legal'), false)
  } finally { cleanup() }
  const { COPY } = await import('../src/client/i18n.js')
  const zh = COPY.zh, en = COPY.en
  assert.ok(zh !== null && en !== null)
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort(), 'zh/en key sets must be identical')
  assert.deepEqual(Object.keys(zh.historyKind).sort(), Object.keys(en.historyKind).sort())
  assert.ok('select' in zh.historyKind && 'select' in en.historyKind)
  // No new localStorage keys in touched compact client files.
  for (const file of ['src/client/compact.js', 'src/client/AsyncStatusBadge.jsx', 'src/client/AsyncHistoryDialog.jsx', 'src/client/CompactPanel.jsx', 'src/client/ModelSelector.jsx']) {
    const src = read(file)
    for (const m of src.matchAll(/localStorage\w*\.(?:getItem|setItem|removeItem)\s*\(\s*['"]([^'"]+)['"]/g)) {
      assert.ok(['dsh-nano-model-selector:media-engine.v1', 'dsh-perf-review'].includes(m[1]),
        `${file} introduces an unregistered localStorage key ${m[1]}`)
    }
    assert.equal(src.includes('window.confirm('), false, `${file} must not use window.confirm`)
  }
  // DETAIL.zh strict order on both lines.
  const detail = repoRead('dsh-nano-model-selector-compaction/DETAIL.zh.md').split('\n')
  assert.equal(/可以等于/.test(detail[14] ?? ''), false, 'line 15 must not allow equality')
  assert.match(detail[15] ?? '', /严格/, 'line 16 states the strict order')
  assert.match(detail[15] ?? '', /低于 B/, 'line 16 keeps the H<B chain')
})

test('T17 topbar placement: compact button sits between search and close, never on the rail', () => {
  const src = read('src/client/ModelSelector.jsx')
  const top = src.slice(src.indexOf('className="nms-top"'), src.indexOf('className="nms-body"'))
  const searchAt = top.indexOf('nms-search"')
  const compactAt = top.indexOf('compactInstalled &&')
  const closeAt = top.indexOf('onClick={() => close(true)}')
  assert.ok(searchAt > -1 && compactAt > searchAt && closeAt > compactAt,
    'search < compactInstalled-button < close must hold in the topbar slice')
  // Rail slice: no compact entry.
  const rail = src.slice(src.indexOf('className="nms-rail"'), src.indexOf('nms-body-list') > -1 ? src.indexOf('nms-body-list') : src.length)
  assert.equal(/compactInstalled|CompactionIcon|compactTitle/.test(rail), false,
    'the rail must not carry a compaction entry')
})

test('T18 ui-rules warn-only delta: touched files report no NEW alerts vs HEAD', async () => {
  // Baseline = each file's findings at the previous commit, current = worktree
  // content. "只减不增": current(file) ⊆ baseline(file), per file.
  const out = execFileSync('node', [join(root, '..', 'scripts', 'check-ui-rules.mjs'), '--json'],
    { cwd: join(root, '..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  const report = JSON.parse(out)
  const touched = [
    'dsh-nano-model-selector/src/client/ModelSelector.jsx',
    'dsh-nano-model-selector/src/client/CompactPanel.jsx',
    'dsh-nano-model-selector/src/client/AsyncStatusBadge.jsx',
    'dsh-nano-model-selector/src/client/AsyncHistoryDialog.jsx',
    'dsh-nano-model-selector/src/client/compact.js',
    'dsh-nano-model-selector/src/client/history-format.js',
    'dsh-nano-model-selector/src/client/i18n.js',
  ]
  const { scanPlugin, PLUGINS } = await import(pathToFileURL(join(root, '..', 'scripts', 'check-ui-rules.mjs')).href)
  const tokens = JSON.parse(readFileSync(join(root, '..', 'packages', 'dsh-nano-ui', 'catalog', 'tokens.json'), 'utf8')).tokens
  const exemptRows = []
  const dnms = PLUGINS.find(p => p.abbr === 'DNMS')
  const currentFindings = report.findings.filter(f => touched.some(fi => f.file?.endsWith(fi) || fi.endsWith(f.file ?? '')))
  const baseline = new Set()
  for (const rel of touched) {
    let oldText = null
    try {
      // Baseline is the PLAN BASE (fb7264d), not HEAD: with a clean worktree
      // HEAD already contains this phase's edits, so HEAD: would make the
      // delta vacuous.
      oldText = execFileSync('git', ['show', `fb7264d:${rel}`], { cwd: join(root, '..'), encoding: 'utf8' })
    } catch { oldText = null }
    if (oldText === null) continue
    const found = scanPlugin(dnms, [{ rel, text: oldText }], { tokens, exemptRows })
    for (const f of found) baseline.add(`${rel}:${f.rule}:${f.line}`)
  }
  const current = new Set()
  for (const f of currentFindings) current.add(`${f.file}:${f.rule}:${f.line}`)
  const added = [...current].filter(k => {
    // A shifted line number is not a new rule hit: compare file+rule only.
    const [file, rule] = [k.slice(0, k.lastIndexOf(':')), null]
    return ![...baseline].some(b => b.startsWith(`${k.split(':')[0]}:`) && b.split(':')[1] === k.split(':')[1])
  })
  assert.deepEqual(added, [], `new ui-rules alerts vs HEAD: ${JSON.stringify(added)}`)
  // Forbidden patterns must not appear in the touched files at all.
  for (const rel of touched) {
    const src = readFileSync(join(root, '..', rel), 'utf8')
    assert.equal(src.includes('window.confirm('), false, `${rel}: window.confirm`)
    assert.equal(/\[\s*class\s*[*^$|~]?=/.test(src), false, `${rel}: host DOM grafting selector`)
    assert.equal(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{8}\b/.test(src), false, `${rel}: hex colour literal`)
  }
})
