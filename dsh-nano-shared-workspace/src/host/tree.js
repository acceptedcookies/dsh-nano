/**
 * Workspace file generations on S3. The replica directory is a cache.
 * HEAD.json is the current generation; generations/{n}.json is immutable.
 * A generation's parent pointer is what conflict dissolution walks.
 */

import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'

const SKIP = new Set(['.git', 'node_modules', '.nsw', '.DS_Store'])
const MAX_FILE = 2 * 1024 * 1024
const MAX_FILES = 200

const headKey = id => `workspaces/${id}/tree/HEAD.json`
const genKey = (id, n) => `workspaces/${id}/tree/generations/${n}.json`
const blobKey = (id, sha) => `workspaces/${id}/tree/blobs/${sha}`

const sha256 = buf => createHash('sha256').update(buf).digest('hex')

function inside(root, rel) {
  const dest = resolve(root, rel)
  const base = resolve(root)
  return dest === base || dest.startsWith(base + sep) ? dest : undefined
}

function scan(root) {
  const files = []
  const walk = dir => {
    let names = []
    try { names = readdirSync(dir) } catch { return }
    for (const name of names) {
      if (SKIP.has(name) || files.length >= MAX_FILES) continue
      const abs = join(dir, name)
      let st
      try { st = statSync(abs) } catch { continue }
      if (st.isDirectory()) walk(abs)
      else if (st.isFile() && st.size <= MAX_FILE) {
        const buf = readFileSync(abs)
        files.push({
          rel: relative(root, abs).split('\\').join('/'),
          sha256: sha256(buf),
          size: buf.length,
        })
      }
    }
  }
  walk(root)
  files.sort((a, b) => a.rel.localeCompare(b.rel))
  return files
}

function byRel(files) {
  return new Map((files ?? []).map(file => [file.rel, file]))
}

function isText(buf) {
  return !buf.includes(0)
}

function readRel(root, rel) {
  const dest = inside(root, rel)
  if (dest === undefined) return undefined
  try { return readFileSync(dest) } catch { return undefined }
}

/**
 * Three-way merge of file lists. Both sides changed → text conflict markers
 * (a new generation, neither side discarded) or the remote bytes plus a
 * sibling `*.nsw-local` for binary.
 */
function dissolve(root, parent, remote, local) {
  const p = byRel(parent)
  const r = byRel(remote)
  const l = byRel(local)
  const paths = new Set([...p.keys(), ...r.keys(), ...l.keys()])
  const files = []
  const conflicts = []
  for (const rel of [...paths].sort()) {
    const ps = p.get(rel)?.sha256
    const rs = r.get(rel)?.sha256
    const ls = l.get(rel)?.sha256
    if (ls === rs) {
      if (ls !== undefined) files.push(l.get(rel))
      continue
    }
    if (ls === ps) {
      if (rs !== undefined) files.push(r.get(rel))
      continue
    }
    if (rs === ps || (rs === undefined && ps === undefined)) {
      if (ls !== undefined) files.push(l.get(rel))
      continue
    }
    const localBuf = ls !== undefined ? readRel(root, rel) : undefined
    const remoteSha = rs
    conflicts.push(rel)
    if (localBuf !== undefined && remoteSha !== undefined && isText(localBuf)) {
      files.push({ rel, sha256: null, size: 0, pending: 'text', remoteSha, localBuf })
    } else if (remoteSha !== undefined) {
      files.push({ rel, sha256: remoteSha, size: r.get(rel).size })
      if (localBuf !== undefined) {
        const side = `${rel}.nsw-local`
        files.push({ rel: side, sha256: sha256(localBuf), size: localBuf.length, buf: localBuf })
      }
    } else if (ls !== undefined) {
      files.push(l.get(rel))
    }
  }
  return { files, conflicts, writes: [] }
}

async function materializePending(s3, workspaceId, root, dissolved) {
  const out = []
  for (const file of dissolved.files) {
    if (file.pending !== 'text') {
      out.push({ rel: file.rel, sha256: file.sha256, size: file.size, buf: file.buf })
      continue
    }
    const remoteBuf = await s3.getBytes(blobKey(workspaceId, file.remoteSha))
    const merged = Buffer.from(`<<<<<<< local\n${file.localBuf.toString('utf8')}=======\n${(remoteBuf ?? Buffer.alloc(0)).toString('utf8')}>>>>>>> remote\n`)
    const dest = inside(root, file.rel)
    if (dest !== undefined) {
      mkdirSync(dirname(dest), { recursive: true })
      writeFileSync(dest, merged)
    }
    out.push({ rel: file.rel, sha256: sha256(merged), size: merged.length, buf: merged })
    dissolved.writes.push(file.rel)
  }
  return out
}

