// NUE1117-T01 / T02 (and T29 in Phase 10): documentation contracts for the
// single UI spec. Run explicitly: node --test test/scripts/nue-docs.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, realpathSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const read = p => readFileSync(join(root, p), 'utf8')
const DESIGN = 'docs/specs/dsh-nano-ui/DESIGN.md'
const README = 'docs/specs/dsh-nano-ui/README.md'

const SECTIONS = ['优先级与豁免', '令牌', '主题', '层级与间距', '弹层承载模型', '组件清单', '宿主接口', '宿主缺口', '检测规则', '豁免登记']
// One name per truth §4.2 row.
const TRUTH_42 = ['Modal', 'RiskConfirmation', 'useModalLayer', 'Menu', 'SegmentedControl', 'Toast', 'Tooltip', 'Switch', 'Button', 'Tag', 'SettingsValueField', 'DisclosureRow', 'relativeTime', 'Icon']
const FORBIDDEN = ['三个插件', '三个 overlay 插件', 'headless 无样式', 'z-index', 'data-nano-theme', '--nano-dlg']
const GAPS = ['层级令牌', 'spacing 令牌', '区域 API', 'TrajectoryToolbar', '云会话 composer 按钮', '云会话标识', '文件树状态钩子']

export function forbiddenHits(text) {
  return FORBIDDEN.filter(word => text.includes(word))
}

test('T01 forbidden-word scan can fail (positive control on the pre-NUE README)', () => {
  const fixture = '三个 overlay 插件共用 … headless 无样式 … z-index:30 … data-nano-theme … --nano-dlg-max'
  assert.ok(forbiddenHits(fixture).length >= 5)
})

test('T01 DESIGN.md carries every fixed section, every truth §4.2 component, U1–U10 and the gap table', () => {
  const text = read(DESIGN)
  for (const name of SECTIONS) assert.match(text, new RegExp(`^## \\d+\\. ${name}`, 'm'), `section ${name}`)
  for (const name of TRUTH_42) assert.ok(text.includes(`\`${name}`), `component ${name}`)
  for (let i = 1; i <= 10; i++) assert.match(text, new RegExp(`\\| U${i} `), `rule U${i}`)
  for (const gap of GAPS) assert.ok(text.includes(gap), `gap ${gap}`)
  assert.ok(text.includes('--dsh-font-family-code'))
})

test('T01 README is an entry page; README and DESIGN.md carry none of the retired contract words', () => {
  const readme = read(README)
  assert.ok(readme.split('\n').length <= 15, 'README stays an entry page')
  assert.doesNotMatch(readme, /^## /m, 'README has no clause sections')
  assert.ok(readme.includes('DESIGN.md') && readme.includes('CHANGELOG'))
  assert.deepEqual(forbiddenHits(readme), [])
  assert.deepEqual(forbiddenHits(read(DESIGN)), [])
})

test('T01 the package README symlink resolves to the same entry page', () => {
  const link = join(root, 'packages/dsh-nano-ui/README.md')
  assert.equal(realpathSync(link), realpathSync(join(root, README)))
})

test('T02 root AGENTS principle names host, nano-ui, nano-ui-exempt and grafting', () => {
  const text = read('AGENTS.md')
  const line = text.split('\n').find(l => l.startsWith('**UI 宿主优先**'))
  assert.ok(line, 'principle line present')
  for (const word of ['宿主', 'nano-ui', 'nano-ui-exempt', '嫁接', 'DESIGN.md']) assert.ok(line.includes(word), word)
})

test('T02 TEMPLATE links DESIGN.md; INTRODUCTION no longer restates the portal token rule', () => {
  assert.ok(read('docs/agents/TEMPLATE.md').includes('docs/specs/dsh-nano-ui/DESIGN.md'))
  const intro = read('INTRODUCTION.md')
  assert.ok(intro.includes('docs/specs/dsh-nano-ui/DESIGN.md'))
  assert.ok(!intro.includes('才到得了弹层'))
})

// Tracked manifests only: untracked trees (context/, build caches) are not shipped.
function packageJsons() {
  return execFileSync('git', ['ls-files', '--', 'package.json', '*/package.json'], { cwd: root, encoding: 'utf8' })
    .split('\n').filter(Boolean).map(p => join(root, p))
}

test('T02 design skill exists and is in no package files list', () => {
  const skill = 'docs/agents/skills/dsh-nano-design/SKILL.md'
  assert.ok(existsSync(join(root, skill)))
  assert.match(read(skill), /^name: dsh-nano-design$/m)
  const pkgs = packageJsons()
  assert.ok(pkgs.length > 5, `scanned ${pkgs.length} package.json files`)
  for (const p of pkgs) {
    const files = JSON.parse(readFileSync(p, 'utf8')).files ?? []
    for (const f of files) assert.ok(!/skills\/dsh-nano-design|docs\/agents/.test(f), `${p} ships ${f}`)
  }
})

// ---- NUE1117-T29 (Phase 10): final documentation sync ----

const CONSUMER_AGENTS = ['dsh-nano-model-selector', 'dsh-nano-explorer-extra', 'dsh-nano-terminal', 'dsh-nano-kitesurf', 'dsh-nano-cloud-session', 'dsh-nano-notepad'].map(d => `${d}/AGENTS.md`)
const STALE_ZH = ['区域收束', '隐藏样式', 'portal 主题', '才到得了弹层']
const STALE_EN = ['regionElement', 'data-nano-theme', 'NP_PORTAL_Z', 'data-dncs-cloud']

export function staleHits(text) {
  return [...STALE_ZH, ...STALE_EN].filter(word => text.includes(word))
}

test('T29 stale-word scan can fail (positive control)', () => {
  const fixture = '区域收束 … 隐藏样式 … portal 主题 … regionElement … data-nano-theme … NP_PORTAL_Z'
  assert.ok(staleHits(fixture).some(w => STALE_ZH.includes(w)))
  assert.ok(staleHits(fixture).some(w => STALE_EN.includes(w)))
})

test('T29 INTRODUCTION and every consumer AGENTS carry no retired UI wording; INTRODUCTION has no nano-ui 0.1.0', () => {
  const docs = ['INTRODUCTION.md', ...CONSUMER_AGENTS]
  assert.equal(docs.length, 7)
  for (const doc of docs) assert.deepEqual(staleHits(read(doc)), [], doc)
  const intro = read('INTRODUCTION.md')
  assert.ok(!intro.split('\n').some(l => l.includes('dsh-nano-ui') && l.includes('0.1.0')), 'nano-ui 0.1.0 in INTRODUCTION')
})

test('T29 DESIGN.md gap table lists all seven §5.1 items as rows', () => {
  const gaps = read(DESIGN).split(/^## 8\./m)[1].split(/^## 9\./m)[0]
  const rows = gaps.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 缺口') && !l.startsWith('|---'))
  for (const gap of GAPS) assert.ok(rows.some(r => r.startsWith(`| ${gap}`)), `gap row ${gap}`)
})

test('T29 every nano-ui-exempt marker has a DESIGN.md §10 row naming its file, and the counts match', async () => {
  const { run } = await import(join(root, 'scripts', 'check-ui-rules.mjs'))
  const markers = run({ root }).findings.filter(f => f.rule === 'U10')
  assert.ok(markers.length > 0, 'U10 found markers')
  const rows = read(DESIGN).split(/^## 10\./m)[1].split('\n').filter(l => l.startsWith('| `'))
  assert.equal(rows.length, markers.length, 'one §10 row per marker')
  for (const m of markers) assert.ok(rows.some(r => r.includes(m.file)), `§10 row for ${m.file}:${m.line}`)
})
