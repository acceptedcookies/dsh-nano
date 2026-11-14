//! dnt-core: WASM VT terminal core for dsh-nano-terminal.
//!
//! Pure userland: bytes in, packed render rows out. No DOM, no IO.
//! The JS glue feeds PTY/lane bytes into `dnt_write`, drains emulator
//! replies via `dnt_reply_*`, and consumes dirty rows through
//! `dnt_render_*` every animation frame.

use std::collections::VecDeque;
use unicode_width::UnicodeWidthChar;
use vte::{Params, Parser, Perform};

// ---------------------------------------------------------------------------
// Encoding constants (shared with JS glue — keep in sync with client wasm.js)
// ---------------------------------------------------------------------------

pub const MAGIC: u32 = 0x44_4e_54_01; // "DNT\x01" render buffer header

// Cell flag bits
pub const WIDE: u8 = 1 << 0; // first cell of a 2-column glyph
pub const WIDE_SPACER: u8 = 1 << 1; // second cell of a 2-column glyph

// Attr bits (packed into run.attr)
pub const A_BOLD: u32 = 1 << 0;
pub const A_DIM: u32 = 1 << 1;
pub const A_ITALIC: u32 = 1 << 2;
pub const A_BLINK: u32 = 1 << 3;
pub const A_INVERSE: u32 = 1 << 4;
pub const A_INVISIBLE: u32 = 1 << 5;
pub const A_STRIKE: u32 = 1 << 6;
// underline kind occupies bits 7..=10 (0 none, 1 single, 2 double, 3 curly, 4 dotted, 5 dashed)
pub const A_UNDER_SHIFT: u32 = 7;
pub const A_FAINT_FG: u32 = 1 << 11; // bold-dim intensity hint, JS may ignore

// Color packing (u32): [31:30] kind | [29:0] value
//  kind 0 = default, 1 = palette index (0..=255), 2 = truecolor rgb (r<<16|g<<8|b)
pub const C_DEFAULT: u32 = 0;
pub const C_IDX: u32 = 1 << 30;
pub const C_RGB: u32 = 2 << 30;

// Mode bits exported to JS (dnt_modes / render header)
pub const M_CURSOR_VISIBLE: u32 = 1 << 0; // DECTCEM 25
pub const M_APP_CURSOR: u32 = 1 << 1; // DECCKM 1
pub const M_APP_KEYPAD: u32 = 1 << 2; // DECKPAM / DECKPNM
pub const M_BRACKETED_PASTE: u32 = 1 << 3; // 2004
pub const M_MOUSE_CLICK: u32 = 1 << 4; // 1000
pub const M_MOUSE_BTN_MOTION: u32 = 1 << 5; // 1002
pub const M_MOUSE_ANY_MOTION: u32 = 1 << 6; // 1003
pub const M_MOUSE_SGR: u32 = 1 << 7; // 1006
pub const M_FOCUS_EVENTS: u32 = 1 << 8; // 1004
pub const M_ALT_SCREEN: u32 = 1 << 9; // 47/1047/1049
pub const M_ALT_SCROLL: u32 = 1 << 10; // 1007
pub const M_MOUSE_UTF8: u32 = 1 << 11; // 1005 (advertised only)
pub const M_WRAPAROUND: u32 = 1 << 12; // DECAWM 7

// ---------------------------------------------------------------------------
// Cells and lines
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
struct Cell {
    ch: u32, // unicode scalar (combining sequences are collapsed to first char for prototype)
    attr: u32,
    fg: u32,
    bg: u32,
    flags: u8,
}

impl Cell {
    const BLANK: Cell = Cell {
        ch: ' ' as u32,
        attr: 0,
        fg: C_DEFAULT,
        bg: C_DEFAULT,
        flags: 0,
    };
    fn blank_with(attr: u32, fg: u32, bg: u32) -> Cell {
        Cell { ch: ' ' as u32, attr, fg, bg, flags: 0 }
    }
}

type Line = Vec<Cell>;

fn blank_line(cols: usize, fill: Cell) -> Line {
    vec![fill; cols]
}

// ---------------------------------------------------------------------------
// Grid: scrollback + screen in one VecDeque; screen = last `rows` lines
// ---------------------------------------------------------------------------

struct Grid {
    lines: VecDeque<Line>,
    rows: usize,
    cols: usize,
    scrollback: usize,
    dirty: Vec<bool>, // per screen row
    dirty_all: bool,
}

impl Grid {
    fn new(cols: usize, rows: usize, scrollback: usize, fill: Cell) -> Self {
        let mut lines = VecDeque::with_capacity(rows + scrollback.min(64));
        for _ in 0..rows {
            lines.push_back(blank_line(cols, fill));
        }
        Grid { lines, rows, cols, scrollback, dirty: vec![true; rows], dirty_all: true }
    }

    #[inline]
    fn screen_base(&self) -> usize {
        self.lines.len() - self.rows
    }

    #[inline]
    fn line_mut(&mut self, row: usize) -> &mut Line {
        let i = self.screen_base() + row;
        self.dirty[row] = true;
        &mut self.lines[i]
    }

    #[inline]
    fn line(&self, row: usize) -> &Line {
        &self.lines[self.screen_base() + row]
    }

    /// Scroll region [top, bottom) up by one; the top line leaves the screen.
    /// Only full-screen scrolls contribute to scrollback.
    fn scroll_up(&mut self, top: usize, bottom: usize, fill: Cell) {
        let base = self.screen_base();
        if top == 0 && bottom == self.rows {
            // full-screen scroll: append a blank at the bottom and let the
            // deque grow — the scrolled-off line stays as scrollback.
            // (DNT01 fix: the line used to be dropped, so history never grew.)
            self.lines.push_back(blank_line(self.cols, fill));
            while self.lines.len() > self.scrollback + self.rows {
                self.lines.pop_front();
            }
        } else {
            self.lines.remove(base + top);
            self.lines.insert(base + bottom - 1, blank_line(self.cols, fill));
        }
        self.mark_dirty_range(top, bottom.max(top + 1));
    }

    fn scroll_down(&mut self, top: usize, bottom: usize, fill: Cell) {
        let base = self.screen_base();
        self.lines.remove(base + bottom - 1);
        self.lines.insert(base + top, blank_line(self.cols, fill));
        self.mark_dirty_range(top, bottom.max(top + 1));
    }

    fn insert_lines(&mut self, at: usize, bottom: usize, n: usize, fill: Cell) {
        let base = self.screen_base();
        for _ in 0..n.min(bottom - at) {
            self.lines.remove(base + bottom - 1);
            self.lines.insert(base + at, blank_line(self.cols, fill));
        }
        self.mark_dirty_range(at, bottom.max(at + 1));
    }

    fn delete_lines(&mut self, at: usize, bottom: usize, n: usize, fill: Cell) {
        let base = self.screen_base();
        for _ in 0..n.min(bottom - at) {
            self.lines.remove(base + at);
            self.lines.insert(base + bottom - 1, blank_line(self.cols, fill));
        }
        self.mark_dirty_range(at, bottom.max(at + 1));
    }

    fn mark_dirty_range(&mut self, a: usize, b: usize) {
        let b = b.min(self.rows);
        for r in a.min(b)..b {
            self.dirty[r] = true;
        }
    }

