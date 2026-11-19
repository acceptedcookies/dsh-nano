#!/usr/bin/env node
/**
 * Clean-lib gate (T-O-13 / P1-04): the runtime may only resolve `node:*`
 * builtins and relative `./`/`../` imports. Any bare package specifier left in
 * a shipped artifact would fail at runtime — the dev instance copies lib/ but
 * not node_modules, and a tarball cannot resolve `file:` dependencies.
 *
 * `node --check` is NOT sufficient: it parses but never resolves specifiers.
 * This script scans the emitted bundles for bare `import/export ... from`,
 * side-effect `import '<pkg>'`, dynamic `import('<pkg>')`, and `require('<pkg>')`.
 *
 * Scope: each plugin's lib/*.js (host ESM bundles + route-guard bundles +
 * shipped sources like lib/host-media.js) plus the unbundled host index.js
 * (notepad, model-selector). The IIFE lib/client.js bundles carry no static
 * imports, but they are scanned anyway — a bare specifier is illegal anywhere.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join, relative } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')

// DEPRECATED 2026-11-12: dsh-nano-shared-workspace retired to deprecated/;
// its lib/ is archived, not shipped, so it is no longer scanned. See
// deprecated/README.md.
export const PLUGINS = [
  'dsh-nano-notepad',
  'dsh-nano-explorer-extra',
  'dsh-nano-model-selector',
  'dsh-nano-model-selector-compaction',
  'dsh-nano-kitesurf',
  'dsh-nano-local-sandbox',
  'dsh-nano-terminal',
  'dsh-nano-cloud-session',   // P5-02: DNCS was unscanned (coverage gap)
  'dsh-nano-cloud-session-host',
]

/** Plugins whose host entry is the unbundled index.js (also a runtime file). */
export const UNBUNDLED_INDEX = ['dsh-nano-notepad', 'dsh-nano-model-selector', 'dsh-nano-model-selector-compaction', 'dsh-nano-kitesurf', 'dsh-nano-local-sandbox', 'dsh-nano-terminal', 'dsh-nano-cloud-session', 'dsh-nano-cloud-session-host']

/**
 * Packages whose shipped lib/ legally carries bare `@deepseek-ai/*` specifiers
 * resolved by the host's own dependency tree. The vendored dsh-compaction
 * seam (QNA R-16) imports only @deepseek-ai/cordis, which the profile resolves
 * via its hoisted runtime node_modules. dsh-nano-model-selector-compaction
 * additionally probes @deepseek-ai/dsh-compaction via a fail-soft dynamic
 * import() (vendored fallback when the host does not expose it). Flag anything
 * else.
 */
export const HOST_RESOLVED_SPECIFIERS = new Set(['@deepseek-ai/cordis', '@deepseek-ai/dsh-compaction'])

/** Directories under lib/ whose artifacts are NOT host-runnable code and are
 *  skipped by the bare-specifier scan. DNN's lib/fx/ ships the fx wasm runtime —
 *  its optional native-accel candidates (@libfx/libfx-<plat>) are lazy probe
 *  imports that the wasm layer catches when absent (wasm is the real artifact).
 */
/**
 * Bare names a plugin declares as optional peers. The rc.5 profile resolver
 * routes a linked plugin's peer-declared bare imports to the running
 * installation, so those resolve at runtime (DNCSH vendored host faces).
 * A specifier's package name is its first segment, or first two when scoped.
 */
export function optionalPeers(dir) {
  const file = join(dir, 'package.json')
  if (!existsSync(file)) return new Set()
  const pkg = JSON.parse(readFileSync(file, 'utf8'))
  return new Set(Object.keys(pkg.peerDependencies ?? {}).filter(name => pkg.peerDependenciesMeta?.[name]?.optional === true))
}

const packageName = spec => spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/')

export const SKIP_LIB_SUBDIRS = new Set(['lib/fx'])

/**
 * Strip comments so JSDoc `import('pkg').Type` annotations and commented-out
 * imports are not mistaken for real specifiers. Block comments are removed
 * wholesale; line comments are removed only when `//` starts the line or
 * follows whitespace — so a `//` inside a string literal (e.g. 'a://b') or a
 * regex does not eat real code.
 */
function stripComments(text) {
  const noBlocks = text.replace(/\/\*[\s\S]*?\*\//g, match => match.replace(/[^\n]/g, ' '))
  return noBlocks.split('\n').map(line => {
    const idx = line.search(/(^|\s)\/\//)
    return idx === -1 ? line : line.slice(0, idx)
  }).join('\n')
}

/**
 * Every static/dynamic specifier in a JS source, with its 1-based line.
 * @returns {{spec: string, line: number}[]}
 */
function specifiers(text) {
  const clean = stripComments(text)
  const out = []
  const patterns = [
    /(?:import|export)\s+[^'";]*?\bfrom\s*['"]([^'"]+)['"]/g, // import ... from / export ... from
    /\bimport\s*['"]([^'"]+)['"]/g,                           // side-effect import
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,                 // dynamic import('...')
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,                // require('...')
  ]
  for (const re of patterns) {
    for (const match of clean.matchAll(re)) {
      out.push({ spec: match[1], line: clean.slice(0, match.index).split('\n').length })
    }
  }
  return out
}

/** A specifier the runtime cannot resolve: not node:*, not ./ ../ or absolute. */
const isBare = spec =>
  !spec.startsWith('node:')
  && !spec.startsWith('./')
  && !spec.startsWith('../')
  && !spec.startsWith('/')

export function collectBare(root, plugins = PLUGINS, unbundled = UNBUNDLED_INDEX) {
  const problems = []
  const scanned = []
  for (const plugin of plugins) {
    const dir = join(root, plugin)
    const lib = join(dir, 'lib')
    const peers = optionalPeers(dir)
    // Recurse: DNMSC vendored lib/compaction/types/*.js would otherwise be missed.
    const walk = (d, acc = []) => {
      if (!existsSync(d)) return acc
      for (const name of readdirSync(d)) {
        const p = join(d, name)
        const stat = statSync(p)
        if (stat.isDirectory()) walk(p, acc)
        else if (name.endsWith('.js')) acc.push(p)
      }
      return acc
    }
    // Skip non-host-runnable subdirs (e.g. DNN lib/fx wasm runtime — its
    // optional @libfx native probes are lazy/caught, not host imports).
    const files = walk(lib).filter(p => !SKIP_LIB_SUBDIRS.has(relative(dir, p).replace(/\\/g, '/').split('/').slice(0, 2).join('/')))
    if (unbundled.includes(plugin) && existsSync(join(dir, 'index.js'))) {
      files.push(join(dir, 'index.js'))
    }
    for (const file of files.sort()) {
      scanned.push(file)
      const text = readFileSync(file, 'utf8')
      for (const { spec, line } of specifiers(text)) {
        if (isBare(spec) && spec.length < 180 && !/[\s,();]/.test(spec) && !HOST_RESOLVED_SPECIFIERS.has(spec) && !peers.has(packageName(spec))) {
          problems.push(`${file.slice(root.length + 1)}:${line} — bare specifier '${spec}' would fail at runtime`)
        }
      }
    }
  }
  return { problems, scanned }
}

function main() {
  const { problems, scanned } = collectBare(ROOT)
  if (problems.length > 0) {
    console.error(`clean-lib FAILED: ${problems.length} bare specifier(s) in runtime artifacts`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
  console.log(`clean-lib OK: ${scanned.length} runtime artifact(s), only node:* + relative imports`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main()
