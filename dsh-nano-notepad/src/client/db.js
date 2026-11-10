/** Browser database for the notepad. One origin, one database. */

export const DB_NAME = 'dsh-nano-notepad'
export const DB_VERSION = 3
export const CHANNEL = 'dsh-nano-notepad'

export const DEFAULT_SETTINGS = {
  autoSave: true,
  draftIntervalMs: 3 * 60 * 1000,
  saveDelayMs: 800,
  commitIntervalSec: 3600,
  versionLimit: 50,
  imageLimitBytes: 5 * 1024 * 1024,
  editorFontSizePx: 14,
  defaultView: 'rendered',
  theme: 'system',
  chromeStyle: 'mac',
  followApp: true,
  followSessionWorkspace: true,
  settingsVersion: 2,
}

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

/** @param {unknown} value */
function record(value) {
  return typeof value === 'object' && value !== null
}

/** @param {unknown} config */
export function normalizeSettings(config) {
  const source = record(config) ? config : {}
  const number = (key, fallback, min, max) => {
    const value = source[key]
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) return fallback
    return value
  }
  /* schema v2: default commit interval 1h; migrate old default 60 → 3600 */
  const legacy = source.settingsVersion !== 2 && source.commitIntervalSec === 60
  return {
    autoSave: source.autoSave !== false,
    draftIntervalMs: number('draftIntervalMs', DEFAULT_SETTINGS.draftIntervalMs, 30 * 1000, 30 * 60 * 1000),
    saveDelayMs: number('saveDelayMs', DEFAULT_SETTINGS.saveDelayMs, 200, 5000),
    commitIntervalSec: legacy ? 3600 : number('commitIntervalSec', DEFAULT_SETTINGS.commitIntervalSec, 15, 86400),
    versionLimit: number('versionLimit', DEFAULT_SETTINGS.versionLimit, 5, 500),
    imageLimitBytes: number('imageLimitBytes', DEFAULT_SETTINGS.imageLimitBytes, 256 * 1024, 20 * 1024 * 1024),
    editorFontSizePx: number('editorFontSizePx', DEFAULT_SETTINGS.editorFontSizePx, 10, 32),
    defaultView: source.defaultView === 'source' ? 'source' : 'rendered',
    theme: source.theme === 'light' || source.theme === 'dark' ? source.theme : 'system',
    chromeStyle: source.chromeStyle === 'windows' ? 'windows' : 'mac',
    followApp: source.followApp !== false,
    followSessionWorkspace: source.followSessionWorkspace !== false,
    settingsVersion: 2,
  }
}

/** @param {IDBRequest<any>} request */
function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('notepad database request failed'))
  })
}

/** @param {IDBTransaction} transaction */
function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve(undefined)
    transaction.onabort = () => reject(transaction.error ?? new Error('notepad database transaction aborted'))
    transaction.onerror = () => reject(transaction.error ?? new Error('notepad database transaction failed'))
  })
}

export function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('nodes')) {
        const nodes = db.createObjectStore('nodes', { keyPath: 'id' })
        nodes.createIndex('parentId', 'parentId', { unique: false })
        nodes.createIndex('workspaceId', 'workspaceId', { unique: false })
      } else if (!request.transaction.objectStore('nodes').indexNames.contains('workspaceId')) {
        request.transaction.objectStore('nodes').createIndex('workspaceId', 'workspaceId', { unique: false })
      }
      if (!db.objectStoreNames.contains('versions')) {
        const versions = db.createObjectStore('versions', { keyPath: 'id' })
        versions.createIndex('fileCreated', ['fileId', 'createdAt'], { unique: false })
      }
      if (!db.objectStoreNames.contains('images')) {
        const images = db.createObjectStore('images', { keyPath: 'id' })
        images.createIndex('sha256', 'sha256', { unique: true })
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' })
      if (!db.objectStoreNames.contains('ui')) db.createObjectStore('ui', { keyPath: 'id' })
      /* v3. Kept so databases already opened at this version do not downgrade. */
      if (!db.objectStoreNames.contains('blobs')) db.createObjectStore('blobs', { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('notepad database failed to open'))
  })
}

/** @param {string} name */
export function validateName(name) {
  const trimmed = name.trim()
  if (trimmed === '' || trimmed.includes('/') || trimmed.includes('\\')) {
    throw new Error('notepad name is empty or contains a slash')
  }
  return trimmed
}

/**
 * A note keeps a recognised extension as typed/imported (.md, .json, .markdown);
 * only extensionless names are completed to .md.
 * @param {string} name
 */
