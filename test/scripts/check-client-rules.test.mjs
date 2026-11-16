// NUE1117-T05: check-client-rules rule 2 (primitives-catalog) reads the
// catalog, covers every import form, and refuses empty scans.
// Run: node --test test/scripts/check-client-rules.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const repo = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SCRIPT = join(repo, 'scripts', 'check-client-rules.mjs')
const P = '@deepseek-ai/dsh-client-ui-primitives'
const USERS = ['dsh-nano-model-selector', 'dsh-nano-explorer-extra', 'dsh-nano-terminal', 'dsh-nano-kitesurf', 'dsh-nano-cloud-session', 'dsh-nano-notepad']

function fixture({ catalog = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'nue-ccr-'))
  if (catalog) {
    mkdirSync(join(root, 'packages', 'dsh-nano-ui', 'catalog'), { recursive: true })
    writeFileSync(join(root, 'packages', 'dsh-nano-ui', 'catalog', 'primitives.json'), JSON.stringify({ exports: { 'rc.1': ['Button', 'Tooltip'], 'rc.3': ['Button', 'Tooltip', 'OnlyNew'] } }))
  }
  mkdirSync(join(root, 'dsh-nano-model-selector', 'lib'), { recursive: true })
  writeFileSync(join(root, 'dsh-nano-model-selector', 'lib', 'client.js'), `__ModuleLoader__.load("react","react-dom","${P}")`)
  mkdirSync(join(root, 'dsh-nano-model-selector', 'src', 'client'), { recursive: true })
  writeFileSync(join(root, 'dsh-nano-model-selector', 'src', 'client', 'ok.js'), `import { Button, Tooltip as T } from '${P}'\n`)
  return root
}

function put(root, rel, text) {
  mkdirSync(dirname(join(root, rel)), { recursive: true })
  writeFileSync(join(root, rel), text)
}

const run = (root, extra = []) => spawnSync(process.execPath, [SCRIPT, ...(root ? ['--root', root] : []), ...extra], { encoding: 'utf8' })

test('T05 clean fixture passes and reports a non-zero file count', () => {
  const root = fixture()
  const r = run(root)
  assert.equal(r.status, 0, r.stderr)
  const m = r.stdout.match(/primitives-catalog: (\d+) file\(s\), (\d+) primitives name/)
  assert.ok(m && Number(m[1]) > 0 && Number(m[2]) > 0, r.stdout)
  rmSync(root, { recursive: true })
})

const FORMS = {
  named: name => `import { Button, ${name} } from '${P}'\n`,
  multiline: name => `import {\n  Button,\n  ${name},\n} from '${P}'\n`,
  defaultNamed: name => `import Prim, { ${name} } from '${P}'\n`,
  namespaceMember: name => `import * as prim from '${P}'\nconst X = prim.Button ?? prim.${name}\n`,
  namespaceDestructure: name => `import * as prim from '${P}'\nconst { Button, ${name}: Local } = prim\n`,
  requireDestructure: name => `const { Tooltip, ${name} } = require('${P}')\n`,
}

for (const [form, source] of Object.entries(FORMS)) {
  test(`T05 ${form}: a name missing from every release fails with exit 1 and names it`, () => {
    const root = fixture()
    const name = `NotExported${form[0].toUpperCase()}${form.slice(1)}`
    put(root, `dsh-nano-kitesurf/src/client/${form}.js`, source(name))
    const r = run(root)
    assert.equal(r.status, 1, r.stdout)
    assert.match(r.stderr, new RegExp(`"${name}"`))
    rmSync(root, { recursive: true })
  })
}

test('T05 nano-ui src is scanned too', () => {
  const root = fixture()
  put(root, 'packages/dsh-nano-ui/src/x.js', `import { NanoMissing } from '${P}'\n`)
  const r = run(root)
  assert.equal(r.status, 1)
  assert.match(r.stderr, /"NanoMissing"/)
  rmSync(root, { recursive: true })
})

test('T05 a name missing in some releases only warns (exit 0)', () => {
  const root = fixture()
  put(root, 'dsh-nano-notepad/src/client/partial.js', `import { OnlyNew } from '${P}'\n`)
  const r = run(root)
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /WARN .*"OnlyNew" missing in rc\.1/)
  rmSync(root, { recursive: true })
})

test('T05 a missing catalog fails (exit 1), not a warning', () => {
  const root = fixture({ catalog: false })
  const r = run(root)
  assert.equal(r.status, 1)
  assert.match(r.stderr, /primitives-catalog .*missing/)
  rmSync(root, { recursive: true })
})

test('T05 an empty scan fails', () => {
  const root = fixture()
  rmSync(join(root, 'dsh-nano-model-selector', 'src'), { recursive: true })
  const r = run(root)
  assert.equal(r.status, 1)
  assert.match(r.stderr, /scanned 0 files/)
  rmSync(root, { recursive: true })
})

test('T05 without --root the scan roots are the six users plus nano-ui', () => {
  const r = run(null)
  const line = r.stdout.split('\n').find(l => l.startsWith('primitives-catalog: scan roots '))
  assert.ok(line, r.stdout)
  const roots = line.replace('primitives-catalog: scan roots ', '').split(', ')
  assert.deepEqual(roots, [...USERS.map(u => `${u}/src/client`), 'packages/dsh-nano-ui/src'])
  const m = r.stdout.match(/primitives-catalog: (\d+) file\(s\)/)
  assert.ok(m && Number(m[1]) > 0)
})
