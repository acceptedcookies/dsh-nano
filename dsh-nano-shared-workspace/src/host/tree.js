/**
 * Workspace file generations on S3. The replica directory is a cache.
 * HEAD.json is the current generation; generations/{n}.json is immutable.
 * A generation's parent pointer is what conflict dissolution walks.
 */

import { createHash } from 'node:crypto'
import { lstat, mkdir, readFile, readdir, realpath, unlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { validate, SchemaReject, WORKSPACE_ID_RE } from 'dsh-remote-data-schema'

/* SKIP (P2-05 + P4-04 `imagine`): entries under these top-level segments are
 * never pulled to the host (a remote HEAD carrying `imagine/.grok/auth.json`
 * must not land on this disk) and never enumerated for push (a local
 * `imagine/.grok/` credentials dir must not reach the bucket). `.DS_Store`
 * remains a scan-time name skip. */
/* All-lowercase members: SKIP comparisons are made case-insensitive so a
 * remote rel like `ImAgInE/.grok/…` cannot smuggle into the imagine/.git/
 * node_modules trees on case-folding filesystems (APFS) — review 9012 P4. */
const SKIP = new Set(['.git', 'node_modules', '.nsw', '.ds_store', 'imagine'])
const MAX_FILE = 2 * 1024 * 1024
const MAX_FILES = 200

const headKey = id => `workspaces/${id}/tree/HEAD.json`
const genKey = (id, n) => `workspaces/${id}/tree/generations/${n}.json`
const blobKey = (id, sha) => `workspaces/${id}/tree/blobs/${sha}`

const sha256 = buf => createHash('sha256').update(buf).digest('hex')

/**
 * Normalize + fence the replica root (P2-05): absolute, resolved, and NOT a
 * pre-existing symlink (a symlinked root would make the realpath fence point
 * anywhere). The directory is created as before; the returned root is its
 * real path so every descendant check is against the true location.
 */
async function replicaRoot(localPath) {
  if (typeof localPath !== 'string' || !isAbsolute(localPath) || resolve(localPath) !== localPath) {
    throw new SchemaReject('schema:localPath', 'localPath must be an absolute normalized path')
  }
  const root = resolve(localPath)
  try {
    if ((await lstat(root)).isSymbolicLink()) {
      throw new SchemaReject('schema:localPath', 'localPath must not be a symlink')
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error
  }
  await mkdir(root, { recursive: true })
  return realpath(root)
}

/** Top-level SKIP test for a remote rel (POSIX separators, as written in
 * HEADs). Case-insensitive: on APFS `ImAgInE` resolves to `imagine`, so a
 * literal-match SKIP would let a remote HEAD plant files into the protected
 * credential/.git/node_modules trees (review 9012 P4). */
const skippedRel = rel => SKIP.has(String(rel).split('/')[0].toLowerCase())

/**
 * The realpath fence (P2-05): `inside()` upgraded from lexical to
 * filesystem-aware. `base` must already be the replica's realpath.
 * Returns the absolute destination only when ALL hold:
 *   - rel resolves strictly inside base (lexical, `..`/abs rejected)
 *   - its top-level segment is not in SKIP
 *   - the destination itself is not a symlink (lstat — incl. dangling links)
 *   - the deepest existing ancestor's realpath IS that ancestor — i.e. no
 *     symlink anywhere inside the replica redirects the write/read outside.
 */
async function inside(root, rel) {
  if (typeof rel !== 'string' || rel === '') return undefined
  // Canonicalize the base defensively: `replicaRoot` already realpaths, but
  // a caller passing an unresolved path (e.g. under a symlinked /var) must
  // still land the walk on the true location, not fail the probe compare.
  try { root = await realpath(root) } catch { return undefined }
  const dest = resolve(root, rel)
  if (!dest.startsWith(root + sep)) return undefined
  if (skippedRel(rel)) return undefined
  try {
    if ((await lstat(dest)).isSymbolicLink()) return undefined
  } catch (error) {
    if (error?.code !== 'ENOENT') return undefined
  }
  /* Deepest-existing-ancestor walk over the PARENT chain (P3). `dest` itself
   * may be a regular file we are about to overwrite/stale-delete — that's
   * legal — and its own symlink case is already fenced above. What we must
   * verify here is the directory chain that mkdir({recursive}) will create
   * through: no ancestor may be a symlink (live or dangling) or a non-dir.
   * lstat — NOT access — is the probe: access follows the final link and
   * reports a DANGLING symlink as "missing", letting the walk climb past it
   * and approve `dest`, after which mkdir(dirname) throws and wedges the pull
   * mid-loop (review 9012 P3). lstat sees the link object. */
  let probe = dirname(dest)
  for (;;) {
    let st
    try { st = await lstat(probe) } catch { st = undefined }
    if (st !== undefined) {
      /* Ancestor must be a real directory that is not a link. */
      if (st.isSymbolicLink() || !st.isDirectory()) return undefined
      break
    }
    const parent = dirname(probe)
    if (parent === probe) return undefined
    probe = parent
    if (probe !== root && !probe.startsWith(root + sep)) return undefined
  }
  try {
    if (await realpath(probe) !== probe) return undefined
  } catch { return undefined }
  return dest
}

async function scan(root) {
  const files = []
  const walk = async dir => {
    let names = []
    try { names = await readdir(dir) } catch { return }
    for (const name of names) {
      /* case-insensitive SKIP (P4): a local `ImAgInE/` folds to `imagine/` on
       * APFS and would otherwise be scanned + uploaded past the guard. */
      if (SKIP.has(name.toLowerCase()) || files.length >= MAX_FILES) continue
      const abs = join(dir, name)
      let st
      try { st = await lstat(abs) } catch { continue }
      // lstat (P2-05): symlinks are never followed — a link pointing outside
      // the replica is skipped, not read into a blob upload.
      if (st.isSymbolicLink()) continue
      if (st.isDirectory()) await walk(abs)
      else if (st.isFile() && st.size <= MAX_FILE) {
        const buf = await readFile(abs)
        files.push({
          rel: relative(root, abs).split('\\').join('/'),
          sha256: sha256(buf),
          size: buf.length,
        })
      }
    }
  }
  await walk(root)
  files.sort((a, b) => a.rel.localeCompare(b.rel))
  return files
}

function byRel(files) {
  return new Map((files ?? []).map(file => [file.rel, file]))
}

function isText(buf) {
  return !buf.includes(0)
}

async function readRel(root, rel) {
  const dest = await inside(root, rel)
  if (dest === undefined) return undefined
  try { return await readFile(dest) } catch { return undefined }
}

/**
 * Three-way merge of file lists. Both sides changed → text conflict markers
 * (a new generation, neither side discarded) or the remote bytes plus a
 * sibling `*.nsw-local` for binary.
 */
async function dissolve(root, parent, remote, local) {
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
    const localBuf = ls !== undefined ? await readRel(root, rel) : undefined
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
  return { files, conflicts }
}

/**
 * Resolve pending text conflicts into merged bytes held in memory. Writing
 * them into the replica is deferred until the generation and HEAD CAS writes
 * both succeed, so a lost race never leaves half-merged bytes on disk.
 */
async function materializePending(s3, workspaceId, dissolved) {
  const out = []
  for (const file of dissolved.files) {
    if (file.pending !== 'text') {
      out.push({ rel: file.rel, sha256: file.sha256, size: file.size, buf: file.buf })
      continue
    }
    const remoteBuf = await s3.getBytes(blobKey(workspaceId, file.remoteSha))
    const merged = Buffer.from(`<<<<<<< local\n${file.localBuf.toString('utf8')}=======\n${(remoteBuf ?? Buffer.alloc(0)).toString('utf8')}>>>>>>> remote\n`)
    out.push({ rel: file.rel, sha256: sha256(merged), size: merged.length, buf: merged, writeToReplica: true })
  }
  return out
}

/** Commit the merged bytes to this replica only after the remote CAS wins. */
async function writePending(root, files) {
  for (const file of files) {
    if (file.writeToReplica !== true) continue
    const dest = await inside(root, file.rel)
    if (dest === undefined) continue
    await mkdir(dirname(dest), { recursive: true })
    await writeFile(dest, file.buf)
  }
}

function basePath(dshHome, workspaceId) {
  return join(dshHome, 'nsw', `${workspaceId}.json`)
}

async function loadBase(dshHome, workspaceId) {
  try { return JSON.parse(await readFile(basePath(dshHome, workspaceId), 'utf8')) }
  catch { return { generation: 0, files: [] } }
}

async function saveBase(dshHome, workspaceId, record) {
  const dest = basePath(dshHome, workspaceId)
  await mkdir(dirname(dest), { recursive: true })
  await writeFile(dest, JSON.stringify({ generation: record.generation, files: record.files }))
}

/**
 * Bounded worker pool. Blob transfers are independent per file, so the serial
 * loop made a 200-file push take ~110s (measured T-E02). The cap keeps the
 * host from opening an unbounded number of sockets to one endpoint.
 */
const BLOB_CONCURRENCY = 8

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    for (;;) {
      const index = next
      next += 1
      if (index >= items.length) return
      results[index] = await worker(items[index], index)
    }
  })
  await Promise.all(runners)
  return results
}

