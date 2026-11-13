// Canvas renderer for dnt-core packed rows.
// Two stacked canvases per pane: base (text) + cursor overlay.
// Dirty-row repaint only; scroll triggers full repaint via wasm dirty-all.

import { MODES } from './wasm.js'

// ---------------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------------

const ANSI_DARK = [
  '#0d1117', '#f85149', '#56d364', '#e3b341', '#58a6ff', '#bc8cff', '#39c5cf', '#b1bac4',
  '#484f58', '#ff7b72', '#7ee787', '#f2cc60', '#79c0ff', '#d2a8ff', '#56d4dd', '#f0f6fc',
]

export function buildPalette(host) {
  // 256-color table: 16 ANSI + 6x6x6 cube + 24 grays
  const idx = new Array(256)
  const base = ANSI_DARK
  for (let i = 0; i < 16; i++) idx[i] = base[i]
  const levels = [0, 95, 135, 175, 215, 255]
  for (let i = 16; i < 232; i++) {
    const v = i - 16
    const r = levels[Math.floor(v / 36) % 6]
    const g = levels[Math.floor(v / 6) % 6]
    const b = levels[v % 6]
    idx[i] = `rgb(${r},${g},${b})`
  }
  for (let i = 232; i < 256; i++) {
    const v = 8 + (i - 232) * 10
    idx[i] = `rgb(${v},${v},${v})`
  }
  // Chrome-adjacent colors come from the workbench theme, not hardcodes: the
  // pane surface, default foreground, and cursor track --dsw-alias-* tokens.
  const probe = host ?? document.documentElement
  const css = (name, fallback) =>
    getComputedStyle(probe).getPropertyValue(name).trim() || fallback
  const bg = css('--dsw-alias-bg-base', base[0])
  return {
    idx,
    fg: css('--dsw-alias-label-primary', base[15]),
    bg,
    cursor: css('--dsw-alias-brand-primary', css('--dsw-alias-link', base[4])),
    border: css('--dsw-alias-border-l3', '#30363d'),
    paneBg: bg,
  }
}

const C_IDX = 1 << 30
const C_RGB = 2 << 30
const C_KIND = 3 << 30

function resolveColor(palette, packed, fallback, bold) {
  const kind = packed & C_KIND
  if (kind === C_RGB) {
    const v = packed & 0xffffff
    return `rgb(${(v >> 16) & 0xff},${(v >> 8) & 0xff},${v & 0xff})`
  }
  if (kind === C_IDX) {
    let i = packed & 0xff
    if (bold && i < 8) i += 8 // classic bold-brightens
    return palette.idx[i]
  }
  return fallback
}

// ---------------------------------------------------------------------------
// Attr bits (mirror of lib.rs)
// ---------------------------------------------------------------------------

const A_BOLD = 1
const A_DIM = 2
const A_ITALIC = 4
const A_BLINK = 8
const A_INVERSE = 16
const A_INVISIBLE = 32
const A_STRIKE = 64
const A_UNDER_SHIFT = 7

// ---------------------------------------------------------------------------
// TermCanvas
// ---------------------------------------------------------------------------

export class TermCanvas {
  /**
   * @param {HTMLElement} container - positioning context, overflow hidden
   * @param {object} palette
   * @param {object} font - {family, size}
   */
  constructor(container, palette, font) {
    this.container = container
    this.palette = palette
    this.fontSize = font.size
    this.fontFamily = font.family
    this.dpr = Math.max(1, Math.round(window.devicePixelRatio || 1))
    this.base = document.createElement('canvas')
    this.overlay = document.createElement('canvas')
    for (const c of [this.base, this.overlay]) {
      c.style.position = 'absolute'
      c.style.left = '0'
      c.style.top = '0'
      c.style.pointerEvents = 'none'
    }
    this.overlay.style.zIndex = '2'
    container.appendChild(this.base)
    container.appendChild(this.overlay)
    this.bctx = this.base.getContext('2d', { alpha: false })
    this.octx = this.overlay.getContext('2d')
    this.cols = 0
    this.rows = 0
    this.measure()
    this.cursorOn = true
    this.cursorRow = -1
    this.cursorX = 0
    this._blinkTimer = null
  }

  dispose() {
    clearInterval(this._blinkTimer)
    this.base.remove()
    this.overlay.remove()
  }

  font(bold, italic) {
    return `${italic ? 'italic ' : ''}${bold ? '600' : '400'} ${this.fontSize}px ${this.fontFamily}`
  }

  measure() {
    const probe = document.createElement('canvas').getContext('2d')
    probe.font = this.font(false, false)
    const w = probe.measureText('W')
    this.charW = Math.max(1, Math.round(w.width))
    const ascent = w.fontBoundingBoxAscent ?? Math.ceil(this.fontSize * 0.85)
    const descent = w.fontBoundingBoxDescent ?? Math.ceil(this.fontSize * 0.3)
    this.charH = Math.max(2, ascent + descent + Math.ceil(this.fontSize * 0.15))
    this.baseline = ascent + Math.ceil(this.fontSize * 0.075)
  }