const KNOWN_EXT = /\.(md|markdown|json)$/i

export function fileName(name) {
  const trimmed = validateName(name)
  return KNOWN_EXT.test(trimmed) ? trimmed : `${trimmed}.md`
}

/** @param {{ name: string }[]} siblings @param {string} name */
function taken(siblings, name) {
  const wanted = name.toLowerCase()
  return siblings.some(node => node.name.toLowerCase() === wanted)
}

/** @param {{ name: string }[]} siblings */
export function nextUntitled(siblings) {
  if (!taken(siblings, 'untitled.md')) return 'untitled.md'
  for (let index = 2; index < 10000; index += 1) {
    const name = `untitled-${index}.md`
    if (!taken(siblings, name)) return name
  }
  throw new Error('notepad cannot find an unused untitled name')
}

/** @param {IDBDatabase} db */
async function readAll(db, storeName) {
  const transaction = db.transaction(storeName, 'readonly')
  const rows = await requestToPromise(transaction.objectStore(storeName).getAll())
  await transactionDone(transaction)
  return rows
}

/** Coerce stored nodes into the shape the UI expects; bad rows are skipped. @param {any[]} rows */
export function sanitizeNodes(rows) {
  const clean = []
  const seen = new Set()
  for (const node of Array.isArray(rows) ? rows : []) {
    if (!record(node) || typeof node.id !== 'string' || seen.has(node.id)) continue
    if (node.kind !== 'file' && node.kind !== 'folder') continue
    if (typeof node.name !== 'string' || node.name.trim() === '') {
      node.name = node.kind === 'file' ? 'untitled.md' : 'folder'
    }
    node.parentId = typeof node.parentId === 'string' ? node.parentId : null
    node.workspaceId = typeof node.workspaceId === 'string' ? node.workspaceId : null
    if (typeof node.draft !== 'string') node.draft = node.kind === 'file' ? '' : undefined
    seen.add(node.id)
    clean.push(node)
  }
  return clean
}

/** @param {IDBDatabase} db */
export async function loadSnapshot(db) {
  const [nodes, settingsRows, uiRows] = await Promise.all([
    readAll(db, 'nodes'),
    readAll(db, 'settings'),
    readAll(db, 'ui'),
  ])
  const settings = normalizeSettings(settingsRows[0])
  const ui = record(uiRows[0]) ? uiRows[0] : { id: 'ui', open: false, tabs: [] }
  return { nodes: sanitizeNodes(nodes), settings, ui }
}

/** @param {IDBDatabase} db @param {string} parentId */
async function childrenOf(db, parentId) {
  const transaction = db.transaction('nodes', 'readonly')
  const rows = await requestToPromise(transaction.objectStore('nodes').index('parentId').getAll(parentId))
  await transactionDone(transaction)
  return rows
}

/** @param {IDBDatabase} db @param {string | null} parentId @param {string | null} workspaceId */
async function siblingsOf(db, parentId, workspaceId) {
  const nodes = await readAll(db, 'nodes')
  return nodes.filter(node => node.parentId === parentId && (node.workspaceId ?? null) === workspaceId)
}

/** @param {IDBDatabase} db @param {'folder' | 'file'} kind @param {string | null} parentId @param {string} name @param {string | null} workspaceId */
export async function createNode(db, kind, parentId, name, workspaceId = null) {
  const siblings = await siblingsOf(db, parentId, workspaceId)
  const finalName = kind === 'file' ? fileName(name) : validateName(name)
  if (taken(siblings, finalName)) throw new Error('notepad name is already used in this folder')
  const now = Date.now()
  const node = {
    id: crypto.randomUUID(),
    parentId,
    workspaceId,
    kind,
    name: finalName,
    createdAt: now,
    updatedAt: now,
    ...(kind === 'file' ? { draft: '' } : {}),
  }
  const transaction = db.transaction('nodes', 'readwrite')
  transaction.objectStore('nodes').put(node)
  await transactionDone(transaction)
  return node
}

/** @param {IDBDatabase} db @param {string} id @param {string} name */
export async function renameNode(db, id, name) {
  const rows = await readAll(db, 'nodes')
  const node = rows.find(item => item.id === id)
  if (!node) throw new Error('notepad item no longer exists')
  const finalName = node.kind === 'file' ? fileName(name) : validateName(name)
  const siblings = rows.filter(item => item.parentId === node.parentId && (item.workspaceId ?? null) === (node.workspaceId ?? null))
  if (siblings.some(item => item.id !== id && item.name.toLowerCase() === finalName.toLowerCase())) {
    throw new Error('notepad name is already used in this folder')
  }
  node.name = finalName
  node.updatedAt = Date.now()
  const transaction = db.transaction('nodes', 'readwrite')
  transaction.objectStore('nodes').put(node)
  await transactionDone(transaction)
  return node
}

