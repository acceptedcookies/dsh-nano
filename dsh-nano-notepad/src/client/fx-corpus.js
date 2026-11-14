/**
 * fx-corpus.js — five-kind 语料层（IDB）。
 *
 * `cat` carries the five-kind taxonomy: prompt|note|draft|knowledge|memory.
 * (`kind` stays file/folder for tree semantics.) Machine artifacts carry
 * draftStatus/supersedes/rejectCount/via/epoch (§10.1).
 *
 * prompt/note = human kinds (machine writes land draft/knowledge only).
 * draft = machine-exclusive, reject-only: pending → reject(feedback) → supersedes chain.
 */

import * as db from './db.js'

export const KINDS = ['prompt', 'note', 'draft', 'knowledge', 'memory']
const MACHINE_WRITE_KINDS = new Set(['draft', 'knowledge'])

/** All corpus nodes (file nodes with a `cat` in KINDS). */
async function corpusNodes(idb) {
  const snap = await db.loadSnapshot(idb)
  return snap.nodes.filter(n => n.kind === 'file' && KINDS.includes(n.cat))
}

/** Corpus handle bound to the open IDB + a writer/epoch identity.
 *  `workspaceId` scopes machine-written artifacts to the tree's visible
 *  workspace. Accepts a value or a zero-arg getter — the workspace catalog
 *  hydrates after page boot, so it is resolved at each write, not captured
 *  once. */
export function createCorpus(idb, { writerId = 'notepad-fx', epochId = 'e0', workspaceId = null } = {}) {
  const wsOf = typeof workspaceId === 'function' ? workspaceId : () => workspaceId
  return {
    /** note_read: {id} or {kind,name} → {id,cat,name,content,meta}. */
    async read({ id, kind, name }) {
      const nodes = await corpusNodes(idb)
      let node = id ? nodes.find(n => n.id === id) : null
      if (!node && name) {
        node = nodes.find(n => n.name === name && (!kind || n.cat === kind))
      }
      if (!node) return { content: `not found: ${id ?? `${kind}/${name}`}`, isError: true }
      return {
        content: JSON.stringify({
          id: node.id, cat: node.cat, name: node.name,
          content: node.draft ?? '', draftStatus: node.draftStatus ?? null,
          supersedes: node.supersedes ?? null, rejectCount: node.rejectCount ?? 0,
          createdAt: node.createdAt, updatedAt: node.updatedAt,
        }),
      }
    },

    /** note_write: {kind:draft|knowledge, name, content, supersedes?, via?} → {id,cat}. */
    async write({ kind, name, content, supersedes, via }) {
      if (!MACHINE_WRITE_KINDS.has(kind)) {
        return { content: `kind must be draft|knowledge (got ${kind})`, isError: true }
      }
      const finalName = name || `${kind}-${Date.now().toString(36)}.md`
      // Unique-name retry: createNode throws on collision, append -2/-3…
      let node = null
      for (let attempt = 0; attempt < 6 && !node; attempt += 1) {
        try {
          node = await db.createNode(idb, 'file', null, attempt === 0 ? finalName : `${attempt + 1}-${finalName}`, wsOf())
        } catch { /* collision → retry */ }
      }
      if (!node) return { content: `name taken: ${finalName}`, isError: true }
      const meta = {
        cat: kind,
        draftStatus: kind === 'draft' ? 'pending' : undefined,
        rejectCount: 0,
        via: via && typeof via === 'object' ? via : { promptId: null, runId: null, epochId, at: Date.now() },
        epoch: epochId,
      }
      if (supersedes) meta.supersedes = supersedes
      await db.updateNodeMeta(idb, node.id, meta)
      await db.saveDraft(idb, node.id, String(content ?? ''))
      return {
        content: JSON.stringify({ id: node.id, cat: kind, name: node.name, supersedes: supersedes ?? null }),
      }
    },

    /** note_kind_get: {kind,limit?} → [{id,cat,name,createdAt}] newest-first. */
    async kindGet({ kind, limit = 50 }) {
      const nodes = (await corpusNodes(idb))
        .filter(n => n.cat === kind)
        .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
        .slice(0, limit)
        .map(n => ({ id: n.id, cat: n.cat, name: n.name, createdAt: n.createdAt }))
      return { content: JSON.stringify(nodes) }
    },

    /** note_search: {query,kind?,limit?} → [{id,cat,name,excerpt}]. */
    async search({ query, kind, limit = 20 }) {
      const q = String(query ?? '').toLowerCase()
      if (!q) return { content: JSON.stringify([]) }
      const hits = (await corpusNodes(idb))
        .filter(n => (!kind || n.cat === kind))
        .filter(n => (n.name ?? '').toLowerCase().includes(q) || (n.draft ?? '').toLowerCase().includes(q))
        .slice(0, limit)
        .map(n => ({
          id: n.id, cat: n.cat, name: n.name,
          excerpt: String(n.draft ?? '').slice(0, 120),
        }))
      return { content: JSON.stringify(hits) }
    },
  }
}

/**
 * draft 状态机：reject(feedback) → 记录 supersedes 源 + rejectCount+1，
 * 产物本身标记 rejected（不删；谱系可查）。返回 {id,supersedesOf,rejectCount}。
 */
export async function rejectDraft(idb, id, feedback = '') {
  const node = (await db.loadSnapshot(idb)).nodes.find(n => n.id === id)
  if (!node || node.cat !== 'draft') throw new Error('not a draft node')
  const count = (node.rejectCount ?? 0) + 1
  await db.updateNodeMeta(idb, id, {
    draftStatus: 'rejected',
    rejectCount: count,
    rejectedAt: Date.now(),
    rejectFeedback: String(feedback).slice(0, 500),
  })
  return { id, rejectCount: count, status: 'rejected' }
}

/** Lineage view: supersedes chain for one artifact (newest-first). */
export async function lineage(idb, id) {
  const nodes = await corpusNodes(idb)
  const chain = []
  let cursor = nodes.find(n => n.id === id)
  const seen = new Set()
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id)
    chain.push({ id: cursor.id, name: cursor.name, cat: cursor.cat, rejectCount: cursor.rejectCount ?? 0, draftStatus: cursor.draftStatus ?? null })
    cursor = cursor.supersedes ? nodes.find(n => n.id === cursor.supersedes) : null
  }
  return chain
}