function basePath(dshHome, workspaceId) {
  return join(dshHome, 'nsw', `${workspaceId}.json`)
}

function loadBase(dshHome, workspaceId) {
  try { return JSON.parse(readFileSync(basePath(dshHome, workspaceId), 'utf8')) }
  catch { return { generation: 0, files: [] } }
}

function saveBase(dshHome, workspaceId, record) {
  const dest = basePath(dshHome, workspaceId)
  mkdirSync(dirname(dest), { recursive: true })
  writeFileSync(dest, JSON.stringify({ generation: record.generation, files: record.files }))
}

async function ensureBlobs(s3, workspaceId, root, files) {
  for (const file of files) {
    const buf = file.buf ?? readRel(root, file.rel)
    if (buf === undefined) continue
    await s3.putBytes(blobKey(workspaceId, file.sha256), buf)
  }
}

/** Download HEAD into the replica. Files this replica previously synced and the new HEAD dropped are removed. */
export async function pullWorkspace(s3, dshHome, workspaceId, localPath) {
  const head = await s3.getJson(headKey(workspaceId))
  if (head === undefined) return { ok: true, generation: 0, files: 0 }
  mkdirSync(localPath, { recursive: true })
  const base = loadBase(dshHome, workspaceId)
  const next = new Set((head.files ?? []).map(file => file.rel))
  for (const old of base.files ?? []) {
    if (next.has(old.rel)) continue
    const dest = inside(localPath, old.rel)
    if (dest === undefined) continue
    try { unlinkSync(dest) } catch { /* already gone */ }
  }
  for (const file of head.files ?? []) {
    const dest = inside(localPath, file.rel)
    if (dest === undefined) continue
    const have = readRel(localPath, file.rel)
    if (have !== undefined && sha256(have) === file.sha256) continue
    const blob = await s3.getBytes(blobKey(workspaceId, file.sha256))
    if (blob === undefined) continue
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, blob)
  }
  saveBase(dshHome, workspaceId, head)
  return { ok: true, generation: head.generation ?? 0, files: (head.files ?? []).length, conflicts: head.conflicts ?? [] }
}

/** Push the replica. Divergent HEAD is dissolved into a child generation instead of a blind overwrite. */
export async function pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt = 0) {
  mkdirSync(localPath, { recursive: true })
  const head = await s3.getJson(headKey(workspaceId))
  const base = loadBase(dshHome, workspaceId)
  const local = scan(localPath)
  const remote = head?.files ?? []
  const same = JSON.stringify(local.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size })))
    === JSON.stringify(remote.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size })))
  if (same && head !== undefined) return { ok: true, generation: head.generation, files: remote.length, unchanged: true, conflicts: [] }

  let parentFiles = base.files ?? []
  if (head !== undefined && base.generation !== head.generation) {
    const parent = head.parent ? await s3.getJson(genKey(workspaceId, head.parent)) : undefined
    parentFiles = parent?.files ?? []
  }
  const dissolved = dissolve(localPath, parentFiles, remote, local)
  const files = await materializePending(s3, workspaceId, localPath, dissolved)
  await ensureBlobs(s3, workspaceId, localPath, files)
  const generation = (head?.generation ?? 0) + 1
  const record = {
    v: 1,
    generation,
    parent: head?.generation ?? null,
    writerId,
    files: files.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size })),
    conflicts: dissolved.conflicts,
    at: new Date().toISOString(),
  }
  const put = await s3.putJson(genKey(workspaceId, generation), record, { ifNoneMatch: '*' })
  if (put?.conflict === true && attempt < 1) return pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt + 1)
  await s3.putJson(headKey(workspaceId), record)
  saveBase(dshHome, workspaceId, record)
  return { ok: true, generation, files: record.files.length, conflicts: dissolved.conflicts }
}

/** Record the username once. A second client keeps the first claim. */
export async function registerIdentity(s3, identity) {
  if (typeof identity?.username !== 'string' || identity.username === '') return { ok: false }
  const key = `identities/${encodeURIComponent(identity.username)}.json`
  const existing = await s3.getJson(key)
  if (existing !== undefined) return { ok: true, existed: true }
  await s3.putJson(key, { username: identity.username, claimedAt: new Date().toISOString() })
  return { ok: true, existed: false }
}