    fn resize(&mut self, cols: usize, rows: usize, fill: Cell) {
        self.cols = cols;
        // reflowless resize: truncate/pad every retained line
        for line in self.lines.iter_mut() {
            line.resize(cols, fill);
        }
        // adjust screen height: pull from scrollback or push blanks at top
        while self.lines.len() > rows && self.lines.len() - self.rows > self.scrollback.min(usize::MAX) {
            // shrink screen: move extra screen lines to scrollback top… keep simple:
            if self.lines.len() - self.rows > 0 && self.lines.len() > rows {
                // dropping from top keeps the newest content visible
                self.lines.pop_front();
            }
        }
        while self.lines.len() < rows {
            self.lines.push_back(blank_line(cols, fill));
        }
        while self.lines.len() > self.scrollback + rows {
            self.lines.pop_front();
        }
        self.rows = rows;
        self.dirty = vec![true; rows];
        self.dirty_all = true;
    }

    fn total_lines(&self) -> usize {
        self.lines.len()
    }

    fn history_len(&self) -> usize {
        self.lines.len() - self.rows
    }
}

// ---------------------------------------------------------------------------
// Terminal state
// ---------------------------------------------------------------------------

#[derive(Clone, Copy)]
struct Cursor {
    x: usize,
    y: usize,
}

struct SavedCursor {
    x: usize,
    y: usize,
    attr: u32,
    fg: u32,
    bg: u32,
    origin: bool,
    charset_g: [u8; 4],
    charset_active: u8,
}

pub struct Term {
    parser: Parser,
    grid: Grid,          // active grid
    saved_grid: Option<Grid>, // main grid while alt screen is active
    cursor: Cursor,
    saved: SavedCursor,
    pen_attr: u32,
    pen_fg: u32,
    pen_bg: u32,
    scrollback_cfg: usize,
    scroll_region: (usize, usize), // [top, bottom) in screen rows; bottom exclusive
    pending_wrap: bool,
    modes: u32,
    scroll_off: usize, // viewport offset into scrollback (0 = live tail)
    charset_g: [u8; 4], // G0..G3 translation: 0 = ASCII, 1 = DEC line drawing
    charset_active: u8, // 0..=3
    reply: Vec<u8>,     // emulator → pty replies (DA/DSR/CPR/DECRQM)
    title: String,
    title_dirty: bool,
    render_buf: Vec<i32>,
    text_buf: String,
    alive: bool,
    underline_color: u32,
    hyperlinks: u32, // unused counter (future)
    // --- OSC 7501 program-reported state (herdr-core status protocol) -------
    // The program declares its own state; the core never guesses from the
    // screen. Each report is a record with an optional `id` (multi-subtask);
    // the record without an id is the "root" record and drives the turn.
    states: Vec<StateRecord>,
    state_seq: u32,
    state_buf: String, // JSON-serialized states for JS/host consumption
    state_dirty: bool,
    // text export buffer (dnt_screen_text) — separate from render's text_buf
    dump_buf: Vec<u8>,
    /// selection: (line, col) absolute indices into grid.lines; None = cleared
    sel_anchor: Option<(usize, usize)>,
    sel_focus: Option<(usize, usize)>,
    sel_buf: Vec<u8>,
}

/// One OSC 7501 record: `state=working:kind=permission:app=x:progress=40:msg=<b64>`
#[derive(Clone, Default)]
pub struct StateRecord {
    pub id: String,     // empty = root record
    pub state: String,  // idle | working | done | blocked | error | clear
    pub kind: String,   // blocked only: permission | question | auth
    pub app: String,
    pub msg: String,    // base64-decoded
    pub progress: u32,
}

impl StateRecord {
    fn to_json(&self) -> String {
        let mut s = String::with_capacity(64 + self.id.len() + self.msg.len());
        s.push_str("{\"id\":\"");
        json_escape(&self.id, &mut s);
        s.push_str("\",\"state\":\"");
        json_escape(&self.state, &mut s);
        s.push('"');
        if !self.kind.is_empty() {
            s.push_str(",\"kind\":\"");
            json_escape(&self.kind, &mut s);
            s.push('"');
        }
        if !self.app.is_empty() {
            s.push_str(",\"app\":\"");
            json_escape(&self.app, &mut s);
            s.push('"');
        }
        if !self.msg.is_empty() {
            s.push_str(",\"msg\":\"");
            json_escape(&self.msg, &mut s);
            s.push('"');
        }
        if self.progress > 0 {
            s.push_str(",\"progress\":");
            s.push_str(&self.progress.to_string());
        }
        s.push('}');
        s
    }
}

fn json_escape(src: &str, out: &mut String) {
    for c in src.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                out.push_str(&format!("\\u{:04x}", c as u32));
            }
            c => out.push(c),
        }
    }
}

fn b64_decode(s: &str) -> Option<String> {
    fn val(b: u8) -> Option<u32> {
        match b {
            b'A'..=b'Z' => Some((b - b'A') as u32),
            b'a'..=b'z' => Some((b - b'a' + 26) as u32),
            b'0'..=b'9' => Some((b - b'0' + 52) as u32),
            b'+' | b'-' => Some(62),
            b'/' | b'_' => Some(63),
            _ => None,
        }
    }
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    let mut acc: u32 = 0;
    let mut nbits: u32 = 0;
    for &b in bytes {
        if b == b'=' || b == b'\n' || b == b'\r' {
            continue;
        }
        let v = val(b)?;
        acc = (acc << 6) | v;
        nbits += 6;
        if nbits >= 8 {
            nbits -= 8;
            out.push((acc >> nbits) as u8);
        }
    }
    String::from_utf8(out).ok()
}

const DEFAULT_SCROLLBACK: usize = 2000;

impl Term {
    pub fn new(cols: usize, rows: usize, scrollback: usize) -> Self {
        Term {
            parser: Parser::new(),
            grid: Grid::new(cols, rows, scrollback, Cell::BLANK),
            saved_grid: None,
            cursor: Cursor { x: 0, y: 0 },
            saved: SavedCursor {
                x: 0,
                y: 0,
                attr: 0,
                fg: C_DEFAULT,
                bg: C_DEFAULT,
                origin: false,
                charset_g: [0; 4],
                charset_active: 0,
            },
            pen_attr: 0,
            pen_fg: C_DEFAULT,
            pen_bg: C_DEFAULT,
            scrollback_cfg: scrollback,
            scroll_region: (0, rows.max(1)),
            pending_wrap: false,
            modes: M_CURSOR_VISIBLE | M_WRAPAROUND,
            scroll_off: 0,
            charset_g: [0; 4],
            charset_active: 0,
            reply: Vec::with_capacity(64),
            title: String::new(),
            title_dirty: false,
            render_buf: Vec::with_capacity(4096),
            text_buf: String::with_capacity(8192),
            alive: true,
            underline_color: C_DEFAULT,
            hyperlinks: 0,
            states: Vec::new(),
            state_seq: 0,
            state_buf: String::new(),
            state_dirty: false,
            dump_buf: Vec::with_capacity(8192),
            sel_anchor: None,
            sel_focus: None,
            sel_buf: Vec::new(),
        }
    }

