// NUE1117-T07: check-ui-rules warns for every rule, never fails on findings,
// and crashes loudly. Run: node --test test/scripts/check-ui-rules.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRIPT = join(repo, 'scripts', 'check-ui-rules.mjs')
const RULES = ['U1', 'U2', 'U3', 'U4', 'U5', 'U6', 'U8', 'U9', 'U10']
const { scanPlugin } = await import(pathToFileURL(SCRIPT).href)

const VIOLATIONS = `
const STYLES = \`
.nks-switch{color:var(--dsw-alias-ok)}
.nks-dead{color:var(--dsw-not-a-token)}
.nks-box{z-index:30}
[class*="_toolbar_"]{display:none}
[class *= "_toolbar_"]{display:none}
[ class*= "_toolbar_"]{display:none}
[class^="_toolbar_"]{display:none}
[class$="_toolbar_"]{display:none}
[CLASS|="_toolbar_"]{display:none}
\`
// nano-ui-exempt: fixture marker
export const view = () => [
  h('button', { className: 'nks-switch nks-box' }, '⚙'),
  h('span', { className: 'nks-ghost' }),
]
`

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'nue-cur-'))
  mkdirSync(join(root, 'packages', 'dsh-nano-ui', 'catalog'), { recursive: true })
  writeFileSync(join(root, 'packages', 'dsh-nano-ui', 'catalog', 'tokens.json'), JSON.stringify({ tokens: { '--dsw-alias-ok': { declared: true, light: '#fff', dark: '#000' } } }))
  mkdirSync(join(root, 'docs', 'specs', 'dsh-nano-ui'), { recursive: true })
  writeFileSync(join(root, 'docs', 'specs', 'dsh-nano-ui', 'DESIGN.md'), '# x\n\n## 10. 豁免登记\n\n| 位置 | 缺口说明 |\n|---|---|\n')
  mkdirSync(join(root, 'dsh-nano-kitesurf', 'src', 'client'), { recursive: true })
  writeFileSync(join(root, 'dsh-nano-kitesurf', 'src', 'client', 'index.js'), VIOLATIONS)
  return root
}

const run = args => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })

test('T07 every rule fires on the violation fixture and the exit code stays 0', () => {
  const root = fixture()
  const json = run(['--root', root, '--plugin', 'DNK', '--json'])
  assert.equal(json.status, 0, json.stderr)
  const result = JSON.parse(json.stdout)
  assert.ok(result.files > 0)
  for (const rule of RULES) assert.ok(result.plugins.DNK.counts[rule] > 0, `${rule} did not fire`)
  const plain = run(['--root', root, '--plugin', 'dsh-nano-kitesurf'])
  assert.equal(plain.status, 0)
  for (const rule of RULES) assert.match(plain.stdout, new RegExp(`WARN  ${rule} `))
  assert.match(plain.stdout, /U7: 见 scripts\/check-client-rules\.mjs/)
  assert.match(plain.stdout, /--dsw-not-a-token/)
  assert.match(plain.stdout, /未在 DESIGN\.md §10 登记/)
  rmSync(root, { recursive: true })
})

test('T07 a crash (no catalog) exits non-zero', () => {
  const root = fixture()
  rmSync(join(root, 'packages'), { recursive: true })
  const r = run(['--root', root])
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /crashed/)
  rmSync(root, { recursive: true })
})

test('T07 an unknown plugin is a crash, not an empty pass', () => {
  const r = run(['--plugin', 'nope'])
  assert.notEqual(r.status, 0)
})

test('T07 the real repo scan covers files and exits 0', () => {
  const r = run(['--json'])
  assert.equal(r.status, 0, r.stderr)
  const result = JSON.parse(r.stdout)
  assert.ok(result.files > 0)
  assert.deepEqual(Object.keys(result.plugins), ['DNMS', 'DNEE', 'DNT', 'DNK', 'DNCS', 'DNN', 'nano-ui'])
})

test('T07 check-ui-rules is not a test-all gate', () => {
  assert.equal(readFileSync(join(repo, 'scripts', 'test-all.mjs'), 'utf8').includes('check-ui-rules'), false)
})

const DNK = { abbr: 'DNK', prefixes: ['nks-'] }
const scan = text => scanPlugin(DNK, [{ rel: 'probe.js', text }], { tokens: {}, exemptRows: [] })

test('T07 U5 catches every spelling of a class attribute selector', () => {
  const selectors = [
    '[class*="a"]',
    '[class *= "a"]',
    '[ class*= "a"]',
    '[class ^= "a"]',
    '[class^="a"]',
    '[class$="a"]',
    '[class~="a"]',
    '[class|="a"]',
    '[class="a"]',
    '[CLASS*="a"]',
  ]
  const text = selectors.map(s => `.probe ${s} { display: none }`).join('\n')
  const hits = scan(text).filter(f => f.rule === 'U5')
  assert.deepEqual(hits.map(f => f.line), selectors.map((_, i) => i + 1), 'every spelling fires on its own line')
})

test('T07 U8 counts a template-built class family as referenced', () => {
  const text = [
    '.nks-cap-120 { max-height: 120px; }',
    '.nks-dead { color: red; }',
    'const capClass = cap => `nks-cap-${cap}`',
  ].join('\n')
  const dead = scan(text).filter(f => f.rule === 'U8').map(f => f.detail)
  assert.deepEqual(dead, ['.nks-dead 只在样式中定义'], 'only the genuinely unreferenced class is reported')
})

test('T07 U9 accepts classes defined inside compound and element-qualified selectors', () => {
  const text = [
    '.nks-action.nks-danger { color: red; }',
    '.nks-host button.nks-chrome-close { color: red; }',
    "export const view = () => h('button', { className: 'nks-action nks-danger nks-chrome-close nks-ghost' })",
  ].join('\n')
  const undefinedClasses = scan(text).filter(f => f.rule === 'U9').map(f => f.detail)
  assert.deepEqual(undefinedClasses, ['nks-ghost 没有样式定义'])
})
