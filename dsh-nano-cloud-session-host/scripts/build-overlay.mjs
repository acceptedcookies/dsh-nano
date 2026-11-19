#!/usr/bin/env node
/**
 * Derive the [DNCSH] overlay artifacts from a built deepseek-harness tree.
 *
 * Usage: node scripts/build-overlay.mjs --source <harness checkout>
 *
 * The source tree must be the upstream commit named in upstream/BASE with
 * upstream/native-host.patch applied and `pnpm run build:artifacts` (or the
 * per-package tsc + tsdown steps) completed. This script never writes into the
 * source tree; it only reads its built lib/ files and writes this package's
 * lib/vendor/ and lib/client*.js.
 *
 * Host faces: lib/index.js + lib/typert.host.js of the three replaced API
 * packages are copied verbatim, except that imports of a replaced package are
 * rewritten to the vendored copy. Every remaining bare specifier must be a
 * declared (optional) peer: the rc.5 profile resolver routes a linked
 * plugin's peer-declared bare imports to the running installation.
 *
 * Browser face: the replaced client bundles are re-wrapped as parts of ONE
 * module registration owned by this package (the client module registry maps
 * one Loader row to one package root), and their module-table `require` is
 * renamed so the shipped file carries no literal `require("<pkg>")` call.
 */
import { build, transform } from 'esbuild'
import { createHash } from 'node:crypto'
import { isBuiltin } from 'node:module'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const PKG_DIR = join(HERE, '..')
const PKG = JSON.parse(readFileSync(join(PKG_DIR, 'package.json'), 'utf8'))
const OWNER = PKG.name
const REQUIRE_ALIAS = '__dshModuleRequire'
const SETTINGS_ROW_ID = 'nano-cloud-session-host'

const argv = process.argv.slice(2)
const sourceArg = argv.includes('--source') ? argv[argv.indexOf('--source') + 1] : undefined
if (sourceArg === undefined) {
  console.error('usage: node scripts/build-overlay.mjs --source <patched and built deepseek-harness checkout>')
  process.exit(2)
}
const SOURCE = resolve(sourceArg)

/** Replaced host packages: vendored directory name -> upstream package dir. */
export const HOST_PACKAGES = {
  'session-controller': { dir: 'packages/api/session-controller', name: '@deepseek-ai/dsh-api-session-controller' },
  'terminal-controller': { dir: 'packages/api/terminal-controller', name: '@deepseek-ai/dsh-api-terminal-controller' },
  'workspace-files': { dir: 'packages/api/workspace-files', name: '@deepseek-ai/dsh-api-workspace-files' },
}

/** Replaced client bundles, in registration order. */
export const CLIENT_PARTS = [
  { id: '@deepseek-ai/dsh-api-remotes', file: 'packages/api/remotes/lib/client.js' },
  { id: '@deepseek-ai/dsh-api-session-controller', file: 'packages/api/session-controller/lib/client.js' },
  { id: '@deepseek-ai/dsh-api-terminal-controller', file: 'packages/api/terminal-controller/lib/client.js' },
  { id: '@deepseek-ai/dsh-api-workspace-files', file: 'packages/api/workspace-files/lib/client.js' },
  { id: '@deepseek-ai/dsh-client-ui-conversation', file: 'packages/client/ui-conversation/lib/client.js' },
  { id: '@deepseek-ai/dsh-client-ui-sidebar-right', file: 'packages/client/ui-sidebar-right/lib/client.js' },
  { id: '@deepseek-ai/dsh-client-ui-sidebar-files', file: 'packages/client/ui-sidebar-files/lib/client.js' },
  { id: '@deepseek-ai/dsh-client-ui-sidebar-terminal', file: 'packages/client/ui-sidebar-terminal/lib/client.js' },
]
const CHUNKS = [
  { owner: '@deepseek-ai/dsh-client-ui-sidebar-terminal', file: 'packages/client/ui-sidebar-terminal/lib/client.terminal.js', name: 'client.terminal.js' },
]

/** Module-table words the browser shell seeds (packages/client/web/src/platform.ts). */
const PLATFORM_MODULES = [
  'react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', '@deepseek-ai/cordis', 'zod', '@tanstack/react-virtual',
  '@deepseek-ai/dsh-client-store', '@deepseek-ai/dsh-client-ui-slots', '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-dockkit',
]

function fail(message) {
  console.error(`build-overlay: ${message}`)
  process.exit(1)
}

function read(rel) {
  const path = join(SOURCE, rel)
  if (!existsSync(path)) fail(`missing ${rel} in --source; build the patched tree first`)
  return readFileSync(path, 'utf8')
}

const sha = text => createHash('sha256').update(text).digest('hex')

