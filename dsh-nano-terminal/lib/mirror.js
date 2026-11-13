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
var ScreenMirror = class {
  constructor(cols, rows, scrollback = 2e3) {
    const e = loadMirror();
    this.id = e.dnt_new(cols, rows, scrollback);
    this.e = e;
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
  /** Last `n` rendered screen rows as joined text (trailing blanks trimmed). */
  screenText(n = 50) {
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
