/** Honest completion timestamps for the Tasks footer.
 *
 *  That a task is completed comes from the official `todos` projection; WHEN
 *  it completed is not a projection field. The event stream has it: every
 *  `todo/write` carries the whole list at an event time, so the first snapshot
 *  in which an item appears as `completed` is its completion time. Nothing is
 *  invented for items that only arrived already-completed from an older window.
 *
 *  @param {readonly object[]} rows - denoised, seq-sorted ProgressRows.
 *  @returns {Map<string, number>} task content → epoch ms of first completion.
 */
export function taskCompletionTimes(rows) {
  const at = new Map()
  for (const row of rows ?? []) {
    if (row?.type !== 'todo' || !Array.isArray(row.detail?.todos)) continue
    if (typeof row.time !== 'number' || !Number.isFinite(row.time)) continue
    for (const item of row.detail.todos) {
      if (item?.status !== 'completed') continue
      const content = typeof item.content === 'string' ? item.content : ''
      if (content === '') continue
      if (!at.has(content)) at.set(content, row.time)
    }
  }
  return at
}