/** Bare package name of a specifier, or undefined for node:/relative ones. */
export function bareName(spec) {
  if (spec.startsWith('node:') || spec.startsWith('.') || spec.startsWith('/')) return undefined
  const parts = spec.split('/')
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

/** Literal runtime requires esbuild's import graph does not see (lazy and createRequire loads). */
const LITERAL_REQUIRE_RE = /\b(?:createLazyRequire|__require|createRequire\(import\.meta\.url\))\(\s*["']([^"']+)["']/g

/** Module specifiers a file really imports (string contents never count). */
async function importSpecifiers(path) {
  const result = await build({
    entryPoints: [path],
    bundle: true,
    write: false,
    metafile: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
    plugins: [{
      name: 'externalize-all',
      setup(b) {
        b.onResolve({ filter: /.*/ }, args => (args.kind === 'entry-point' ? undefined : { path: args.path, external: true }))
      },
    }],
  })
  return Object.values(result.metafile.inputs).flatMap(input => input.imports.map(entry => entry.path))
}

// ---- host faces ---------------------------------------------------------------
const vendorRoot = join(PKG_DIR, 'lib', 'vendor')
rmSync(vendorRoot, { recursive: true, force: true })
const replacedByName = new Map(Object.entries(HOST_PACKAGES).map(([key, value]) => [value.name, key]))
const bare = new Set()
const inputs = {}
for (const [key, { dir }] of Object.entries(HOST_PACKAGES)) {
  for (const file of ['index.js', 'typert.host.js']) {
    const rel = `${dir}/lib/${file}`
    let text = read(rel)
    inputs[rel] = sha(text)
    // Mirror the upstream package layout (<pkg>/lib/*.js beside <pkg>/package.json)
    // so the bundles' own `createRequire(import.meta.url)("../package.json")` holds.
    const outDir = join(vendorRoot, key, 'lib')
    for (const match of text.matchAll(LITERAL_REQUIRE_RE)) {
      const spec = match[1]
      if (spec === '../package.json') continue
      if (spec.startsWith('.')) fail(`${rel} requires relative ${spec} at runtime; vendor its target too`)
      if (isBuiltin(spec)) continue
      bare.add(bareName(spec))
    }
    for (const spec of await importSpecifiers(join(SOURCE, rel))) {
      if (spec.startsWith('.')) fail(`${rel} imports relative ${spec}; vendor its target too`)
      const replaced = replacedByName.get(spec)
      if (replaced !== undefined) {
        const target = relative(outDir, join(vendorRoot, replaced, 'lib', 'index.js')).replace(/^(?!\.)/, './')
        const pattern = new RegExp(`(\\bfrom\\s*|\\bimport\\s*\\(\\s*)(["'])${spec.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}\\2`, 'g')
        const before = text
        text = text.replace(pattern, (_whole, head, quote) => `${head}${quote}${target}${quote}`)
        if (text === before) fail(`${rel}: import of ${spec} found by esbuild but not rewritten`)
        continue
      }
      if (replacedByName.has(bareName(spec))) fail(`${rel} imports subpath ${spec} of a replaced package; map it explicitly`)
      const name = bareName(spec)
      if (name !== undefined) bare.add(name)
    }
    mkdirSync(outDir, { recursive: true })
    writeFileSync(join(outDir, file), text)
  }
  // Only `version` is read at runtime; no name/exports, so the directory is not a
  // package scope of its own for resolution, and no peers, so bare imports keep
  // walking up to this package's peer declarations.
  const upstreamManifest = JSON.parse(read(`${dir}/package.json`))
  writeFileSync(join(vendorRoot, key, 'package.json'), JSON.stringify({ private: true, type: 'module', version: upstreamManifest.version }, null, 2) + '\n')
}
for (const file of ['index.js', 'lib/host-session-controller.js', 'lib/host-terminal-controller.js', 'lib/host-workspace-files.js', 'lib/host-remotes.js']) {
  for (const spec of await importSpecifiers(join(PKG_DIR, file))) {
    if (spec.startsWith('./vendor/') || spec.startsWith('../')) continue
    const name = bareName(spec)
    if (name !== undefined) bare.add(name)
  }
}
const declared = new Set(Object.keys(PKG.peerDependencies ?? {}))
const missing = [...bare].filter(name => !declared.has(name)).sort()
const unused = [...declared].filter(name => !bare.has(name)).sort()
if (missing.length > 0 || unused.length > 0) {
  fail(`peerDependencies drift — add: [${missing.join(', ')}] remove: [${unused.join(', ')}] (each as "0.2.2-rc.5"-compatible optional peer)`)
}

// ---- browser face ------------------------------------------------------------
const HEAD_RE = /^\s*window\.__ModuleLoader__\.load\(\{id:`([^`]+)`,(?:chunk:`([^`]+)`,)?factory:require=>\{/
const TAIL_RE = /\}\}\);\s*(?:\/\/# sourceMappingURL=\S+\s*)?$/

/** Strip one bundle's module-loader envelope; the body ends with `return module.exports`. */
function factoryBody(rel, expectedId, expectedChunk) {
  const text = read(rel)
  inputs[rel] = sha(text)
  const head = text.match(HEAD_RE)
  if (head === null || head[1] !== expectedId || head[2] !== expectedChunk) fail(`${rel}: unexpected module-loader envelope`)
  const tail = text.match(TAIL_RE)
  if (tail === null) fail(`${rel}: unexpected module-loader tail`)
  return text.slice(head[0].length, tail.index)
}

const parts = CLIENT_PARTS.map(({ id, file }) => {
  let body = factoryBody(file, id)
  if (id === '@deepseek-ai/dsh-client-ui-conversation') {
    // Browser preferences read the Host entry that owns them; the stock
    // `ui-conversation` row is disabled, so this package's root row owns them.
    const from = 'const CONVERSATION_SETTINGS_NAMESPACE=`ui-conversation`;'
    if (body.split(from).length !== 2) fail(`${file}: CONVERSATION_SETTINGS_NAMESPACE literal not found exactly once`)
    body = body.replace(from, `const CONVERSATION_SETTINGS_NAMESPACE=\`${SETTINGS_ROW_ID}\`;`)
  }
  return { id, body }
})

const externalEntry = join(SOURCE, 'packages/client/ui-chat/src/client/conversation-nodes/external.ts')
if (!existsSync(externalEntry)) fail('missing ui-chat external conversation node source')
inputs['packages/client/ui-chat/src/client/conversation-nodes/external.ts'] = sha(readFileSync(externalEntry, 'utf8'))
const externalNode = await build({
  stdin: {
    contents: `import { registerExternalAssistantConversationNode } from ${JSON.stringify(externalEntry)}
export const inject = ['uiConversation']
export function apply(ctx) { registerExternalAssistantConversationNode(ctx) }
`,
    resolveDir: dirname(externalEntry),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: PLATFORM_MODULES,
  logLevel: 'error',
})
const externalBody = `var module={exports:{}};var exports=module.exports;${externalNode.outputFiles[0].text}\nreturn module.exports`
parts.push({ id: `${OWNER}/external-conversation-node`, body: externalBody })

const composite = `window.__ModuleLoader__.load({id:\`${OWNER}\`,factory:${REQUIRE_ALIAS}=>{
const parts=[
${parts.map(({ id, body }) => `[${JSON.stringify(id)},(()=>{${body}\n})()]`).join(',\n')}
];
return {
  name: ${JSON.stringify(OWNER)},
  async apply(ctx) {
    // The Loader's boot audit awaits entry fibers only; an async part (the Remote mounts) must settle inside this entry.
    // A part still waiting on a service has no lifecycle work, so its await() returns at once.
    const fibers = parts.map(([name, part]) => ctx.plugin({ name, inject: part.inject, Config: part.Config, apply: part.apply }))
    await Promise.all(fibers.map(fiber => fiber.await()))
  },
}
}});
`

/** Rename every free `require` to the factory parameter; strings stay byte-identical. */
async function renameRequire(code) {
  const out = await transform(code, { define: { require: REQUIRE_ALIAS }, target: 'es2022', legalComments: 'none', logLevel: 'error' })
  if (/(?<![\w$.])require\s*\(/.test(out.code.replace(/`(?:\\[\s\S]|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""'))) {
    fail('a free require( survived the rename')
  }
  return out.code
}

const banner = `/* Generated by dsh-nano-cloud-session-host/scripts/build-overlay.mjs from ${readFileSync(join(PKG_DIR, 'upstream', 'BASE'), 'utf8').trim()} + upstream/native-host.patch — do not edit. */\n`
writeFileSync(join(PKG_DIR, 'lib', 'client.js'), banner + await renameRequire(composite))

for (const { owner, file, name } of CHUNKS) {
  const body = factoryBody(file, owner, name)
  const chunk = `window.__ModuleLoader__.load({id:\`${OWNER}\`,chunk:\`${name}\`,factory:${REQUIRE_ALIAS}=>{${body}\n}});\n`
  writeFileSync(join(PKG_DIR, 'lib', name), banner + await renameRequire(chunk))
}

writeFileSync(join(PKG_DIR, 'lib', 'vendor', 'INPUTS.json'), JSON.stringify({
  base: readFileSync(join(PKG_DIR, 'upstream', 'BASE'), 'utf8').trim(),
  patch: sha(readFileSync(join(PKG_DIR, 'upstream', 'native-host.patch'), 'utf8')),
  inputs: Object.fromEntries(Object.entries(inputs).sort()),
}, null, 2) + '\n')
console.log(`build-overlay OK: ${Object.keys(HOST_PACKAGES).length} host faces, ${parts.length} client parts, ${CHUNKS.length} chunk(s)`)
