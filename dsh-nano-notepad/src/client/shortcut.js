/** The notepad's two-key chord, kept pure so the platform rules are testable.
 *
 *  macOS uses ⌘E then 1. Windows uses Alt+E then 1: Alt sits where ⌘ sits on a
 *  Mac keyboard, so the gesture lands on the same finger instead of the far
 *  bottom-left Ctrl.
 *
 *  Ctrl stays accepted on Windows as a fallback. Alt+E is also Chrome's "open
 *  the menu" accelerator, and a browser-reserved combo cannot always be
 *  suppressed from the page — if the browser wins the key, the chord never
 *  completes and the user must still have a way in.
 */

/**
 * Human-readable chord for the launcher tooltip.
 * @param {string} platform - `ctx.shortcuts.platform`.
 * @returns {string}
 */
export function chordKeys(platform) {
  return platform === 'windows' ? 'Alt+E 1' : '⌘E1'
}

/**
 * `aria-keyshortcuts` value. Windows advertises both accepted modifiers.
 * @param {string} platform
 * @returns {string}
 */
export function chordAria(platform) {
  return platform === 'windows' ? 'Alt+E+1 Control+E+1' : 'Meta+E+1'
}

/**
 * Whether the platform's chord modifier is held — and only it.
 * @param {{ altKey?: boolean, ctrlKey?: boolean, metaKey?: boolean }} event
 * @param {string} platform
 * @returns {boolean}
 */
export function primaryDown(event, platform) {
  if (platform === 'windows') {
    /* AltGr reports Ctrl+Alt together; requiring exactly one modifier keeps
       layouts where AltGr+E types a character (e.g. €) from arming the chord. */
    const alt = event.altKey === true && event.ctrlKey !== true && event.metaKey !== true
    const ctrl = event.ctrlKey === true && event.altKey !== true && event.metaKey !== true
    return alt || ctrl
  }
  return event.metaKey === true && event.ctrlKey !== true && event.altKey !== true
}
