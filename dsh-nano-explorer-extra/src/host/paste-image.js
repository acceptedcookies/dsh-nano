/** Clipboard image bytes: sniff, name, and an exclusive create. No text write. */

import { writeFile } from 'node:fs/promises'

/** Decoded image cap. A retina screenshot fits; the JSON envelope is larger. */
export const PASTE_IMAGE_MAX_BYTES = 8 * 1024 * 1024

/** Base64 envelope cap. 8MB of bytes expands by 4/3, plus a small JSON wrapper. */
export const PASTE_IMAGE_BODY_BYTES = 12 * 1024 * 1024

/** How many `name`, `name-2`, … attempts one paste will try before refusing. */
export const PASTE_NAME_TRIES = 100

const EXTENSION = { png: 'png', jpeg: 'jpg', gif: 'gif', webp: 'webp' }

/**
 * Identify a bitmap by its leading bytes.
 *
 * The client-supplied media type is not consulted. SVG is intentionally absent:
 * it can carry script, and a screenshot is never SVG.
 * @param bytes - raw file bytes.
 * @returns `png`, `jpeg`, `gif`, `webp`, or null.
 */
export function sniffImage(bytes) {
  if (bytes == null || bytes.length < 3) return null
  const b = bytes
  if (b.length >= 8
    && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47
    && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png'
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpeg'
  if (b.length >= 6
    && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38
    && (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61) return 'gif'
  if (b.length >= 12
    && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
    && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp'
  return null
}

/** @param {string} kind - sniff result. */
export function extensionFor(kind) {
  return EXTENSION[kind]
}

const IMAGE_SUFFIX = /\.(png|jpe?g|gif|webp)$/iu

/**
 * Names to try, in order. The first is the stem plus the sniffed extension.
 * A collision uses `stem-2.ext`, then `stem-3.ext`. The stem comes from the
 * clipboard filename when it is a real basename; a blank or `image.png`
 * screenshot falls through to `image`.
 * @param preferred - clipboard filename, or empty.
 * @param ext - sniffed extension, without the dot.
 * @returns up to {@link PASTE_NAME_TRIES} basenames.
 */
export function candidateNames(preferred, ext) {
  let stem = 'image'
  if (typeof preferred === 'string') {
    let base = preferred.trim().split(/[/\\]/u).pop() ?? ''
    if (base !== '' && base !== '.' && base !== '..' && !base.includes('\0')) {
      base = base.replace(IMAGE_SUFFIX, '').trim().replace(/[. ]+$/u, '')
      if (base !== '' && base !== '.' && base !== '..' && !/[/\\\0]/u.test(base)) stem = base
    }
  }
  const names = []
  for (let n = 1; n <= PASTE_NAME_TRIES; n += 1) {
    names.push(n === 1 ? `${stem}.${ext}` : `${stem}-${n}.${ext}`)
  }
  return names
}

/**
 * Decode one base64 image body.
 * @param data - JSON `data` field.
 * @returns the decoded bytes.
 */
export function decodeImageData(data) {
  if (typeof data !== 'string' || data.trim() === '') throw new Error('image data is required')
  if (!/^[A-Za-z0-9+/=\s]+$/u.test(data)) throw new Error('image data is not base64')
  const bytes = Buffer.from(data, 'base64')
  if (bytes.length === 0) throw new Error('image is empty')
  if (bytes.length > PASTE_IMAGE_MAX_BYTES) throw new Error('image is larger than 8MB')
  return bytes
}

/**
 * Create one file, failing if it already exists.
 *
 * The host filesystem service only writes UTF-8 (`writeText`) and rejects
 * binary, so a PNG cannot go through it. Callers must already have fenced
 * the path. `wx` is the exclusive-create flag: a race with an existing file
 * throws `EEXIST` instead of truncating it.
 * @param path - absolute destination.
 * @param bytes - image bytes.
 */
export async function writeExclusiveFile(path, bytes) {
  await writeFile(path, bytes, { flag: 'wx' })
}