    /// Parse one or more OSC 7501 records. `state=clear` removes the record
    /// (matching id when given, else root); otherwise upsert by id.
    fn osc_7501(&mut self, params: &[&[u8]]) {
        for p in params {
            let text = String::from_utf8_lossy(p);
            let mut rec = StateRecord::default();
            for kv in text.split(':') {
                let mut it = kv.splitn(2, '=');
                let (k, v) = (it.next().unwrap_or(""), it.next().unwrap_or(""));
                match k {
                    "id" => rec.id = v.to_string(),
                    "state" => rec.state = v.to_string(),
                    "kind" => rec.kind = v.to_string(),
                    "app" => rec.app = v.to_string(),
                    "msg" => rec.msg = b64_decode(v).unwrap_or_else(|| v.to_string()),
                    "progress" => rec.progress = v.parse().unwrap_or(0),
                    _ => {}
                }
            }
            if rec.state.is_empty() {
                continue;
            }
            if rec.state == "clear" {
                self.states.retain(|s| s.id != rec.id);
            } else if let Some(slot) = self.states.iter_mut().find(|s| s.id == rec.id) {
                // upsert: state/kind/app/msg all come from the new report
                *slot = rec;
            } else {
                self.states.push(rec);
            }
            self.state_seq = self.state_seq.wrapping_add(1);
            self.state_dirty = true;
        }
    }

    /// Serialize the state table + title as JSON for JS/host consumption.
    /// Root = the record with empty id (may be absent).
    fn state_json(&mut self) {
        self.state_buf.clear();
        self.state_buf.push_str("{\"seq\":");
        self.state_buf.push_str(&self.state_seq.to_string());
        self.state_buf.push_str(",\"title\":\"");
        json_escape(&self.title, &mut self.state_buf);
        self.state_buf.push_str("\",\"records\":[");
        for (i, s) in self.states.iter().enumerate() {
            if i > 0 {
                self.state_buf.push(',');
            }
            self.state_buf.push_str(&s.to_json());
        }
        self.state_buf.push_str("]}");
    }

    #[inline]
    fn mode(&self, bit: u32) -> bool {
        self.modes & bit != 0
    }

    fn set_mode_bit(&mut self, bit: u32, on: bool) {
        if on {
            self.modes |= bit;
        } else {
            self.modes &= !bit;
        }
    }

    fn move_down_or_scroll(&mut self) {
        let (top, bottom) = self.scroll_region;
        if self.cursor.y + 1 == bottom {
            self.grid.scroll_up(top, bottom, Cell::blank_with(self.pen_attr, self.pen_fg, self.pen_bg));
        } else if self.cursor.y + 1 < self.grid.rows {
            self.cursor.y += 1;
        }
    }

    fn move_up_or_scroll(&mut self) {
        let (top, bottom) = self.scroll_region;
        if self.cursor.y == top {
            self.grid.scroll_down(top, bottom, Cell::blank_with(self.pen_attr, self.pen_fg, self.pen_bg));
        } else if self.cursor.y > 0 {
            self.cursor.y -= 1;
        }
    }

    fn newline(&mut self) {
        self.pending_wrap = false;
        self.cursor.x = 0;
        self.move_down_or_scroll();
    }

    fn put_char(&mut self, c: char) {
        if !self.alive {
            return;
        }
        // DEC line-drawing translation when G1/G-graphics active
        let c = if self.charset_g[self.charset_active as usize] == 1 {
            map_line_drawing(c)
        } else {
            c
        };
        if (c as u32) < 0x20 || c == '\u{7f}' {
            return; // control chars handled by execute()
        }
        let width = c.width().unwrap_or(1).min(2) as usize;
        if width == 0 {
            return;
        }
        if self.pending_wrap {
            self.pending_wrap = false;
            self.newline();
        }
        let cols = self.grid.cols;
        let x = self.cursor.x.min(cols.saturating_sub(1));
        if width == 2 && x + 1 >= cols {
            if self.mode(M_WRAPAROUND) {
                self.newline();
            } else {
                return;
            }
        }
        {
            let line = self.grid.line_mut(self.cursor.y);
            let x = self.cursor.x;
            if width == 2 {
                line[x] = Cell { ch: c as u32, attr: self.pen_attr, fg: self.pen_fg, bg: self.pen_bg, flags: WIDE };
                if x + 1 < cols {
                    line[x + 1] = Cell { ch: 0, attr: self.pen_attr, fg: self.pen_fg, bg: self.pen_bg, flags: WIDE_SPACER };
                }
            } else {
                line[x] = Cell { ch: c as u32, attr: self.pen_attr, fg: self.pen_fg, bg: self.pen_bg, flags: 0 };
            }
        }
        if self.cursor.x + width >= cols {
            if self.mode(M_WRAPAROUND) {
                self.pending_wrap = true;
            } else {
                self.cursor.x = cols.saturating_sub(1);
            }
        } else {
            self.cursor.x += width;
        }
    }