/** @param {IDBDatabase} db @param {string} id @param {Record<string, unknown>} fields */
export async function updateNodeMeta(db, id, fields) {
  const transaction = db.transaction('nodes', 'readwrite')
  const store = transaction.objectStore('nodes')
  const node = await requestToPromise(store.get(id))
  if (!node) throw new Error('notepad item no longer exists')
  Object.assign(node, fields)
  node.updatedAt = Date.now()
  store.put(node)
  await transactionDone(transaction)
  return node
}

/** @param {IDBDatabase} db @param {string} id @param {boolean} pinned */
export async function pinNode(db, id, pinned) {
  const transaction = db.transaction('nodes', 'readwrite')
  const store = transaction.objectStore('nodes')
  const node = await requestToPromise(store.get(id))
  if (!node || (node.kind !== 'file' && node.kind !== 'folder')) throw new Error('notepad item no longer exists')
  node.pinned = pinned
  node.updatedAt = Date.now()
  store.put(node)
  await transactionDone(transaction)
  return node
}

/** @param {any[]} nodes @param {string} id */
export function descendantIds(nodes, id) {
  const result = []
  const visit = current => {
    for (const node of nodes) {
      if (node.parentId !== current) continue
      result.push(node.id)
      if (node.kind === 'folder') visit(node.id)
    }
  }
  visit(id)
  return result
}

/** @param {IDBDatabase} db @param {string} id @param {string | null} parentId @param {string | null} workspaceId */
export async function moveNode(db, id, parentId, workspaceId = undefined) {
  const nodes = await readAll(db, 'nodes')
  const node = nodes.find(item => item.id === id)
  if (!node) throw new Error('notepad item no longer exists')
  if (parentId !== null && !nodes.some(item => item.id === parentId && item.kind === 'folder')) {
    throw new Error('notepad destination folder no longer exists')
  }
  if (parentId === id || descendantIds(nodes, id).includes(parentId)) {
    throw new Error('notepad cannot move a folder into itself')
  }
  const destination = workspaceId === undefined ? node.workspaceId ?? null : workspaceId
  const siblings = nodes.filter(item => item.parentId === parentId && (item.workspaceId ?? null) === destination && item.id !== id)
  if (taken(siblings, node.name)) throw new Error('notepad name is already used in this folder')
  node.parentId = parentId
  node.workspaceId = destination
  node.updatedAt = Date.now()
  const descendants = descendantIds(nodes, id)
  const transaction = db.transaction('nodes', 'readwrite')
  const store = transaction.objectStore('nodes')
  store.put(node)
  for (const childId of descendants) {
    const child = nodes.find(item => item.id === childId)
    if (child && (child.workspaceId ?? null) !== destination) {
      child.workspaceId = destination
      child.updatedAt = node.updatedAt
      store.put(child)
    }
  }
  await transactionDone(transaction)
  return node
}

/**
 * Deep-copy a file or a whole folder tree into another workspace's top level.
 * Drafts ride on the node record, so clones carry their text; versions and images
 * stay with the source. A name collision in the destination gets a `-N` suffix.
 * @param {IDBDatabase} db @param {string} id @param {string | null} workspaceId
 */
export async function copyNode(db, id, workspaceId = null) {
  const nodes = await readAll(db, 'nodes')
  const source = nodes.find(item => item.id === id)
  if (!source) throw new Error('notepad item no longer exists')
  const destination = workspaceId ?? null
  const topSiblings = nodes.filter(item => item.parentId === null && (item.workspaceId ?? null) === destination)
  const isFile = source.kind === 'file'
  const m = isFile ? source.name.match(KNOWN_EXT) : null
  const base = m ? source.name.slice(0, -m[0].length) : source.name
  const ext = m ? m[0] : ''
  let name = source.name, i = 1
  while (topSiblings.some(item => item.name === name)) name = `${base}-${++i}${ext}`
  const now = Date.now()
  const clones = []
  const map = new Map()
  const clone = (node, parentId) => {
    const copy = { ...node, id: crypto.randomUUID(), parentId, workspaceId: destination, createdAt: now, updatedAt: now }
    if (parentId === null) copy.name = name
    map.set(node.id, copy.id)
    clones.push({ copy, from: node })
    for (const child of nodes.filter(item => item.parentId === node.id)) clone(child, copy.id)
  }
  clone(source, null)
  const transaction = db.transaction('nodes', 'readwrite')
  const store = transaction.objectStore('nodes')
  for (const { copy } of clones) store.put(copy)
  await transactionDone(transaction)
  return clones[0].copy
}