/** Blobs are content-addressed, so a key that already exists needs no resend. */
async function ensureBlobs(s3, workspaceId, root, files, knownShas) {
  const uploads = []
  for (const file of files) {
    if (knownShas !== undefined && knownShas.has(file.sha256)) continue
    const buf = file.buf ?? await readRel(root, file.rel)
    if (buf === undefined) continue
    uploads.push({ key: blobKey(workspaceId, file.sha256), buf })
  }
  await mapLimit(uploads, BLOB_CONCURRENCY, ({ key, buf }) => s3.putBytes(key, buf))
  return uploads.length
}

/** Download HEAD into the replica. Files this replica previously synced and the new HEAD dropped are removed. */
export async function pullWorkspace(s3, dshHome, workspaceId, localPath) {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject('schema:workspaceId', 'workspaceId has a bad charset')
  const head = await s3.getJson(headKey(workspaceId))
  if (head === undefined) return { ok: true, generation: 0, files: 0 }
  const root = await replicaRoot(localPath)
  // Remote HEAD crosses the boundary only after the v1 whitelist (P2-05).
  validate('tree-head', head)
  const base = await loadBase(dshHome, workspaceId)
  const next = new Set((head.files ?? []).map(file => file.rel))
  for (const old of base.files ?? []) {
    if (next.has(old.rel)) continue
    // Stale-delete uses the same fence: SKIP/`..`/symlink targets are not touched.
    const dest = await inside(root, old.rel)
    if (dest === undefined) continue
    try { await unlink(dest) } catch { /* already gone */ }
  }
  const downloads = []
  for (const file of head.files ?? []) {
    const dest = await inside(root, file.rel)
    if (dest === undefined) continue
    const have = await readRel(root, file.rel)
    if (have !== undefined && sha256(have) === file.sha256) continue
    downloads.push({ dest, key: blobKey(workspaceId, file.sha256) })
  }
  const blobs = await mapLimit(downloads, BLOB_CONCURRENCY, ({ key }) => s3.getBytes(key))
  for (let index = 0; index < downloads.length; index += 1) {
    const blob = blobs[index]
    if (blob === undefined) continue
    await mkdir(dirname(downloads[index].dest), { recursive: true })
    await writeFile(downloads[index].dest, blob)
  }
  await saveBase(dshHome, workspaceId, head)
  return { ok: true, generation: head.generation ?? 0, files: (head.files ?? []).length, conflicts: head.conflicts ?? [] }
}