    fn erase_in_line(&mut self, mode: u16) {
        let cols = self.grid.cols;
        let x = self.cursor.x.min(cols);
        let fill = Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg);
        let line = self.grid.line_mut(self.cursor.y);
        match mode {
            0 => {
                for c in x..cols {
                    line[c] = fill;
                }
            }
            1 => {
                for c in 0..=x.min(cols - 1) {
                    line[c] = fill;
                }
            }
            2 => {
                for c in 0..cols {
                    line[c] = fill;
                }
            }
            _ => {}
        }
    }

    fn erase_in_display(&mut self, mode: u16) {
        let fill = Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg);
        let (cx, cy) = (self.cursor.x, self.cursor.y);
        match mode {
            0 => {
                let cols0 = self.grid.cols;
                {
                    let line = self.grid.line_mut(cy);
                    for c in cx..cols0 {
                        line[c] = fill;
                    }
                }
                for r in cy + 1..self.grid.rows {
                    *self.grid.line_mut(r) = blank_line(self.grid.cols, fill);
                }
            }
            1 => {
                for r in 0..cy {
                    *self.grid.line_mut(r) = blank_line(self.grid.cols, fill);
                }
                let cols1 = self.grid.cols;
                let line = self.grid.line_mut(cy);
                for c in 0..=cx.min(cols1.saturating_sub(1)) {
                    line[c] = fill;
                }
            }
            2 | 3 => {
                for r in 0..self.grid.rows {
                    *self.grid.line_mut(r) = blank_line(self.grid.cols, fill);
                }
                if mode == 3 {
                    // clear scrollback
                    while self.grid.lines.len() > self.grid.rows {
                        self.grid.lines.pop_front();
                    }
                    self.scroll_off = 0;
                }
            }
            _ => {}
        }
    }

    fn sgr(&mut self, params: &Params) {
        let mut iter = params.iter();
        let mut any = false;
        while let Some(p) = iter.next() {
            any = true;
            for &v in p {
                match v {
                    0 => {
                        self.pen_attr = 0;
                        self.pen_fg = C_DEFAULT;
                        self.pen_bg = C_DEFAULT;
                        self.underline_color = C_DEFAULT;
                    }
                    1 => self.pen_attr |= A_BOLD,
                    2 => self.pen_attr |= A_DIM,
                    3 => self.pen_attr |= A_ITALIC,
                    4 => {
                        // sub-param underline styles arrive as [4, style]
                        self.pen_attr = (self.pen_attr & !(0xF << A_UNDER_SHIFT)) | (1 << A_UNDER_SHIFT);
                    }
                    5 | 6 => self.pen_attr |= A_BLINK,
                    7 => self.pen_attr |= A_INVERSE,
                    8 => self.pen_attr |= A_INVISIBLE,
                    9 => self.pen_attr |= A_STRIKE,
                    21 => self.pen_attr = (self.pen_attr & !(0xF << A_UNDER_SHIFT)) | (2 << A_UNDER_SHIFT),
                    22 => self.pen_attr &= !(A_BOLD | A_DIM),
                    23 => self.pen_attr &= !A_ITALIC,
                    24 => self.pen_attr &= !(0xF << A_UNDER_SHIFT),
                    25 => self.pen_attr &= !A_BLINK,
                    27 => self.pen_attr &= !A_INVERSE,
                    28 => self.pen_attr &= !A_INVISIBLE,
                    29 => self.pen_attr &= !A_STRIKE,
                    30..=37 => self.pen_fg = C_IDX | (v as u32 - 30),
                    38 => {
                        self.pen_fg = self.parse_color(&mut iter, C_IDX | 7);
                    }
                    39 => self.pen_fg = C_DEFAULT,
                    40..=47 => self.pen_bg = C_IDX | (v as u32 - 40),
                    48 => {
                        self.pen_bg = self.parse_color(&mut iter, C_IDX | 0);
                    }
                    49 => self.pen_bg = C_DEFAULT,
                    58 => {
                        self.underline_color = self.parse_color(&mut iter, C_DEFAULT);
                    }
                    59 => self.underline_color = C_DEFAULT,
                    90..=97 => self.pen_fg = C_IDX | (v as u32 - 90 + 8),
                    100..=107 => self.pen_bg = C_IDX | (v as u32 - 100 + 8),
                    _ => {}
                }
            }
        }
        if !any {
            self.pen_attr = 0;
            self.pen_fg = C_DEFAULT;
            self.pen_bg = C_DEFAULT;
            self.underline_color = C_DEFAULT;
        }
    }

    fn parse_color<'a>(&mut self, iter: &mut impl Iterator<Item = &'a [u16]>, fallback: u32) -> u32 {
        // 38 ; 2 ; r ; g ; b   |   38 ; 5 ; idx
        match iter.next() {
            Some(&[2]) => {
                let r = iter.next().and_then(|p| p.first()).copied().unwrap_or(0) as u32;
                let g = iter.next().and_then(|p| p.first()).copied().unwrap_or(0) as u32;
                let b = iter.next().and_then(|p| p.first()).copied().unwrap_or(0) as u32;
                C_RGB | ((r & 0xFF) << 16) | ((g & 0xFF) << 8) | (b & 0xFF)
            }
            Some(&[5]) => {
                let idx = iter.next().and_then(|p| p.first()).copied().unwrap_or(0) as u32;
                C_IDX | (idx & 0xFF)
            }
            _ => fallback,
        }
    }

    fn decset(&mut self, params: &Params, set: bool, private: bool) {
        for p in params.iter() {
            for &v in p {
                if private {
                    match v {
                        1 => self.set_mode_bit(M_APP_CURSOR, set),
                        3 => {
                            // DECCOLM 132/80 — ignore, keep cols
                        }
                        5 => {
                            // DECSCNM reverse video — invert handled by renderer? ignore
                        }
                        6 => {
                            // DECOM origin mode: restrict cursor to scroll region
                            self.cursor.x = 0;
                            self.cursor.y = 0;
                        }
                        7 => self.set_mode_bit(M_WRAPAROUND, set),
                        9 => self.set_mode_bit(M_MOUSE_CLICK, set),
                        12 => { /* cursor blink — keep CSS-side */ }
                        25 => self.set_mode_bit(M_CURSOR_VISIBLE, set),
                        47 | 1047 | 1049 => {
                            if set {
                                self.enter_alt_screen();
                            } else {
                                self.leave_alt_screen();
                            }
                            if v == 1049 {
                                if set {
                                    self.save_cursor();
                                } else {
                                    self.restore_cursor();
                                }
                            }
                        }
                        1000 => self.set_mode_bit(M_MOUSE_CLICK, set),
                        1002 => self.set_mode_bit(M_MOUSE_BTN_MOTION, set),
                        1003 => self.set_mode_bit(M_MOUSE_ANY_MOTION, set),
                        1004 => self.set_mode_bit(M_FOCUS_EVENTS, set),
                        1005 => self.set_mode_bit(M_MOUSE_UTF8, set),
                        1006 => self.set_mode_bit(M_MOUSE_SGR, set),
                        1007 => self.set_mode_bit(M_ALT_SCROLL, set),
                        1048 => {
                            if set {
                                self.save_cursor();
                            } else {
                                self.restore_cursor();
                            }
                        }
                        2004 => self.set_mode_bit(M_BRACKETED_PASTE, set),
                        _ => {}
                    }
                } else {
                    match v {
                        4 => { /* IRM insert mode — currently off-screen optimization; track via attr */ }
                        20 => { /* LNM newline mode — ignore */ }
                        _ => {}
                    }
                }
            }
        }
    }

    fn enter_alt_screen(&mut self) {
        if self.mode(M_ALT_SCREEN) {
            return;
        }
        self.set_mode_bit(M_ALT_SCREEN, true);
        let alt = Grid::new(self.grid.cols, self.grid.rows, 0, Cell::BLANK);
        self.saved_grid = Some(std::mem::replace(&mut self.grid, alt));
        self.scroll_region = (0, self.grid.rows.max(1));
        self.scroll_off = 0;
        self.pending_wrap = false;
    }

    fn leave_alt_screen(&mut self) {
        if !self.mode(M_ALT_SCREEN) {
            return;
        }
        self.set_mode_bit(M_ALT_SCREEN, false);
        if let Some(main) = self.saved_grid.take() {
            self.grid = main;
            self.grid.dirty_all = true;
            for d in self.grid.dirty.iter_mut() {
                *d = true;
            }
        }
        self.scroll_region = (0, self.grid.rows.max(1));
        self.pending_wrap = false;
    }

    fn save_cursor(&mut self) {
        self.saved = SavedCursor {
            x: self.cursor.x,
            y: self.cursor.y,
            attr: self.pen_attr,
            fg: self.pen_fg,
            bg: self.pen_bg,
            origin: false,
            charset_g: self.charset_g,
            charset_active: self.charset_active,
        };
    }

    fn restore_cursor(&mut self) {
        self.cursor.x = self.saved.x.min(self.grid.cols.saturating_sub(1));
        self.cursor.y = self.saved.y.min(self.grid.rows.saturating_sub(1));
        self.pen_attr = self.saved.attr;
        self.pen_fg = self.saved.fg;
        self.pen_bg = self.saved.bg;
        self.charset_g = self.saved.charset_g;
        self.charset_active = self.saved.charset_active;
        self.pending_wrap = false;
    }

    fn full_reset(&mut self) {
        let cols = self.grid.cols;
        let rows = self.grid.rows;
        *self = Term::new(cols, rows, self.scrollback_cfg);
    }

    // -- public API used by FFI ------------------------------------------------

    pub fn write(&mut self, bytes: &[u8]) {
        if !self.alive {
            return;
        }
        let mut parser = std::mem::replace(&mut self.parser, Parser::new());
        parser.advance(self, bytes);
        self.parser = parser;
        if self.scroll_off > 0 {
            // keep viewport pinned relative to growing scrollback while scrolled
            // (new content keeps arriving underneath the viewed region)
            self.scroll_off = self.scroll_off.min(self.grid.history_len());
        }
    }

    pub fn resize(&mut self, cols: usize, rows: usize) {
        if cols == 0 || rows == 0 || (cols == self.grid.cols && rows == self.grid.rows) {
            return;
        }
        self.grid.resize(cols, rows, Cell::BLANK);
        if let Some(g) = &mut self.saved_grid {
            g.resize(cols, rows, Cell::BLANK);
        }
        self.cursor.x = self.cursor.x.min(cols - 1);
        self.cursor.y = self.cursor.y.min(rows - 1);
        self.scroll_region = (0, rows);
        self.pending_wrap = false;
        self.scroll_off = self.scroll_off.min(self.grid.history_len());
    }

    pub fn scroll_lines(&mut self, delta: isize) {
        let hist = self.grid.history_len() as isize;
        let mut off = self.scroll_off as isize + delta;
        if off < 0 {
            off = 0;
        }
        if off > hist {
            off = hist;
        }
        self.scroll_off = off as usize;
        self.grid.dirty_all = true;
    }

    pub fn scroll_to_bottom(&mut self) {
        if self.scroll_off != 0 {
            self.scroll_off = 0;
            self.grid.dirty_all = true;
        }
    }

    /// Pack the visible grid into `render_buf`.
    ///
    /// Layout (all i32):
    ///   [0] MAGIC  [1] rows_visible  [2] total_lines  [3] view_start
    ///   [4] cursor_x [5] cursor_y(absolute in buffer) [6] modes
    ///   [7] row_count
    ///   then per row (7 i32): y, cols, text_len, run_count, cursor_in_row(0/1), flags
    ///   then runs (6 i32): col, byte_off, byte_len, attr, fg, bg
    /// Row text bytes are appended to `text_buf`; runs index into it cumulatively.
    pub fn render(&mut self) {
        self.render_buf.clear();
        self.text_buf.clear();
        let dirty_all = self.grid.dirty_all;
        let rows = self.grid.rows;
        let total = self.grid.total_lines();
        let view_start = total - rows - self.scroll_off;

        self.render_buf.push(MAGIC as i32);
        self.render_buf.push(rows as i32);
        self.render_buf.push(total as i32);
        self.render_buf.push(view_start as i32);
        self.render_buf.push(self.cursor.x as i32);
        let cy = view_start + self.cursor.y;
        self.render_buf.push(cy as i32);
        self.render_buf.push(self.modes as i32);
        // row count placeholder — patched at the end
        self.render_buf.push(0);
        let count_idx = self.render_buf.len() - 1;
        let mut count = 0i32;

        for r in 0..rows {
            let abs = view_start + r;
            let dirty = dirty_all || self.grid.dirty.get(r).copied().unwrap_or(false);
            if !dirty {
                continue;
            }
            count += 1;
            let line = &self.grid.lines[abs];
            let mut runs: Vec<[i32; 6]> = Vec::new();
            let mut text = String::with_capacity(line.len() * 3);
            let mut col = 0usize;
            let cols = self.grid.cols;
            let cursor_in_row = (abs == cy && self.mode(M_CURSOR_VISIBLE)) as i32;
            while col < cols {
                let c = line[col];
                if c.flags & WIDE_SPACER != 0 {
                    col += 1;
                    continue;
                }
                let start_col = col;
                let byte_off = self.text_buf.len() + text.len();
                let mut run_text = String::new();
                let (attr, fg, bg) = (c.attr, c.fg, c.bg);
                while col < cols {
                    let c2 = line[col];
                    if c2.flags & WIDE_SPACER != 0 {
                        col += 1;
                        continue;
                    }
                    if col > start_col && (c2.attr != attr || c2.fg != fg || c2.bg != bg) {
                        break;
                    }
                    if c2.ch != 0 {
                        if let Some(ch) = char::from_u32(c2.ch) {
                            run_text.push(ch);
                        }
                    }
                    col += 1;
                }
                text.push_str(&run_text);
                let byte_len = run_text.len();
                runs.push([start_col as i32, byte_off as i32, byte_len as i32, attr as i32, fg as i32, bg as i32]);
            }
            self.text_buf.push_str(&text);
            self.render_buf.push(r as i32); // screen y
            self.render_buf.push(cols as i32);
            self.render_buf.push(text.len() as i32);
            self.render_buf.push(runs.len() as i32);
            self.render_buf.push(cursor_in_row);
            self.render_buf.push(self.cursor.x as i32);
            self.render_buf.push(0); // reserved
            for run in runs {
                self.render_buf.extend_from_slice(&run);
            }
        }
        self.render_buf[count_idx] = count;
        self.grid.dirty_all = false;
        for d in self.grid.dirty.iter_mut() {
            *d = false;
        }
    }
}

