// Static checks over the shipped overlay: the bundle patch, the derived files and their recorded inputs.
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { build } from 'esbuild'
import { existsSync, readFileSync } from 'node:fs'
import { isBuiltin } from 'node:module'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const PKG_DIR = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = rel => readFileSync(join(PKG_DIR, rel), 'utf8')
const pkg = JSON.parse(read('package.json'))
const patch = read('cordis.patch.yml')

const REPLACED_ROWS = [
  'session-controller', 'terminal-controller', 'workspace-files', 'api-remotes',
  'ui-conversation', 'ui-sidebar-right', 'ui-sidebar-files', 'ui-sidebar-terminal',
]

test('the bundle patch disables exactly the eight replaced stock rows', () => {
  const disabled = [...patch.matchAll(/^- id: (\S+)\n {2}disabled: true$/gm)].map(m => m[1])
  assert.deepEqual(disabled.sort(), [...REPLACED_ROWS].sort())
})

test('every inserted row names this package or one of its exported subpaths', () => {
  const rows = [...patch.matchAll(/^ {4}- id: (\S+)\n {6}name: (\S+)$/gm)].map(m => ({ id: m[1], name: m[2] }))
  assert.equal(rows.length, 5)
  for (const { id, name } of rows) {
    assert.ok(id.startsWith('nano-cloud-session-host'), id)
    assert.ok(name === pkg.name || name.startsWith(`${pkg.name}/`), name)
    const sub = name === pkg.name ? '.' : `./${name.slice(pkg.name.length + 1)}`
    const target = pkg.exports[sub]
    assert.ok(target !== undefined, `${name} has no export`)
    assert.ok(existsSync(join(PKG_DIR, target)), `${target} missing`)
  }
})

test('the grants config is a quoted !!js expression so YAML keeps it a string', () => {
  assert.match(patch, /externalWorkspaceGrants: !!js "\(\(\) => \{[^"\n]*\}\)\(\)"$/m)
})

test('recorded inputs match the shipped patch and base', () => {
  const inputs = JSON.parse(read('lib/vendor/INPUTS.json'))
  assert.equal(inputs.patch, createHash('sha256').update(readFileSync(join(PKG_DIR, 'upstream', 'native-host.patch'))).digest('hex'))
  assert.equal(inputs.base, read('upstream/BASE').trim())
})

test('host artifacts import only builtins, relative files and declared optional peers', async () => {
  const peers = new Set(Object.keys(pkg.peerDependencies))
  for (const name of peers) assert.equal(pkg.peerDependenciesMeta[name]?.optional, true, `${name} not optional`)
  const entryPoints = ['index.js', ...Object.values(pkg.exports).filter(t => /^\.\/lib\/host-.*\.js$/.test(t))]
  const result = await build({
    absWorkingDir: PKG_DIR, entryPoints, bundle: true, write: false, metafile: true, outdir: 'out',
    platform: 'node', format: 'esm', logLevel: 'silent',
    plugins: [{ name: 'externals', setup(b) { b.onResolve({ filter: /^[^./]/ }, args => ({ path: args.path, external: true })) } }],
  })
  const unknown = new Set()
  for (const input of Object.values(result.metafile.inputs)) {
    for (const { path, external } of input.imports) {
      if (!external || isBuiltin(path)) continue
      const bare = path.startsWith('@') ? path.split('/').slice(0, 2).join('/') : path.split('/')[0]
      if (!peers.has(bare)) unknown.add(path)
    }
  }
  assert.deepEqual([...unknown], [])
})

test('the composite client registers this package and carries no free require call', () => {
  const client = read('lib/client.js')
  assert.ok(client.includes(`window.__ModuleLoader__.load({ id: \`${pkg.name}\``))
  for (const rel of ['lib/client.js', 'lib/client.terminal.js']) {
    const code = read(rel).replace(/`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""')
    assert.doesNotMatch(code, /(?<![\w$.])require\s*\(/, rel)
  }
})

test('the composite settles its parts inside its own entry', () => {
  // The web boot audit awaits entry fibers only; the Remote mounts are an async part.
  assert.match(read('lib/client.js'), /await Promise\.all\(fibers\.map\(\(fiber\) => fiber\.await\(\)\)\)/)
})

test('the client row depends only on the gateway for load order', () => {
  // A replaced part provides services (remote.*, sessions, uiConversation) that stock rows wait on;
  // listing those rows here would make this entry load after them and deadlock the boot.
  assert.deepEqual(pkg.dsh.client.inject, ['@deepseek-ai/dsh-api-gateway'])
  assert.deepEqual(pkg.dsh.client.external, ['@deepseek-ai/dsh-api-gateway/client'])
})