/** @param {string} markdown */
export function imageIdsIn(markdown) {
  return [...markdown.matchAll(/notepad-image:([0-9a-f-]{36})/gu)].map(match => match[1])
}

/** @param {IDBDatabase} db @param {Set<string>} live */
async function dropOrphanImages(store, live) {
  const images = await requestToPromise(store.getAll())
  for (const image of images) {
    if (!live.has(image.id)) store.delete(image.id)
  }
}

/** @param {IDBDatabase} db @param {string} id */
export async function deleteNode(db, id) {
  const nodes = await readAll(db, 'nodes')
  const target = nodes.find(item => item.id === id)
  if (!target) return
  const ids = new Set([id, ...descendantIds(nodes, id)])
  const removedFiles = nodes.filter(node => ids.has(node.id) && node.kind === 'file').map(node => node.id)
  const transaction = db.transaction(['nodes', 'versions', 'images'], 'readwrite')
  const nodeStore = transaction.objectStore('nodes')
  const versionStore = transaction.objectStore('versions')
  const imageStore = transaction.objectStore('images')
  for (const nodeId of ids) nodeStore.delete(nodeId)
  const versions = await requestToPromise(versionStore.getAll())
  const removedVersions = versions.filter(version => removedFiles.includes(version.fileId))
  for (const version of removedVersions) versionStore.delete(version.id)
  const remaining = versions.filter(version => !removedFiles.includes(version.fileId))
  const live = new Set()
  for (const node of nodes) {
    if (node.kind !== 'file' || ids.has(node.id)) continue
    for (const imageId of imageIdsIn(node.draft ?? '')) live.add(imageId)
  }
  for (const version of remaining) {
    for (const imageId of version.imageIds ?? []) live.add(imageId)
  }
  await dropOrphanImages(imageStore, live)
  await transactionDone(transaction)
}

/** @param {IDBDatabase} db @param {string} fileId */
export async function versionsOf(db, fileId) {
  const transaction = db.transaction('versions', 'readonly')
  const rows = await requestToPromise(transaction.objectStore('versions').index('fileCreated').getAll(IDBKeyRange.bound([fileId, 0], [fileId, Number.MAX_SAFE_INTEGER])))
  await transactionDone(transaction)
  return rows.sort((left, right) => right.createdAt - left.createdAt)
}

/** @param {IDBDatabase} db @param {string} fileId @param {string} markdown @param {'interval' | 'manual' | 'restore'} reason @param {number} limit */
export async function commitVersion(db, fileId, markdown, reason, limit) {
  const transaction = db.transaction(['nodes', 'versions', 'images'], 'readwrite')
  const nodeStore = transaction.objectStore('nodes')
  const versionStore = transaction.objectStore('versions')
  const node = await requestToPromise(nodeStore.get(fileId))
  if (!node || node.kind !== 'file') {
    transaction.abort()
    throw new Error('notepad file no longer exists')
  }
  const rows = await requestToPromise(versionStore.index('fileCreated').getAll(IDBKeyRange.bound([fileId, 0], [fileId, Number.MAX_SAFE_INTEGER])))
  const newest = rows.reduce((best, row) => best === undefined || row.createdAt > best.createdAt ? row : best, undefined)
  if (newest?.markdown === markdown) {
    transaction.abort()
    return null
  }
  const version = {
    id: crypto.randomUUID(),
    fileId,
    createdAt: Date.now(),
    reason,
    markdown,
    imageIds: imageIdsIn(markdown),
  }
  versionStore.put(version)
  node.draft = markdown
  node.updatedAt = version.createdAt
  nodeStore.put(node)
  const kept = [...rows, version].sort((left, right) => left.createdAt - right.createdAt)
  const automatic = kept.filter(row => row.reason === 'interval')
  const overflow = kept.length - limit
  const drop = new Set()
  if (overflow > 0) {
    for (const row of automatic) {
      if (drop.size >= overflow) break
      drop.add(row.id)
    }
  }
  if (kept.length - drop.size > limit) {
    for (const row of kept) {
      if (kept.length - drop.size <= limit) break
      if (row.reason !== 'interval') drop.add(row.id)
    }
  }
  for (const id of drop) versionStore.delete(id)
  await transactionDone(transaction)
  await pruneImages(db)
  return version
}

