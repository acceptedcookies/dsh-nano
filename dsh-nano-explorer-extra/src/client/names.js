/** Unique default names for newly created entries, matching the notepad plugin's strategy. */

/** File extension appended when the proposed name has none. */
const FILE_SUFFIX = '.md'

/**
 * Pick the first unused default name in one directory.
 * @param kind - `file` or `folder`, which selects the base name.
 * @param siblings - entries already listed in that directory.
 * @returns a name no sibling uses, ignoring case.
 */
export function nextName(kind, siblings) {
  const base = kind === 'file' ? 'untitled' : 'new-folder'
  const taken = new Set((siblings ?? []).map(entry => String(entry.name ?? '').toLowerCase()))
  const compose = index => kind === 'file'
    ? `${base}${index === 1 ? '' : `-${index}`}${FILE_SUFFIX}`
    : `${base}${index === 1 ? '' : `-${index}`}`
  for (let index = 1; index < 10000; index += 1) {
    const candidate = compose(index)
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
  throw new Error('cannot find an unused name')
}

/**
 * Validate a proposed entry name, returning the reason rather than throwing.
 * @param name - proposed basename.
 * @param copy - the active language dictionary.
 * @returns `{ ok: true, name }` or `{ ok: false, message }`.
 */
export function checkName(name, copy) {
  const trimmed = String(name ?? '').trim()
  if (trimmed === '') return { ok: false, message: copy.nameEmpty }
  if (trimmed === '.' || trimmed === '..') return { ok: false, message: copy.invalidName }
  if (/[/\\\0]/u.test(trimmed)) return { ok: false, message: copy.nameSlash }
  return { ok: true, name: trimmed }
}