  /** Resize canvases to fit the container; returns {cols, rows, changed}. */
  fit(cols, rows) {
    const dpr = this.dpr
    const w = this.cols * this.charW
    const h = this.rows * this.charH
    if (cols !== this.cols || rows !== this.rows) {
      this.cols = cols
      this.rows = rows
      for (const c of [this.base, this.overlay]) {
        c.width = this.cols * this.charW * dpr
        c.height = this.rows * this.charH * dpr
        c.style.width = `${this.cols * this.charW}px`
        c.style.height = `${this.rows * this.charH}px`
      }
      this.bctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.octx.setTransform(dpr, 0, 0, dpr, 0, 0)
      this.bctx.fillStyle = this.palette.bg
      this.bctx.fillRect(0, 0, this.cols * this.charW, this.rows * this.charH)
      return true
    }
    return false
  }

  cellX(col) { return col * this.charW }
  cellY(row) { return row * this.charH }

  clearAll() {
    this.bctx.fillStyle = this.palette.bg
    this.bctx.fillRect(0, 0, this.cols * this.charW, this.rows * this.charH)
    this.octx.clearRect(0, 0, this.cols * this.charW, this.rows * this.charH)
  }

  /**
   * Paint dirty rows from wasm render(). `packed` is the decoded object.
   */
  paint(packed, scrollbackActive) {
    const ctx = this.bctx
    const pal = this.palette
    const cursorRow = packed.cursorAbsY - packed.viewStart
    this.cursorRow = cursorRow
    this.cursorX = packed.cursorX

    for (const row of packed.rows) {
      const y = this.cellY(row.y)
      const runs = row.runs
      // clear the row's used span first (bg of each run), then draw text
      for (let i = 0; i < runs.length; i++) {
        const run = runs[i]
        const nextCol = i + 1 < runs.length ? runs[i + 1].col : row.cols
        const x0 = this.cellX(run.col)
        const w = (nextCol - run.col) * this.charW

        const bold = !!(run.attr & A_BOLD)
        const dim = !!(run.attr & A_DIM)
        let fg = resolveColor(pal, run.fg, pal.fg, bold)
        let bg = resolveColor(pal, run.bg, pal.bg, false)
        if (run.attr & A_INVERSE) [fg, bg] = [bg, fg]

        ctx.fillStyle = bg
        ctx.fillRect(x0, y, w, this.charH)

        const underline = (run.attr >> A_UNDER_SHIFT) & 0xf
        const invisible = !!(run.attr & A_INVISIBLE)
        if (!invisible && run.text.length) {
          ctx.font = this.font(bold, !!(run.attr & A_ITALIC))
          ctx.fillStyle = fg
          ctx.globalAlpha = dim ? 0.55 : 1
          ctx.fillText(run.text, x0, y + this.baseline)
          ctx.globalAlpha = 1
        }
        if (underline && !invisible) {
          ctx.strokeStyle = fg
          ctx.lineWidth = 1
          const uy = y + this.baseline + Math.max(2, this.fontSize * 0.12)
          ctx.beginPath()
          if (underline === 3) {
            // curly
            const step = Math.max(3, Math.round(this.charW / 2))
            ctx.moveTo(x0, uy)
            for (let x = x0; x < x0 + w; x += step) {
              ctx.quadraticCurveTo(x + step / 2, uy + 3, x + step, uy)
            }
          } else if (underline === 4) {
            ctx.setLineDash([2, 3])
            ctx.moveTo(x0, uy)
            ctx.lineTo(x0 + w, uy)
            ctx.setLineDash([])
          } else if (underline === 5) {
            ctx.setLineDash([6, 4])
            ctx.moveTo(x0, uy)
            ctx.lineTo(x0 + w, uy)
            ctx.setLineDash([])
          } else {
            ctx.moveTo(x0, uy)
            ctx.lineTo(x0 + w, uy)
            if (underline === 2) {
              ctx.moveTo(x0, uy + 2)
              ctx.lineTo(x0 + w, uy + 2)
            }
          }
          ctx.stroke()
        }
        if (run.attr & A_STRIKE) {
          ctx.strokeStyle = fg
          ctx.lineWidth = 1
          const sy = y + Math.round(this.charH * 0.55)
          ctx.beginPath()
          ctx.moveTo(x0, sy)
          ctx.lineTo(x0 + w, sy)
          ctx.stroke()
        }
      }
      // runs cover 0..cols (blank cells included), so no trailing clear needed
    }
    this.paintCursor(packed.modes)
    return { cursorRow, cursorX: packed.cursorX }
  }

  paintCursor(modes) {
    const ctx = this.octx
    ctx.clearRect(0, 0, this.cols * this.charW, this.rows * this.charH)
    if (!(modes & MODES.CURSOR_VISIBLE)) return
    if (this.cursorRow < 0 || this.cursorRow >= this.rows) return
    if (!this.cursorOn) return
    const x = this.cellX(this.cursorX)
    const y = this.cellY(this.cursorRow)
    ctx.save()
    ctx.globalCompositeOperation = 'difference'
    ctx.fillStyle = this.palette.cursor
    ctx.fillRect(x, y, this.charW, this.charH)
    ctx.restore()
  }

  startBlink(getModes) {
    clearInterval(this._blinkTimer)
    this._blinkTimer = setInterval(() => {
      this.cursorOn = !this.cursorOn
      this.paintCursor(getModes())
    }, 530)
  }
}

export function runCellSpan(run, next) {
  return next ? next - run.col : 0
}