/** @param {IDBDatabase} db */
async function pruneImages(db) {
  const transaction = db.transaction(['nodes', 'versions', 'images'], 'readwrite')
  const nodes = await requestToPromise(transaction.objectStore('nodes').getAll())
  const versions = await requestToPromise(transaction.objectStore('versions').getAll())
  const live = new Set()
  for (const node of nodes) {
    if (node.kind === 'file') for (const id of imageIdsIn(node.draft ?? '')) live.add(id)
  }
  for (const version of versions) for (const id of version.imageIds ?? []) live.add(id)
  await dropOrphanImages(transaction.objectStore('images'), live)
  await transactionDone(transaction)
}

/** @param {IDBDatabase} db @param {string} fileId @param {string} draft */
export async function saveDraft(db, fileId, draft) {
  const transaction = db.transaction('nodes', 'readwrite')
  const store = transaction.objectStore('nodes')
  const node = await requestToPromise(store.get(fileId))
  if (!node || node.kind !== 'file') {
    transaction.abort()
    throw new Error('notepad file no longer exists')
  }
  if (node.draft === draft) {
    transaction.abort()
    return node
  }
  node.draft = draft
  node.updatedAt = Date.now()
  store.put(node)
  await transactionDone(transaction)
  return node
}

/** @param {IDBDatabase} db */
export async function clearContent(db) {
  const transaction = db.transaction(['nodes', 'versions', 'images'], 'readwrite')
  transaction.objectStore('nodes').clear()
  transaction.objectStore('versions').clear()
  transaction.objectStore('images').clear()
  await transactionDone(transaction)
}

/** @param {IDBDatabase} db @param {Record<string, unknown>} settings */
export async function writeSettings(db, settings) {
  const transaction = db.transaction('settings', 'readwrite')
  transaction.objectStore('settings').put({ id: 'settings', ...normalizeSettings(settings) })
  await transactionDone(transaction)
}

/** @param {IDBDatabase} db @param {Record<string, unknown>} ui */
export async function writeUi(db, ui) {
  const transaction = db.transaction('ui', 'readwrite')
  transaction.objectStore('ui').put({ ...ui, id: 'ui' })
  await transactionDone(transaction)
}

/** @param {Blob} blob */
async function sha256(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return {
    bytes,
    hex: [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join(''),
  }
}

/** @param {Uint8Array} bytes */
function toBase64(bytes) {
  let text = ''
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    text += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(text)
}

/** @param {IDBDatabase} db @param {Blob} blob @param {number} limit */
export async function storeImage(db, blob, limit) {
  if (!IMAGE_TYPES.has(blob.type)) throw new Error('notepad accepts png, jpeg, gif, and webp images')
  if (blob.size > limit) throw new Error('notepad image is larger than the configured limit')
  const hashed = await sha256(blob)
  const transaction = db.transaction('images', 'readwrite')
  const store = transaction.objectStore('images')
  const existing = await requestToPromise(store.index('sha256').get(hashed.hex))
  if (existing) {
    await transactionDone(transaction)
    return existing
  }
  const image = {
    id: crypto.randomUUID(),
    mime: blob.type,
    base64: toBase64(hashed.bytes),
    sha256: hashed.hex,
    byteLength: hashed.bytes.byteLength,
    createdAt: Date.now(),
  }
  store.put(image)
  await transactionDone(transaction)
  return image
}

/** @param {IDBDatabase} db @param {string[]} ids */
export async function imagesById(db, ids) {
  const unique = [...new Set(ids)]
  const transaction = db.transaction('images', 'readonly')
  const store = transaction.objectStore('images')
  const rows = await Promise.all(unique.map(id => requestToPromise(store.get(id))))
  await transactionDone(transaction)
  return new Map(rows.filter(Boolean).map(row => [row.id, row]))
}

/** @param {IDBDatabase} db */
export async function counts(db) {
  const [nodes, versions, images] = await Promise.all([
    readAll(db, 'nodes'),
    readAll(db, 'versions'),
    readAll(db, 'images'),
  ])
  return {
    files: nodes.filter(node => node.kind === 'file').length,
    versions: versions.length,
    images: images.length,
  }
}

export const testables = { childrenOf }
