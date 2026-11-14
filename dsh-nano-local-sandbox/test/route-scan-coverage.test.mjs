import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { contractProblems, PLUGINS as contractPlugins } from '../../scripts/check-feature-contract.mjs'
import { sensitivityProblems } from '../../scripts/check-route-sensitivity.mjs'
import { collectBare, PLUGINS as cleanPlugins } from '../../scripts/check-clean-lib.mjs'
import { SCAN_PLUGINS, scanLocalSandboxSource, scanRoutes } from '../../scripts/route-scan.mjs'
import { readFileSync } from 'node:fs'

const root = join(import.meta.dirname, '..', '..')

test('the live scanners include DNLS, and dropping it fails both route gates', () => {
  const names = new Set(scanRoutes().map((row) => row.plugin))
  assert.equal(names.has('dsh-nano-local-sandbox'), true)
  assert.equal(names.has('dsh-nano-terminal'), true)
  assert.equal(SCAN_PLUGINS.includes('dsh-nano-local-sandbox'), true)
  assert.equal(contractPlugins.includes('dsh-nano-local-sandbox'), true)
  assert.equal(cleanPlugins.includes('dsh-nano-local-sandbox'), true)
  const contract = JSON.parse(readFileSync(join(root, 'security', 'feature-contract.json'), 'utf8'))
  const ledger = JSON.parse(readFileSync(join(root, 'security', 'route-sensitivity.json'), 'utf8'))
  const full = scanRoutes()
  assert.equal(contractProblems(contract, full).length, 0)
  assert.equal(sensitivityProblems(ledger, full).length, 0)
  const without = scanRoutes(SCAN_PLUGINS.filter((plugin) => plugin !== 'dsh-nano-local-sandbox'))
  assert.ok(contractProblems(contract, without).length > 0)
  assert.ok(sensitivityProblems(ledger, without).length > 0)
})

test('an extra DNLS route constant fails the scanner, and a bare import fails clean-lib', () => {
  const source = readFileSync(join(root, 'dsh-nano-local-sandbox', 'src', 'host', 'routes.js'), 'utf8')
  const table = readFileSync(join(root, 'dsh-nano-local-sandbox', 'lib', 'route-table.js'), 'utf8')
  assert.throws(() => scanLocalSandboxSource(`${source}\nexport const EXTRA_ROUTE = '/nano-local-sandbox/extra'\n`, table), /dsh-nano-local-sandbox/)
  const fixture = mkdtempSync(join(tmpdir(), 'dnls-clean-'))
  mkdirSync(join(fixture, 'dsh-nano-local-sandbox', 'lib'), { recursive: true })
  writeFileSync(join(fixture, 'dsh-nano-local-sandbox', 'lib', 'bad.js'), "import 'left-pad'\n")
  const { problems } = collectBare(fixture, ['dsh-nano-local-sandbox'], [])
  assert.equal(problems.length > 0, true)
})
