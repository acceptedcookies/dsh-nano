#!/usr/bin/env node
/**
 * Content hash of the DNPR source tree, injected into every plugin build as
 * `__DNPR_BUILD__` (T-O-PRE1116-07.4). Same source → same stamp; a changed
 * byte anywhere in src/ changes it. The lab's version fingerprint reads the
 * stamps from the report's contributors instead of a hand-written version.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'packages', 'dsh-performance-review', 'src')

export function dnprBuildStamp() {
  const files = readdirSync(ROOT).filter(name => name.endsWith('.js')).sort()
  const hash = createHash('sha256')
  for (const name of files) {
    hash.update(name)
    hash.update('\0')
    hash.update(readFileSync(join(ROOT, name)))
    hash.update('\0')
  }
  return hash.digest('hex').slice(0, 12)
}

if (process.argv[1] && process.argv[1].endsWith('dnpr-build-stamp.mjs')) {
  console.log(dnprBuildStamp())
}
