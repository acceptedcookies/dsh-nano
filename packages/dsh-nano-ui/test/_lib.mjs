import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

export const PKG = join(dirname(fileURLToPath(import.meta.url)), '..')
export const REPO = join(PKG, '..', '..')
export const SRC = join(PKG, 'src')
export const read = path => readFileSync(path, 'utf8')
export const readSrc = name => read(join(SRC, name))
export const rel = path => relative(PKG, path)
export const catalog = name => JSON.parse(read(join(PKG, 'catalog', `${name}.json`)))

/** Every file under `dir` with one of `exts`, recursively. */
export function walk(dir, exts = ['.js', '.jsx', '.mjs']) {
  const out = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) out.push(...walk(path, exts))
    else if (exts.some(ext => name.endsWith(ext))) out.push(path)
  }
  return out
}

/** nano-ui source scope for "is zero" scans: src/** plus index.js. */
export function sourceFiles() {
  const files = [...walk(SRC), join(PKG, 'index.js')]
  if (files.length < 2) throw new Error(`nano-ui scan found ${files.length} files`)
  return files.map(path => ({ path, text: read(path) }))
}

/** Lines of `files` matching `pattern`, as `file:line text`. */
export function hits(files, pattern) {
  const out = []
  for (const { path, text } of files) {
    text.split('\n').forEach((line, index) => {
      if (pattern.test(line)) out.push(`${rel(path)}:${index + 1} ${line.trim()}`)
    })
  }
  return out
}

/** Names exported by an ESM module's `export { a, b } from` / `export function|const` lines. */
export function exportedNames(text) {
  const names = new Set()
  for (const match of text.matchAll(/export \{([^}]*)\}/g)) {
    for (const part of match[1].split(',')) {
      const name = part.trim().split(/\s+as\s+/).pop()
      if (name) names.add(name)
    }
  }
  for (const match of text.matchAll(/export (?:async )?(?:function|const|let|class) ([A-Za-z_$][\w$]*)/g)) names.add(match[1])
  return names
}
