// Keyboard → PTY byte encoding (xterm-compatible sequences).
// Encodes on the client: the lane always carries bytes, never key events.

import { MODES } from './wasm.js'

const encoder = new TextEncoder()

/** Encode one keydown into bytes to send. Returns Uint8Array | null. */
export function encodeKey(ev, modes) {
  const appCursor = !!(modes & MODES.APP_CURSOR)
  const appKeypad = !!(modes & MODES.APP_KEYPAD)
  const k = ev.key

  // macOS Command passes through to the shell for the few combos people use
  // inside terminals (Cmd+C is handled by the copy path, not here).
  if (ev.metaKey) {
    if (k === 'v' || k === 'c') return null // let browser handlers do paste/copy
    return null
  }
  if (ev.ctrlKey && k.length === 1) {
    const ch = k.toLowerCase().charCodeAt(0)
    if (ch >= 97 && ch <= 122) return bytesOf([ch - 96]) // Ctrl+A..Z → 0x01..0x1a
    switch (k) {
      case '[': return ESC_SEQ
      case '\\': return bytesOf([0x1c])
      case ']': return bytesOf([0x1d])
      case '^': return bytesOf([0x1e])
      case '_': return bytesOf([0x1f])
      case ' ': return bytesOf([0x00])
      case '?': return bytesOf([0x7f])
    }
  }
  if (ev.altKey && k.length === 1) {
    return encoder.encode('\x1b' + k)
  }

  if (k.length === 1) return encoder.encode(k)

  const mod = modParam(ev)
  const csi = (body) => encoder.encode(`\x1b[${body}`)
  const ss3 = (ch) => encoder.encode(`\x1bO${ch}`)

  switch (k) {
    case 'Enter': return bytesOf([0x0d])
    case 'Backspace': return bytesOf([0x7f])
    case 'Tab': return ev.shiftKey ? csi('Z') : bytesOf([0x09])
    case 'Escape': return ESC_SEQ
    case 'ArrowUp': return arrow('A', appCursor, mod)
    case 'ArrowDown': return arrow('B', appCursor, mod)
    case 'ArrowRight': return arrow('C', appCursor, mod)
    case 'ArrowLeft': return arrow('D', appCursor, mod)
    case 'Home': return mod ? csi(`1;${mod}H`) : (appCursor ? ss3('H') : csi('H'))
    case 'End': return mod ? csi(`1;${mod}F`) : (appCursor ? ss3('F') : csi('F'))
    case 'PageUp': return csi(`5${mod ? ';' + mod : ''}~`)
    case 'PageDown': return csi(`6${mod ? ';' + mod : ''}~`)
    case 'Insert': return csi(`2${mod ? ';' + mod : ''}~`)
    case 'Delete': return csi(`3${mod ? ';' + mod : ''}~`)
    case 'F1': return ss3('P')
    case 'F2': return ss3('Q')
    case 'F3': return ss3('R')
    case 'F4': return ss3('S')
    case 'F5': return csi(`15${mod ? ';' + mod : ''}~`)
    case 'F6': return csi(`17${mod ? ';' + mod : ''}~`)
    case 'F7': return csi(`18${mod ? ';' + mod : ''}~`)
    case 'F8': return csi(`19${mod ? ';' + mod : ''}~`)
    case 'F9': return csi(`20${mod ? ';' + mod : ''}~`)
    case 'F10': return csi(`21${mod ? ';' + mod : ''}~`)
    case 'F11': return csi(`23${mod ? ';' + mod : ''}~`)
    case 'F12': return csi(`24${mod ? ';' + mod : ''}~`)
    case 'ContextMenu': return null
    default:
      if (k.startsWith('Dead')) return null
      if (k === 'Unidentified') return null
      return null
  }

  function arrow(letter, app, m) {
    if (m) return csi(`1;${m}${letter}`)
    return app ? ss3(letter) : csi(letter)
  }
}

function modParam(ev) {
  let m = 1
  if (ev.shiftKey) m += 1
  if (ev.altKey) m += 2
  if (ev.ctrlKey) m += 4
  return m > 1 ? m : 0
}

function bytesOf(arr) {
  return new Uint8Array(arr)
}

const ESC_SEQ = new Uint8Array([0x1b])

/** Encode pasted text honoring bracketed-paste mode. */
export function encodePaste(text, modes) {
  const normalized = text.replace(/\r?\n/g, '\r')
  if (modes & MODES.BRACKETED_PASTE) {
    return encoder.encode('\x1b[200~' + normalized + '\x1b[201~')
  }
  return encoder.encode(normalized)
}

/** Encode an SGR mouse report. btn: 0 left,1 mid,2 right; release uses btn|3 semantics. */
export function encodeMouse(modes, { btn, x, y, release, wheel, shift, alt, ctrl }) {
  if (!(modes & (MODES.MOUSE_CLICK | MODES.MOUSE_BTN_MOTION | MODES.MOUSE_ANY_MOTION))) return null
  let code = btn
  if (wheel) code = (wheel === 'up' ? 64 : 65) | 0
  else if (release && !(modes & MODES.MOUSE_SGR)) code = 3
  if (shift) code |= 4
  if (alt) code |= 8
  if (ctrl) code |= 16
  const X = x + 1
  const Y = y + 1
  if (modes & MODES.MOUSE_SGR) {
    return encoder.encode(`\x1b[<${code};${X};${Y}${release && !wheel ? 'm' : 'M'}`)
  }
  return encoder.encode(`\x1b[M${String.fromCharCode(32 + code)}${String.fromCharCode(32 + X)}${String.fromCharCode(32 + Y)}`)
}

/** Focus in/out report (mode 1004). */
export function encodeFocus(modes, focused) {
  if (!(modes & MODES.FOCUS_EVENTS)) return null
  return encoder.encode(focused ? '\x1b[I' : '\x1b[O')
}
