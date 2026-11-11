/** Cloud sync for the notepad.
 *
 *  The host is a signed S3 proxy (/nano-notepad/s3/*); credentials never reach
 *  this file. This module owns the manifest, the local cursor/outbox, and the
 *  merge policy. Layout under the host's configured prefix:
 *
 *    manifest.json              {rev, updatedAt, files:{id:{...}}, images:{sha:{...}}}
 *    files/<id>.md              draft body (UTF-8)
 *    images/<sha256>            {mime, base64} as JSON
 *
 *  Writes are conditional on the manifest ETag (If-Match), so two clients
 *  racing on a manifest bump cannot silently lose an update. A local change
 *  is pushed before a remote diff is applied, so neither side loses edits. */

import { readSyncMeta, writeSyncMeta, applyRemoteFiles, putImageFromRemote, allImages, createNode, saveDraft, deleteNode } from './db.js'

const MANIFEST_KEY = 'manifest.json'
const STATUS_ROUTE = '/nano-notepad/s3/status'
const TEST_ROUTE = '/nano-notepad/s3/test'
const OBJECT_ROUTE = '/nano-notepad/s3/object'
const CONFIG_ROUTE = '/nano-notepad/s3/config'
const PUSH_DEBOUNCE_MS = 2000
const MAX_CAS_RETRIES = 3

async function rpc(path, body) {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  })
  const json = await response.json().catch(() => null)
  if (!response.ok) throw new Error(json?.message || `s3 ${path} HTTP ${response.status}`)
  return json
}

const object = body => rpc(OBJECT_ROUTE, body)
const configRpc = (action, payload = {}) => rpc(CONFIG_ROUTE, { action, ...payload })

/** UTF-8 safe base64 (btoa/atob alone mangle non-ASCII drafts). */
function encode(text) {
  const bytes = new TextEncoder().encode(text)
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(binary)
}