// ---------------------------------------------------------------------------
// vte::Perform implementation
// ---------------------------------------------------------------------------

impl Perform for Term {
    fn print(&mut self, c: char) {
        self.put_char(c);
    }

    fn execute(&mut self, byte: u8) {
        match byte {
            b'\n' | 0x0B | 0x0C => {
                self.pending_wrap = false;
                self.move_down_or_scroll();
            }
            b'\r' => {
                self.pending_wrap = false;
                self.cursor.x = 0;
            }
            0x08 => {
                self.pending_wrap = false;
                self.cursor.x = self.cursor.x.saturating_sub(1);
            }
            0x09 => {
                self.pending_wrap = false;
                let next = (self.cursor.x / 8 + 1) * 8;
                self.cursor.x = next.min(self.grid.cols.saturating_sub(1));
            }
            0x07 => {} // BEL — JS may render a bell indicator later
            0x0E => self.charset_active = 1, // SO → G1
            0x0F => self.charset_active = 0, // SI → G0
            _ => {}
        }
    }

    fn hook(&mut self, _params: &Params, _intermediates: &[u8], _ignore: bool, _c: char) {}
    fn put(&mut self, _b: u8) {}
    fn unhook(&mut self) {}

    fn osc_dispatch(&mut self, params: &[&[u8]], _bell: bool) {
        match params.first().map(|p| *p) {
            Some(b"0") | Some(b"2") => {
                if let Some(t) = params.get(1) {
                    let s = String::from_utf8_lossy(t).into_owned();
                    if s != self.title {
                        self.title = s;
                        self.title_dirty = true;
                    }
                }
            }
            Some(b"52") => {
                // clipboard — store as title-adjacent for now (JS reads via dnt_title)
                if let Some(t) = params.get(2) {
                    self.title = format!("{}📋{}", self.title, String::from_utf8_lossy(t));
                    self.title_dirty = true;
                }
            }
            Some(b"7501") => {
                // herdr-core status protocol: the program reports its own state,
                // the core never guesses from the screen. Each param after the
                // command is one record `k=v:k=v…`; `state=clear` drops the
                // matching record. The id-less record is the root status.
                self.osc_7501(&params[1..]);
            }
            _ => {}
        }
    }