/** Push the replica. Divergent HEAD is dissolved into a child generation instead of a blind overwrite. */
export async function pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt = 0) {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject('schema:workspaceId', 'workspaceId has a bad charset')
  const root = await replicaRoot(localPath)
  const got = await s3.getJson(headKey(workspaceId), { withMeta: true })
  const head = got?.value
  if (head !== undefined) {
    // A poisoned remote HEAD is rejected whole — its rels cannot steer the
    // merge (P2-05) even though `dissolve` would SKIP-filter them anyway.
    validate('tree-head', head)
  }
  const base = await loadBase(dshHome, workspaceId)
  const local = await scan(root)
  const remote = (head?.files ?? []).filter(file => !skippedRel(file.rel))
  const same = JSON.stringify(local.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size })))
    === JSON.stringify(remote.map(({ rel, sha256: sha, size }) => ({ rel, sha256: sha, size })))
  if (same && head !== undefined) return { ok: true, generation: head.generation, files: remote.length, unchanged: true, conflicts: [] }

  let parentFiles = base.files ?? []
  if (head !== undefined && base.generation !== head.generation) {
    const parent = head.parent ? await s3.getJson(genKey(workspaceId, head.parent)) : undefined
    if (parent !== undefined) {
      validate('tree-head', parent)
      parentFiles = parent.files ?? []
    }
  }
  const dissolved = await dissolve(root, parentFiles, remote, local)
  const files = await materializePending(s3, workspaceId, dissolved)
  // Every sha already referenced by the current HEAD has a blob in the bucket,
  // so a repeat push re-uploads only genuinely new content.
  const knownShas = new Set([
    ...(head?.files ?? []).map(file => file.sha256),
    ...parentFiles.map(file => file.sha256),
  ])
  const uploaded = await ensureBlobs(s3, workspaceId, root, files, knownShas)
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
  // Generation objects are immutable; HEAD is a CAS write. A racing client
  // either wins the generation slot or re-reads the new HEAD and dissolves
  // against it — it can never overwrite the winner's HEAD with stale bytes.
  const MAX_ATTEMPTS = 3
  const genPut = await s3.putJson(genKey(workspaceId, generation), record, { ifNoneMatch: '*' })
  if (genPut?.conflict === true) {
    if (attempt >= MAX_ATTEMPTS) throw new Error('tree generation is racing another writer; retry the push')
    return pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt + 1)
  }
  const headPut = await s3.putJson(headKey(workspaceId), record,
    got?.etag === undefined ? { ifNoneMatch: '*' } : { ifMatch: got.etag })
  if (headPut?.conflict === true) {
    if (attempt >= MAX_ATTEMPTS) throw new Error('tree HEAD changed during push; retry the push')
    return pushWorkspace(s3, dshHome, workspaceId, localPath, writerId, attempt + 1)
  }
  await writePending(root, files)
  await saveBase(dshHome, workspaceId, record)
  return { ok: true, generation, files: record.files.length, conflicts: dissolved.conflicts, uploaded }
}