function decode(base64) {
  const binary = atob(base64)
  return new TextDecoder().decode(Uint8Array.from(binary, char => char.charCodeAt(0)))
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

async function readManifest() {
  const result = await object({ op: 'get', key: MANIFEST_KEY })
  if (!result || typeof result.bodyB64 !== 'string') {
    /* A present-but-unreadable manifest must never be treated as "empty":
       that would make push() publish rev 1 and orphan every remote object. */
    const head = await object({ op: 'head', key: MANIFEST_KEY }).catch(() => null)
    if (head) throw new Error('manifest exists but could not be read; refusing to overwrite')
    return { data: null, etag: null }
  }
  let parsed
  try {
    parsed = JSON.parse(decode(result.bodyB64))
  } catch {
    throw new Error('manifest is not valid JSON; refusing to overwrite')
  }
  if (!parsed || typeof parsed.rev !== 'number' || typeof parsed.files !== 'object') {
    throw new Error('manifest has an unexpected shape; refusing to overwrite')
  }
  return { data: parsed, etag: result.etag }
}

/**
 * @param {object} options
 * @param {() => IDBDatabase | null} options.getDb
 * @param {() => Array<object>} options.getNodes - current node list from panel state
 * @param {() => boolean} options.getEnabled
 * @param {() => number} options.getIntervalSec
 * @param {(info: object) => void} options.onState - status callback for the UI
 * @param {() => Promise<void>} options.onApplied - reload + render after remote changes
 */
export function createSync({ getDb, getNodes, getEnabled, getIntervalSec, onState, onApplied }) {
  let timer = null
  let pushTimer = null
  let busy = false
  /* While switching endpoints the local database is the temporary source of
     truth: no automatic push and no pull. Local edits still queue into the
     outbox so nothing is lost before the switch is confirmed. */
  let suspended = false
  let info = {
    phase: 'off', detail: '', lastSyncAt: 0, pending: 0,
    usage: null, limits: null, ready: false, config: null,
  }

  function emit(patch) {
    info = { ...info, ...patch }
    onState?.(info)
  }

  /** One push: rebuild the file index, upload changed bodies, then CAS the manifest. */
  async function pushOnce() {
    const db = getDb()
    if (!db) return { changed: false }
    const meta = await readSyncMeta(db)
    const files = getNodes().filter(node => node.kind === 'file')
    const { data, etag } = await readManifest()
    const previous = data?.files ?? {}
    const nextFiles = {}
    let uploaded = 0

    for (const file of files) {
      const draft = file.draft ?? ''
      const hash = await sha256Hex(draft)
      const before = previous[file.id]
      if (!before || before.sha256 !== hash || meta.dirty[file.id]) {
        await object({ op: 'put', key: `files/${file.id}.md`, bodyB64: encode(draft), contentType: 'text/plain; charset=utf-8' })
        uploaded += 1
      }
      nextFiles[file.id] = {
        name: file.name,
        parentId: file.parentId ?? null,
        workspaceId: file.workspaceId ?? null,
        sha256: hash,
        bytes: new TextEncoder().encode(draft).length,
        updatedAt: file.updatedAt ?? Date.now(),
      }
    }

    const images = await allImages(db)
    const nextImages = { ...(data?.images ?? {}) }
    for (const image of images) {
      if (nextImages[image.sha256]) continue
      await object({
        op: 'put', key: `images/${image.sha256}`,
        bodyB64: encode(JSON.stringify({ mime: image.mime, base64: image.base64 })),
        contentType: 'application/json',
      })
      nextImages[image.sha256] = { id: image.id, mime: image.mime, byteLength: image.byteLength }
      uploaded += 1
    }

    const manifest = {
      rev: (data?.rev ?? 0) + 1,
      updatedAt: new Date().toISOString(),
      files: nextFiles,
      images: nextImages,
    }
    const written = await object({
      op: 'put', key: MANIFEST_KEY,
      bodyB64: encode(JSON.stringify(manifest)),
      contentType: 'application/json',
      ifMatch: etag || undefined,
    })
    await writeSyncMeta(db, { rev: manifest.rev, etag: written.etag, lastPushAt: Date.now(), dirty: {} })
    emit({ pending: 0 })
    return { changed: uploaded > 0, uploaded, rev: manifest.rev }
  }

  /** Retry a failed conditional write against the newest manifest. */
  async function push() {
    for (let attempt = 0; attempt < MAX_CAS_RETRIES; attempt += 1) {
      try { return await pushOnce() } catch (error) {
        if (attempt === MAX_CAS_RETRIES - 1) throw error
      }
    }
    return { changed: false }
  }

  /** Pull remote changes and apply them, then push any pending local edits.
   *  Remote changes MUST be applied before a push: pushOnce rebuilds the file
   *  index from the local tree, so pushing first would drop files that only
   *  exist on S3 (they would become orphaned objects). */
  async function pull() {
    const db = getDb()
    if (!db) return { changed: false }
    const { data, etag } = await readManifest()
    const meta = await readSyncMeta(db)
    if (!data) {
      // Empty bucket: publish the current local tree as the first revision.
      await push()
      return { changed: true, first: true }
    }

    let applied = 0
    /* Only a strictly newer revision is a remote change. Comparing ETags too
       caused a full re-download whenever the cursor row was fresh. */
    if (data.rev > meta.rev) {
      const localById = new Map(getNodes().filter(node => node.kind === 'file').map(node => [node.id, node]))
      const remotes = []
      for (const [id, entry] of Object.entries(data.files ?? {})) {
        const local = localById.get(id)
        if (local && await sha256Hex(local.draft ?? '') === entry.sha256) continue
        const got = await object({ op: 'get', key: `files/${id}.md` })
        if (!got) continue
        remotes.push({
          id, name: entry.name, parentId: entry.parentId, workspaceId: entry.workspaceId,
          draft: decode(got.bodyB64), updatedAt: entry.updatedAt,
        })
      }

      const images = await allImages(db)
      const have = new Set(images.map(image => image.sha256))
      let imageCount = 0
      for (const [sha, info] of Object.entries(data.images ?? {})) {
        if (have.has(sha)) continue
        const got = await object({ op: 'get', key: `images/${sha}` })
        if (!got) continue
        try {
          const payload = JSON.parse(decode(got.bodyB64))
          await putImageFromRemote(db, { ...payload, sha256: sha, byteLength: info.byteLength, createdAt: Date.now() })
          imageCount += 1
        } catch { /* malformed remote image: skip, not fatal to text sync */ }
      }

      if (remotes.length) await applyRemoteFiles(db, remotes)
      await writeSyncMeta(db, { rev: data.rev, etag, lastPullAt: Date.now() })
      if (remotes.length || imageCount) await onApplied?.()
      applied = remotes.length + imageCount
    }

    /* onApplied refreshed the local tree, so a pending push now includes the
       files we just pulled instead of erasing them from the manifest. */
    const after = await readSyncMeta(db)
    if (Object.keys(after.dirty).length > 0) await push()
    return { changed: applied > 0, files: applied, rev: data.rev }
  }

  /** Run one full cycle (pull first, then refresh host status/usage). */
  async function cycle() {
    if (busy || suspended || !getEnabled()) return
    busy = true
    emit({ phase: 'syncing', detail: '' })
    try {
      const result = await pull()
      const status = await rpc(STATUS_ROUTE)
      emit({
        phase: 'ok', detail: '', lastSyncAt: Date.now(),
        ready: status.ok, config: status.config,
        limits: status.limits, usage: status.ledger,
        pending: Object.keys((await readSyncMeta(getDb())).dirty).length,
      })
      return result
    } catch (error) {
      emit({ phase: 'error', detail: error instanceof Error ? error.message : String(error) })
      return { changed: false, error: true }
    } finally {
      busy = false
    }
  }

  /** Mark a local file as changed and schedule a debounced push. */
  async function noteChange(fileId) {
    if (!getEnabled() || !fileId) return
    const db = getDb()
    if (!db) return
    const meta = await readSyncMeta(db)
    await writeSyncMeta(db, { dirty: { ...meta.dirty, [fileId]: Date.now() } })
    emit({ pending: Object.keys(meta.dirty).length + 1 })
    window.clearTimeout(pushTimer)
    pushTimer = window.setTimeout(() => { void cycle().catch(() => {}) }, PUSH_DEBOUNCE_MS)
  }

  function start() {
    stop()
    if (!getEnabled()) { emit({ phase: 'off' }); return }
    emit({ phase: 'idle' })
    void cycle()
    timer = window.setInterval(() => { void cycle() }, Math.max(10, getIntervalSec()) * 1000)
  }

  function stop() {
    if (timer) window.clearInterval(timer)
    if (pushTimer) window.clearTimeout(pushTimer)
    timer = null
    pushTimer = null
    if (info.phase !== 'off') emit({ phase: 'off' })
  }

  /* ── guarded endpoint switch ──────────────────────────────────────────────
     The local database becomes the temporary source of truth: automatic
     push/pull stop, while local edits keep queuing into the outbox. A switch
     only commits after the local tree and the target manifest are reconciled.
     A failed strategy aborts the host's pending switch back to the old active. */

  function suspend() {
    suspended = true
    if (timer) window.clearInterval(timer)
    if (pushTimer) window.clearTimeout(pushTimer)
    timer = null
    pushTimer = null
    emit({ phase: 'paused', detail: '' })
  }

  function resume() {
    suspended = false
    start()
  }

  async function resetCursor() {
    const db = getDb()
    if (!db) return
    await writeSyncMeta(db, { rev: 0, etag: null, lastPushAt: 0, lastPullAt: 0, dirty: {} })
  }

  /** Compare local files with a probed remote manifest. */
  async function diffAgainst(manifest) {
    const local = new Map(getNodes().filter(n => n.kind === 'file').map(n => [n.id, n]))
    const remote = new Map((manifest?.files ?? []).map(f => [f.id, f]))
    const onlyLocalIds = [], conflictIds = [], onlyRemote = [], same = []
    for (const [id, node] of local) {
      const entry = remote.get(id)
      if (!entry) onlyLocalIds.push(id)
      else if (await sha256Hex(node.draft ?? '') === entry.sha256) same.push(node.name)
      else conflictIds.push(id)
    }
    for (const [id, entry] of remote) if (!local.has(id)) onlyRemote.push(entry.name || id)
    return {
      onlyLocalIds, onlyLocal: onlyLocalIds.map(id => local.get(id)?.name ?? id),
      conflictIds, conflict: conflictIds.map(id => local.get(id)?.name ?? id),
      onlyRemote, same, corrupt: Boolean(manifest?.corrupt), remoteRev: manifest?.rev ?? 0,
      hasRemote: Boolean(manifest),
    }
  }

  async function deleteLocalOnly(ids) {
    const db = getDb()
    if (!db || !ids.length) return
    for (const id of ids) await deleteNode(db, id)
    await onApplied?.()
  }

  async function saveConflictCopies(ids) {
    const db = getDb()
    if (!db || !ids.length) return
    for (const id of ids) {
      const node = getNodes().find(n => n.id === id)
      if (!node) continue
      const base = String(node.name ?? 'note').replace(/\.(md|markdown|json|html)$/i, '')
      const copy = await createNode(db, 'file', node.parentId ?? null, `${base} (本地冲突).md`, node.workspaceId ?? null)
      await saveDraft(db, copy.id, node.draft ?? '')
    }
    await onApplied?.()
  }

  /** Step 1: stop auto-sync, probe the target, compute the diff. Keeps local
   *  as the temporary source of truth until commitSwitch or cancelSwitch. */
  async function prepareSwitch(targetId) {
    const db = getDb()
    if (!db) return { ok: false, error: 'database not ready' }
    if (!targetId) return { ok: false, error: 'no target endpoint' }
    suspend()
    try {
      const probe = await configRpc('probe', { id: targetId })
      if (!probe.ok) throw new Error(probe.message || 'endpoint probe failed')
      const diff = await diffAgainst(probe.manifest)
      return { ok: true, probe, diff, targetId }
    } catch (error) {
      resume()
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /** Step 2: after the user picks a reconciliation strategy, begin the host
   *  switch, execute it, then commit. Any failure aborts back to the old active. */
  async function commitSwitch(prepared, strategy, onStep = () => {}) {
    if (!suspended || !prepared?.ok) return { ok: false, error: 'switch was not prepared' }
    const { targetId, diff, probe } = prepared
    if (!probe.manifest && strategy !== 'local' && strategy !== 'consistent') {
      cancelSwitch()
      return { ok: false, error: '目标端点为空桶，请选择「以本地为准」' }
    }
    try {
      onStep('begin')
      await configRpc('beginSwitch', { id: targetId })
      try {
        await resetCursor()
        if (strategy === 'local') await push()
        else if (strategy === 'remote') {
          await deleteLocalOnly(diff.onlyLocalIds)
          await pull()
        } else if (strategy === 'merge') {
          await saveConflictCopies(diff.conflictIds)
          await pull()
          await push()
        }
        await configRpc('commitSwitch')
        resume()
        return { ok: true, diff, activeId: targetId }
      } catch (error) {
        await configRpc('abortSwitch').catch(() => {})
        throw error
      }
    } catch (error) {
      resume()
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  function cancelSwitch() { resume() }

  /** Convenience one-shot for tests / programmatic switches. */
  async function switchTo(targetId, strategy, onStep = () => {}) {
    const prepared = await prepareSwitch(targetId)
    if (!prepared.ok) return prepared
    return commitSwitch(prepared, strategy, onStep)
  }

  return {
    start, stop, cycle, pull, push, noteChange,
    suspend, resume, resetCursor, diffAgainst,
    prepareSwitch, commitSwitch, cancelSwitch, switchTo,
    config: configRpc,
    isSuspended: () => suspended,
    info: () => info,
    test: () => rpc(TEST_ROUTE),
    status: () => rpc(STATUS_ROUTE),
  }
}