    fn csi_dispatch(&mut self, params: &Params, intermediates: &[u8], ignore: bool, c: char) {
        if ignore {
            return;
        }
        let private = intermediates.first().copied() == Some(b'?');
        let param = |i: usize, d: u16| -> u16 {
            params
                .iter()
                .nth(i)
                .and_then(|p| p.first())
                .copied()
                .map(|v| if v == 0 { d } else { v })
                .unwrap_or(d)
        };
        match c {
            'A' => {
                // CUU — origin mode restriction ignored (no DECOM tracking yet)
                self.pending_wrap = false;
                self.cursor.y = self.cursor.y.saturating_sub(param(0, 1) as usize);
            }
            'B' | 'e' => {
                self.pending_wrap = false;
                self.cursor.y = (self.cursor.y + param(0, 1) as usize).min(self.grid.rows.saturating_sub(1));
            }
            'C' | 'a' => {
                self.pending_wrap = false;
                self.cursor.x = (self.cursor.x + param(0, 1) as usize).min(self.grid.cols.saturating_sub(1));
            }
            'D' => {
                self.pending_wrap = false;
                self.cursor.x = self.cursor.x.saturating_sub(param(0, 1) as usize);
            }
            'E' => {
                self.pending_wrap = false;
                self.cursor.y = (self.cursor.y + param(0, 1) as usize).min(self.grid.rows.saturating_sub(1));
                self.cursor.x = 0;
            }
            'F' => {
                self.pending_wrap = false;
                self.cursor.y = self.cursor.y.saturating_sub(param(0, 1) as usize);
                self.cursor.x = 0;
            }
            'G' | '`' => {
                self.pending_wrap = false;
                self.cursor.x = (param(0, 1) as usize).saturating_sub(1).min(self.grid.cols.saturating_sub(1));
            }
            'd' => {
                self.pending_wrap = false;
                self.cursor.y = (param(0, 1) as usize).saturating_sub(1).min(self.grid.rows.saturating_sub(1));
            }
            'H' | 'f' => {
                self.pending_wrap = false;
                self.cursor.y = (param(0, 1) as usize).saturating_sub(1).min(self.grid.rows.saturating_sub(1));
                self.cursor.x = (param(1, 1) as usize).saturating_sub(1).min(self.grid.cols.saturating_sub(1));
            }
            'I' => {
                let n = param(0, 1) as usize;
                self.cursor.x = ((self.cursor.x / 8) + n).min((self.grid.cols - 1) / 8) * 8;
            }
            'Z' => {
                let n = param(0, 1) as usize;
                self.cursor.x = (self.cursor.x / 8).saturating_sub(n) * 8;
            }
            'J' => self.erase_in_display(param(0, 0)),
            'K' => self.erase_in_line(param(0, 0)),
            'L' => {
                let n = param(0, 1) as usize;
                let (_, bottom) = self.scroll_region;
                self.grid.insert_lines(self.cursor.y, bottom.max(self.cursor.y + 1), n, Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg));
            }
            'M' => {
                let n = param(0, 1) as usize;
                let (_, bottom) = self.scroll_region;
                self.grid.delete_lines(self.cursor.y, bottom.max(self.cursor.y + 1), n, Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg));
            }
            'P' => {
                let n = param(0, 1) as usize;
                let cols = self.grid.cols;
                let x = self.cursor.x;
                let fill = Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg);
                let line = self.grid.line_mut(self.cursor.y);
                for c in x..cols {
                    let src = (c + n).min(cols - 1);
                    line[c] = if c + n < cols { line[src] } else { fill };
                }
            }
            'S' => {
                let n = param(0, 1) as usize;
                let (top, bottom) = self.scroll_region;
                for _ in 0..n {
                    self.grid.scroll_up(top, bottom, Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg));
                }
            }
            'T' => {
                let n = param(0, 1) as usize;
                let (top, bottom) = self.scroll_region;
                if intermediates.is_empty() {
                    for _ in 0..n {
                        self.grid.scroll_down(top, bottom, Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg));
                    }
                } // else mouse-tracking Hilite — ignore
            }
            'X' => {
                let n = (param(0, 1) as usize).min(self.grid.cols - self.cursor.x);
                let fill = Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg);
                let line = self.grid.line_mut(self.cursor.y);
                for c in self.cursor.x..self.cursor.x + n {
                    line[c] = fill;
                }
            }
            '@' => {
                let n = param(0, 1) as usize;
                let cols = self.grid.cols;
                let x = self.cursor.x;
                let fill = Cell::blank_with(self.pen_attr, C_DEFAULT, self.pen_bg);
                let line = self.grid.line_mut(self.cursor.y);
                let mut c = cols;
                while c > x {
                    c -= 1;
                    line[c] = if c >= x + n { line[c - n] } else { fill };
                }
            }
            'm' => self.sgr(params),
            'r' => {
                let top = (param(0, 1) as usize).saturating_sub(1);
                let bot = (param(1, self.grid.rows as u16) as usize).clamp(top + 1, self.grid.rows);
                self.scroll_region = (top, bot);
                self.cursor.x = 0;
                self.cursor.y = 0;
                self.pending_wrap = false;
            }
            's' => self.save_cursor(),
            'u' => self.restore_cursor(),
            'h' => self.decset(params, true, private),
            'l' => self.decset(params, false, private),
            'n' => match param(0, 0) {
                5 => self.reply.extend_from_slice(b"\x1b[0n"),
                6 => self.reply.extend_from_slice(
                    format!("\x1b[{};{}R", self.cursor.y + 1, self.cursor.x + 1).as_bytes(),
                ),
                _ => {}
            },
            'c' => {
                if intermediates.first().copied() == Some(b'>') || intermediates.is_empty() {
                    // DA: xterm-256color-ish response (VT220 + 4=sixel? advertise 132col, color)
                    self.reply.extend_from_slice(b"\x1b[?62;1;2;6;22c");
                }
            }
            'p' => {
                // DECRQM mode request/reply for private modes — report current state
                if intermediates.first().copied() == Some(b'?') {
                    if let Some(v) = params.iter().next().and_then(|p| p.first()) {
                        let (bit, base) = match *v {
                            1 => (M_APP_CURSOR, 1u16),
                            25 => (M_CURSOR_VISIBLE, 25),
                            1000 => (M_MOUSE_CLICK, 1000),
                            1002 => (M_MOUSE_BTN_MOTION, 1002),
                            1003 => (M_MOUSE_ANY_MOTION, 1003),
                            1006 => (M_MOUSE_SGR, 1006),
                            2004 => (M_BRACKETED_PASTE, 2004),
                            _ => (0, *v),
                        };
                        let state = if bit != 0 && self.mode(bit) { 2 } else { 1 };
                        self.reply.extend_from_slice(
                            format!("\x1b[?{};{}$y", base, state).as_bytes(),
                        );
                    }
                }
            }
            't' => {
                // XTWINOPS — reply to common queries
                match param(0, 0) {
                    18 => self.reply.extend_from_slice(
                        format!("\x1b[8;{};{}t", self.grid.rows, self.grid.cols).as_bytes(),
                    ),
                    14 | 16 | 19 => { /* cell/px size queries — ignore */ }
                    _ => {}
                }
            }
            'q' => {
                // DECSCUSR cursor style — ignore (JS cursor fixed)
            }
            'g' | 'b' | 'x' | 'y' | 'z' | '{' | '|' | '}' | '~' => {}
            _ => {}
        }
    }

    fn esc_dispatch(&mut self, intermediates: &[u8], _ignore: bool, byte: u8) {
        match (intermediates.first().copied(), byte) {
            (None, b'7') => self.save_cursor(),
            (None, b'8') => self.restore_cursor(),
            (None, b'D') => {
                self.pending_wrap = false;
                self.move_down_or_scroll();
            }
            (None, b'E') => {
                self.pending_wrap = false;
                self.cursor.x = 0;
                self.move_down_or_scroll();
            }
            (None, b'M') => {
                self.pending_wrap = false;
                self.move_up_or_scroll();
            }
            (None, b'c') => self.full_reset(),
            (None, b'=') => self.set_mode_bit(M_APP_KEYPAD, true),
            (None, b'>') => self.set_mode_bit(M_APP_KEYPAD, false),
            (None, b'Z') => self.reply.extend_from_slice(b"\x1b[?62;22c"), // DECID
            (Some(b'('), b'0') => self.charset_g[0] = 1,
            (Some(b'('), _) => self.charset_g[0] = 0,
            (Some(b')'), b'0') => self.charset_g[1] = 1,
            (Some(b')'), _) => self.charset_g[1] = 0,
            (Some(b'*'), b'0') => self.charset_g[2] = 1,
            (Some(b'*'), _) => self.charset_g[2] = 0,
            (Some(b'+'), b'0') => self.charset_g[3] = 1,
            (Some(b'+'), _) => self.charset_g[3] = 0,
            (Some(b'#'), b'8') => {
                // DECALN alignment test: fill screen with 'E'
                for r in 0..self.grid.rows {
                    let line = self.grid.line_mut(r);
                    for c in line.iter_mut() {
                        *c = Cell { ch: 'E' as u32, attr: 0, fg: C_DEFAULT, bg: C_DEFAULT, flags: 0 };
                    }
                }
            }
            _ => {}
        }
    }
}

