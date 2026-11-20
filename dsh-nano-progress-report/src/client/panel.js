/** Pure helpers for the footer lists (T-O-16). Kept out of the JSX so the
 *  label and list-selection rules are unit-testable without a renderer. */

/** The list ids the footer can show; persisted as `view` in the tasks key. */
export const PANEL_VIEWS = ['tasks', 'files', 'failures', 'jobs']

/** Persisted view if its list has entries, else Tasks. */
export function activeView(view, counts) {
  return PANEL_VIEWS.includes(view) && view !== 'tasks' && (counts[view] ?? 0) > 0 ? view : 'tasks'
}

/** Changed files, most recently touched first. */
export function filesNewestFirst(files) {
  return [...files].sort((a, b) => (b?.lastSeq ?? 0) - (a?.lastSeq ?? 0))
}

/** `<tool> <label> ×n`: file tools label the path; bash borrows the title the
 *  timeline already shows for that call (view-time only, never written back);
 *  any other tool, or a bash call whose row is not loaded, shows the tool. */
export function failureLabel(failure, titleOf = () => null) {
  const tool = typeof failure?.tool === 'string' && failure.tool !== '' ? failure.tool : 'tool'
  const count = Number.isSafeInteger(failure?.count) && failure.count > 0 ? failure.count : 1
  let label = null
  if (typeof failure?.path === 'string' && failure.path !== '') label = failure.path
  else if (tool === 'bash' && typeof failure?.callId === 'string' && failure.callId !== '') {
    const borrowed = titleOf(failure.callId)
    if (typeof borrowed === 'string' && borrowed !== '') label = borrowed
  }
  return label === null ? `${tool} ×${count}` : `${tool} ${label} ×${count}`
}
