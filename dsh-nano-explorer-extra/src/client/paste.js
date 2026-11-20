/** What a file-tree paste is willing to take from the clipboard. */

/** Bitmap types a screenshot or "copy image" actually puts on the clipboard. */
export const PASTE_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp'])

/** Same decoded cap the host enforces. Checked before the request is built. */
export const PASTE_IMAGE_MAX_BYTES = 8 * 1024 * 1024

/**
 * The first bitmap on a paste event, or null when the clipboard has none.
 *
 * Text, files that are not images, and SVG are ignored so the paste is left
 * to whoever else is focused. The host still sniffs the bytes; this only
 * decides whether the tree claims the gesture.
 * @param clipboardData - the event's clipboard.
 * @returns a File, or null.
 */
export function clipboardImage(clipboardData) {
  if (clipboardData == null) return null
  const items = clipboardData.items
  if (items != null) {
    for (const item of items) {
      if (item?.kind === 'file' && PASTE_IMAGE_TYPES.has(item.type) && typeof item.getAsFile === 'function') {
        const file = item.getAsFile()
        if (file) return file
      }
    }
  }
  const files = clipboardData.files
  if (files != null) {
    for (const file of files) {
      if (PASTE_IMAGE_TYPES.has(file?.type)) return file
    }
  }
  return null
}

/**
 * True when the paste landed in a field that already owns the gesture.
 * @param target - event target.
 * @returns whether the tree must leave the paste alone.
 */
export function pasteTargetIsEditable(target) {
  if (target == null || typeof target.closest !== 'function') return false
  return target.closest('input, textarea, [contenteditable="true"]') != null
}

/**
 * A clipboard filename the host may use as a stem. Empty when there is none.
 * The host still rejects separators and picks the extension from the bytes.
 * @param fileName - `File.name`.
 * @returns a basename, or `''`.
 */
export function preferredPasteName(fileName) {
  if (typeof fileName !== 'string') return ''
  const base = fileName.split(/[/\\]/u).pop()?.trim() ?? ''
  if (base === '' || base === '.' || base === '..' || base.includes('\0')) return ''
  return base
}

/**
 * Encode bytes as base64 without blowing the argument limit of `btoa`.
 * @param bytes - image bytes.
 * @returns a base64 string.
 */
export function bytesToBase64(bytes) {
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}
