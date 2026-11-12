#!/usr/bin/env node
/**
 * P2-08 / B1-T07 — export存量桶 samples into test/remote-schema/compat/.
 *
 * Reads credentials from .env.s3 (S3_NOTEPAD_ for the notepad bucket,
 * S3_DEV_/S3_PROD_ for the shared-workspace bucket — nsw uses the same
 * credential set under whatever prefix it is configured with). Lists objects,
 *
 * DEPRECATED 2026-11-12: dsh-nano-shared-workspace retired to deprecated/.
 * This exporter is kept for historical schema samples only; it is not a
 * release gate. See deprecated/README.md.
 * pulls a representative sample of each of the six schema kinds, and writes
 * them to compat/<kind>/<name>. Large objects are skipped.
 *
 * Only metadata + small objects are exported (charter rule).
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createS3Client } from '../packages/dsh-s3-client/src/client.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const OUT = join(ROOT, 'test/remote-schema/compat')
const MAX_SAMPLE = 256 * 1024 // only small objects leave the bucket for the corpus

function loadEnv(file) {
  const out = {}
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1)
    out[m[1]] = v
  }
  return out
}

const env = loadEnv(join(ROOT, '.env.s3'))

/** Build a client from a named env var set. `prefix` is where the plugin puts objects. */
function clientFor(tag, prefix) {
  const endpoint = env[`S3_${tag}_ENDPOINT`]
  const bucket = env[`S3_${tag}_BUCKET`]
  const region = env[`S3_${tag}_REGION`] || 'auto'
  const accessKeyId = env[`S3_${tag}_ACCESS_KEY`]
  const secretAccessKey = env[`S3_${tag}_SECRET_KEY`]
  const pathStyle = env[`S3_${tag}_PATH_STYLE`] === undefined ? true : String(env[`S3_${tag}_PATH_STYLE`]) === 'true'
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) return null
  return createS3Client({ endpoint, region, bucket, accessKeyId, secretAccessKey, prefix, pathStyle })
}

const write = (kind, name, body) => {
  const dir = join(OUT, kind)
  mkdirSync(dir, { recursive: true })
  const file = join(dir, name.replace(/\//g, '__'))
  const data = typeof body === 'string' ? body : body instanceof Uint8Array ? Buffer.from(body) : Buffer.from(JSON.stringify(body))
  if (data.byteLength > MAX_SAMPLE) { console.log(`  skip ${kind}/${name} (${data.byteLength}B > ${MAX_SAMPLE}B)`); return false }
  writeFileSync(file, data)
  console.log(`  wrote ${kind}/${name} (${data.byteLength}B)`)
  return true
}

async function exportNotepad() {
  const client = clientFor('NOTEPAD', '')            // prefix:'' — use full keys
  if (!client) { console.log('notepad: no S3_NOTEPAD_* creds — skip'); return }
  const under = env.S3_NOTEPAD_PREFIX ?? 'notepad/'
  console.log(`notepad bucket (prefix ${under}):`)
  let objs
  try { objs = (await client.listObjects({ under })).objects } catch (e) { console.log('  list failed:', e.message); return }
  console.log(`  ${objs.length} object(s)`)
  const get = key => client.getObject(key)            // keys already full (prefix:'')
  // manifest
  const manifest = objs.find(o => /manifest\.json$/.test(o.key))
  if (manifest) { const g = await get(manifest.key); if (g) write('manifest', 'manifest.json', g.body) }
  // files/*.md
  const files = objs.filter(o => /files\/.+\.md$/.test(o.key)).slice(0, 4)
  for (const f of files) { const g = await get(f.key); if (g) write('files', f.key.split('/').pop(), g.body) }
  // images/*
  const img = objs.find(o => /images\/.+/.test(o.key))
  if (img) { const g = await get(img.key); if (g) write('images', img.key.split('/').pop(), g.body) }
}

async function exportNsw(tag) {
  // nsw keeps objects under workspaces/<id>.json and workspaces/<id>/...
  const client = clientFor(tag, '')
  if (!client) { console.log(`nsw ${tag}: no S3_${tag}_* creds — skip`); return }
  console.log(`nsw ${tag} bucket:`)
  let objs
  try { objs = (await client.listObjects({ under: 'workspaces/' })).objects } catch (e) { console.log('  list failed:', e.message); return }
  console.log(`  ${objs.length} object(s) under workspaces/`)
  // marker: workspaces/<id>.json (16-hex id, not a directory key)
  const markers = objs.filter(o => /^workspaces\/[A-Za-z0-9_-]+\.json$/.test(o.key)).slice(0, 2)
  for (const m of markers) { const g = await client.getObject(m.key); if (g) write('marker', m.key.split('/').pop(), g.body) }
  // session-meta
  const metas = objs.filter(o => /workspaces\/[^/]+\/sessions\/[^/]+\/meta\.json$/.test(o.key)).slice(0, 2)
  for (const m of metas) { const g = await client.getObject(m.key); if (g) write('session-meta', m.key.replace(/^workspaces\//, '').replace(/\//g, '__'), g.body) }
  // tree-head
  const heads = objs.filter(o => /workspaces\/[^/]+\/tree\/HEAD\.json$/.test(o.key)).slice(0, 2)
  for (const m of heads) { const g = await client.getObject(m.key); if (g) write('tree-head', m.key.replace(/^workspaces\//, '').replace(/\//g, '__'), g.body) }
}

await exportNotepad()
await exportNsw('DEV')
await exportNsw('PROD')
console.log('done')