// DEC special-graphics (line drawing) map for bytes 0x60..=0x7e
fn map_line_drawing(c: char) -> char {
    match c {
        '`' => '◆',
        'a' => '▒',
        'b' => '␉',
        'c' => '␌',
        'd' => '␍',
        'e' => '␊',
        'f' => '°',
        'g' => '±',
        'h' => '␤',
        'i' => '␋',
        'j' => '┘',
        'k' => '┐',
        'l' => '┌',
        'm' => '└',
        'n' => '┼',
        'o' => '⎺',
        'p' => '⎻',
        'q' => '─',
        'r' => '⎼',
        's' => '⎽',
        't' => '├',
        'u' => '┤',
        'v' => '┴',
        'w' => '┬',
        'x' => '│',
        'y' => '≤',
        'z' => '≥',
        '{' => 'π',
        '|' => '≠',
        '}' => '£',
        '~' => '·',
        _ => c,
    }
}

// ---------------------------------------------------------------------------
// FFI surface (raw wasm ABI — no wasm-bindgen)
// ---------------------------------------------------------------------------

use std::cell::RefCell;
use std::collections::HashMap;
use std::sync::atomic::{AtomicU32, Ordering};

thread_local! {
    static TERMS: RefCell<HashMap<u32, Term>> = RefCell::new(HashMap::new());
    static LAST: RefCell<Vec<u8>> = RefCell::new(Vec::new());
}
static NEXT_ID: AtomicU32 = AtomicU32::new(1);

fn with_term<R>(id: u32, f: impl FnOnce(&mut Term) -> R) -> Option<R> {
    TERMS.with(|t| t.borrow_mut().get_mut(&id).map(f))
}

fn set_last(bytes: &[u8]) -> *const u8 {
    LAST.with(|l| {
        let mut l = l.borrow_mut();
        l.clear();
        l.extend_from_slice(bytes);
        l.as_ptr()
    })
}

#[no_mangle]
pub extern "C" fn dnt_alloc(len: u32) -> *mut u8 {
    let mut v = Vec::<u8>::with_capacity(len as usize);
    let p = v.as_mut_ptr();
    std::mem::forget(v);
    p
}

#[no_mangle]
pub extern "C" fn dnt_dealloc(ptr: *mut u8, len: u32) {
    unsafe { drop(Vec::from_raw_parts(ptr, 0, len as usize)) }
}

#[no_mangle]
pub extern "C" fn dnt_new(cols: u32, rows: u32, scrollback: u32) -> u32 {
    let id = NEXT_ID.fetch_add(1, Ordering::Relaxed);
    let cols = (cols as usize).clamp(2, 512);
    let rows = (rows as usize).clamp(1, 512);
    let sb = if scrollback == 0 { DEFAULT_SCROLLBACK } else { (scrollback as usize).min(100_000) };
    TERMS.with(|t| t.borrow_mut().insert(id, Term::new(cols, rows, sb)));
    id
}

#[no_mangle]
pub extern "C" fn dnt_free(id: u32) {
    TERMS.with(|t| t.borrow_mut().remove(&id));
}

/// Feed output bytes. `ptr`/`len` point into wasm linear memory written by JS.
#[no_mangle]
pub extern "C" fn dnt_write(id: u32, ptr: *const u8, len: u32) {
    let data = unsafe { std::slice::from_raw_parts(ptr, len as usize) };
    with_term(id, |t| t.write(data));
}

#[no_mangle]
pub extern "C" fn dnt_resize(id: u32, cols: u32, rows: u32) {
    with_term(id, |t| t.resize(cols.max(2) as usize, rows.max(1) as usize));
}

#[no_mangle]
pub extern "C" fn dnt_scroll(id: u32, delta_lines: i32) {
    with_term(id, |t| t.scroll_lines(delta_lines as isize));
}

#[no_mangle]
pub extern "C" fn dnt_scroll_bottom(id: u32) {
    with_term(id, |t| t.scroll_to_bottom());
}

/// Force the next render() to emit every screen row — used after font/metric
/// changes where the JS side clears and repaints the whole canvas.
#[no_mangle]
pub extern "C" fn dnt_invalidate(id: u32) {
    with_term(id, |t| {
        t.grid.dirty_all = true;
    });
}

/// Pack dirty rows. Returns pointer to i32 render buffer (valid until next call).
#[no_mangle]
pub extern "C" fn dnt_render(id: u32) -> *const i32 {
    match with_term(id, |t| {
        t.render();
        t.render_buf.as_ptr()
    }) {
        Some(p) => p,
        None => std::ptr::null(),
    }
}

/// i32 count in the render buffer.
#[no_mangle]
pub extern "C" fn dnt_render_len(id: u32) -> u32 {
    with_term(id, |t| t.render_buf.len() as u32).unwrap_or(0)
}

/// UTF-8 byte pointer to the packed run text (valid until next render).
#[no_mangle]
pub extern "C" fn dnt_render_text(id: u32) -> *const u8 {
    with_term(id, |t| t.text_buf.as_ptr()).unwrap_or(std::ptr::null())
}

#[no_mangle]
pub extern "C" fn dnt_render_text_len(id: u32) -> u32 {
    with_term(id, |t| t.text_buf.len() as u32).unwrap_or(0)
}