/**
 * Delete every object under `workspaces/{id}/` (F-12). `list()` is one level
 * deep because it asks S3 for a delimiter, so the walk recurses on prefixes
 * and deletes the keys of each leaf level. Bounded by a depth and a key budget
 * so a pathological bucket cannot turn a delete into an unbounded sweep.
 *
 * MinIO echoes the request's own prefix inside `<CommonPrefixes>` when the
 * directory holds only deeper directories; recursing into that self-reference
 * would loop until the depth cap, so any child equal to the current prefix is
 * skipped.
 * @returns `{keys, truncated}` actually removed.
 */
export async function purgeWorkspaceObjects(s3, workspaceId, { maxDepth = 8, maxKeys = 5000 } = {}) {
  if (!WORKSPACE_ID_RE.test(workspaceId)) throw new SchemaReject('schema:workspaceId', 'workspaceId has a bad charset')
  let deleted = 0
  let visited = 0
  const seen = new Set()
  const walk = async (prefix, depth) => {
    if (depth > maxDepth || visited >= maxKeys || seen.has(prefix)) return
    seen.add(prefix)
    const page = await s3.list(prefix).catch(() => undefined)
    if (page === undefined) return
    for (const key of page.keys ?? []) {
      if (visited >= maxKeys) return
      visited += 1
      await s3.del(key).catch(() => {})
      deleted += 1
    }
    for (const child of page.prefixes ?? []) {
      if (child === prefix) continue
      await walk(child, depth + 1)
    }
  }
  await walk(`workspaces/${workspaceId}/`, 0)
  return { keys: deleted, truncated: visited >= maxKeys }
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
