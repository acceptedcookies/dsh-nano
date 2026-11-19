/** ConversationViewBuilder for the 'progress' target: keeps ProgressRows by
 *  node key and publishes a denoised flat list plus turn groups. Pure data,
 *  no React/DOM. */
import { rowCounts, rowFromNode, sortRows } from '../rows.js'
import { denoise, groupRows } from '../group.js'

export class ProgressBuilder {
  constructor() {
    this.empty = EMPTY
    this.rows = new Map()
    this.revision = 0
  }

  /** Full window replacement (first activation / prepend replay). */
  replace({ nodes, timeline }) {
    this.rows = new Map()
    for (const node of nodes) {
      const row = rowFromNode(node)
      if (row !== null) this.rows.set(node.key, row)
    }
    return this.snapshot(timeline)
  }

  /** Incremental upserts; unchanged nodes never arrive. */
  apply({ upserts, timeline }) {
    for (const node of upserts) {
      if (node === null) continue
      const row = rowFromNode(node)
      if (row !== null) this.rows.set(node.key, row)
    }
    return this.snapshot(timeline)
  }

  snapshot(timeline) {
    const rows = denoise(sortRows([...this.rows.values()]))
    this.revision += 1
    return {
      rows,
      groups: groupRows(rows),
      timeline,
      counts: rowCounts(rows),
      revision: this.revision,
    }
  }
}

const EMPTY = Object.freeze({
  rows: Object.freeze([]),
  groups: Object.freeze([]),
  timeline: Object.freeze({ turnOrder: Object.freeze([]), turns: Object.freeze(new Map()) }),
  counts: Object.freeze({ total: 0, failed: 0, running: 0, awaiting: 0, byType: Object.freeze({}) }),
  revision: 0,
})