/// Emulator → PTY replies accumulated since the last drain.
#[no_mangle]
pub extern "C" fn dnt_reply_len(id: u32) -> u32 {
    with_term(id, |t| t.reply.len() as u32).unwrap_or(0)
}

/// Drain emulator replies. Returns pointer (valid until next call); also clears.
#[no_mangle]
pub extern "C" fn dnt_reply_ptr(id: u32) -> *const u8 {
    match with_term(id, |t| {
        let bytes = std::mem::take(&mut t.reply);
        set_last(&bytes)
    }) {
        Some(p) => p,
        None => std::ptr::null(),
    }
}

#[no_mangle]
pub extern "C" fn dnt_modes(id: u32) -> u32 {
    with_term(id, |t| t.modes).unwrap_or(0)
}

/// Terminal title (OSC 0/2). Returns pointer; len via dnt_title_len.
/// Returns null when unchanged since last read.
#[no_mangle]
pub extern "C" fn dnt_title(id: u32) -> *const u8 {
    match with_term(id, |t| {
        if t.title_dirty {
            t.title_dirty = false;
            set_last(t.title.as_bytes())
        } else {
            std::ptr::null()
        }
    }) {
        Some(p) => p,
        None => std::ptr::null(),
    }
}

#[no_mangle]
pub extern "C" fn dnt_title_len(id: u32) -> u32 {
    with_term(id, |t| t.title.len() as u32).unwrap_or(0)
}

/// Mark emulator dead (host process exited) — freezes input path.
#[no_mangle]
pub extern "C" fn dnt_dead(id: u32) {
    with_term(id, |t| t.alive = false);
}

/// Total scrollback + screen lines (for scrollbar sizing).
#[no_mangle]
pub extern "C" fn dnt_total_lines(id: u32) -> u32 {
    with_term(id, |t| t.grid.total_lines() as u32).unwrap_or(0)
}

#[no_mangle]
pub extern "C" fn dnt_view_start(id: u32) -> i32 {
    with_term(id, |t| (t.grid.total_lines() - t.grid.rows - t.scroll_off) as i32).unwrap_or(0)
}

// --- OSC 7501 state export --------------------------------------------------

/// Monotonic state sequence — bump on every 7501 record upsert/clear.
#[no_mangle]
pub extern "C" fn dnt_state_seq(id: u32) -> u32 {
    with_term(id, |t| t.state_seq).unwrap_or(0)
}

/// JSON pointer for `{seq,title,records:[{id,state,kind?,app?,msg?,progress?}]}`.
/// Re-serializes only when dirty. Valid until next call.
#[no_mangle]
pub extern "C" fn dnt_state_json(id: u32) -> *const u8 {
    match with_term(id, |t| {
        if t.state_dirty {
            t.state_dirty = false;
            t.state_json();
        }
        set_last(t.state_buf.as_bytes())
    }) {
        Some(p) => p,
        None => std::ptr::null(),
    }
}

#[no_mangle]
pub extern "C" fn dnt_state_len(id: u32) -> u32 {
    with_term(id, |t| t.state_buf.len() as u32).unwrap_or(0)
}

// --- Screen text export ------------------------------------------------------

/// Dump screen text into an internal buffer.
/// `source`: 0 = visible (live screen, last `lines` rows — the user's viewport
/// is irrelevant; this is the live grid), 1 = recent (last `lines` of the
/// whole buffer incl. scrollback), 2 = detection (bottom-buffer live rows —
/// the snapshot status detection reads; identical to visible for now but a
/// distinct contract slot for viewport-aware reads later).
/// Returns pointer (valid until next call); len via dnt_dump_len.
#[no_mangle]
pub extern "C" fn dnt_dump(id: u32, source: u32, lines: u32) -> *const u8 {
    match with_term(id, |t| {
        t.dump_buf.clear();
        let total = t.grid.total_lines();
        let base = t.grid.screen_base();
        let rows = t.grid.rows;
        let n = (lines as usize).max(1);
        let (start, end) = match source {
            1 => (total.saturating_sub(n), total),
            _ => (base + rows.saturating_sub(n), base + rows),
        };
        let mut first = true;
        for idx in start..end.min(t.grid.lines.len()) {
            if !first {
                t.dump_buf.push(b'\n');
            }
            first = false;
            let line = &t.grid.lines[idx];
            let mut s = String::with_capacity(line.len());
            for c in line {
                if c.flags & WIDE_SPACER != 0 {
                    continue;
                }
                s.push(char::from_u32(c.ch).unwrap_or(' '));
            }
            t.dump_buf.extend_from_slice(s.trim_end().as_bytes());
        }
        set_last(&t.dump_buf)
    }) {
        Some(p) => p,
        None => std::ptr::null(),
    }
}

#[no_mangle]
pub extern "C" fn dnt_dump_len(id: u32) -> u32 {
    with_term(id, |t| t.dump_buf.len() as u32).unwrap_or(0)
}

// --- Selection (copy / copy-mode) --------------------------------------------

/// Set the selection range: absolute (line, col) into grid.lines.
/// Pass aline < 0 to clear.
#[no_mangle]
pub extern "C" fn dnt_select_set(id: u32, aline: i32, acol: u32, fline: i32, fcol: u32) {
    with_term(id, |t| {
        if aline < 0 || fline < 0 {
            t.sel_anchor = None;
            t.sel_focus = None;
        } else {
            t.sel_anchor = Some((aline as usize, acol as usize));
            t.sel_focus = Some((fline as usize, fcol as usize));
        }
    });
}

/// Extract the selected text into sel_buf. Pointer via dnt_select_ptr,
/// length via dnt_select_len. Returns 1 when a selection exists.
#[no_mangle]
pub extern "C" fn dnt_select_extract(id: u32) -> u32 {
    with_term(id, |t| {
        t.sel_buf.clear();
        let (Some(a), Some(f)) = (t.sel_anchor, t.sel_focus) else {
            return 0;
        };
        let (top, bot) = if a <= f { (a, f) } else { (f, a) };
        for line_idx in top.0..=bot.0.min(t.grid.lines.len().saturating_sub(1)) {
            let line = &t.grid.lines[line_idx];
            let c0 = if line_idx == top.0 { top.1 } else { 0 };
            let c1 = if line_idx == bot.0 { bot.1 + 1 } else { line.len() };
            let mut s = String::new();
            for c in &line[c0.min(line.len())..c1.min(line.len())] {
                if c.flags & WIDE_SPACER != 0 {
                    continue;
                }
                s.push(char::from_u32(c.ch).unwrap_or(' '));
            }
            t.sel_buf.extend_from_slice(s.trim_end().as_bytes());
            if line_idx < bot.0 {
                t.sel_buf.push(b'\n');
            }
        }
        1
    })
    .unwrap_or(0)
}

#[no_mangle]
pub extern "C" fn dnt_select_ptr(id: u32) -> *const u8 {
    with_term(id, |t| t.sel_buf.as_ptr()).unwrap_or(std::ptr::null())
}

#[no_mangle]
pub extern "C" fn dnt_select_len(id: u32) -> u32 {
    with_term(id, |t| t.sel_buf.len() as u32).unwrap_or(0)
}

/// Row count of the live screen.
#[no_mangle]
pub extern "C" fn dnt_rows(id: u32) -> u32 {
    with_term(id, |t| t.grid.rows as u32).unwrap_or(0)
}
