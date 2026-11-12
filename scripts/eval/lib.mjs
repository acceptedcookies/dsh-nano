/**
 * Shared harness for DASW-1112 automation tests. Not shipped in the plugin tarball.
 * Reads `.env.s3` from the worktree root (git-ignored) and talks to MinIO through
 * the plugin's own SigV4 client, so probes exercise exactly the shipped code path.
 */
import { readFileSync } from 'node:fs'
import { createS3 } from '../../deprecated/dsh-nano-shared-workspace/src/host/s3.js'

const ROOT = new URL('../../', import.meta.url).pathname

/** Parse the `KEY=value` lines of .env.s3, ignoring comments. */
export function env(path = `${ROOT}.env.s3`) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2]
  }
  return out
}

/** Build a config+identity pair for one `S3_<NAME>_*` block. */
export function clientFor(e, name, overrides = {}) {
  const prefix = `S3_${name}_`
  const config = {
    endpoint: e[`${prefix}ENDPOINT`],
    region: e[`${prefix}REGION`],
    bucket: e[`${prefix}BUCKET`],
    prefix: '',
    ...overrides,
  }
  const identity = {
    username: `dasw-${name.toLowerCase()}`,
    accessKey: e[`${prefix}ACCESS_KEY`],
    token: e[`${prefix}SECRET_KEY`],
    configured: true,
  }
  return { config, identity, s3: createS3(config, identity), prefix }
}

/** JSON round-trip with a small delay-visible result. */
export async function roundTrip(s3, key, value = { at: Date.now(), tag: 'dasw-1112' }) {
  const put = await s3.putJson(key, value)
  const got = await s3.getJson(key)
  await s3.del(key)
  const gone = await s3.getJson(key)
  return { put, got, gone }
}

/** Assert helper that prints an evidence line and throws on failure. */
export function check(name, condition, detail = '') {
  const ok = condition === true
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail === '' ? '' : ` :: ${detail}`}`)
  if (!ok) process.exitCode = 1
}
