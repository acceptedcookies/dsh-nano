// src/host/mirror.js
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
var here = dirname(fileURLToPath(import.meta.url));
var exports_ = null;
var memory = null;
var decoder = new TextDecoder("utf-8", { fatal: false });
function loadMirror() {
  if (exports_) return exports_;
  const path = join(here, "..", "lib", "dnt-core.wasm");
  const bytes = readFileSync(path);
  const instance = new WebAssembly.Instance(new WebAssembly.Module(bytes), {});
  exports_ = instance.exports;
  memory = exports_.memory;
  return exports_;
}
function memI32() {
  return new Int32Array(memory.buffer);
}
function memU8() {
  return new Uint8Array(memory.buffer);
}
var SOURCE = { visible: 0, recent: 1, detection: 2 };
var ScreenMirror = class {
  constructor(cols, rows, scrollback = 2e3) {
    const e = loadMirror();
    this.id = e.dnt_new(cols, rows, scrollback);
    this.e = e;
    this._lastStateSeq = -1;
    this._stateCache = null;
  }
  free() {
    if (this.id) this.e.dnt_free(this.id);
    this.id = 0;
  }
  write(bytes) {
    const e = this.e;
    const ptr = e.dnt_alloc(bytes.length);
    memU8().set(bytes, ptr);
    e.dnt_write(this.id, ptr, bytes.length);
    e.dnt_dealloc(ptr, bytes.length);
  }
  resize(cols, rows) {
    this.e.dnt_resize(this.id, cols, rows);
  }
  /**
   * Program-reported OSC 7501 state — "the core never guesses the screen".
   * Returns { seq, title, records, root } — root = the id-less record (or null).
   * Cached by state_seq so the per-chunk poll is nearly free.
   */
  state() {
    const e = this.e;
    const seq = e.dnt_state_seq?.(this.id) >>> 0;
    if (seq === this._lastStateSeq && this._stateCache) return this._stateCache;
    this._lastStateSeq = seq;
    const ptr = e.dnt_state_json?.(this.id);
    const len = e.dnt_state_len?.(this.id) ?? 0;
    let parsed = { seq, title: "", records: [] };
    if (ptr && len) {
      try {
        parsed = JSON.parse(decoder.decode(memU8().subarray(ptr, ptr + len)));
      } catch {
      }
    }
    const root = parsed.records.find((r) => r.id === "") ?? null;
    this._stateCache = { seq: parsed.seq ?? seq, title: parsed.title ?? "", records: parsed.records, root };
    return this._stateCache;
  }
  /**
   * Rendered text via the wasm dump ABI (no render() involved).
   * source: 'visible' live screen | 'recent' incl. scrollback | 'detection'
   * bottom-buffer live rows (status-detection snapshot).
   */
  dump(n = 50, source = "visible") {
    const e = this.e;
    const ptr = e.dnt_dump?.(this.id, SOURCE[source] ?? 0, n);
    const len = e.dnt_dump_len?.(this.id) ?? 0;
    if (!ptr || !len) return "";
    return decoder.decode(memU8().subarray(ptr, ptr + len));
  }
  /** Back-compat single-arg read; prefers dump when available. */
  screenText(n = 50, source = "visible") {
    if (this.e.dnt_dump) return this.dump(n, source);
    return this.#screenTextLegacy(n);
  }
  /** Legacy render-buffer reader — kept for wasm binaries without dnt_dump. */
  #screenTextLegacy(n = 50) {
    const e = this.e;
    const ptr = e.dnt_render(this.id);
    const len = e.dnt_render_len(this.id);
    if (!ptr || !len) return "";
    const buf = memI32();
    const textLen = e.dnt_render_text_len(this.id);
    const textPtr = e.dnt_render_text(this.id);
    const textAll = decoder.decode(memU8().subarray(textPtr, textPtr + textLen));
    const textBytes = memU8().subarray(textPtr, textPtr + textLen);
    const map = new Uint32Array(textBytes.length + 1);
    let js = 0;
    let b = 0;
    while (b < textBytes.length) {
      map[b] = js;
      const c = textBytes[b];
      if ((c & 192) === 128) {
        b += 1;
        continue;
      }
      if (c < 128) {
        js += 1;
        b += 1;
      } else if (c < 224) {
        js += 1;
        b += 2;
      } else if (c < 240) {
        js += 1;
        b += 3;
      } else {
        js += 2;
        b += 4;
      }
    }
    map[textBytes.length] = textAll.length;
    let i = (ptr >> 2) + 1;
    const rowsVisible = buf[i++];
    i += 4;
    i++;
    const rowCount = buf[i++];
    const lines = new Array(rowsVisible).fill("");
    for (let r = 0; r < rowCount; r++) {
      const y = buf[i++];
      i += 2;
      const runCount = buf[i++];
      i += 3;
      let line = "";
      for (let k = 0; k < runCount; k++) {
        const col = buf[i++];
        const byteOff = buf[i++];
        const byteLen = buf[i++];
        i += 3;
        const t = textAll.slice(map[byteOff], map[byteOff + byteLen]);
        line = line.padEnd(col, " ") + t;
      }
      if (y >= 0 && y < rowsVisible) lines[y] = line.replace(/\s+$/, "");
    }
    let end = lines.length;
    while (end > 0 && lines[end - 1] === "") end--;
    return lines.slice(Math.max(0, end - n), end).join("\n");
  }
};
export {
  ScreenMirror,
  loadMirror
};
